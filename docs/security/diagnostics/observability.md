# Observability Stack

The observability stack provides metrics collection, log aggregation, and dashboards for the DAISy-Agency host and containers. All services run as Docker containers with `network_mode: host`.

## Services

### Prometheus

Metrics storage and alerting engine.

| Setting | Value |
|---------|-------|
| Image | `prom/prometheus:v2.51.2` |
| Port | 9090 |
| Scrape interval | 15s |
| Evaluation interval | 15s |
| Retention | 30 days / 10 GB |
| Config | `monitoring/prometheus/prometheus.yml` |
| Alert rules | `monitoring/prometheus/alerts.yml` |

**Scrape targets:**

| Job | Endpoint | What it collects |
|-----|----------|-----------------|
| `prometheus` | localhost:9090 | Prometheus self-metrics |
| `node-exporter` | localhost:9100 | Host CPU, memory, disk, network |
| `cadvisor` | localhost:8080 | Per-container resource usage |
| `openclaw-otel` | localhost:8889 | Application metrics (prefixed `openclaw_`) |
| `alertmanager` | localhost:9093 | Alertmanager health |
| `loki` | localhost:3100 | Loki ingestion metrics |

### node-exporter

Host-level hardware and OS metrics.

| Setting | Value |
|---------|-------|
| Image | `prom/node-exporter:v1.7.0` |
| Port | 9100 |
| Mounts | `/proc`, `/sys`, `/` (rootfs, read-only) |

Exposes CPU usage, memory pressure, disk I/O, network throughput, filesystem utilization, and system load.

### cAdvisor

Per-container resource metrics.

| Setting | Value |
|---------|-------|
| Image | `gcr.io/cadvisor/cadvisor:v0.49.1` |
| Port | 8080 |
| Capabilities | `SYS_PTRACE`, `DAC_READ_SEARCH` |
| Mounts | `/sys`, `/var/lib/docker`, `/dev/disk` |

Provides container-level CPU, memory, network, and filesystem metrics. Capabilities are restricted to the minimum required for reading container stats.

### OpenTelemetry Collector

Bridge between the application's OTLP push telemetry and Prometheus pull scraping.

| Setting | Value |
|---------|-------|
| Image | `otel/opentelemetry-collector-contrib:0.98.0` |
| OTLP HTTP receiver | localhost:4318 |
| Prometheus exporter | localhost:8889 |
| Config | `monitoring/otel-collector/otel-collector-config.yml` |

The application's `diagnostics-otel` extension pushes metrics via OTLP/HTTP to the collector, which exposes them as Prometheus metrics for scraping.

**Application configuration:** Add to your application `.env`:
```
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Loki

Log aggregation backend.

| Setting | Value |
|---------|-------|
| Image | `grafana/loki:2.9.6` |
| HTTP port | 3100 |
| gRPC port | 9096 |
| Retention | 720h (30 days) |
| Max ingestion rate | 10 MB/s |
| Max streams | 10,000 per user |
| Config | `monitoring/loki/loki-config.yml` |

Stores logs from all sources (application, Docker, Falco, auditd, syslog, watchdog) with 30-day retention and automatic compaction.

### Promtail

Log shipping agent.

| Setting | Value |
|---------|-------|
| Image | `grafana/promtail:2.9.6` |
| Port | 9080 |
| Config | `monitoring/promtail/promtail-config.yml` |

**Log sources:**

| Job | Path | Content |
|-----|------|---------|
| `openclaw` | `/var/log/openclaw/openclaw-*.log` | Application JSONL logs |
| `docker` | `/var/lib/docker/containers/*/*.log` | Container stdout/stderr |
| `falco` | `/var/log/falco/events.json` | Security detection events |
| `auditd` | `/var/log/audit/audit.log` | Kernel audit trail |
| `syslog` | `/var/log/syslog` | System messages |
| `watchdog` | `/var/log/daisy-watchdog/audit.jsonl` | Process monitoring events |

**Credential redaction:** Promtail automatically masks secrets before they reach Loki:

- Anthropic API keys (`sk-ant-*`)
- GitHub tokens (`ghp_*`)
- Bearer tokens
- Generic API keys (`sk-*`)
- Slack tokens (`xoxb-*`)
- MongoDB connection URIs
- Google API keys (`AIza*`)
- Password fields in JSON

All matched patterns are replaced with `[REDACTED]`.

### Grafana

Dashboard and visualization platform.

| Setting | Value |
|---------|-------|
| Image | `grafana/grafana-oss:10.4.2` |
| Port | 3000 |
| Admin password | Set via `GRAFANA_ADMIN_PASSWORD` env var |
| Config | `monitoring/grafana/grafana.ini` |

**Pre-built dashboards:**

| Dashboard | Description |
|-----------|-------------|
| Agent Activity Overview | High-level agent behavior and session metrics |
| Container Resources | CPU, memory, network per container |
| Security Events | Falco detections and alert timeline |
| Audit Trail | auditd and watchdog event log |
| File Integrity | AIDE change detection status |
| Network Traffic | Connection patterns and outbound transfers |
| Process Monitor | Process allowlist violations |

Dashboards are auto-provisioned from `monitoring/grafana/dashboards/` on startup.

**Accessing Grafana** (via IAP tunnel):
```bash
gcloud compute ssh <INSTANCE> --project <PROJECT> --zone <ZONE> \
  --tunnel-through-iap -- -L 3000:localhost:3000
# Then open http://localhost:3000
```

## Data Volumes

| Volume | Service | Purpose |
|--------|---------|---------|
| `prometheus-data` | Prometheus | Metrics time-series storage |
| `loki-data` | Loki | Log chunks and index |
| `grafana-data` | Grafana | Dashboard state, user prefs |
| `alertmanager-data` | Alertmanager | Notification state (silences, etc.) |
