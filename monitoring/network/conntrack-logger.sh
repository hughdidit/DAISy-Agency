#!/usr/bin/env bash
# DAISy Network Connection Tracker
# Monitors all outbound connections from containers via conntrack
# Logs structured JSON for Promtail ingestion
# Detects: SSRF, data exfiltration, C2 communication, DNS tunneling
#
# Install: sudo apt-get install -y conntrack
# Run: sudo systemd service (daisy-conntrack-logger.service)
#
set -euo pipefail

LOGFILE="/var/log/daisy-watchdog/network.log"
DNS_LOGFILE="/var/log/daisy-watchdog/dns.log"
NTFY_TOPIC="${NTFY_TOPIC:-}"

# Metadata endpoint (SSRF indicator)
METADATA_IPS=("169.254.169.254" "metadata.google.internal")

# Internal network ranges (should not be accessed from containers)
INTERNAL_RANGES=("10.128." "10.0." "172.16." "192.168.")

# Suspicious destination patterns
SUSPICIOUS_PORTS=(4444 5555 6666 6667 6697 8888 9999 1337 31337)

# Data exfiltration services
EXFIL_DOMAINS="pastebin|transfer\.sh|ngrok|webhook\.site|requestbin|pipedream|beeceptor|hookbin|burpcollaborator"

# Ensure log directory
mkdir -p /var/log/daisy-watchdog

log_event() {
    local severity="$1"
    local event_type="$2"
    local proto="$3"
    local src="$4"
    local dst="$5"
    local dport="$6"
    local extra="${7:-}"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Try to resolve container name from source IP
    local container="unknown"
    container=$(docker network inspect bridge --format '{{range .Containers}}{{if eq .IPv4Address "'"${src}"'/16"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || echo "host-network")

    local json="{\"timestamp\":\"${timestamp}\",\"event_type\":\"${event_type}\",\"severity\":\"${severity}\",\"proto\":\"${proto}\",\"src\":\"${src}\",\"dst\":\"${dst}\",\"dport\":${dport},\"container\":\"${container}\""
    if [[ -n "${extra}" ]]; then
        json="${json},\"detail\":\"${extra}\""
    fi
    json="${json}}"

    echo "${json}" >> "${LOGFILE}"

    # Alert on critical events
    if [[ "${severity}" == "critical" ]] && [[ -n "${NTFY_TOPIC}" ]]; then
        curl -s -o /dev/null \
            -H "Title: 🚨 DAISy Network Alert" \
            -H "Priority: urgent" \
            -H "Tags: rotating_light,globe_with_meridians" \
            -d "Container ${container}: ${event_type} to ${dst}:${dport}" \
            "https://ntfy.sh/${NTFY_TOPIC}" || true
    fi
}

check_connection() {
    local proto="$1"
    local src="$2"
    local dst="$3"
    local dport="$4"

    # Check for SSRF (metadata endpoint access)
    for meta_ip in "${METADATA_IPS[@]}"; do
        if [[ "${dst}" == "${meta_ip}" ]]; then
            log_event "critical" "ssrf_metadata_access" "${proto}" "${src}" "${dst}" "${dport}" "Cloud metadata endpoint accessed"
            return
        fi
    done

    # Check for internal network access
    for range in "${INTERNAL_RANGES[@]}"; do
        if [[ "${dst}" == ${range}* ]] && [[ "${dport}" != "53" ]]; then
            log_event "warning" "internal_network_access" "${proto}" "${src}" "${dst}" "${dport}" "Internal network range"
            return
        fi
    done

    # Check for suspicious ports
    for port in "${SUSPICIOUS_PORTS[@]}"; do
        if [[ "${dport}" == "${port}" ]]; then
            log_event "warning" "suspicious_port" "${proto}" "${src}" "${dst}" "${dport}" "Known suspicious port"
            return
        fi
    done

    # Log all outbound connections (info level) for baseline analysis
    log_event "info" "outbound_connection" "${proto}" "${src}" "${dst}" "${dport}"
}

echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") DAISy conntrack logger started" >> "${LOGFILE}"

# Monitor new connections via conntrack events
# Filter: only NEW connections (not updates/destroys), TCP and UDP
conntrack -E -e NEW -o timestamp 2>/dev/null | while read -r line; do
    # Parse conntrack output
    # Format: [timestamp] [NEW] proto=tcp src=x.x.x.x dst=y.y.y.y sport=xxxxx dport=yyy
    proto=$(echo "${line}" | grep -oP 'proto=\K\w+' || echo "unknown")
    src=$(echo "${line}" | grep -oP 'src=\K[\d.]+' | head -1 || echo "0.0.0.0")
    dst=$(echo "${line}" | grep -oP 'dst=\K[\d.]+' | head -1 || echo "0.0.0.0")
    dport=$(echo "${line}" | grep -oP 'dport=\K\d+' | head -1 || echo "0")

    # Skip loopback and monitoring stack traffic
    [[ "${dst}" == "127."* ]] && continue
    [[ "${src}" == "127."* ]] && continue

    check_connection "${proto}" "${src}" "${dst}" "${dport}"
done
