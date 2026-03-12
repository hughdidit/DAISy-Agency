"""
DAISy Monitoring Dead Man's Switch — GCP Cloud Function

This function runs on GCP Cloud Scheduler (every 5 minutes) and checks:
1. Is the DAISy VM responding to health checks?
2. Is Prometheus still sending its Watchdog alert?
3. Is the monitoring stack operational?

If any check fails, sends an independent alert via ntfy.sh and/or
GCP Cloud Monitoring custom metric.

Deploy:
    gcloud functions deploy daisy-heartbeat-check \
        --gen2 \
        --runtime=python312 \
        --trigger-http \
        --allow-unauthenticated \
        --region=us-central1 \
        --entry-point=heartbeat_check \
        --set-env-vars="NTFY_TOPIC=your-topic,VM_HEALTH_URL=http://your-vm:$OPENCLAW_GATEWAY_PORT/healthz,ALERTMANAGER_URL=http://your-vm:9093"

Cloud Scheduler:
    gcloud scheduler jobs create http daisy-heartbeat \
        --schedule="*/5 * * * *" \
        --uri="https://REGION-PROJECT.cloudfunctions.net/daisy-heartbeat-check" \
        --http-method=POST \
        --location=us-central1
"""

import json
import os
import time
from datetime import datetime, timezone

import functions_framework
import requests

# Configuration from environment
VM_HEALTH_URL = os.environ.get("VM_HEALTH_URL", "")
ALERTMANAGER_URL = os.environ.get("ALERTMANAGER_URL", "")
NTFY_TOPIC = os.environ.get("NTFY_TOPIC", "")
NTFY_URL = f"https://ntfy.sh/{NTFY_TOPIC}" if NTFY_TOPIC else ""
TIMEOUT_SECONDS = 10

# State tracking (in-memory for Cloud Functions; use Firestore for persistence)
_last_alert_time: float = 0
_alert_cooldown = 300  # 5 minutes between repeated alerts


def check_vm_health() -> dict:
    """Check if the DAISy VM gateway is responding."""
    if not VM_HEALTH_URL:
        return {"status": "skipped", "reason": "VM_HEALTH_URL not configured"}

    try:
        resp = requests.get(VM_HEALTH_URL, timeout=TIMEOUT_SECONDS)
        if resp.status_code == 200:
            data = resp.json()
            return {
                "status": "healthy",
                "response_code": resp.status_code,
                "response_time_ms": int(resp.elapsed.total_seconds() * 1000),
            }
        else:
            return {
                "status": "unhealthy",
                "response_code": resp.status_code,
                "response_time_ms": int(resp.elapsed.total_seconds() * 1000),
            }
    except requests.exceptions.Timeout:
        return {"status": "timeout", "reason": f"No response in {TIMEOUT_SECONDS}s"}
    except requests.exceptions.ConnectionError as e:
        return {"status": "unreachable", "reason": str(e)[:200]}
    except Exception as e:
        return {"status": "error", "reason": str(e)[:200]}


def check_alertmanager() -> dict:
    """Check if Alertmanager is running and receiving the Watchdog alert."""
    if not ALERTMANAGER_URL:
        return {"status": "skipped", "reason": "ALERTMANAGER_URL not configured"}

    try:
        # Check Alertmanager health
        health_resp = requests.get(
            f"{ALERTMANAGER_URL}/-/healthy", timeout=TIMEOUT_SECONDS
        )

        # Check for active Watchdog alert (dead man's switch)
        alerts_resp = requests.get(
            f"{ALERTMANAGER_URL}/api/v2/alerts",
            params={"filter": 'alertname="Watchdog"'},
            timeout=TIMEOUT_SECONDS,
        )

        watchdog_active = False
        if alerts_resp.status_code == 200:
            alerts = alerts_resp.json()
            watchdog_active = len(alerts) > 0

        if not watchdog_active:
            return {
                "status": "watchdog_missing",
                "reason": "Prometheus Watchdog alert not firing — Prometheus may be down",
                "alertmanager_healthy": health_resp.status_code == 200,
            }

        return {
            "status": "healthy",
            "alertmanager_healthy": True,
            "watchdog_active": True,
        }

    except requests.exceptions.Timeout:
        return {"status": "timeout", "reason": f"No response in {TIMEOUT_SECONDS}s"}
    except requests.exceptions.ConnectionError as e:
        return {"status": "unreachable", "reason": str(e)[:200]}
    except Exception as e:
        return {"status": "error", "reason": str(e)[:200]}


def send_alert(message: str, priority: str = "urgent"):
    """Send alert via ntfy.sh (independent of VM's alerting pipeline)."""
    global _last_alert_time

    now = time.time()
    if now - _last_alert_time < _alert_cooldown:
        return  # Cooldown active

    _last_alert_time = now

    if NTFY_URL:
        try:
            requests.post(
                NTFY_URL,
                data=message,
                headers={
                    "Title": "🚨 DAISy Dead Man's Switch",
                    "Priority": priority,
                    "Tags": "rotating_light,skull",
                },
                timeout=5,
            )
        except Exception:
            pass  # Best effort


@functions_framework.http
def heartbeat_check(request):
    """
    Cloud Function entry point.
    Called by Cloud Scheduler every 5 minutes.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    results = {}
    overall_healthy = True
    alerts = []

    # Check 1: VM health
    vm_result = check_vm_health()
    results["vm_health"] = vm_result
    if vm_result["status"] not in ("healthy", "skipped"):
        overall_healthy = False
        alerts.append(f"VM: {vm_result['status']} — {vm_result.get('reason', '')}")

    # Check 2: Alertmanager & Watchdog
    am_result = check_alertmanager()
    results["alertmanager"] = am_result
    if am_result["status"] not in ("healthy", "skipped"):
        overall_healthy = False
        alerts.append(f"Alertmanager: {am_result['status']} — {am_result.get('reason', '')}")

    # Send alert if anything is wrong
    if not overall_healthy and alerts:
        alert_msg = (
            f"DAISy monitoring check FAILED at {timestamp}\n\n"
            + "\n".join(f"• {a}" for a in alerts)
            + "\n\nThis alert comes from the external dead man's switch (Cloud Function), "
            "independent of the VM's monitoring stack."
        )
        send_alert(alert_msg)

    # Response
    response = {
        "timestamp": timestamp,
        "overall_healthy": overall_healthy,
        "checks": results,
        "alerts_sent": len(alerts) if not overall_healthy else 0,
    }

    status_code = 200 if overall_healthy else 503
    return json.dumps(response, indent=2), status_code, {"Content-Type": "application/json"}
