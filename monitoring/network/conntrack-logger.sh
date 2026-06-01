#!/bin/bash
# conntrack-logger.sh - Log new outbound connections from containers.
#
# Runs conntrack in event mode and logs NEW outbound connections.
# Output is bounded JSONL, ingested by Promtail -> Loki.
#
# Install: apt-get install -y conntrack
# Run as: systemd service or cron
# Output: stdout (captured by systemd journal -> Promtail)

set -uo pipefail
export TZ=UTC

LOG_PREFIX="${LOG_PREFIX:-conntrack-logger}"
CONNTRACK_LOG_RATE_PER_SEC="${CONNTRACK_LOG_RATE_PER_SEC:-25}"
CONNTRACK_LOG_BURST="${CONNTRACK_LOG_BURST:-50}"

case "$CONNTRACK_LOG_RATE_PER_SEC" in
    ''|*[!0-9]*|0) CONNTRACK_LOG_RATE_PER_SEC=25 ;;
esac

case "$CONNTRACK_LOG_BURST" in
    ''|*[!0-9]*|0) CONNTRACK_LOG_BURST=50 ;;
esac

tokens="$CONNTRACK_LOG_BURST"
last_refill="$(printf '%(%s)T' -1)"
suppressed=0
last_summary_epoch=0
last_suppressed_epoch=0

timestamp() {
    printf '%(%Y-%m-%dT%H:%M:%SZ)T' "$1"
}

now_epoch() {
    printf '%(%s)T' -1
}

refill_tokens() {
    local now="$1"
    local elapsed=$((now - last_refill))

    if (( elapsed <= 0 )); then
        return
    fi

    tokens=$((tokens + elapsed * CONNTRACK_LOG_RATE_PER_SEC))
    if (( tokens > CONNTRACK_LOG_BURST )); then
        tokens="$CONNTRACK_LOG_BURST"
    fi
    last_refill="$now"
}

emit_connection() {
    local now="$1" proto="$2" src="$3" dst="$4" sport="$5" dport="$6"

    printf '{"timestamp":"%s","service":"%s","event_type":"new_connection","proto":"%s","src":"%s","dst":"%s","sport":"%s","dport":"%s"}\n' \
        "$(timestamp "$now")" \
        "$LOG_PREFIX" \
        "$proto" "$src" "$dst" "$sport" "$dport"
}

emit_suppressed() {
    local now="$1"

    if (( suppressed <= 0 )); then
        return
    fi

    printf '{"timestamp":"%s","service":"%s","event_type":"rate_limited","suppressed":%d,"rate_per_sec":%d,"burst":%d}\n' \
        "$(timestamp "$now")" \
        "$LOG_PREFIX" \
        "$suppressed" \
        "$CONNTRACK_LOG_RATE_PER_SEC" \
        "$CONNTRACK_LOG_BURST"
    suppressed=0
    last_summary_epoch="$now"
}

handle_line() {
    local line="$1"
    local now="$2"
    local proto="" src="" dst="" sport="" dport="" field

    case "$line" in
        *tcp*|*udp*) ;;
        *) return ;;
    esac

    case "$line" in
        *"dst=127."*|*"dst=::1"*) return ;;
    esac

    for field in $line; do
        case "$field" in
            tcp|udp)
                proto="$field"
                ;;
            src=*)
                [[ -z "$src" ]] && src="${field#src=}"
                ;;
            dst=*)
                [[ -z "$dst" ]] && dst="${field#dst=}"
                ;;
            sport=*)
                [[ -z "$sport" ]] && sport="${field#sport=}"
                ;;
            dport=*)
                [[ -z "$dport" ]] && dport="${field#dport=}"
                ;;
        esac
    done

    if [[ -z "$dst" ]]; then
        return
    fi

    refill_tokens "$now"
    if (( tokens >= 1 )); then
        tokens=$((tokens - 1))
        emit_suppressed "$now"
        emit_connection "$now" "$proto" "$src" "$dst" "$sport" "$dport"
    else
        suppressed=$((suppressed + 1))
        last_suppressed_epoch="$now"
        if (( now > last_summary_epoch )); then
            emit_suppressed "$now"
        fi
    fi
}

flush_if_idle() {
    local now="$1"

    refill_tokens "$now"
    if (( suppressed > 0 && now > last_suppressed_epoch )); then
        emit_suppressed "$now"
    fi
}

# Keep parsing in shell builtins only. The previous version forked awk and date
# per event, which amplified metadata and sandbox churn into host CPU/journal
# pressure during incidents.
conntrack -E -e NEW -o timestamp 2>&1 | while true; do
    if IFS= read -r -t 1 line; then
        handle_line "$line" "$(now_epoch)"
        continue
    fi

    read_status="$?"
    flush_if_idle "$(now_epoch)"

    # read -t returns >128 on timeout and 1 on EOF.
    if (( read_status > 128 )); then
        continue
    fi

    break
done
