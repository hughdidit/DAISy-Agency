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
  https://docs.cloud.google.com/compute/docs/connect/ssh-using-iap
- Using IAP TCP forwarding:
  https://docs.cloud.google.com/iap/docs/using-tcp-forwarding

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
  https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment
- Secrets and environment approvals:
  https://docs.github.com/en/actions/concepts/security/secrets

---

## Secrets (IAP-only + Workload Identity Federation)

### Required (both staging and production)
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
- `GHCR_USERNAME` - GitHub username for GHCR
- `GHCR_TOKEN` - PAT with `read:packages` scope

Note: Image reference comes from `release-metadata.json`, not a separate secret.

References:
- google-github-actions/auth (WIF setup and examples):
  https://github.com/google-github-actions/auth
- Keyless auth overview (GCP blog):
  https://cloud.google.com/blog/products/identity-security/enabling-keyless-authentication-from-github-actions

---

## Workflows overview
- Dry run exits successfully after printing the resolved image reference.
- Real deploy connects via IAP, sets `CLAWDBOT_IMAGE` to the resolved ref, runs `docker compose pull`, then `docker compose up -d --remove-orphans`.
- The deploy fails if Docker is missing or `docker-compose.yml` is not found under `DEPLOY_DIR`.

### Docker release
Builds and publishes the multi-arch image, then uploads an artifact:

- Artifact name: `release-metadata`
- File: `dist/release/release-metadata.json`
- Contains: image name, canonical tags, digest (preferred), sha/ref, run id

Deployments should reference a specific `release_run_id` so the deploy is deterministic and rollbackable.

### Deploy
Manual dispatch and reusable workflow call.

Inputs:
- `environment`: `staging` | `production`
- `release_run_id`: the Docker release run id that uploaded `release-metadata`
- optional `image_ref`: emergency override (tag or digest ref)
- `dry_run`: if true, does not perform remote changes

### Promote to production
Manual dispatch only; routes through `Deploy` with `environment=production`, which triggers the environment approval gate.

### Staging auto-deploy dry run toggle
The `deploy-staging-on-release` workflow reads a repo variable named `STAGING_DEPLOY_DRY_RUN`. Set it to `true` to keep staging in dry-run mode, or `false` to allow real deployments without editing the workflow file.

### Verify
Smoke-check workflow (may be a stub initially). Prefer running Verify after staging deploy and after production promote.

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
2. Authenticates to GHCR:
   - `docker login ghcr.io -u $GHCR_USERNAME --password-stdin`
3. Sets the image ref (digest preferred) via environment variable:
   - `export CLAWDBOT_IMAGE=<image@digest>`
4. Applies:
   - `docker compose pull`
   - `docker compose up -d --remove-orphans`
5. Outputs deployment status

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
  https://docs.cloud.google.com/iap/docs/using-tcp-forwarding

### Permission/approval confusion
- Ensure deploy jobs reference `environment: staging|production` so GitHub Environments apply.
- Environment secrets are unavailable until approval (production).
