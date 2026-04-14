# Deployments (GCP VM: DAISy)

This repository deploys the Moltbot-forked version of DAISy to a **Debian 12 Google Compute Engine (GCE) VM** using GitHub Actions **Environments** for gating (staging vs production) and a release artifact (`release-metadata`) for deterministic, rollbackable deployments.

This document is written for the **IAP-only** access model (preferred): the VM does **not** need a public SSH endpoint; GitHub Actions reaches it through **IAP TCP forwarding** using `gcloud compute ssh --tunnel-through-iap`.

---

## Branch model

- `daisy/dev` — integration / staging
- `daisy/main` — production

---

## Deployment target

- Host: Debian 12 GCE VM running the Moltbot/Clawdbot stack
- Persistent state: `/var/lib/clawdbot` (must survive deploys/restarts)
- Deployment directory on VM: `DEPLOY_DIR` (default: `/opt/DAISy`)
- Runtime: Docker + Compose (or systemd-managed service that starts containers)

---

## Why IAP-only

IAP TCP forwarding tunnels SSH over HTTPS and enforces IAM authorization before the connection is allowed. This reduces public attack surface compared to exposing port 22 to the internet.

References:

- Connect to Linux VMs using IAP (`gcloud compute ssh --tunnel-through-iap`):
  <https://docs.cloud.google.com/compute/docs/connect/ssh-using-iap>
- Using IAP TCP forwarding:
  <https://docs.cloud.google.com/iap/docs/using-tcp-forwarding>

---

## GitHub Environments

Create two environments in GitHub repo settings:

### `staging`

- Deployment branches: `daisy/dev`, `daisy/main` (your choice)
- Required reviewers: optional
- Environment secrets: see **Secrets** section below

### `production`

- Deployment branches: `daisy/main` (recommended; optionally tags `v*`)
- Required reviewers: **required** (at least one approver)
- Environment secrets: see **Secrets** section below

**Important:** environment secrets are only available to jobs that reference the environment, and approval gates can prevent access until a reviewer approves.

Reference:

- GitHub Environments & deployment protection rules:
  <https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment>
- Secrets and environment approvals:
  <https://docs.github.com/en/actions/concepts/security/secrets>

---

## Secrets and Variables (IAP-only + Workload Identity Federation)

### Environment Secrets

These are **environment secrets** (set separately under `staging` and `production` environments).

**GCP auth via Workload Identity Federation (no JSON keys):**

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
  Resource name of your WIF provider (e.g. `projects/…/locations/global/workloadIdentityPools/…/providers/…`)
- `GCP_SERVICE_ACCOUNT`
  Service account email to impersonate (e.g. `deploy-bot@project.iam.gserviceaccount.com`)

**Target VM identity:**

- `GCP_PROJECT_ID` - GCP project hosting the deployment VM
- `GCP_ZONE` - Compute zone (e.g. `us-west1-b`)
- `GCE_INSTANCE_NAME` - VM instance name (e.g. `daisy-staging-1`)

**VM deploy layout:**

- `DEPLOY_DIR` - Directory containing docker-compose.yml (default: `/opt/DAISy`)

**Registry pull (GHCR):**

- `GHCR_USERNAME` - GitHub username that owns the GHCR token used for deploy pulls
- `GHCR_TOKEN` - personal access token (classic) with at least `read:packages`

If the owning account or organization enforces SSO, authorize `GHCR_TOKEN` for SSO before running Deploy.

Note: Image reference comes from `release-metadata.json`, not a separate secret.

### Application Secrets

These secrets are passed to docker compose on the target VM.

**Required:**

- `OPENCLAW_GATEWAY_TOKEN` - Authentication token for the gateway API. Generate with `openssl rand -hex 32`. Secures communication between clients and the gateway.
- `DISCORD_BOT_TOKEN` - Discord bot token required by the current deployment workflow and deploy script for the bot runtime.
- `ANTHROPIC_API_KEY` - Anthropic API key required by the current deployment workflow and deploy script for real deploys.

**Optional (integrations):**

- `OPENAI_API_KEY` - OpenAI-backed models, tools, and embeddings
- `MONGODB_URI` - memory-mongodb connection URI
- `GEMINI_API_KEY` - Gemini embeddings / Google provider access
- `BRAVE_API_KEY` - Brave web search access
- `FIRECRAWL_API_KEY` - Firecrawl access
- `TRELLO_API_KEY` - Trello API key for Trello integration features
- `TRELLO_TOKEN` - Trello token for Trello integration features
- `GOOGLE_WORKSPACE_CLI_TOKEN` - optional bearer token for `gws-toolkit-phase1` token mode
- `GWS_CREDENTIALS` - optional Google Workspace credentials JSON for `gws-toolkit-phase1` `credentials_file` mode (Headless OAuth2 export or service-account JSON)

Trello secrets are optional and only needed when Trello integration is enabled. Staging currently uses `gws-toolkit-phase1` in `credentials_file` mode, so `GWS_CREDENTIALS` is the active path and `GOOGLE_WORKSPACE_CLI_TOKEN` can remain unset. Route-level service-account impersonation is configured through plugin route fields (`impersonatedUser` or `impersonatedUserEnvVar`), not through token mode.

### Monitoring Secrets

These values are used to render `/opt/DAISy/monitoring/.env.monitoring` on the VM:

- `GRAFANA_ADMIN_PASSWORD` - required to generate `.env.monitoring`
- `DISCORD_ALERTS_WEBHOOK_URL` - sensitive Discord webhook for Alertmanager notifications
- `ALERT_SMTP_USERNAME` - SMTP auth username
- `ALERT_SMTP_PASSWORD` - SMTP auth password

`DISCORD_ALERTS_WEBHOOK_URL` must be stored as an environment secret, not an Actions variable, because GitHub prints variables verbatim in workflow logs.

### Environment Variables

Use Actions **variables** only for non-sensitive deployment settings:

- `OPENCLAW_GATEWAY_PORT`
- `OPENCLAW_BRIDGE_PORT`
- `OPENCLAW_GATEWAY_BIND`
- `OPENCLAW_CONFIG_FILE`
- `VERIFY_GCE_CONTAINER`
- `VERIFY_HEALTH_TIMEOUT`
- `ALERT_EMAIL_TO`
- `ALERT_SMTP_HOST`
- `ALERT_SMTP_PORT`
- `ALERT_SMTP_FROM`
- `STAGING_DEPLOY_DRY_RUN` (repo variable consumed by the staging auto-deploy workflow)

References:

- google-github-actions/auth (WIF setup and examples):
  <https://github.com/google-github-actions/auth>
- Keyless auth overview (GCP blog):
  <https://cloud.google.com/blog/products/identity-security/enabling-keyless-authentication-from-github-actions>

---

## Workflows overview

- Dry run resolves the image ref, validates GHCR auth and image readability on the GitHub Actions runner, then exits without remote mutation.
- Real deploy connects via IAP, sets `OPENCLAW_IMAGE` to the resolved ref, runs `docker compose pull`, then `docker compose up -d --remove-orphans`.
- The deploy fails if Docker is missing or `docker-compose.yml` is not found under `DEPLOY_DIR`.

### Docker release

Builds and publishes the multi-arch image, then uploads an artifact:

- `build-amd64`, `build-arm64`, `build-sandbox`, and `build-sandbox-browser` run on dedicated self-hosted GCP runner pools
- `create-manifest` stays on `ubuntu-latest` in phase one so manifest publication and `release-metadata` generation remain GitHub-hosted
- Artifact name: `release-metadata`
- File: `dist/release/release-metadata.json`
- Contains: image name, canonical tags, and digest when present

Deployments should reference a specific `release_run_id` so the deploy is deterministic and rollbackable.

Self-hosted build runners are pre-provisioned infrastructure and are not reused
from the staging or production deploy VM. See
[`docs/deployments/docker-release-runners.md`](./deployments/docker-release-runners.md)
for runner labels, trust boundaries, and rollout requirements.

### Deploy

Manual dispatch and reusable workflow call.

Inputs:

- `environment`: `staging` | `production`
- `release_run_id`: the Docker release run id that uploaded `release-metadata`
- optional `image_ref`: emergency override (tag or digest ref)
- `dry_run`: if true, skips remote mutation, but still validates GHCR credentials and image readability on the GitHub Actions runner
- `provision`: if true, provisions the VM before deploying (see below)

#### VM Provisioning

When `provision: true`, the deploy workflow will:

1. Create the deploy directory (`DEPLOY_DIR`, default `/opt/DAISy`)
2. Copy `docker-compose.yml` from the repository to the VM
3. Create `config/` and `workspace/` subdirectories

Use provisioning when:

- Setting up a new VM for the first time
- The VM's `docker-compose.yml` is missing or needs to be reset to the repo version

Subsequent deploys should use `provision: false` (the default) since the directory structure already exists.

### Promote to production

Manual dispatch only; routes through `Deploy` with `environment=production`, which triggers the environment approval gate.

### Staging auto-deploy dry run toggle

The `deploy-staging-on-release` workflow reads a repo variable named `STAGING_DEPLOY_DRY_RUN`. Set it to `true` to keep staging in dry-run mode, or `false` to allow real deployments without editing the workflow file.

### Verify

Runs post-deploy smoke checks against the target VM. On the GCE Docker path it verifies the gateway container is running, becomes healthy, matches the requested image ref when provided, and that the manifest-defined runtime binaries are present in the live gateway container. When sandboxing is enabled in the deployed config, Verify also smoke-tests the same manifest-defined binaries in the configured sandbox image before continuing and fails if that image does not expose the `gws` CLI on `PATH`. It also checks that the bundled mongodb-mcp-server CLI starts inside the live container without the known Node 22 translator crash signatures. For staging, Verify also checks the active `gws-toolkit-phase1` credentials-file path on the VM and runs route-bound `gws auth status` inside the live gateway container (including impersonation env projection when configured), failing if the deployed credential reports an invalid token or any `token_error`. It also requires `monitoring-alertmanager-1` to be healthy when `.env.monitoring` is present. When `agents.defaults.sandbox.browser.enabled=true`, Verify also fails if the resolved sandbox browser image is missing on the VM. Prefer running Verify after staging deploy and after production promote.

---

## Operator notes

### How to find `release_run_id`

1. GitHub → Actions
2. Open the **Docker release** workflow
3. Click the run you want
4. Copy the numeric run id from the URL: `/actions/runs/<RUN_ID>`

### How to SSH to the VM via IAP (operator workstation)

```bash
gcloud compute ssh "$GCE_INSTANCE_NAME"   --project "$GCP_PROJECT_ID"   --zone "$GCP_ZONE"   --tunnel-through-iap
```

---

## Deploy behavior on the VM (expected)

On a real deploy (dry_run=false), the deploy routine:

1. Connects to the VM via IAP (`gcloud compute ssh --tunnel-through-iap`)
2. Clears any stale root GHCR auth on the VM, then authenticates to GHCR:
   - `docker logout ghcr.io || true`
   - `docker login ghcr.io -u $GHCR_USERNAME --password-stdin`
3. Pulls the resolved app image ref explicitly so GHCR auth and package access fail early with a classified error.
4. Reads the selected deployed config and, when `agents.defaults.sandbox.browser.enabled=true`, pulls `ghcr.io/<owner>/daisy-agency-sandbox-browser:bookworm-slim` and retags it locally as `openclaw-sandbox-browser:bookworm-slim`
5. Sets the image ref via environment variable:
   - `export OPENCLAW_IMAGE=<image@digest-or-tag>`
6. Pulls the app and compose-managed images:
   - `docker-compose pull`
7. Applies:
   - `docker-compose up -d --remove-orphans`
8. Waits for `openclaw-gateway` to become healthy, then silently refreshes recent routed chat sessions by issuing `sessions.reset` through the live Gateway for the most recent `direct`/`group` session keys from `openclaw sessions --all-agents --active <minutes> --json`
   - Defaults: last `1440` minutes, cap `10` sessions, `180s` health wait
   - Tunables: `POST_DEPLOY_SESSION_REFRESH_ACTIVE_MINUTES`, `POST_DEPLOY_SESSION_REFRESH_MAX_SESSIONS`, `POST_DEPLOY_SESSION_REFRESH_HEALTH_TIMEOUT_SECONDS`
   - Silent means no outbound chat message is sent; it refreshes persisted session state without spamming channels
9. Outputs deployment status

Current `daisy/dev` deployments resolve by tag because the release metadata artifact currently emits an empty digest. Expect refs such as `ghcr.io/hughdidit/daisy-agency:dev-<sha7>` until digest population is restored.

---

## Rollback

Rollback is “deploy a previous artifact”:

1. Identify a prior successful Docker release run id
2. Run `Deploy` for the target environment with that `release_run_id`
3. Approve if production
4. Verify

Because deploy uses `release-metadata`, rollback is deterministic.

---

## Troubleshooting

### Deploy cannot download `release-metadata`

- Verify `release_run_id` is from the **Docker release** workflow run (not CI/Deploy).
- Confirm that run uploaded `release-metadata` artifact.

### IAP tunnel errors

- Ensure IAP TCP forwarding is enabled and IAM grants include IAP tunnel access.
- Reference IAP TCP forwarding docs:
  <https://docs.cloud.google.com/iap/docs/using-tcp-forwarding>

### Permission/approval confusion

- Ensure deploy jobs reference `environment: staging|production` so GitHub Environments apply.
- Environment secrets are unavailable until approval (production).
