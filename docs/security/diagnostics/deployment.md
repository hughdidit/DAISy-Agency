# Deployment

The monitoring stack can be deployed via the CI/CD pipeline or manually on the VM.

## CI/CD Deployment

### Deploy with Monitoring

Use the `--with-monitoring` flag in the deploy workflow:

```bash
gh workflow run deploy.yml \
  -f environment=staging \
  -f release_run_id=<DOCKER_RELEASE_RUN_ID> \
  -f dry_run=false \
  -f with_monitoring=true \
  --ref daisy/dev
```

This performs three steps on the VM via IAP tunnel:

1. **Transfer configs**: Tars the `monitoring/` directory, base64-encodes it, and extracts it to `${DEPLOY_DIR}/monitoring/` on the VM. Clears `chattr +i` immutable bits before extraction so files can be updated.

2. **Run setup-permissions.sh**: On first deploy, installs packages (aide, auditd, conntrack, apparmor-utils), creates the `daisy-monitor` user, sets file permissions, applies `chattr +i` on critical configs, and installs systemd units. On subsequent deploys, skips package installation but re-applies permissions.

3. **Start services**: Pulls and starts the Docker monitoring stack, then restarts `daisy-watchdog` and `daisy-conntrack-logger` systemd services.

### Deploy Workflow Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `environment` | choice | — | `staging` or `production` |
| `release_run_id` | string | — | Docker Release workflow run ID |
| `dry_run` | boolean | `true` | If true, validate only (no actual deploy) |
| `provision` | boolean | `false` | If true, copy compose files and create directories |
| `with_monitoring` | boolean | `false` | If true, deploy monitoring stack |

### Typical CI/CD Flow

```
PR merged to daisy/dev
    → Docker Release (builds + pushes images)
    → Deploy staging on release (auto, dry-run by default)
    → Manual: Deploy with with_monitoring=true
    → Verify
```

## Manual Deployment

### Prerequisites

- SSH access to the VM (via IAP tunnel)
- Docker and docker-compose installed
- Root access (`sudo`)

### 1. Copy Monitoring Files

```bash
# From your local machine
gcloud compute scp --recurse monitoring/ \
  <INSTANCE>:/opt/DAISy/monitoring/ \
  --project <PROJECT> --zone <ZONE> --tunnel-through-iap
```

### 2. Install Falco

Falco runs as a systemd service on the host (not in Docker) for unrestricted eBPF kernel access.

```bash
gcloud compute ssh <INSTANCE> --project <PROJECT> --zone <ZONE> \
  --tunnel-through-iap -- 'bash -s' <<'EOF'
# Add Falco repository
curl -fsSL https://falco.org/repo/falcosecurity-packages.asc | sudo gpg --dearmor -o /usr/share/keyrings/falco-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/falco-archive-keyring.gpg] https://download.falco.org/packages/deb stable main" | sudo tee /etc/apt/sources.list.d/falcosecurity.list
sudo apt-get update
sudo apt-get install -y falco
# Falco config is deployed in the next step via setup-permissions.sh
EOF
```

### 3. Run Setup Script

```bash
gcloud compute ssh <INSTANCE> --project <PROJECT> --zone <ZONE> \
  --tunnel-through-iap -- \
  'sudo /opt/DAISy/monitoring/setup-permissions.sh'
```

This script:
- Creates the `daisy-monitor` user (uid 2000) and group
- Installs packages: `aide`, `auditd`, `conntrack`, `apparmor-utils`
- Creates log directories with correct ownership
- Clears and re-applies `chattr +i` on critical config files
- Installs auditd rules to `/etc/audit/rules.d/`
- Installs and loads the AppArmor profile
- Copies Falco config and rules to `/etc/falco/`
- Initializes the AIDE database (first run only)
- Installs the AIDE cron job (every 15 minutes)
- Installs systemd units for watchdog and conntrack-logger

### 4. Create Environment File

```bash
# On the VM
sudo cp /opt/DAISy/monitoring/.env.monitoring.example /opt/DAISy/monitoring/.env.monitoring
sudo nano /opt/DAISy/monitoring/.env.monitoring
# Fill in: GRAFANA_ADMIN_PASSWORD, DISCORD_ALERTS_WEBHOOK_URL, SMTP settings
sudo chown root:root /opt/DAISy/monitoring/.env.monitoring
sudo chmod 600 /opt/DAISy/monitoring/.env.monitoring
```

### 5. Start Docker Monitoring Stack

```bash
cd /opt/DAISy
sudo docker-compose \
  --env-file monitoring/.env.monitoring \
  -f monitoring/docker-compose.monitoring.yml \
  up -d
```

### 6. Start Host Services

```bash
sudo systemctl start daisy-watchdog
sudo systemctl start daisy-conntrack-logger
```

### 7. Verify

```bash
# Docker services
sudo docker-compose -f monitoring/docker-compose.monitoring.yml ps

# Systemd services
sudo systemctl status daisy-watchdog
sudo systemctl status daisy-conntrack-logger
sudo systemctl status falco
sudo systemctl status auditd

# AppArmor
sudo aa-status | grep openclaw

# Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health}'

# Grafana
curl -s http://localhost:3000/api/health
```

## Environment Variables

All monitoring secrets are stored in `monitoring/.env.monitoring` on the VM. This file must be **root-owned with 600 permissions** and must never be committed to git.

| Variable | Required | Description |
|----------|----------|-------------|
| `GRAFANA_ADMIN_PASSWORD` | Yes | Grafana admin password |
| `DISCORD_ALERTS_WEBHOOK_URL` | Yes | Discord webhook (append `/slack`) |
| `ALERT_EMAIL_TO` | Yes | Alert recipient email |
| `ALERT_SMTP_HOST` | Yes | SMTP server hostname |
| `ALERT_SMTP_PORT` | Yes | SMTP port (587 for TLS) |
| `ALERT_SMTP_FROM` | Yes | Sender email address |
| `ALERT_SMTP_USERNAME` | Yes | SMTP authentication username |
| `ALERT_SMTP_PASSWORD` | Yes | SMTP authentication password |

## Anti-Tampering

### Immutable Config Files

The following files are protected with `chattr +i` (immutable flag) after deployment:

- `prometheus/prometheus.yml`
- `prometheus/alerts.yml`
- `alertmanager/alertmanager.yml`
- `falco/falco.yaml`
- `falco/rules/daisy-agent-rules.yaml`
- `aide/aide.conf`
- `auditd/daisy-containers.rules`
- `seccomp/daisy-seccomp.json`

These files cannot be modified even by root until `chattr -i` is run. The deploy script automatically clears immutable bits before updating configs and re-applies them after.

### File Ownership

All monitoring files are owned by `root:daisy-monitor` with `750` (directories) and `640` (files) permissions. The `.env.monitoring` file is `root:root 600`.

## Updating the Monitoring Stack

1. Make changes to files under `monitoring/` in the repository
2. Create a PR, pass CI, merge to `daisy/dev`
3. Trigger deploy with `with_monitoring=true`:
   ```bash
   gh workflow run deploy.yml \
     -f environment=staging \
     -f release_run_id=<RUN_ID> \
     -f dry_run=false \
     -f with_monitoring=true
   ```
4. The deploy script will:
   - Clear `chattr +i` on existing configs
   - Extract the new configs
   - Re-run `setup-permissions.sh --skip-packages`
   - Restart Docker services and systemd units

## Ports Reference

| Port | Service |
|------|---------|
| 3000 | Grafana |
| 3100 | Loki (HTTP) |
| 4318 | OTel Collector (OTLP HTTP) |
| 8080 | cAdvisor |
| 8889 | OTel Collector (Prometheus exporter) |
| 9080 | Promtail |
| 9090 | Prometheus |
| 9093 | Alertmanager |
| 9096 | Loki (gRPC) |
| 9100 | node-exporter |

All ports are on localhost only (host networking mode). Access via IAP tunnel:

```bash
gcloud compute ssh <INSTANCE> --project <PROJECT> --zone <ZONE> \
  --tunnel-through-iap -- \
  -L 3000:localhost:3000 \
  -L 9090:localhost:9090 \
  -L 9093:localhost:9093
```
