"""DAISy-Agency Watchdog Heartbeat Receiver — GCP Cloud Function.

Receives periodic HTTP heartbeats from the daisy-watchdog service.
If no heartbeat is received within HEARTBEAT_TIMEOUT_MINUTES, the
function alerts via Discord webhook and email.

Deploy:
    gcloud functions deploy daisy-heartbeat-check \
        --runtime python312 \
        --trigger-http \
        --allow-unauthenticated \
        --set-env-vars "DISCORD_ALERTS_WEBHOOK_URL=https://discord.com/api/webhooks/...,ALERT_EMAIL_TO=alerts@example.com" \
        --source monitoring/heartbeat/cloud-function

Scheduled health check (Cloud Scheduler):
    gcloud scheduler jobs create http daisy-heartbeat-check \
        --schedule "*/5 * * * *" \
        --uri "https://REGION-PROJECT.cloudfunctions.net/daisy-heartbeat-check" \
        --http-method POST \
        --message-body '{"action":"check"}'

The watchdog sends heartbeats via:
    curl -s -X POST https://REGION-PROJECT.cloudfunctions.net/daisy-heartbeat-check \
        -H "Content-Type: application/json" \
        -d '{"action":"heartbeat","source":"daisy-watchdog"}'
"""

import json
import os
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# In-memory state (Cloud Functions may reuse instances)
_last_heartbeat = 0.0

# Configuration
HEARTBEAT_TIMEOUT_MINUTES = int(os.environ.get("HEARTBEAT_TIMEOUT_MINUTES", "10"))
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_ALERTS_WEBHOOK_URL", "")
ALERT_EMAIL_TO = os.environ.get("ALERT_EMAIL_TO", "")


def _send_discord_alert(message: str) -> None:
    """Send alert to Discord via webhook."""
    if not DISCORD_WEBHOOK_URL:
        return

    # Strip /slack suffix if present — use native Discord webhook format
    url = DISCORD_WEBHOOK_URL.rstrip("/")
    if url.endswith("/slack"):
        url = url[:-6]

    payload = json.dumps({
        "content": message,
        "username": "DAISy Heartbeat Monitor",
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            _ = resp.read()
    except urllib.error.URLError as e:
        print(f"Failed to send Discord alert: {e}")


def _format_timestamp(ts: float) -> str:
    """Format Unix timestamp as ISO 8601."""
    if ts == 0:
        return "never"
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def heartbeat_receiver(request):
    """HTTP Cloud Function entry point.

    POST {"action": "heartbeat"} — record a heartbeat
    POST {"action": "check"}     — check if heartbeats are current
    GET                          — return status
    """
    global _last_heartbeat

    if request.method == "GET":
        elapsed = time.time() - _last_heartbeat if _last_heartbeat else None
        return json.dumps({
            "status": "ok",
            "last_heartbeat": _format_timestamp(_last_heartbeat),
            "elapsed_seconds": round(elapsed, 1) if elapsed else None,
        }), 200, {"Content-Type": "application/json"}

    try:
        body = request.get_json(silent=True) or {}
    except Exception:
        body = {}

    action = body.get("action", "")

    if action == "heartbeat":
        _last_heartbeat = time.time()
        return json.dumps({
            "status": "ok",
            "recorded": _format_timestamp(_last_heartbeat),
        }), 200, {"Content-Type": "application/json"}

    if action == "check":
        now = time.time()
        timeout_seconds = HEARTBEAT_TIMEOUT_MINUTES * 60

        if _last_heartbeat == 0:
            # No heartbeat ever received (cold start) — not necessarily an alert
            return json.dumps({
                "status": "unknown",
                "message": "No heartbeat received since function cold start",
            }), 200, {"Content-Type": "application/json"}

        elapsed = now - _last_heartbeat
        if elapsed > timeout_seconds:
            alert_msg = (
                f"**CRITICAL: DAISy Watchdog Heartbeat Missing**\n"
                f"No heartbeat received for {elapsed / 60:.1f} minutes "
                f"(threshold: {HEARTBEAT_TIMEOUT_MINUTES}m).\n"
                f"Last heartbeat: {_format_timestamp(_last_heartbeat)}\n"
                f"The watchdog service may be down — monitoring is degraded."
            )
            _send_discord_alert(alert_msg)
            print(f"ALERT: {alert_msg}")
            return json.dumps({
                "status": "alert",
                "message": f"Heartbeat missing for {elapsed / 60:.1f} minutes",
                "last_heartbeat": _format_timestamp(_last_heartbeat),
            }), 200, {"Content-Type": "application/json"}

        return json.dumps({
            "status": "healthy",
            "last_heartbeat": _format_timestamp(_last_heartbeat),
            "elapsed_seconds": round(elapsed, 1),
        }), 200, {"Content-Type": "application/json"}

    return json.dumps({"error": "Unknown action"}), 400, {"Content-Type": "application/json"}
