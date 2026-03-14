#!/bin/bash
# conntrack-logger.sh — Log new outbound connections from containers
#
# Runs conntrack in event mode and logs NEW outbound connections.
# Output is JSONL, ingested by Promtail → Loki.
#
# Install: apt-get install -y conntrack
# Run as: systemd service or cron
# Output: stdout (captured by systemd journal → Promtail)

set -euo pipefail

LOG_PREFIX="conntrack-logger"

log_json() {
    local proto="$1" src="$2" dst="$3" sport="$4" dport="$5"
    printf '{"timestamp":"%s","service":"%s","event":"new_connection","proto":"%s","src":"%s","dst":"%s","sport":"%s","dport":"%s"}\n' \
        "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
        "$LOG_PREFIX" \
        "$proto" "$src" "$dst" "$sport" "$dport"
}

# Only track NEW outbound connections (not replies)
conntrack -E -e NEW -o timestamp 2>/dev/null | while IFS= read -r line; do
    # Skip non-TCP/UDP
    if [[ "$line" != *"tcp"* ]] && [[ "$line" != *"udp"* ]]; then
        continue
    fi

    # Skip localhost traffic
    if [[ "$line" == *"dst=127."* ]] || [[ "$line" == *"dst=::1"* ]]; then
        continue
    fi

    # Parse protocol
    proto=""
    if [[ "$line" == *"tcp"* ]]; then
        proto="tcp"
    elif [[ "$line" == *"udp"* ]]; then
        proto="udp"
    fi

    # Extract src, dst, sport, dport using grep
    src=$(echo "$line" | grep -oP 'src=\K[^ ]+' | head -1)
    dst=$(echo "$line" | grep -oP 'dst=\K[^ ]+' | head -1)
    sport=$(echo "$line" | grep -oP 'sport=\K[^ ]+' | head -1)
    dport=$(echo "$line" | grep -oP 'dport=\K[^ ]+' | head -1)

    if [[ -n "$dst" ]]; then
        log_json "$proto" "${src:-}" "$dst" "${sport:-}" "${dport:-}"
    fi
done
