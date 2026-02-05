# Staging VM Setup Guide

This guide documents the process for creating and configuring a staging VM that mirrors production.

## Overview

The staging VM is created by:
1. Cloning the production boot disk via snapshot
2. Attaching a fresh state disk for isolated storage
3. Running a scrub script to remove production secrets/state
4. Manually configuring staging-specific secrets

## Architecture

```
+-------------------------------------------------------+
| daisy-staging-1 (GCE VM)                              |
|                                                       |
|  +-----------------+  +---------------------------+   |
|  | Boot Disk       |  | State Disk (200GB)        |   |
|  | (from snapshot) |  | /var/lib/daisy            |   |
|  |                 |  |   +-- config/             |   |
|  | - OS            |  |   +-- workspace/          |   |
|  | - Docker        |  |                           |   |
|  | - App binaries  |  | Bind mounts:              |   |
|  +-----------------+  |   config/ -> .clawdbot/   |   |
|                       |   workspace/ -> clawd/    |   |
|                       +---------------------------+   |
|                                                       |
|  IAP-only SSH (no external IP)                        |
+-------------------------------------------------------+
```

## Prerequisites

- `gcloud` CLI authenticated with appropriate permissions
- Access to the target GCP project
- IAP tunnel access (`roles/iap.tunnelResourceAccessor`)
- **Firewall rule allowing IAP TCP forwarding** (see below)

### IAP Firewall Rule

IAP TCP forwarding requires an ingress firewall rule allowing Google's IAP IP range to reach SSH on your VMs:

```bash
gcloud compute firewall-rules create allow-iap-ssh \
  --project="$GCP_PROJECT_ID" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --target-tags=iap-ssh
```

This rule allows the IAP proxy range (`35.235.240.0/20`) to connect to port 22 on VMs tagged with `iap-ssh`. The staging VM creation script applies this tag automatically.

## Configuration

All scripts use environment variables with sensible defaults. View current configuration:

```bash
./scripts/gcp/create-staging-vm.sh --show-defaults
```

Override any setting by exporting variables:

```bash
export GCP_PROJECT_ID="my-project-id"
export GCP_ZONE="us-central1-a"
export STAGING_INSTANCE="my-staging-vm"
./scripts/gcp/create-staging-vm.sh
```

| Variable | Default | Description |
|----------|---------|-------------|
| `GCP_PROJECT_ID` | **(required)** | GCP project ID |
| `GCP_ZONE` | `us-west1-b` | Zone for staging VM |
| `PROD_BOOT_DISK` | `clawdbot-gw-1` | Production boot disk to clone |
| `STAGING_INSTANCE` | `daisy-staging-1` | Staging VM name |
| `STAGING_MACHINE_TYPE` | `n2-standard-8` | Machine type |
| `STAGING_STATE_DISK_SIZE` | `200GB` | State disk size |

### Service Account (Least Privilege)

The staging service account (`${STAGING_INSTANCE}-sa`) is created with minimal permissions:

| IAM Role | Purpose |
|----------|---------|
| `roles/logging.logWriter` | Write application logs to Cloud Logging |
| `roles/monitoring.metricWriter` | Write metrics to Cloud Monitoring |
| `roles/artifactregistry.reader` | Pull Docker images from Artifact Registry |

**VM OAuth Scopes** (further restricts what the SA can do from the VM):
- `logging-write` - Write logs only
- `monitoring-write` - Write metrics only
- `storage-ro` - Read-only storage (for pulling container images)

The broad `cloud-platform` scope is intentionally avoided.

## Quick Start

### 1. Create the Staging VM

```bash
# From the repository root
./scripts/gcp/create-staging-vm.sh

# Or with dry-run to preview
./scripts/gcp/create-staging-vm.sh --dry-run
```

This script will:
- Create a staging service account
- Snapshot the production boot disk
- Create staging boot and state disks
- Create the `daisy-staging-1` VM
- Validate IAP SSH access

### 2. SSH into the Staging VM

```bash
gcloud compute ssh ${STAGING_INSTANCE:-daisy-staging-1} \
  --zone=${GCP_ZONE:-us-west1-b} \
  --tunnel-through-iap
```

### 3. Run the Scrub Script

Copy the scrub script to the VM and run it:

```bash
# From your local machine
gcloud compute scp scripts/gcp/staging-scrub.sh \
  ${STAGING_INSTANCE:-daisy-staging-1}:/tmp/staging-scrub.sh \
  --zone=${GCP_ZONE:-us-west1-b} \
  --tunnel-through-iap

# On the VM
sudo bash /tmp/staging-scrub.sh
```

The scrub script will:
- Stop all services
- Format and mount the state disk
- Set up bind mounts for config and workspace
- Remove production credentials and state
- Set staging hostname
- Remove cron jobs
- Prompt to reboot

### 4. Configure Staging Secrets (Manual)

After the VM reboots, SSH back in and configure staging secrets:

```bash
gcloud compute ssh ${STAGING_INSTANCE:-daisy-staging-1} \
  --zone=${GCP_ZONE:-us-west1-b} \
  --tunnel-through-iap
```

Create the `.env` file with staging secrets:

```bash
sudo nano /opt/DAISy/.env
```

Required variables:
```env
# Gateway
CLAWDBOT_GATEWAY_TOKEN=<generate-random-token>
CLAWDBOT_GATEWAY_BIND=lan
CLAWDBOT_GATEWAY_PORT=18789
CLAWDBOT_BRIDGE_PORT=18790

# Docker image (pin to specific version or SHA for security)
# Using :latest is convenient but poses supply-chain risk - if the registry
# or tag is compromised, malicious code could execute with your secrets.
# For staging, use a specific version tag or image digest:
#   Tag example:    ghcr.io/hughdidit/daisy-agency:staging
#   SHA example:    ghcr.io/hughdidit/daisy-agency@sha256:abc123...
# Replace <TAG_OR_SHA> with your actual version:
CLAWDBOT_IMAGE=ghcr.io/hughdidit/daisy-agency:<TAG_OR_SHA>

# Paths (should match bind mounts)
CLAWDBOT_CONFIG_DIR=/var/lib/clawdbot/home/.clawdbot
CLAWDBOT_WORKSPACE_DIR=/var/lib/clawdbot/home/clawd

# API Keys (use staging-specific or shared with usage tracking)
# ANTHROPIC_API_KEY=<staging-key>
# OPENAI_API_KEY=<staging-key>
```

Generate a random gateway token:
```bash
openssl rand -hex 32
```

#### Staging Secrets Checklist

- [ ] `CLAWDBOT_GATEWAY_TOKEN` - Generate new random token
- [ ] Discord bot token - **Use staging bot, NOT production**
- [ ] Discord allowlist - **Staging-only channels/users**
- [ ] API keys - Use staging keys or shared keys with tracking
- [ ] GHCR credentials - For pulling staging images
- [ ] Cloudflare tunnel - **Disabled or staging-only tunnel**

### 5. Start Services

```bash
cd /opt/DAISy

# Pull the staging image
sudo docker compose pull

# Start services
sudo docker compose up -d
```

### 6. Verify Setup

Copy and run the verification script:

```bash
# From your local machine
gcloud compute scp scripts/gcp/staging-verify.sh \
  ${STAGING_INSTANCE:-daisy-staging-1}:/tmp/staging-verify.sh \
  --zone=${GCP_ZONE:-us-west1-b} \
  --tunnel-through-iap

# On the VM
bash /tmp/staging-verify.sh
```

Expected output:
```
=== Staging VM Verification ===

Checking hostname...
  [PASS] Hostname is 'daisy-staging-1'
Checking external IP access...
  [PASS] No external IP access (IAP-only)
Checking state disk mount...
  [PASS] State disk mounted at /var/lib/daisy
...

=== Verification Summary ===
  Passed: 10
  Failed: 0
  Warnings: 2

RESULT: PASSED with warnings
```

## Resource Details

Resources are named based on `STAGING_INSTANCE` (default: `daisy-staging-1`):

| Resource | Naming Pattern | Notes |
|----------|----------------|-------|
| VM Instance | `${STAGING_INSTANCE}` | No external IP |
| Boot Disk | `${STAGING_INSTANCE}-boot` | Cloned from production |
| State Disk | `${STAGING_INSTANCE}-state` | 200GB, fresh |
| Service Account | `${STAGING_INSTANCE}-sa@PROJECT.iam...` | Minimal permissions |
| Snapshot | `${STAGING_INSTANCE}-snapshot-YYYYMMDD-HHMMSS` | Can be deleted after VM creation |

## Rollback / Cleanup

To delete the staging VM and all its resources:

```bash
# Set your variables (or use the same exports as creation)
STAGING_INSTANCE="${STAGING_INSTANCE:-daisy-staging-1}"
GCP_ZONE="${GCP_ZONE:-us-west1-b}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"

# Delete VM
gcloud compute instances delete "$STAGING_INSTANCE" \
  --zone="$GCP_ZONE" \
  --quiet

# Delete disks
gcloud compute disks delete "${STAGING_INSTANCE}-boot" "${STAGING_INSTANCE}-state" \
  --zone="$GCP_ZONE" \
  --quiet

# Delete snapshot (optional - may want to keep for future staging VMs)
gcloud compute snapshots list --filter="name~${STAGING_INSTANCE}" \
  --format="value(name)" | xargs -r gcloud compute snapshots delete --quiet

# Delete service account (optional)
gcloud iam service-accounts delete \
  "${STAGING_INSTANCE}-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
```

## Differences from Production

| Aspect | Production | Staging |
|--------|------------|---------|
| Instance name | Production instance | `daisy-staging-1` |
| Hostname | Production hostname | `daisy-staging-1` |
| State storage | Production data disk | `daisy-staging-1-state` (fresh) |
| Discord bot | Production bot | Staging bot (different token) |
| Discord allowlist | Production channels | Staging-only channels |
| External IP | None (IAP-only) | None (IAP-only) |
| Service account | Default compute SA | `${STAGING_INSTANCE}-sa` |

## GitHub Actions Integration

Deploy to staging via GitHub Actions using **Workload Identity Federation (WIF)** for keyless authentication and **IAP SSH** for secure access. This avoids long-lived service account keys or SSH keys.

### Required GitHub Environment Variables

Configure the `staging` environment with these variables (replace with your values):

| Variable | Example | Description |
|----------|---------|-------------|
| `GCP_PROJECT_ID` | `your-project-id` | GCP project ID |
| `GCP_ZONE` | `us-west1-b` | Compute zone |
| `GCE_INSTANCE_NAME` | `daisy-staging-1` | Staging VM instance name |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUM/locations/global/workloadIdentityPools/github/providers/github` | WIF provider path |
| `GCP_SERVICE_ACCOUNT` | `daisy-staging-sa@PROJECT_ID.iam.gserviceaccount.com` | Staging service account |
| `DEPLOY_DIR` | `/opt/DAISy` | Directory containing docker-compose.yml |
| `PROD_HOSTNAME_PATTERN` | `daisy-1` | Production hostname for .env validation (optional) |

### Workflow Authentication

Use `google-github-actions/auth` with WIF (no JSON keys):

```yaml
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ vars.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ vars.GCP_SERVICE_ACCOUNT }}

- uses: google-github-actions/setup-gcloud@v2
```

### IAP SSH from GitHub Actions

Use `gcloud compute ssh` with IAP tunneling (no SSH keys):

```yaml
- name: Deploy to staging
  run: |
    gcloud compute ssh ${{ vars.GCE_INSTANCE_NAME }} \
      --zone=${{ vars.GCP_ZONE }} \
      --tunnel-through-iap \
      --command="cd ${{ vars.DEPLOY_DIR }} && docker compose pull && docker compose up -d"
```

### WIF Setup (one-time)

**Prerequisite**: This assumes you have a Workload Identity Pool named `github` already configured. See [Google's WIF documentation](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) to create one if needed.

Grant the staging service account permission to be impersonated by GitHub Actions:

```bash
# Replace these with your values
PROJECT_ID="your-project-id"
PROJECT_NUM="123456789"  # from: gcloud projects describe $PROJECT_ID --format='value(projectNumber)'
SA_EMAIL="daisy-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"
REPO="your-org/your-repo"

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUM}/locations/global/workloadIdentityPools/github/attribute.repository/${REPO}"
```

Grant the service account IAP tunnel access:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iap.tunnelResourceAccessor"
```

## Troubleshooting

### IAP SSH fails

1. **Check firewall rule exists** (most common issue):
   ```bash
   gcloud compute firewall-rules list --filter="name=allow-iap-ssh"
   ```

   If missing, create it:
   ```bash
   gcloud compute firewall-rules create allow-iap-ssh \
     --direction=INGRESS --priority=1000 --network=default \
     --action=ALLOW --rules=tcp:22 --source-ranges=35.235.240.0/20 \
     --target-tags=iap-ssh
   ```

2. **Verify VM has the `iap-ssh` tag**:
   ```bash
   gcloud compute instances describe $STAGING_INSTANCE --zone=$GCP_ZONE \
     --format="get(tags.items)"
   ```

3. **Verify IAP tunnel IAM access**:
   ```bash
   gcloud projects get-iam-policy $GCP_PROJECT_ID \
     --filter="bindings.role:roles/iap.tunnelResourceAccessor"
   ```

4. Grant IAM access if missing:
   ```bash
   gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
     --member="user:YOUR_EMAIL" \
     --role="roles/iap.tunnelResourceAccessor"
   ```

### State disk not mounted after reboot

1. Check fstab:
   ```bash
   cat /etc/fstab | grep daisy
   ```

2. Mount manually:
   ```bash
   sudo mount -a
   ```

3. Check disk:
   ```bash
   lsblk
   sudo blkid /dev/sdb
   ```

### Container fails to start

1. Check Docker logs:
   ```bash
   cd /opt/DAISy
   docker compose logs
   ```

2. Verify .env file:
   ```bash
   cat /opt/DAISy/.env
   ```

3. Verify image pull:
   ```bash
   docker compose pull
   ```
