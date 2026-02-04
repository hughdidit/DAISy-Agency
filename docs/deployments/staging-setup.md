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
┌─────────────────────────────────────────────────┐
│ daisy-staging-1 (GCE VM)                        │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Boot Disk       │  │ State Disk          │  │
│  │ (from snapshot) │  │ /var/lib/daisy      │  │
│  │                 │  │   ├── config/       │  │
│  │ - OS            │  │   └── workspace/    │  │
│  │ - Docker        │  │                     │  │
│  │ - App code      │  │  Bind mounts:       │  │
│  └─────────────────┘  │  → /home/node/.clawdbot  │
│                       │  → /home/node/clawd      │
│                       └─────────────────────┘  │
│                                                 │
│  IAP-only SSH (no external IP)                  │
└─────────────────────────────────────────────────┘
```

## Prerequisites

- `gcloud` CLI authenticated with appropriate permissions
- Access to the GCP project: `amiable-raceway-472818-m5`
- IAP tunnel access (`roles/iap.tunnelResourceAccessor`)

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
gcloud compute ssh daisy-staging-1 \
  --zone=us-west1-b \
  --tunnel-through-iap
```

### 3. Run the Scrub Script

Copy the scrub script to the VM and run it:

```bash
# From your local machine
gcloud compute scp scripts/gcp/staging-scrub.sh \
  daisy-staging-1:/tmp/staging-scrub.sh \
  --zone=us-west1-b \
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
gcloud compute ssh daisy-staging-1 \
  --zone=us-west1-b \
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

# Docker image
CLAWDBOT_IMAGE=ghcr.io/hughdidit/daisy-agency:latest

# Paths (should match bind mounts)
CLAWDBOT_CONFIG_DIR=/home/node/.clawdbot
CLAWDBOT_WORKSPACE_DIR=/home/node/clawd

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
  daisy-staging-1:/tmp/staging-verify.sh \
  --zone=us-west1-b \
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

| Resource | Name | Notes |
|----------|------|-------|
| VM Instance | `daisy-staging-1` | No external IP |
| Boot Disk | `daisy-staging-boot` | Cloned from production |
| State Disk | `daisy-staging-state` | 50GB, fresh |
| Service Account | `daisy-staging-sa@...` | Minimal permissions |
| Snapshot | `daisy-staging-snapshot-YYYYMMDD-HHMMSS` | Can be deleted after VM creation |

## Rollback / Cleanup

To delete the staging VM and all its resources:

```bash
# Delete VM
gcloud compute instances delete daisy-staging-1 \
  --zone=us-west1-b \
  --quiet

# Delete disks
gcloud compute disks delete daisy-staging-boot daisy-staging-state \
  --zone=us-west1-b \
  --quiet

# Delete snapshot (optional - may want to keep for future staging VMs)
gcloud compute snapshots delete daisy-staging-snapshot-YYYYMMDD-HHMMSS \
  --quiet

# Delete service account (optional)
gcloud iam service-accounts delete \
  daisy-staging-sa@amiable-raceway-472818-m5.iam.gserviceaccount.com
```

## Differences from Production

| Aspect | Production | Staging |
|--------|------------|---------|
| Instance name | `daisy-1` | `daisy-staging-1` |
| Hostname | `daisy-1` | `daisy-staging-1` |
| State storage | `disk-20260125-210858` (250GB) | `daisy-staging-state` (50GB) |
| Discord bot | Production bot | Staging bot (different token) |
| Discord allowlist | Production channels | Staging-only channels |
| External IP | None (IAP-only) | None (IAP-only) |
| Service account | Default compute SA | `daisy-staging-sa` |

## GitHub Actions Integration

To deploy to staging via GitHub Actions, configure the `staging` environment with these secrets:

| Secret | Description |
|--------|-------------|
| `GCP_CREDENTIALS` | Staging SA JSON key (base64 encoded) |
| `GCP_PROJECT_ID` | `amiable-raceway-472818-m5` |
| `GCP_ZONE` | `us-west1-b` |
| `GCE_INSTANCE_NAME` | `daisy-staging-1` |
| `DEPLOY_TARGET` | SSH target (via IAP) |
| `DEPLOY_TOKEN` | SSH private key |

## Troubleshooting

### IAP SSH fails

1. Verify IAP tunnel access:
   ```bash
   gcloud projects get-iam-policy amiable-raceway-472818-m5 \
     --filter="bindings.role:roles/iap.tunnelResourceAccessor"
   ```

2. Grant access if missing:
   ```bash
   gcloud projects add-iam-policy-binding amiable-raceway-472818-m5 \
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
