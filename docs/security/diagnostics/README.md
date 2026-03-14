# DAISy-Agency Security Diagnostics Suite

Host-level monitoring, security detection, and anti-tampering for DAISy-Agency. The entire stack runs **outside** the AI agent containers on the host VM, providing independent visibility and alerting for harmful agent behavior.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  GCP VM (n2-standard-8, Debian 12, IAP-only)                    │
│                                                                  │
│  ┌──────────────────────┐    ┌─────────────────────────────────┐│
│  │  Docker Containers   │    │  Host Monitoring Stack          ││
│  │  ┌────────────────┐  │    │                                 ││
│  │  │ openclaw-gateway│──┼────┤  Prometheus ← node-exporter   ││
│  │  │  (AI agents)   │  │    │            ← cAdvisor          ││
│  │  │  seccomp       │  │    │            ← OTel Collector    ││
│  │  │  apparmor      │  │    │                                 ││
│  │  │  read-only fs  │  │    │  Loki ← Promtail               ││
│  │  │  no-new-privs  │  │    │       ← Falco events           ││
│  │  │  cap_drop ALL  │  │    │       ← auditd logs            ││
│  │  └────────────────┘  │    │       ← watchdog events        ││
│  │                      │    │                                 ││
│  └──────────────────────┘    │  Grafana (dashboards)          ││
│                              │  Alertmanager → Discord + Email ││
│  ┌──────────────────────┐    │                                 ││
│  │  Host Services       │    │  Falco (eBPF syscall monitor)  ││
│  │  daisy-watchdog      │    │  AIDE (file integrity)         ││
│  │  conntrack-logger    │    │  auditd (kernel audit)         ││
│  │  auditd              │    │                                 ││
│  └──────────────────────┘    └─────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  GCP Cloud Function │
│  Heartbeat Receiver │
│  (dead man's switch)│
└─────────────────────┘
```

## Components

| Component | Type | Purpose | Doc |
|-----------|------|---------|-----|
| Prometheus | Docker | Metrics storage and alerting | [observability.md](observability.md) |
| Grafana | Docker | Dashboards and visualization | [observability.md](observability.md) |
| Loki + Promtail | Docker | Log aggregation and shipping | [observability.md](observability.md) |
| OTel Collector | Docker | OTLP bridge for app telemetry | [observability.md](observability.md) |
| Alertmanager | Docker | Alert routing (Discord + Email) | [alerting.md](alerting.md) |
| node-exporter | Docker | Host CPU/memory/disk metrics | [observability.md](observability.md) |
| cAdvisor | Docker | Per-container resource metrics | [observability.md](observability.md) |
| Falco | Systemd | Kernel-level syscall monitoring | [security-detection.md](security-detection.md) |
| AIDE | Cron | File integrity monitoring | [security-detection.md](security-detection.md) |
| auditd | Systemd | Kernel audit rules | [security-detection.md](security-detection.md) |
| daisy-watchdog | Systemd | Process allowlist enforcement | [watchdog.md](watchdog.md) |
| conntrack-logger | Systemd | Network connection logging | [network-monitoring.md](network-monitoring.md) |
| Seccomp profile | Docker | Syscall filtering | [container-hardening.md](container-hardening.md) |
| AppArmor profile | Docker | MAC filesystem/capability policy | [container-hardening.md](container-hardening.md) |
| Heartbeat Function | GCP | Dead man's switch | [heartbeat.md](heartbeat.md) |
| setup-permissions.sh | Script | First-run provisioning | [deployment.md](deployment.md) |

## Security Principles

- **Zero-trust**: Assume containment can be broken. Monitor everything independently.
- **Defense-in-depth**: Multiple overlapping detection layers (Falco + AIDE + auditd + watchdog).
- **Least privilege**: `cap_drop: ALL`, `no-new-privileges`, read-only filesystem, seccomp + AppArmor.
- **Secret masking**: All credentials redacted in Promtail before reaching Loki.
- **Immutable configs**: Critical monitoring configs protected with `chattr +i`.
- **Independent monitoring**: The monitoring stack cannot be tampered with from inside containers.

## Quick Start

See [deployment.md](deployment.md) for full deployment instructions.

```bash
# Deploy with monitoring (via CI/CD)
gh workflow run deploy.yml \
  -f environment=staging \
  -f release_run_id=<DOCKER_RELEASE_RUN_ID> \
  -f dry_run=false \
  -f with_monitoring=true

# Or manually on the VM
sudo monitoring/setup-permissions.sh
sudo docker-compose --env-file monitoring/.env.monitoring \
  -f monitoring/docker-compose.monitoring.yml up -d
```

## File Layout

```
monitoring/
├── docker-compose.monitoring.yml    # All Docker monitoring services
├── .env.monitoring.example          # Environment variable template
├── setup-permissions.sh             # First-run provisioning script
├── aide/
│   └── aide.conf                    # File integrity rules
├── alertmanager/
│   ├── alertmanager.yml             # Alert routing config
│   └── discord.tmpl                 # Discord notification template
├── apparmor/
│   └── openclaw-container           # AppArmor MAC profile
├── auditd/
│   └── daisy-containers.rules       # Kernel audit rules
├── falco/
│   ├── falco.yaml                   # Falco main config
│   └── rules/
│       └── daisy-agent-rules.yaml   # Custom detection rules
├── grafana/
│   ├── grafana.ini                  # Grafana server config
│   ├── dashboards/                  # Pre-built dashboard JSONs
│   └── provisioning/                # Auto-provisioning configs
├── heartbeat/
│   └── cloud-function/
│       ├── main.py                  # GCP Cloud Function
│       └── requirements.txt
├── loki/
│   └── loki-config.yml              # Log aggregation config
├── network/
│   └── conntrack-logger.sh          # Connection tracking script
├── otel-collector/
│   └── otel-collector-config.yml    # OpenTelemetry pipeline
├── prometheus/
│   ├── prometheus.yml               # Metrics scrape config
│   └── alerts.yml                   # Alert rules
├── promtail/
│   └── promtail-config.yml          # Log shipping + credential redaction
├── seccomp/
│   └── daisy-seccomp.json           # Syscall filter profile
└── watchdog/
    ├── daisy-watchdog.py            # Process monitor daemon
    ├── daisy-watchdog.service       # Systemd unit
    └── process-allowlist.yml        # Approved executables
```
