# DAISy Monitoring & Diagnostics Stack

Host-level safety, monitoring, and diagnostics suite for the DAISy-Agency GCP VM.
Runs **outside** Docker containers to provide independent visibility into agent behavior.

## Architecture

```
GCP VM Host
├── monitoring/ (this directory)
│   ├── Prometheus + cAdvisor + node-exporter  → container & host metrics
│   ├── Loki + Promtail                        → centralized log aggregation
│   ├── Grafana                                → dashboards (IAP-tunneled)
│   ├── Alertmanager                           → alert routing & dedup
│   ├── Falco (eBPF)                           → runtime syscall security
│   ├── AIDE                                   → file integrity monitoring
│   ├── daisy-watchdog                         → process allowlist & audit trail
│   └── conntrack-logger                       → network connection tracking
│
├── Docker containers (MONITORED)
│   ├── openclaw-gateway
│   ├── openclaw-cli
│   └── sandbox-*
│
└── GCP Cloud Logging (off-host, tamper-proof)
```

## Components

| Component | Purpose | Type |
|-----------|---------|------|
| **Prometheus** | Time-series metrics storage, alerting engine | Docker (9090) |
| **cAdvisor** | Per-container CPU/memory/network/disk metrics | Docker (8080) |
| **node-exporter** | Host-level system metrics | Docker (9100) |
| **Loki** | Log aggregation and querying | Docker (3100) |
| **Promtail** | Log shipper (containers, Falco, auditd, syslog) | Docker |
| **Grafana** | Visualization dashboards | Docker (3000) |
| **Alertmanager** | Alert routing, deduplication, notification | Docker (9093) |
| **Falco** | eBPF-based runtime security (syscall monitoring) | Host systemd |
| **AIDE** | File integrity monitoring (cron, every 15 min) | Host cron |
| **daisy-watchdog** | Process allowlist, tool audit trail, rate limiting | Host systemd |
| **conntrack-logger** | Network connection tracking for SSRF/exfiltration | Host systemd |

All monitoring Docker services bind to `127.0.0.1` only (accessible via IAP tunnel).

## Deployment

### Prerequisites

- GCP VM with IAP SSH access
- Docker and docker-compose v2
- GitHub environment variables configured (see below)

### CI/CD Integration

Monitoring deploys via the existing CI/CD pipeline:

```
deploy.yml (deploy_monitoring: true)
  → monitoring/deploy-monitoring.sh
    → templates port placeholders → copies configs → installs host tools
    → starts docker-compose stack → applies anti-tampering

verify.yml (VERIFY_MONITORING: true)
  → scripts/verify.sh
    → checks monitoring containers, host services, health endpoints
    → verifies Prometheus Watchdog (dead man's switch)
```

### GitHub Environment Variables

**Required for monitoring deploy** (set per environment: staging/production):

| Variable | Example | Purpose |
|----------|---------|---------|
| `OPENCLAW_GATEWAY_PORT` | `18789` | Application port (templated into configs) |
| `OPENCLAW_BRIDGE_PORT` | `18790` | Bridge port (templated into configs) |

**Required for monitoring verification**:

| Variable | Example | Purpose |
|----------|---------|---------|
| `DEPLOY_MONITORING` | `true` | Enable monitoring deploy in staging auto-deploy |
| `VERIFY_MONITORING` | `true` | Enable monitoring health checks in verify workflow |
| `VERIFY_MONITORING_TIMEOUT` | `60` | Seconds to wait for monitoring endpoints (default: 60) |

### Manual Deployment

```bash
export GCP_PROJECT_ID=your-project
export GCP_ZONE=us-central1-a
export GCE_INSTANCE_NAME=daisy-staging-1
export OPENCLAW_GATEWAY_PORT=18789

./monitoring/deploy-monitoring.sh staging
```

## Alert Channels

| Severity | Response | Examples | Channels |
|----------|----------|---------|----------|
| **critical** | Immediate | Container escape, privilege escalation | PagerDuty + Slack + ntfy |
| **warning** | 15 min | Resource spike, suspicious process | Slack + ntfy |
| **info** | Best effort | Container restart, config change | Slack |

Configure alert credentials in `monitoring/.env` (see `.env.example`).

## Grafana Access

Via IAP tunnel:

```bash
gcloud compute ssh INSTANCE_NAME \
  --project PROJECT_ID \
  --zone ZONE \
  --tunnel-through-iap \
  -- -L 3000:127.0.0.1:3000

# Then open http://localhost:3000
```

## Anti-Tampering

The monitoring stack is hardened against manipulation by escaped agents:

- **Privilege separation**: monitoring runs as `daisy-monitor` (uid 2000), not container uid 1000
- **Immutable configs**: `chattr +i` on all monitoring configuration files
- **Append-only audit log**: `chattr +a` on `/var/log/daisy-watchdog/audit.log`
- **Off-host logging**: GCP Cloud Logging (write-only SA role, no delete)
- **Dead man's switch**: Prometheus Watchdog alert + GCP Cloud Function heartbeat
- **Self-healing**: All services use `Restart=always` in systemd
- **AppArmor**: Container processes blocked from monitoring paths
- **seccomp**: `bpf()` syscall dropped from containers

## Port Configuration

Application ports (`OPENCLAW_GATEWAY_PORT`, `OPENCLAW_BRIDGE_PORT`) are **never hardcoded**.
Config files use `__OPENCLAW_GATEWAY_PORT__` / `__OPENCLAW_BRIDGE_PORT__` placeholders,
substituted at deploy time by `deploy-monitoring.sh` via `sed`.

Monitoring infrastructure ports (9090, 3100, 3000, 9093, 8080, 9100) are fixed
standard ports for their respective tools, bound to `127.0.0.1` only.

## Secret Handling

All logging paths redact credentials before output:

- **Python watchdog**: centralized `redact_secrets()` function
- **Promtail**: `replace` pipeline stages strip credential patterns before Loki ingestion
- **Alertmanager**: templates use explicit safe field names, not `SortedPairs`

## Directory Structure

```
monitoring/
├── deploy-monitoring.sh          # CI/CD deployment script
├── setup-permissions.sh          # Anti-tampering setup (chattr, ownership)
├── docker-compose.monitoring.yml # Monitoring Docker stack
├── .env.example                  # Environment variable template
├── prometheus/
│   ├── prometheus.yml            # Scrape config (port-templated)
│   └── alerts.yml                # 20+ alert rules across 5 groups
├── grafana/
│   ├── provisioning/             # Auto-provisioned datasources & dashboards
│   └── dashboards/               # Dashboard JSON models
├── loki/
│   └── loki-config.yml
├── promtail/
│   └── promtail-config.yml       # Log pipeline with secret redaction
├── alertmanager/
│   └── alertmanager.yml          # 3-tier severity routing
├── falco/
│   ├── falco.yaml                # Main Falco config
│   └── rules/
│       └── daisy-agent-rules.yaml  # 23 custom detection rules
├── aide/
│   ├── aide.conf                 # File integrity monitoring config
│   └── aide-check.sh             # Cron check script
├── watchdog/
│   ├── daisy-watchdog.py         # Custom process monitor + audit
│   ├── daisy-watchdog.service    # systemd unit
│   └── process-allowlist.yml     # Allowed process list per container
├── network/
│   └── conntrack-logger.sh       # Network connection tracker
├── apparmor/
│   └── openclaw-container        # AppArmor profile for containers
├── seccomp/
│   └── daisy-seccomp.json        # seccomp profile (drops bpf() etc.)
└── heartbeat/
    └── cloud-function/           # External dead man's switch
        ├── main.py
        └── requirements.txt
```
