"""DAISy-Agency Watchdog Heartbeat Receiver — GCP Cloud Function.

Receives periodic HTTP heartbeats from the daisy-watchdog service.
If no heartbeat is received within HEARTBEAT_TIMEOUT_MINUTES, the
function alerts via Discord webhook.

State is persisted in a GCS bucket so heartbeat timestamps survive
cold starts and instance recycling.

Deploy (authenticated — only IAM-authorized callers can invoke):
    gcloud functions deploy daisy-heartbeat-check \
        --runtime python312 \
        --trigger-http \
        --no-allow-unauthenticated \
        --set-env-vars "DISCORD_ALERTS_WEBHOOK_URL=https://discord.com/api/webhooks/...,HEARTBEAT_GCS_BUCKET=your-project-heartbeat" \
        --source monitoring/heartbeat/cloud-function

    # Grant the watchdog service account invocation rights:
    gcloud functions add-invoker-policy-binding daisy-heartbeat-check \
        --member="serviceAccount:daisy-watchdog@PROJECT.iam.gserviceaccount.com"

Scheduled health check (Cloud Scheduler with OIDC auth):
    gcloud scheduler jobs create http daisy-heartbeat-check \
        --schedule "*/5 * * * *" \
        --uri "https://REGION-PROJECT.cloudfunctions.net/daisy-heartbeat-check" \
        --http-method POST \
        --message-body '{"action":"check"}' \
        --oidc-service-account-email SCHEDULER_SA@PROJECT.iam.gserviceaccount.com

The watchdog sends heartbeats via authenticated request (using VM metadata token):
    TOKEN=$(curl -s -H "Metadata-Flavor: Google" \
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=FUNCTION_URL")
    curl -s -X POST FUNCTION_URL \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"action":"heartbeat","source":"daisy-watchdog"}'
"""

import json
import os
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Configuration
HEARTBEAT_TIMEOUT_MINUTES = int(os.environ.get("HEARTBEAT_TIMEOUT_MINUTES", "10"))
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_ALERTS_WEBHOOK_URL", "")
GCS_BUCKET = os.environ.get("HEARTBEAT_GCS_BUCKET", "")
GCS_OBJECT = "daisy-watchdog-heartbeat.json"

# In-memory cache (reduces GCS reads within same instance)
_cached_heartbeat = 0.0


def _get_gcs_heartbeat() -> float:
    """Read last heartbeat timestamp from GCS. Returns 0.0 if not found."""
    global _cached_heartbeat
    if not GCS_BUCKET:
        return _cached_heartbeat

    url = f"https://storage.googleapis.com/storage/v1/b/{GCS_BUCKET}/o/{GCS_OBJECT}?alt=media"
    req = urllib.request.Request(url, method="GET")

    # Use default credentials (Cloud Functions has automatic auth to GCS)
    try:
        import google.auth.transport.requests
        import google.auth

        credentials, _ = google.auth.default()
        credentials.refresh(google.auth.transport.requests.Request())
        req.add_header("Authorization", f"Bearer {credentials.token}")
    except Exception:
        pass

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            ts = data.get("last_heartbeat", 0.0)
            _cached_heartbeat = ts
            return ts
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return 0.0
        print(f"GCS read error: {e}")
        return _cached_heartbeat
    except Exception as e:
        print(f"GCS read error: {e}")
        return _cached_heartbeat


def _set_gcs_heartbeat(ts: float) -> None:
    """Write heartbeat timestamp to GCS."""
    global _cached_heartbeat
    _cached_heartbeat = ts

    if not GCS_BUCKET:
        return

    url = (
        f"https://storage.googleapis.com/upload/storage/v1/b/{GCS_BUCKET}"
        f"/o?uploadType=media&name={GCS_OBJECT}"
    )
    payload = json.dumps({"last_heartbeat": ts}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        import google.auth.transport.requests
        import google.auth

        credentials, _ = google.auth.default()
        credentials.refresh(google.auth.transport.requests.Request())
        req.add_header("Authorization", f"Bearer {credentials.token}")
    except Exception:
        pass

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            _ = resp.read()
    except Exception as e:
        print(f"GCS write error: {e}")


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

    Authentication is enforced by Cloud Functions IAM
    (--no-allow-unauthenticated). Only authorized service accounts
    can invoke this function.
    """
    if request.method == "GET":
        last_hb = _get_gcs_heartbeat()
        elapsed = time.time() - last_hb if last_hb else None
        return json.dumps({
            "status": "ok",
            "last_heartbeat": _format_timestamp(last_hb),
            "elapsed_seconds": round(elapsed, 1) if elapsed else None,
        }), 200, {"Content-Type": "application/json"}

    body = request.get_json(silent=True) or {}
    action = body.get("action", "")

    if action == "heartbeat":
        now = time.time()
        _set_gcs_heartbeat(now)
        return json.dumps({
            "status": "ok",
            "recorded": _format_timestamp(now),
        }), 200, {"Content-Type": "application/json"}

    if action == "check":
        now = time.time()
        timeout_seconds = HEARTBEAT_TIMEOUT_MINUTES * 60
        last_hb = _get_gcs_heartbeat()

        if last_hb == 0:
            return json.dumps({
                "status": "unknown",
                "message": "No heartbeat ever recorded",
            }), 200, {"Content-Type": "application/json"}

        elapsed = now - last_hb
        if elapsed > timeout_seconds:
            alert_msg = (
                f"**CRITICAL: DAISy Watchdog Heartbeat Missing**\n"
                f"No heartbeat received for {elapsed / 60:.1f} minutes "
                f"(threshold: {HEARTBEAT_TIMEOUT_MINUTES}m).\n"
                f"Last heartbeat: {_format_timestamp(last_hb)}\n"
                f"The watchdog service may be down — monitoring is degraded."
            )
            _send_discord_alert(alert_msg)
            print(f"ALERT: {alert_msg}")
            return json.dumps({
                "status": "alert",
                "message": f"Heartbeat missing for {elapsed / 60:.1f} minutes",
                "last_heartbeat": _format_timestamp(last_hb),
            }), 200, {"Content-Type": "application/json"}

        return json.dumps({
            "status": "healthy",
            "last_heartbeat": _format_timestamp(last_hb),
            "elapsed_seconds": round(elapsed, 1),
        }), 200, {"Content-Type": "application/json"}

    return json.dumps({"error": "Unknown action"}), 400, {"Content-Type": "application/json"}
