#!/usr/bin/env bash
# DAISy Monitoring Anti-Tampering Setup
# Creates the daisy-monitor user, sets file ownership/permissions,
# applies immutable attributes, and installs systemd services.
#
# MUST be run as root on the GCP VM after deploying monitoring configs.
#
# Usage: sudo bash /opt/DAISy/monitoring/setup-permissions.sh
#
set -euo pipefail

MONITORING_DIR="/opt/DAISy/monitoring"
LOG_DIR="/var/log/daisy-watchdog"
FALCO_LOG_DIR="/var/log/falco"
AIDE_LOG_DIR="/var/log/aide"

echo "═══════════════════════════════════════════════════════════"
echo "DAISy Monitoring Anti-Tampering Setup"
echo "═══════════════════════════════════════════════════════════"

# ─── Step 1: Create daisy-monitor user ───
echo ""
echo "▸ Creating daisy-monitor user (uid 2000)..."
if ! id -u daisy-monitor &>/dev/null; then
    useradd \
        --uid 2000 \
        --system \
        --no-create-home \
        --shell /usr/sbin/nologin \
        --comment "DAISy monitoring service account" \
        daisy-monitor
    echo "  ✓ User daisy-monitor created"
else
    echo "  ✓ User daisy-monitor already exists"
fi

# Add daisy-monitor to docker group (needed for watchdog)
usermod -aG docker daisy-monitor 2>/dev/null || true
echo "  ✓ Added to docker group"


# ─── Step 2: Create log directories ───
echo ""
echo "▸ Creating log directories..."
for dir in "${LOG_DIR}" "${FALCO_LOG_DIR}" "${AIDE_LOG_DIR}"; do
    mkdir -p "${dir}"
    chown daisy-monitor:daisy-monitor "${dir}"
    chmod 750 "${dir}"
    echo "  ✓ ${dir}"
done


# ─── Step 3: Set monitoring config ownership ───
echo ""
echo "▸ Setting config file ownership (root:daisy-monitor, 750)..."

# Directory permissions
find "${MONITORING_DIR}" -type d -exec chown root:daisy-monitor {} \;
find "${MONITORING_DIR}" -type d -exec chmod 750 {} \;

# File permissions (configs readable by daisy-monitor, not by others)
find "${MONITORING_DIR}" -type f -exec chown root:daisy-monitor {} \;
find "${MONITORING_DIR}" -type f -exec chmod 640 {} \;

# Scripts need execute permission
find "${MONITORING_DIR}" -name "*.sh" -exec chmod 750 {} \;
find "${MONITORING_DIR}" -name "*.py" -exec chmod 750 {} \;

echo "  ✓ Ownership and permissions set"


# ─── Step 4: Apply immutable attributes (chattr +i) ───
echo ""
echo "▸ Applying immutable attributes to critical configs..."

# Remove any existing immutable bits first (in case of re-run)
IMMUTABLE_FILES=(
    "${MONITORING_DIR}/prometheus/prometheus.yml"
    "${MONITORING_DIR}/prometheus/alerts.yml"
    "${MONITORING_DIR}/alertmanager/alertmanager.yml"
    "${MONITORING_DIR}/falco/falco.yaml"
    "${MONITORING_DIR}/falco/rules/daisy-agent-rules.yaml"
    "${MONITORING_DIR}/loki/loki-config.yml"
    "${MONITORING_DIR}/promtail/promtail-config.yml"
    "${MONITORING_DIR}/watchdog/process-allowlist.yml"
    "${MONITORING_DIR}/aide/aide.conf"
    "${MONITORING_DIR}/apparmor/openclaw-container"
    "${MONITORING_DIR}/seccomp/daisy-seccomp.json"
)

for file in "${IMMUTABLE_FILES[@]}"; do
    if [[ -f "${file}" ]]; then
        chattr -i "${file}" 2>/dev/null || true
        chattr +i "${file}"
        echo "  ✓ chattr +i ${file}"
    else
        echo "  ⚠ Missing: ${file}"
    fi
done


# ─── Step 5: Apply append-only to audit log ───
echo ""
echo "▸ Applying append-only attribute to audit log..."
AUDIT_LOG="${LOG_DIR}/audit.log"
touch "${AUDIT_LOG}"
chown daisy-monitor:daisy-monitor "${AUDIT_LOG}"
chmod 640 "${AUDIT_LOG}"
chattr -a "${AUDIT_LOG}" 2>/dev/null || true
chattr +a "${AUDIT_LOG}"
echo "  ✓ chattr +a ${AUDIT_LOG}"


# ─── Step 6: Install systemd services ───
echo ""
echo "▸ Installing systemd services..."

# Watchdog service
if [[ -f "${MONITORING_DIR}/watchdog/daisy-watchdog.service" ]]; then
    cp "${MONITORING_DIR}/watchdog/daisy-watchdog.service" /etc/systemd/system/
    echo "  ✓ daisy-watchdog.service installed"
fi

# Conntrack logger service
cat > /etc/systemd/system/daisy-conntrack-logger.service <<'UNIT'
[Unit]
Description=DAISy Network Connection Tracker
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/opt/DAISy/monitoring/network/conntrack-logger.sh
User=root
Restart=always
RestartSec=5
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/log/daisy-watchdog
StandardOutput=journal
StandardError=journal
SyslogIdentifier=daisy-conntrack

[Install]
WantedBy=multi-user.target
UNIT
echo "  ✓ daisy-conntrack-logger.service installed"

# AIDE timer
cat > /etc/systemd/system/daisy-aide-check.timer <<'UNIT'
[Unit]
Description=DAISy AIDE File Integrity Check Timer

[Timer]
OnCalendar=*:0/15
Persistent=true
RandomizedDelaySec=60

[Install]
WantedBy=timers.target
UNIT

cat > /etc/systemd/system/daisy-aide-check.service <<'UNIT'
[Unit]
Description=DAISy AIDE File Integrity Check

[Service]
Type=oneshot
ExecStart=/opt/DAISy/monitoring/aide/aide-check.sh
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=daisy-aide
UNIT
echo "  ✓ daisy-aide-check timer installed"


# ─── Step 7: Install AppArmor profile ───
echo ""
echo "▸ Installing AppArmor profile..."
if command -v apparmor_parser &>/dev/null; then
    cp "${MONITORING_DIR}/apparmor/openclaw-container" /etc/apparmor.d/openclaw-container
    apparmor_parser -r /etc/apparmor.d/openclaw-container 2>/dev/null && \
        echo "  ✓ AppArmor profile loaded" || \
        echo "  ⚠ AppArmor profile parse failed (check syntax)"
else
    echo "  ⚠ AppArmor not available — install with: apt-get install apparmor apparmor-utils"
fi


# ─── Step 8: Install auditd rules ───
echo ""
echo "▸ Installing auditd rules..."
AUDIT_RULES_DIR="/etc/audit/rules.d"
if [[ -d "${AUDIT_RULES_DIR}" ]]; then
    cat > "${AUDIT_RULES_DIR}/daisy-containers.rules" <<'RULES'
# DAISy Container Monitoring Audit Rules
# Track access to monitoring infrastructure and sensitive files

# Monitor access to monitoring configs
-w /opt/DAISy/monitoring/ -p wa -k daisy-monitoring-tamper
-w /etc/falco/ -p wa -k daisy-falco-tamper
-w /var/log/falco/ -p wa -k daisy-falco-logs

# Monitor access to monitoring service binaries
-w /usr/bin/falco -p x -k daisy-falco-exec
-w /usr/bin/aide -p x -k daisy-aide-exec

# Monitor systemctl operations on monitoring units
-w /usr/bin/systemctl -p x -k daisy-systemctl

# Monitor signals sent to monitoring processes
-a always,exit -F arch=b64 -S kill -S tkill -S tgkill -k daisy-signal

# Monitor Docker socket access
-w /var/run/docker.sock -p rwxa -k daisy-docker-socket

# Monitor credential files
-w /opt/DAISy/.env -p ra -k daisy-env-access
-w /opt/DAISy/config/ -p ra -k daisy-config-access

# Monitor cron modifications (persistence)
-w /etc/crontab -p wa -k daisy-cron-tamper
-w /etc/cron.d/ -p wa -k daisy-cron-tamper
-w /var/spool/cron/ -p wa -k daisy-cron-tamper

# Monitor new systemd services (persistence)
-w /etc/systemd/system/ -p wa -k daisy-systemd-tamper

# Monitor user/group changes
-w /etc/passwd -p wa -k daisy-user-tamper
-w /etc/shadow -p wa -k daisy-shadow-tamper
-w /etc/sudoers -p wa -k daisy-sudo-tamper
RULES
    echo "  ✓ auditd rules installed"

    # Reload auditd if running
    if systemctl is-active --quiet auditd; then
        augenrules --load 2>/dev/null && echo "  ✓ auditd rules reloaded" || echo "  ⚠ auditd reload failed"
    fi
else
    echo "  ⚠ auditd not available — install with: apt-get install auditd"
fi


# ─── Step 9: Reload systemd and enable services ───
echo ""
echo "▸ Enabling and starting services..."
systemctl daemon-reload

for svc in daisy-watchdog daisy-conntrack-logger; do
    systemctl enable "${svc}" 2>/dev/null || true
    echo "  ✓ ${svc} enabled"
done

systemctl enable daisy-aide-check.timer 2>/dev/null || true
echo "  ✓ daisy-aide-check.timer enabled"

# Start services
for svc in daisy-watchdog daisy-conntrack-logger daisy-aide-check.timer; do
    systemctl start "${svc}" 2>/dev/null && \
        echo "  ✓ ${svc} started" || \
        echo "  ⚠ ${svc} failed to start (may need dependencies)"
done


# ─── Step 10: Initialize AIDE database ───
echo ""
echo "▸ Initializing AIDE database..."
if command -v aide &>/dev/null; then
    if [[ ! -f /var/lib/aide/aide.db ]]; then
        aide --init --config="${MONITORING_DIR}/aide/aide.conf" 2>/dev/null && \
            cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db && \
            echo "  ✓ AIDE database initialized" || \
            echo "  ⚠ AIDE init failed (run manually: aideinit)"
    else
        echo "  ✓ AIDE database already exists"
    fi
else
    echo "  ⚠ AIDE not installed — install with: apt-get install aide aide-common"
fi


# ─── Summary ───
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Setup complete! Verification checklist:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  1. Test immutable files:   lsattr ${MONITORING_DIR}/prometheus/prometheus.yml"
echo "  2. Test append-only audit: lsattr ${AUDIT_LOG}"
echo "  3. Watchdog status:        systemctl status daisy-watchdog"
echo "  4. Conntrack status:       systemctl status daisy-conntrack-logger"
echo "  5. AIDE timer status:      systemctl status daisy-aide-check.timer"
echo "  6. AppArmor status:        aa-status | grep openclaw"
echo "  7. auditd rules:           auditctl -l | grep daisy"
echo ""
echo "  To modify immutable configs:"
echo "    sudo chattr -i <file>   # remove immutable"
echo "    # make changes"
echo "    sudo chattr +i <file>   # re-apply immutable"
echo ""
