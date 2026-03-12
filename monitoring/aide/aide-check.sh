#!/usr/bin/env bash
# AIDE Integrity Check Script for DAISy-Agency
# Runs via cron every 15 minutes, reports changes to watchdog log + ntfy
#
# Crontab entry:
#   */15 * * * * root /opt/DAISy/monitoring/aide/aide-check.sh
#
set -euo pipefail

AIDE_CONF="/opt/DAISy/monitoring/aide/aide.conf"
AIDE_REPORT="/var/log/aide/aide-report.log"
WATCHDOG_LOG="/var/log/daisy-watchdog/aide-events.log"
NTFY_TOPIC="${NTFY_TOPIC:-}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Ensure log directory exists
mkdir -p /var/log/aide /var/log/daisy-watchdog

# Run AIDE check
AIDE_EXIT=0
aide --check --config="${AIDE_CONF}" > "${AIDE_REPORT}" 2>&1 || AIDE_EXIT=$?

# Exit codes: 0=no changes, 1-3=added, 4-6=removed, 7=changed, 14-19=errors
if [[ ${AIDE_EXIT} -eq 0 ]]; then
    # No changes detected — log heartbeat
    echo "{\"timestamp\":\"${TIMESTAMP}\",\"event_type\":\"aide_check\",\"severity\":\"info\",\"status\":\"clean\",\"exit_code\":0}" >> "${WATCHDOG_LOG}"
    exit 0
fi

# Changes detected — parse and alert
ADDED=$(grep -c "^Added:" "${AIDE_REPORT}" 2>/dev/null || echo "0")
REMOVED=$(grep -c "^Removed:" "${AIDE_REPORT}" 2>/dev/null || echo "0")
CHANGED=$(grep -c "^Changed:" "${AIDE_REPORT}" 2>/dev/null || echo "0")

# Determine severity based on what changed
SEVERITY="warning"
MONITORING_CHANGES=$(grep -c "/opt/DAISy/monitoring\|/etc/falco\|/var/log/falco" "${AIDE_REPORT}" 2>/dev/null || echo "0")
SYSTEM_CHANGES=$(grep -c "/usr/bin\|/usr/sbin\|/etc/passwd\|/etc/shadow\|/etc/sudoers\|/etc/cron\|/etc/systemd" "${AIDE_REPORT}" 2>/dev/null || echo "0")

if [[ ${MONITORING_CHANGES} -gt 0 ]] || [[ ${SYSTEM_CHANGES} -gt 0 ]]; then
    SEVERITY="critical"
fi

# Log structured event
cat >> "${WATCHDOG_LOG}" <<EOF
{"timestamp":"${TIMESTAMP}","event_type":"aide_check","severity":"${SEVERITY}","status":"changes_detected","exit_code":${AIDE_EXIT},"added":${ADDED},"removed":${REMOVED},"changed":${CHANGED},"monitoring_changes":${MONITORING_CHANGES},"system_changes":${SYSTEM_CHANGES}}
EOF

# Send notification for warning+ severity
MESSAGE="AIDE: ${ADDED} added, ${REMOVED} removed, ${CHANGED} changed files"
if [[ ${SEVERITY} == "critical" ]]; then
    MESSAGE="🚨 CRITICAL FIM: ${MONITORING_CHANGES} monitoring + ${SYSTEM_CHANGES} system file changes detected!"
fi

# ntfy.sh notification
if [[ -n "${NTFY_TOPIC}" ]]; then
    PRIORITY="default"
    [[ ${SEVERITY} == "critical" ]] && PRIORITY="urgent"
    [[ ${SEVERITY} == "warning" ]] && PRIORITY="high"

    curl -s -o /dev/null \
        -H "Title: DAISy FIM Alert (${SEVERITY})" \
        -H "Priority: ${PRIORITY}" \
        -H "Tags: ${SEVERITY},shield" \
        -d "${MESSAGE}" \
        "https://ntfy.sh/${NTFY_TOPIC}" || true
fi

# Log full report for Promtail pickup
logger -t "daisy-aide" -p "auth.${SEVERITY}" "${MESSAGE}"

echo "AIDE check completed: exit=${AIDE_EXIT} ${MESSAGE}"
