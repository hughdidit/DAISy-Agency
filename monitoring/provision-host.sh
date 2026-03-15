#!/usr/bin/env bash
# provision-host.sh — One-time host provisioning for the monitoring stack.
#
# Creates the daisy-monitor user, installs host-level packages, sets up
# AIDE database + cron, and installs systemd units.
#
# This script runs ONCE per VM (gated by .setup-complete marker in deploy.sh).
# Per-deploy concerns (file permissions, chattr, log dirs, auditd rules,
# AppArmor profile refresh) are handled inline by deploy.sh on every deploy.
#
# Exits non-zero if any critical step fails, preventing .setup-complete
# from being written so provisioning is retried on next deploy.
#
# Usage: sudo ./provision-host.sh
#
# Must be run as root on the target VM.

# Derive MONITORING_DIR from script location so it works with any DEPLOY_DIR
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="${SCRIPT_DIR}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: This script must be run as root." >&2
  exit 1
fi

echo "=== DAISy Monitoring — Host Provisioning ==="
echo "MONITORING_DIR: ${MONITORING_DIR}"

ERRORS=0

# ── 1. Create daisy-monitor user ──────────────────────────────────
if ! id -u daisy-monitor >/dev/null 2>&1; then
  echo "Creating daisy-monitor user (uid 2000)..."
  groupadd --system daisy-monitor 2>/dev/null || true
  if useradd --system --uid 2000 --gid daisy-monitor \
    --groups docker --no-create-home \
    --shell /usr/sbin/nologin daisy-monitor; then
    echo "Created daisy-monitor user."
  else
    echo "ERROR: Failed to create daisy-monitor user."
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "daisy-monitor user already exists."
fi

# ── 2. Install host-level packages ────────────────────────────────
echo "Installing host-level packages..."
if apt-get update && apt-get install -y aide auditd conntrack apparmor-utils; then
  echo "Host packages installed."
else
  echo "ERROR: Package installation failed."
  ERRORS=$((ERRORS + 1))
fi

# ── 3. Initialize AIDE database ─────────────────────────────────
# Safe: only creates if aide.db doesn't already exist, never overwrites.
echo "Initializing AIDE database..."
if command -v aide >/dev/null 2>&1; then
  if [[ ! -f /var/lib/aide/aide.db ]]; then
    mkdir -p /var/lib/aide
    aide --init --config "${MONITORING_DIR}/aide/aide.conf" 2>/dev/null || \
      echo "WARNING: AIDE init failed (some paths may not exist yet)."
    if [[ -f /var/lib/aide/aide.db.new ]]; then
      if cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db; then
        echo "AIDE database initialized."
      else
        echo "ERROR: Failed to copy new AIDE database."
        ERRORS=$((ERRORS + 1))
      fi
    fi
  else
    echo "AIDE database already exists — not overwriting."
  fi
else
  echo "WARNING: aide not found — skipping AIDE init."
fi

# ── 4. Install AIDE cron entry ──────────────────────────────────
# Safe: only adds if not already present (checked via grep).
AIDE_CRON="*/15 * * * * /usr/bin/aide --check --config ${MONITORING_DIR}/aide/aide.conf 2>&1 | logger -t aide-check"
if ! crontab -l 2>/dev/null | grep -qF "aide --check"; then
  { crontab -l 2>/dev/null || true; echo "${AIDE_CRON}"; } | crontab -
  echo "Installed AIDE cron entry (every 15 minutes)."
else
  echo "AIDE cron entry already exists."
fi

# ── 5. Install systemd units ────────────────────────────────────
echo "Installing systemd units..."

# Watchdog service
if [[ -f "${MONITORING_DIR}/watchdog/daisy-watchdog.service" ]]; then
  if cp "${MONITORING_DIR}/watchdog/daisy-watchdog.service" /etc/systemd/system/; then
    systemctl daemon-reload
    systemctl enable daisy-watchdog.service 2>/dev/null || true
    echo "Installed daisy-watchdog.service."
  else
    echo "ERROR: Failed to copy daisy-watchdog.service."
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "WARNING: daisy-watchdog.service file not found."
  ERRORS=$((ERRORS + 1))
fi

# Conntrack logger
if cat > /etc/systemd/system/daisy-conntrack-logger.service <<UNIT
[Unit]
Description=DAISy-Agency Conntrack Logger
Documentation=https://github.com/hughdidit/DAISy-Agency
After=network.target

[Service]
Type=simple
User=root
ExecStart=/bin/bash ${MONITORING_DIR}/network/conntrack-logger.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=conntrack-logger

[Install]
WantedBy=multi-user.target
UNIT
then
  systemctl daemon-reload
  systemctl enable daisy-conntrack-logger.service 2>/dev/null || true
  echo "Installed daisy-conntrack-logger.service."
else
  echo "ERROR: Failed to write daisy-conntrack-logger.service."
  ERRORS=$((ERRORS + 1))
fi

# ── 6. Install persistent bind mount for promtail log access ────
# Ensures /var/log/openclaw survives reboots without needing a deploy.
MOUNT_UNIT="var-log-openclaw.mount"
cat > "/etc/systemd/system/${MOUNT_UNIT}" <<MOUNT
[Unit]
Description=Bind mount /tmp/openclaw to /var/log/openclaw for promtail
DefaultDependencies=no
Before=docker.service

[Mount]
What=/tmp/openclaw
Where=/var/log/openclaw
Type=none
Options=bind

[Install]
WantedBy=local-fs.target
MOUNT
mkdir -p /tmp/openclaw /var/log/openclaw
chown 1000:1000 /tmp/openclaw
chmod 750 /tmp/openclaw
systemctl daemon-reload
systemctl enable "${MOUNT_UNIT}" 2>/dev/null || true
systemctl start "${MOUNT_UNIT}" 2>/dev/null || true
echo "Installed persistent bind mount (${MOUNT_UNIT})."

# ── Summary ──────────────────────────────────────────────────────
echo ""
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "=== Host Provisioning FAILED (${ERRORS} error(s)) ==="
  echo "Fix the errors above and re-deploy to retry provisioning."
  exit 1
else
  echo "=== Host Provisioning Complete ==="
fi
echo ""
