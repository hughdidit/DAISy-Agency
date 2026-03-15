#!/usr/bin/env bash
# provision-host.sh — One-time host provisioning for the monitoring stack.
#
# Creates the daisy-monitor user, installs host-level packages, sets up
# auditd rules, AppArmor profile, AIDE database + cron, and systemd units.
#
# This script runs ONCE per VM (gated by .setup-complete marker in deploy.sh).
# Per-deploy concerns (file permissions, chattr, log dirs) are handled
# inline by deploy.sh on every deploy.
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
    echo "WARNING: Failed to create daisy-monitor user."
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "daisy-monitor user already exists."
fi

# ── 2. Install host-level packages ────────────────────────────────
echo "Installing host-level packages..."
if apt-get update -qq && apt-get install -y -qq aide auditd conntrack apparmor-utils; then
  echo "Host packages installed."
else
  echo "WARNING: Package installation failed (some packages may be missing)."
  ERRORS=$((ERRORS + 1))
fi

# ── 3. Install auditd rules ──────────────────────────────────────
echo "Installing auditd rules..."
if [[ -f "${MONITORING_DIR}/auditd/daisy-containers.rules" ]]; then
  cp "${MONITORING_DIR}/auditd/daisy-containers.rules" /etc/audit/rules.d/
  if command -v augenrules >/dev/null 2>&1; then
    augenrules --load || echo "WARNING: Failed to reload audit rules."
  fi
else
  echo "WARNING: auditd rules file not found."
  ERRORS=$((ERRORS + 1))
fi

# ── 4. Install AppArmor profile ───────────────────────────────────
echo "Installing AppArmor profile..."
if [[ -f "${MONITORING_DIR}/apparmor/openclaw-container" ]]; then
  cp "${MONITORING_DIR}/apparmor/openclaw-container" /etc/apparmor.d/
  if command -v apparmor_parser >/dev/null 2>&1; then
    apparmor_parser -r /etc/apparmor.d/openclaw-container || \
      echo "WARNING: Failed to load AppArmor profile."
  fi
else
  echo "WARNING: AppArmor profile not found."
  ERRORS=$((ERRORS + 1))
fi

# ── 5. Initialize AIDE database ─────────────────────────────────
# Safe: only creates if aide.db doesn't already exist, never overwrites.
echo "Initializing AIDE database..."
if command -v aide >/dev/null 2>&1; then
  if [[ ! -f /var/lib/aide/aide.db ]]; then
    mkdir -p /var/lib/aide
    aide --init --config "${MONITORING_DIR}/aide/aide.conf" 2>/dev/null || \
      echo "WARNING: AIDE init failed (some paths may not exist yet)."
    if [[ -f /var/lib/aide/aide.db.new ]]; then
      cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
      echo "AIDE database initialized."
    fi
  else
    echo "AIDE database already exists — not overwriting."
  fi
else
  echo "WARNING: aide not found — skipping AIDE init."
  ERRORS=$((ERRORS + 1))
fi

# ── 6. Install AIDE cron entry ──────────────────────────────────
# Safe: only adds if not already present (checked via grep).
AIDE_CRON="*/15 * * * * /usr/bin/aide --check --config ${MONITORING_DIR}/aide/aide.conf 2>&1 | logger -t aide-check"
if ! crontab -l 2>/dev/null | grep -qF "aide --check"; then
  { crontab -l 2>/dev/null || true; echo "${AIDE_CRON}"; } | crontab -
  echo "Installed AIDE cron entry (every 15 minutes)."
else
  echo "AIDE cron entry already exists."
fi

# ── 7. Install systemd units ────────────────────────────────────
echo "Installing systemd units..."

# Watchdog service
if [[ -f "${MONITORING_DIR}/watchdog/daisy-watchdog.service" ]]; then
  cp "${MONITORING_DIR}/watchdog/daisy-watchdog.service" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable daisy-watchdog.service 2>/dev/null || true
  echo "Installed daisy-watchdog.service."
else
  echo "WARNING: daisy-watchdog.service file not found."
  ERRORS=$((ERRORS + 1))
fi

# Conntrack logger
cat > /etc/systemd/system/daisy-conntrack-logger.service <<UNIT
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
systemctl daemon-reload
systemctl enable daisy-conntrack-logger.service 2>/dev/null || true
echo "Installed daisy-conntrack-logger.service."

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo "=== Host Provisioning Complete (${ERRORS} warning(s)) ==="
echo ""
echo "Next steps (handled by deploy.sh):"
echo "  1. Per-deploy permissions are applied automatically"
echo "  2. Monitoring stack is started via docker-compose"
echo "  3. Systemd services are restarted"
echo ""
