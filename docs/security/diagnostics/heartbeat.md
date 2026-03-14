# Heartbeat (Dead Man's Switch)

An external GCP Cloud Function that receives periodic heartbeats from the watchdog service. If heartbeats stop arriving, it alerts via Discord — catching the case where the entire monitoring stack has been compromised or the VM is unreachable.

## Architecture

```
VM (daisy-watchdog)                    GCP Cloud Function
┌─────────────────┐   authenticated    ┌─────────────────────┐
│ heartbeat_loop() ├──────────────────►│ heartbeat_receiver() │
│ every 5 minutes │   POST /heartbeat │                     │
└─────────────────┘                    │  State: GCS bucket  │
                                       └──────────┬──────────┘
                                                   │
Cloud Scheduler                                    │
┌─────────────┐    POST /check    ┌────────────────▼──────┐
│ every 5 min ├──────────────────►│ Check elapsed time    │
└─────────────┘                   │ > 10 min? → Discord   │
                                  └───────────────────────┘
```

## Configuration

| Setting           | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| Function          | `monitoring/heartbeat/cloud-function/main.py`             |
| Runtime           | Python 3.12                                               |
| State storage     | GCS bucket (configured via `HEARTBEAT_GCS_BUCKET`)        |
| Timeout threshold | 10 minutes (configurable via `HEARTBEAT_TIMEOUT_MINUTES`) |
| Authentication    | IAM-enforced (`--no-allow-unauthenticated`)               |
| Alert channel     | Discord webhook                                           |

## API

All endpoints require IAM authentication (OIDC token).

### POST `{"action": "heartbeat"}`

Records a heartbeat timestamp in GCS.

**Response:**

```json
{ "status": "ok", "recorded": "2026-03-14T10:05:12+00:00" }
```

### POST `{"action": "check"}`

Checks if heartbeats are current. Alerts via Discord if the last heartbeat is older than the threshold.

**Response (healthy):**

```json
{ "status": "healthy", "last_heartbeat": "2026-03-14T10:05:12+00:00", "elapsed_seconds": 142.3 }
```

**Response (alert):**

```json
{
  "status": "alert",
  "message": "Heartbeat missing for 12.5 minutes",
  "last_heartbeat": "2026-03-14T09:50:00+00:00"
}
```

### GET

Returns current status without triggering alerts.

## Deployment

### 1. Create GCS Bucket

```bash
gsutil mb -l us-central1 gs://your-project-heartbeat
```

### 2. Deploy the Cloud Function

```bash
gcloud functions deploy daisy-heartbeat-check \
  --runtime python312 \
  --trigger-http \
  --no-allow-unauthenticated \
  --set-env-vars "DISCORD_ALERTS_WEBHOOK_URL=https://discord.com/api/webhooks/...,HEARTBEAT_GCS_BUCKET=your-project-heartbeat" \
  --source monitoring/heartbeat/cloud-function
```

### 3. Grant Invocation Rights

```bash
# For the VM's service account (sends heartbeats)
gcloud functions add-invoker-policy-binding daisy-heartbeat-check \
  --region <REGION> \
  --project <PROJECT> \
  --member="serviceAccount:daisy-watchdog@PROJECT.iam.gserviceaccount.com"

# For Cloud Scheduler (runs checks)
gcloud functions add-invoker-policy-binding daisy-heartbeat-check \
  --region <REGION> \
  --project <PROJECT> \
  --member="serviceAccount:scheduler@PROJECT.iam.gserviceaccount.com"
```

### 4. Create Cloud Scheduler Job

```bash
gcloud scheduler jobs create http daisy-heartbeat-check \
  --schedule "*/5 * * * *" \
  --uri "https://REGION-PROJECT.cloudfunctions.net/daisy-heartbeat-check" \
  --http-method POST \
  --message-body '{"action":"check"}' \
  --oidc-service-account-email scheduler@PROJECT.iam.gserviceaccount.com
```

### 5. Configure Watchdog to Send Heartbeats

The watchdog's `heartbeat_loop()` already emits heartbeat events locally. To send them to the Cloud Function, add a cron job or extend the watchdog to POST to the function URL using the VM's metadata token:

```bash
# Example cron entry (every 5 minutes)
*/5 * * * * TOKEN=$(curl -sf -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=FUNCTION_URL") && [ -n "$TOKEN" ] && curl -sf -X POST FUNCTION_URL -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"action":"heartbeat"}' || logger -t daisy-heartbeat "heartbeat failed"
```

The `-f` flag on curl makes it fail with a non-zero exit code on HTTP errors. The `[ -n "$TOKEN" ]` guard prevents sending an unauthenticated request if the metadata token fetch fails. Failures are logged to syslog via `logger`.

## State Persistence

Heartbeat timestamps are stored in a GCS bucket as `daisy-watchdog-heartbeat.json`. This ensures state survives Cloud Function cold starts, instance recycling, and concurrent executions.

The function also maintains an in-memory cache to reduce GCS reads within the same instance, but GCS is always the authoritative source.

## Security

- **Authentication**: The function requires IAM authentication. No anonymous access.
- **Heartbeat spoofing**: Only the VM's service account can send heartbeats.
- **Check spoofing**: Only Cloud Scheduler's service account can trigger checks.
- **State tampering**: GCS bucket access is controlled by IAM policies.
