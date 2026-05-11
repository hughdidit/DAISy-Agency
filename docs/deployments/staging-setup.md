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

| Variable                  | Default           | Description                   |
| ------------------------- | ----------------- | ----------------------------- |
| `GCP_PROJECT_ID`          | **(required)**    | GCP project ID                |
| `GCP_ZONE`                | `us-west1-b`      | Zone for staging VM           |
| `PROD_BOOT_DISK`          | `clawdbot-gw-1`   | Production boot disk to clone |
| `STAGING_INSTANCE`        | `daisy-staging-1` | Staging VM name               |
| `STAGING_MACHINE_TYPE`    | `n2-standard-8`   | Machine type                  |
| `STAGING_STATE_DISK_SIZE` | `200GB`           | State disk size               |

### Service Account (Least Privilege)

The staging service account (`${STAGING_INSTANCE}-sa`) is created with minimal permissions:

| IAM Role                        | Purpose                                   |
| ------------------------------- | ----------------------------------------- |
| `roles/logging.logWriter`       | Write application logs to Cloud Logging   |
| `roles/monitoring.metricWriter` | Write metrics to Cloud Monitoring         |
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

### 4. Provision and Deploy via GitHub Actions (Recommended)

The easiest way to set up the deployment directory and start services is via the GitHub Actions workflow:

For a brand-new staging VM, the real deploy requires the config file to exist at `/opt/DAISy/config/openclaw.json` before `scripts/deploy.sh` runs. Use the workflow with `provision: true` to create `/opt/DAISy`, then create or copy the config file onto the VM before the first non-dry-run deployment.

1. **Add staging environment secrets** in GitHub:
   - `GHCR_USERNAME`
   - `GHCR_TOKEN`
   - `OPENCLAW_GATEWAY_TOKEN` - Generate with `openssl rand -hex 32`
   - `DISCORD_BOT_TOKEN` - Required by the current deploy workflow and deploy script for real deploys; use the DAISy staging bot for the default Discord account
   - `FINN_DISCORD_BOT_TOKEN` - Optional until the staging config references `channels.discord.accounts.finn.token`; required when Finn runs as its own Discord app
   - `KODY_DISCORD_BOT_TOKEN` - Optional until the staging config references `channels.discord.accounts.kody.token`; required when Kody runs as its own Discord app
   - `ANTHROPIC_API_KEY` - Required by the current deploy workflow and deploy script for real deploys
   - `OPENAI_API_KEY` - Optional, for OpenAI-backed models, tools, and embeddings
   - `MONGODB_URI` - Optional, for memory-mongodb
   - `GEMINI_API_KEY` - Optional, for Gemini-backed embeddings/providers
   - `BRAVE_API_KEY` - Optional, for Brave search
   - `FIRECRAWL_API_KEY` - Optional, for firecrawl-enabled environments
   - `TRELLO_API_KEY` / `TRELLO_TOKEN` - Optional, for Trello integration
   - `GWS_CREDENTIALS` - Optional, for `gws-toolkit-phase1` `credentials_file` mode (service-account JSON required for delegated agent Workspace identities)
   - `GOOGLE_WORKSPACE_CLI_TOKEN` - Optional, only if staging switches to token mode
   - `GRAFANA_ADMIN_PASSWORD` - Required when monitoring `.env.monitoring` should be regenerated
   - `DISCORD_ALERTS_WEBHOOK_URL` - Sensitive Discord webhook for Alertmanager; store as a secret, not a variable
   - `ALERT_SMTP_USERNAME` / `ALERT_SMTP_PASSWORD` - Optional SMTP auth for email alerts

   Staging currently runs `gws-toolkit-phase1` in `credentials_file` mode, so `GWS_CREDENTIALS` is the active path and `GOOGLE_WORKSPACE_CLI_TOKEN` is expected to stay empty unless the config changes. For DAISy agent identities, configure `agents.list[].googleWorkspace.email` with the real Workspace user and bind the agent to a `credentials_file` GWS route; the toolkit uses direct Google API calls with service-account domain-wide delegation instead of relying on `gws` CLI impersonation. Verify checks both file presence and route-bound auth health inside the live gateway container. For delegated routes in enforced environments, credentials must be service-account JSON; exported user OAuth credentials are rejected. Delegated sandbox containers do not receive `/opt/DAISy/config`; they only receive explicit capability projections, so GWS availability in sandboxed delegated runs depends on the route-authorized credential file being derived into the sandbox at container creation time. The sandbox capability-mount resolver is the delegated secret-delivery surface, and GWS is currently the only capability wired through it.

   Minimal staging GWS config fragment:

   ```json5
   {
     agents: {
       list: [
         {
           id: "daisy",
           googleWorkspace: { email: "daisy.ai@hughdidit.com" },
         },
         {
           id: "finn",
           googleWorkspace: { email: "finn.ai@hughdidit.com" },
         },
       ],
     },
     plugins: {
       entries: {
         "gws-toolkit-phase1": {
           enabled: true,
           config: {
             workspaceIdentityDomains: ["hughdidit.com"],
             allowUnboundAgents: false,
             approvedCredentialDirs: ["/opt/DAISy/config/secrets/gws"],
             credentialRoutes: {
               "hughdidit-agent-gws": {
                 mode: "credentials_file",
                 credentialsFile: "/opt/DAISy/config/secrets/gws/domain-wide-delegation.json",
                 allowedServices: ["calendar", "gmail", "drive", "docs", "sheets"],
                 allowedTools: [
                   "gws_status",
                   "gws_calendar_read",
                   "gws_gmail_read",
                   "gws_drive_read",
                   "gws_docs_read",
                   "gws_sheets_read",
                 ],
               },
             },
             agentCredentialBindings: {
               "agent:daisy": "hughdidit-agent-gws",
               "subagent:daisy": "hughdidit-agent-gws",
               "agent:finn": "hughdidit-agent-gws",
               "subagent:finn": "hughdidit-agent-gws",
             },
           },
         },
       },
     },
   }
   ```

   Omit `impersonatedUser` on shared delegated routes. If a compatibility route
   includes `impersonatedUser`, it must match the active agent's
   `googleWorkspace.email`; otherwise `gws_status`, `auth-health`, and tool
   calls fail closed before any Google API call.

   After any GWS route, approved-directory, or credential-file change, recreate the affected sandbox containers before validating delegated runs. The projection is computed at sandbox container creation, so existing hot sandboxes keep their previous bind set until they are explicitly recreated.

   When staging uses `memory-mongodb` with explicit per-agent tool allowlists,
   include the full memory tool surface in both the agent and sandbox tool
   policies for each active agent that should use memory:
   `memory_recall`, `memory_store`, `memory_forget`, `memory_capture`,
   `memory_recallx`, `memory_hygiene`, `commitment_tracker`,
   `preference_miner`, and `memory_audit`. After changing these allowlists,
   recreate or reset the affected sandbox sessions so projected config and
   skill snapshots refresh.

2. **Add staging environment variables** in GitHub:
   - `OPENCLAW_GATEWAY_PORT`
   - `OPENCLAW_BRIDGE_PORT`
   - `OPENCLAW_CONFIG_FILE`
   - `VERIFY_GCE_CONTAINER`
   - `ALERT_EMAIL_TO`
   - `ALERT_SMTP_HOST`
   - `ALERT_SMTP_PORT`
   - `ALERT_SMTP_FROM`

3. **Run the Deploy workflow** with:
   - `release_run_id`: Docker Release workflow run ID (required even when `image_ref` is used)
   - `environment`: `staging`
   - `image_ref`: Optional emergency override (e.g., `ghcr.io/hughdidit/daisy-agency:latest`)
   - `provision`: `true` (creates `/opt/DAISy` and copies docker-compose.yml)
   - `dry_run`: `false`

   Note: These requirements reflect the current behavior of `.github/workflows/deploy.yml`
   and `scripts/deploy.sh`. If those validations are relaxed later, this list can
   be narrowed to only the secrets used by the selected config.

First-time staging setup sequence:

- Run the workflow once with `provision: true` so `${DEPLOY_DIR}` exists on the VM.
- Create or copy `/opt/DAISy/config/openclaw.json` before the first real deploy.
- Re-run the workflow with `dry_run: false` after the config file is in place.

This provisions the VM, pulls the image, and starts the containers in one step.

### 4b. Manual Setup (Alternative)

If you prefer manual configuration instead of workflow provisioning:

```bash
gcloud compute ssh ${STAGING_INSTANCE:-daisy-staging-1} \
  --zone=${GCP_ZONE:-us-west1-b} \
  --tunnel-through-iap
```

Create the deployment directory and docker-compose.yml:

```bash
sudo mkdir -p /opt/DAISy
sudo chown "$(whoami):$(whoami)" /opt/DAISy
# Copy docker-compose.yml from your local machine or create it manually
```

#### Staging Secrets Checklist

- [ ] `OPENCLAW_GATEWAY_TOKEN` - Generate new random token
- [ ] `DISCORD_BOT_TOKEN` - Required by the current deploy workflow/script; use the DAISy staging bot for the default Discord account, not production
- [ ] `FINN_DISCORD_BOT_TOKEN` - Required when `channels.discord.accounts.finn.token` references `${FINN_DISCORD_BOT_TOKEN}`; use Finn's real Discord bot token, not the DAISy staging token
- [ ] `KODY_DISCORD_BOT_TOKEN` - Required when `channels.discord.accounts.kody.token` references `${KODY_DISCORD_BOT_TOKEN}`; use Kody's real Discord bot token, not the DAISy staging token
- [ ] `ANTHROPIC_API_KEY` - Required by the current deploy workflow/script for real deploys
- [ ] `OPENAI_API_KEY` - Optional; set when staging should use OpenAI-backed features
- [ ] `MONGODB_URI` - Optional; set when memory-mongodb is enabled
- [ ] `GEMINI_API_KEY` - Optional; set when Gemini-backed embeddings/providers are enabled
- [ ] `BRAVE_API_KEY` - Optional; set when Brave search is enabled
- [ ] Discord allowlist - **Staging-only channels/users**
- [ ] API keys - Use staging keys or shared keys with tracking
- [ ] `FIRECRAWL_API_KEY` - Optional; set only for firecrawl-enabled environments
- [ ] `TRELLO_API_KEY` / `TRELLO_TOKEN` - Optional; set when Trello integration is enabled
- [ ] `GWS_CREDENTIALS` - Required for the current staging `gws-toolkit-phase1` `credentials_file` path (service-account JSON with Domain-Wide Delegation for delegated agent Workspace identities); must pass route-bound `openclaw gws auth-health` after deploy
- [ ] `workspaceIdentityDomains` - Includes only approved Workspace domains, for example `hughdidit.com`
- [ ] Agent Workspace identities - Each GWS-capable agent has `agents.list[].googleWorkspace.email`
- [ ] GWS route bindings - Each GWS-capable `agent:<id>` and `subagent:<id>` has an explicit `agentCredentialBindings` entry
- [ ] `GOOGLE_WORKSPACE_CLI_TOKEN` - Optional; leave unset unless staging explicitly switches to token mode
- [ ] `GWS Auth Smoke` workflow passing (daily scheduled or manual dispatch) for `agent:main` plus one delegated subject
- [ ] `GRAFANA_ADMIN_PASSWORD` - Required if monitoring `.env.monitoring` should be regenerated on deploy
- [ ] `DISCORD_ALERTS_WEBHOOK_URL` - Optional but sensitive; store as a GitHub secret, never as a GitHub variable
- [ ] `ALERT_SMTP_USERNAME` / `ALERT_SMTP_PASSWORD` - Optional SMTP auth for email alerts
- [ ] GHCR credentials - For pulling staging images
- [ ] Cloudflare tunnel - **Disabled or staging-only tunnel**

### 5. Configure the Application

The config file (`moltbot.json` or `openclaw.json`) lives on the VM at `/opt/DAISy/config/` and is **not managed by the deploy pipeline**. It must be edited manually via SSH.

The config file is bind-mounted read-only into the container and locked with `chattr +i` on the VM filesystem. This prevents the LLM from modifying its own Discord allowlist or other security-sensitive settings via prompt injection.

#### Initial setup (new VM)

```bash
# SSH into the VM
gcloud compute ssh ${STAGING_INSTANCE:-daisy-staging-1} \
  --zone=${GCP_ZONE:-us-west1-b} \
  --tunnel-through-iap

# Create the config file (JSON5 format)
sudo tee /opt/DAISy/config/moltbot.json << 'CONF'
{
  channels: {
    discord: {
      enabled: true,
      guilds: {
        "YOUR_GUILD_ID": {
          slug: "staging-server",
          users: ["YOUR_USER_ID"],
          channels: {
            "YOUR_CHANNEL_ID": { allow: true },
          },
        },
      },
      dmPolicy: "pairing",
    },
  },
}
CONF

# Set ownership and lock
sudo chown 1000:1000 /opt/DAISy/config/moltbot.json
sudo chattr +i /opt/DAISy/config/moltbot.json
```

Then set `OPENCLAW_CONFIG_FILE=moltbot.json` in the GitHub staging environment variables.

#### Editing the config

```bash
# 1. Remove the immutable flag
sudo chattr -i /opt/DAISy/config/moltbot.json

# 2. Edit (nano, vim, etc.)
sudo nano /opt/DAISy/config/moltbot.json

# 3. Re-lock
sudo chattr +i /opt/DAISy/config/moltbot.json

# 4. Restart containers (or rely on hot-reload for most settings)
cd /opt/DAISy
sudo docker-compose -f docker-compose.yml -f docker-compose.host.yml restart
```

See [Gateway Configuration](/gateway/configuration#daisy-deployment-config-management) for the full config format reference and Discord allowlist structure.

#### Delegate Discord named accounts

When staging connects delegate agents to Discord, keep each delegate as a named Discord account with a separate token. Do not reuse `${DISCORD_BOT_TOKEN}` for Finn or Kody; that value is the DAISy staging bot.

```json5
{
  bindings: [
    { agentId: "daisy", match: { channel: "discord", accountId: "default" } },
    { agentId: "finn", match: { channel: "discord", accountId: "finn" } },
    { agentId: "kody", match: { channel: "discord", accountId: "kody" } },
  ],
  channels: {
    discord: {
      accounts: {
        default: {
          token: "${DISCORD_BOT_TOKEN}",
        },
        finn: {
          token: "${FINN_DISCORD_BOT_TOKEN}",
          guilds: {
            FINN_GUILD_ID: {
              channels: {
                FINN_CHANNEL_ID: { allow: true, requireMention: false },
              },
            },
          },
        },
        kody: {
          token: "${KODY_DISCORD_BOT_TOKEN}",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

After editing the locked VM config and deploying with the named-account token present, restart the gateway and verify logs show a separate Discord startup for the delegate account. Run `/reset` or `/new` in the relevant Discord channel after the deploy so channel session snapshots refresh. Do not run a delegate's `BOOTSTRAP.md` as part of this connection step.

### 6. Start Services (Manual only)

Skip this if you used the workflow provisioning (step 4).

```bash
cd /opt/DAISy

# Pull the staging image
sudo docker compose pull

# Start services
sudo docker compose up -d
```

### 7. Verify Setup

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

### 8. Run The Sandbox-First Acceptance Checklist

After Verify is green, run the manual
[Sandbox-First Staging Acceptance Checklist](./sandbox-first-staging-acceptance.md).

Verify confirms the deploy smoke checks, container health, and required runtime
baselines. SBX-401 is the next required closeout step for sandbox-first staging:
it captures operator evidence for readonly diagnostics, live chat behavior,
subagents, and cron-oriented execution under `sandbox.mode="all"`.

## Resource Details

Resources are named based on `STAGING_INSTANCE` (default: `daisy-staging-1`):

| Resource        | Naming Pattern                                 | Notes                            |
| --------------- | ---------------------------------------------- | -------------------------------- |
| VM Instance     | `${STAGING_INSTANCE}`                          | No external IP                   |
| Boot Disk       | `${STAGING_INSTANCE}-boot`                     | Cloned from production           |
| State Disk      | `${STAGING_INSTANCE}-state`                    | 200GB, fresh                     |
| Service Account | `${STAGING_INSTANCE}-sa@PROJECT.iam...`        | Minimal permissions              |
| Snapshot        | `${STAGING_INSTANCE}-snapshot-YYYYMMDD-HHMMSS` | Can be deleted after VM creation |

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
  "${STAGING_INSTANCE}-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --quiet
```

## Differences from Production

| Aspect            | Production           | Staging                         |
| ----------------- | -------------------- | ------------------------------- |
| Instance name     | Production instance  | `daisy-staging-1`               |
| Hostname          | Production hostname  | `daisy-staging-1`               |
| State storage     | Production data disk | `daisy-staging-1-state` (fresh) |
| Discord bot       | Production bot       | Staging bot (different token)   |
| Discord allowlist | Production channels  | Staging-only channels           |
| External IP       | None (IAP-only)      | None (IAP-only)                 |
| Service account   | Default compute SA   | `${STAGING_INSTANCE}-sa`        |

## GitHub Actions Integration

Deploy to staging via GitHub Actions using **Workload Identity Federation (WIF)** for keyless authentication and **IAP SSH** for secure access. This avoids long-lived service account keys or SSH keys.

### Required GitHub Environment Variables

Configure the `staging` environment with these variables (replace with your values):

| Variable                         | Example                                                                               | Description                                                |
| -------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `GCP_PROJECT_ID`                 | `your-project-id`                                                                     | GCP project ID                                             |
| `GCP_ZONE`                       | `us-west1-b`                                                                          | Compute zone                                               |
| `GCE_INSTANCE_NAME`              | `daisy-staging-1`                                                                     | Staging VM instance name                                   |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUM/locations/global/workloadIdentityPools/github/providers/github` | WIF provider path                                          |
| `GCP_SERVICE_ACCOUNT`            | `daisy-staging-sa@PROJECT_ID.iam.gserviceaccount.com`                                 | Staging service account                                    |
| `DEPLOY_DIR`                     | `/opt/DAISy`                                                                          | Directory containing docker-compose.yml                    |
| `HOSTNAME_PATTERN`               | `daisy-1`                                                                             | Production hostname pattern for .env validation (optional) |

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
