#!/usr/bin/env bash
set -euo pipefail

# setup-permissions.sh — First-run provisioning for the monitoring stack.
#
# Creates the daisy-monitor user, sets file ownership and permissions,
# applies immutable attributes on critical configs, installs host-level
# packages (aide, auditd, conntrack-tools, apparmor-utils), initialises
# AIDE database, and installs systemd units.
#
# Usage: sudo ./setup-permissions.sh [--skip-packages]
#
# Must be run as root on the target VM.

# Derive MONITORING_DIR from script location so it works with any DEPLOY_DIR
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="${SCRIPT_DIR}"
LOG_BASE="/var/log"
SKIP_PACKAGES="false"

if [[ "${1:-}" == "--skip-packages" ]]; then
  SKIP_PACKAGES="true"
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: This script must be run as root." >&2
  exit 1
fi

echo "=== DAISy Monitoring — Permission Setup ==="
echo "MONITORING_DIR: ${MONITORING_DIR}"

# ── 1. Create daisy-monitor user ──────────────────────────────────
if ! id -u daisy-monitor >/dev/null 2>&1; then
  echo "Creating daisy-monitor user (uid 2000)..."
  groupadd --system daisy-monitor 2>/dev/null || true
  useradd --system --uid 2000 --gid daisy-monitor \
    --groups docker --no-create-home \
    --shell /usr/sbin/nologin daisy-monitor
  echo "Created daisy-monitor user."
else
  echo "daisy-monitor user already exists."
fi

# ── 2. Install host-level packages ────────────────────────────────
if [[ "${SKIP_PACKAGES}" == "false" ]]; then
  echo "Installing host-level packages..."
  apt-get update -qq
  apt-get install -y -qq aide auditd conntrack apparmor-utils
fi

# ── 3. Create log directories ────────────────────────────────────
echo "Creating log directories..."
mkdir -p "${LOG_BASE}/falco"
mkdir -p "${LOG_BASE}/daisy-watchdog"

chown root:daisy-monitor "${LOG_BASE}/falco"
chmod 750 "${LOG_BASE}/falco"

chown daisy-monitor:daisy-monitor "${LOG_BASE}/daisy-watchdog"
chmod 750 "${LOG_BASE}/daisy-watchdog"

# ── 4. Clear immutable bits before updating configs ───────────────
# chattr +i is applied at the end; clear it first so we can update files
echo "Clearing immutable bits for config update..."
IMMUTABLE_FILES=(
  "${MONITORING_DIR}/prometheus/prometheus.yml"
  "${MONITORING_DIR}/prometheus/alerts.yml"
  "${MONITORING_DIR}/alertmanager/alertmanager.yml"
  "${MONITORING_DIR}/falco/falco.yaml"
  "${MONITORING_DIR}/falco/rules/daisy-agent-rules.yaml"
  "${MONITORING_DIR}/aide/aide.conf"
  "${MONITORING_DIR}/auditd/daisy-containers.rules"
  "${MONITORING_DIR}/seccomp/daisy-seccomp.json"
)

for f in "${IMMUTABLE_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    chattr -i "$f" 2>/dev/null || true
  fi
done

# ── 5. Set monitoring config ownership ────────────────────────────
echo "Setting monitoring config ownership..."
chown -R root:daisy-monitor "${MONITORING_DIR}"
chmod 750 "${MONITORING_DIR}"

# Recursively set directory and file permissions
find "${MONITORING_DIR}" -type d -exec chmod 750 {} +
find "${MONITORING_DIR}" -type f -exec chmod 640 {} +

# Make scripts executable
find "${MONITORING_DIR}" -name "*.sh" -exec chmod 750 {} +
find "${MONITORING_DIR}" -name "*.py" -exec chmod 750 {} +

# ── 6. Protect .env.monitoring ────────────────────────────────────
if [[ -f "${MONITORING_DIR}/.env.monitoring" ]]; then
  chown root:root "${MONITORING_DIR}/.env.monitoring"
  chmod 600 "${MONITORING_DIR}/.env.monitoring"
  echo "Secured .env.monitoring (root:root 600)."
fi

# ── 7. Apply immutable attributes on critical configs ─────────────
echo "Applying immutable attributes on critical configs..."
for f in "${IMMUTABLE_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    chattr +i "$f" 2>/dev/null && echo "  +i $f" || echo "  WARN: chattr not supported for $f"
  fi
done

# ── 8. Install auditd rules ──────────────────────────────────────
echo "Installing auditd rules..."
if [[ -f "${MONITORING_DIR}/auditd/daisy-containers.rules" ]]; then
  cp "${MONITORING_DIR}/auditd/daisy-containers.rules" /etc/audit/rules.d/
  if command -v augenrules >/dev/null 2>&1; then
    augenrules --load || echo "WARNING: Failed to reload audit rules."
  fi
fi

# ── 9. Install AppArmor profile ───────────────────────────────────
echo "Installing AppArmor profile..."
if [[ -f "${MONITORING_DIR}/apparmor/openclaw-container" ]]; then
  cp "${MONITORING_DIR}/apparmor/openclaw-container" /etc/apparmor.d/
  if command -v apparmor_parser >/dev/null 2>&1; then
    apparmor_parser -r /etc/apparmor.d/openclaw-container || \
      echo "WARNING: Failed to load AppArmor profile."
  fi
fi

# ── 10. Initialize AIDE database ─────────────────────────────────
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
    echo "AIDE database already exists."
  fi
fi

# ── 11. Install AIDE cron entry ──────────────────────────────────
AIDE_CRON="*/15 * * * * /usr/bin/aide --check --config ${MONITORING_DIR}/aide/aide.conf 2>&1 | logger -t aide-check"
if ! crontab -l 2>/dev/null | grep -qF "aide --check"; then
  (crontab -l 2>/dev/null; echo "${AIDE_CRON}") | crontab -
  echo "Installed AIDE cron entry (every 15 minutes)."
else
  echo "AIDE cron entry already exists."
fi

# ── 12. Install systemd units ────────────────────────────────────
echo "Installing systemd units..."

# Watchdog service
if [[ -f "${MONITORING_DIR}/watchdog/daisy-watchdog.service" ]]; then
  cp "${MONITORING_DIR}/watchdog/daisy-watchdog.service" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable daisy-watchdog.service 2>/dev/null || true
  echo "Installed daisy-watchdog.service."
fi

# Conntrack logger — create a systemd service for it
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

# ── 13. Summary ──────────────────────────────────────────────────
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Start monitoring stack:  docker compose -f ${MONITORING_DIR}/docker-compose.monitoring.yml up -d"
echo "  2. Start watchdog:          systemctl start daisy-watchdog"
echo "  3. Start conntrack logger:  systemctl start daisy-conntrack-logger"
echo "  4. Verify Falco is running: systemctl status falco"
echo "  5. Verify auditd is running: systemctl status auditd"
echo ""
