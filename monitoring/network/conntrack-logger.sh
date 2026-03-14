#!/bin/bash
# conntrack-logger.sh — Log new outbound connections from containers
#
# Runs conntrack in event mode and logs NEW outbound connections.
# Output is JSONL, ingested by Promtail → Loki.
#
# Install: apt-get install -y conntrack
# Run as: systemd service or cron
# Output: stdout (captured by systemd journal → Promtail)

set -uo pipefail

LOG_PREFIX="conntrack-logger"

log_json() {
    local proto="$1" src="$2" dst="$3" sport="$4" dport="$5"
    printf '{"timestamp":"%s","service":"%s","event_type":"new_connection","proto":"%s","src":"%s","dst":"%s","sport":"%s","dport":"%s"}\n' \
        "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
        "$LOG_PREFIX" \
        "$proto" "$src" "$dst" "$sport" "$dport"
}

# Only track NEW outbound connections (not replies)
# Stderr goes to journal for error visibility
conntrack -E -e NEW -o timestamp 2>&1 | while IFS= read -r line; do
    # Skip non-TCP/UDP
    case "$line" in
        *tcp*|*udp*) ;;
        *) continue ;;
    esac

    # Skip localhost traffic
    case "$line" in
        *"dst=127."*|*"dst=::1"*) continue ;;
    esac

    # Extract fields with awk (POSIX-compatible, single process)
    # conntrack output format: [timestamp] [NEW] proto src=X dst=X sport=X dport=X ...
    eval "$(echo "$line" | awk '{
        proto = ""; src = ""; dst = ""; sport = ""; dport = ""
        for (i = 1; i <= NF; i++) {
            if ($i == "tcp") proto = "tcp"
            else if ($i == "udp") proto = "udp"
            else if ($i ~ /^src=/ && src == "") { split($i, a, "="); src = a[2] }
            else if ($i ~ /^dst=/ && dst == "") { split($i, a, "="); dst = a[2] }
            else if ($i ~ /^sport=/ && sport == "") { split($i, a, "="); sport = a[2] }
            else if ($i ~ /^dport=/ && dport == "") { split($i, a, "="); dport = a[2] }
        }
        printf "proto=%s src=%s dst=%s sport=%s dport=%s", proto, src, dst, sport, dport
    }')"

    if [ -n "$dst" ]; then
        log_json "${proto:-}" "${src:-}" "$dst" "${sport:-}" "${dport:-}"
    fi
done
