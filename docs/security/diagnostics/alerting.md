# Alerting

Alerts are evaluated by Prometheus and routed by Alertmanager to Discord and email.

## Alert Channels

| Channel | Configuration |
|---------|--------------|
| Discord | Webhook URL in `DISCORD_ALERTS_WEBHOOK_URL` (append `/slack` for Slack-compatible format) |
| Email | SMTP settings via `ALERT_SMTP_*` env vars |

Both channels are configured in `monitoring/.env.monitoring`.

## Alert Rules

### Host Resource Alerts

| Alert | Severity | Condition | For |
|-------|----------|-----------|-----|
| `HighCpuUsage` | warning | CPU > 80% | 5m |
| `HighMemoryUsage` | critical | Memory > 90% | 5m |
| `DiskSpaceLow` | warning | Root disk > 85% full | 5m |
| `DiskSpaceCritical` | critical | Root disk > 95% full | 2m |
| `DiskStateVolumeLow` | warning | `/var/lib/daisy` > 85% full | 5m |
| `NetworkTxSpike` | warning | Outbound > 50 MB/s | 2m |

### Container Alerts

| Alert | Severity | Condition | For |
|-------|----------|-----------|-----|
| `ContainerHighCpu` | warning | Container CPU > 0.80 cores | 5m |
| `ContainerHighMemory` | warning | Container memory > 90% of limit | 5m |
| `ContainerRestartLoop` | critical | > 3 restarts in 15 minutes | — |
| `ContainerOomKilled` | critical | OOM kill event detected | — |
| `UnexpectedContainerCount` | warning | > 5 openclaw containers running | 2m |

### Application Alerts

| Alert | Severity | Condition | For |
|-------|----------|-----------|-----|
| `HighWebhookErrorRate` | warning | Error rate > 10% | 5m |
| `SessionStuck` | warning | Stuck sessions detected | 5m |
| `ToolLoopDetected` | critical | Tool loop detected | — |

### Monitoring Health

| Alert | Severity | Condition | For |
|-------|----------|-----------|-----|
| `TargetDown` | critical | Scrape target unreachable | 2m |
| `Watchdog` | none | Dead man's switch (always firing) | — |

The `Watchdog` alert fires continuously. If it stops, something is wrong with the alerting pipeline itself. See [heartbeat.md](heartbeat.md) for the external dead man's switch.

## Routing

Alertmanager routes alerts by severity:

| Severity | Receiver | Repeat Interval |
|----------|----------|-----------------|
| `critical` | Discord + Email | 4 hours |
| `warning` | Discord + Email | 12 hours |
| `info` | Discord only | 24 hours |
| `Watchdog` | Dead man's switch | 1 minute |

**Grouping:** Alerts are grouped by `alertname` and `severity`.
- Group wait: 30s (time to buffer before first notification)
- Group interval: 5m (minimum time between notifications for the same group)

**Inhibition:** Active critical alerts suppress warnings for the same alert name, preventing duplicate notifications.

## Configuration

Alert rules are defined in `monitoring/prometheus/alerts.yml`. Routing is configured in `monitoring/alertmanager/alertmanager.yml`. The Discord notification template is in `monitoring/alertmanager/discord.tmpl`.

### Environment Variables

Set these in `monitoring/.env.monitoring`:

```bash
# Discord webhook (append /slack for Slack-compatible payload format)
DISCORD_ALERTS_WEBHOOK_URL=https://discord.com/api/webhooks/ID/TOKEN/slack

# Email (SMTP)
ALERT_EMAIL_TO=alerts@example.com
ALERT_SMTP_HOST=smtp.gmail.com
ALERT_SMTP_PORT=587
ALERT_SMTP_FROM=daisy-alerts@example.com
ALERT_SMTP_USERNAME=your-username
ALERT_SMTP_PASSWORD=your-password
```

## Silencing Alerts

To temporarily silence alerts during maintenance:

```bash
# Via Alertmanager API
curl -X POST http://localhost:9093/api/v2/silences -d '{
  "matchers": [{"name": "alertname", "value": "HighCpuUsage"}],
  "startsAt": "2026-03-14T00:00:00Z",
  "endsAt": "2026-03-14T02:00:00Z",
  "createdBy": "admin",
  "comment": "Planned maintenance"
}'
```

Or use the Alertmanager UI at `http://localhost:9093`.
