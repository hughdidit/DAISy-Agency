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
- Deployment directory on VM: `DEPLOY_TARGET_DIR` (recommended: `/opt/moltbot`)
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

#### Secrets format

- `DEPLOY_TARGET`: SSH target for the GCP VM (for example, `DAISy@203.0.113.10`).
- `DEPLOY_TOKEN`: SSH private key (raw PEM or base64-encoded).

Optional environment overrides:

- `DEPLOY_DIR`: directory on the VM containing `docker-compose.yml` (defaults to `/opt/DAISy`).

## Deploy workflow

## Secrets (IAP-only + Workload Identity Federation)

### Required (both staging and production)
These are **environment secrets** (set separately under `staging` and `production` environments).

**GCP auth via Workload Identity Federation (no JSON keys):**
- `GCP_WORKLOAD_IDENTITY_PROVIDER`  
  Resource name of your WIF provider (e.g. `projects/…/locations/global/workloadIdentityPools/…/providers/…`)
- `GCP_SERVICE_ACCOUNT`  
  Service account email to impersonate (e.g. `deploy-bot@project.iam.gserviceaccount.com`)

**GCP auth via JSON service account key (required by deploy workflow):**
- `GCP_CREDENTIALS`  
  JSON service account key (stored as a secret string).
- `GCP_PROJECT_ID`  
  GCP project id hosting the deployment VM.

**Target VM identity:**
- `GCP_PROJECT_ID`
- `GCP_ZONE`
- `GCE_INSTANCE_NAME`

**VM deploy layout:**
- `DEPLOY_TARGET_DIR` (e.g. `/opt/moltbot`)
- `PERSIST_STATE_DIR` (must be `/var/lib/clawdbot`)

**Registry pull (GHCR):**
- `GHCR_IMAGE` (e.g. `ghcr.io/<owner>/<repo>`)
- `GHCR_USERNAME`
- `GHCR_TOKEN` (recommend: `packages:read` only)

References:
- google-github-actions/auth (WIF setup and examples):
  https://github.com/google-github-actions/auth
- Keyless auth overview (GCP blog):
  https://cloud.google.com/blog/products/identity-security/enabling-keyless-authentication-from-github-actions

---

## Workflows overview
- Dry run exits successfully after printing the resolved image reference.
- Real deploy SSHes to the target VM, sets `DAISy_IMAGE` to the resolved ref, runs `docker compose pull`, then `docker compose up -d --remove-orphans`.
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

On a real deploy (dry_run=false), the deploy routine should:

1. Ensure directories exist:
   - `$DEPLOY_TARGET_DIR`
   - `$PERSIST_STATE_DIR` (must be `/var/lib/clawdbot`)
2. Authenticate to GHCR (read-only):
   - `docker login ghcr.io`
3. Pin the exact image ref (digest preferred) into compose/env:
   - e.g. write an override file or `.env` with `DAISY_IMAGE=<image@digest>`
4. Apply:
   - `docker compose pull`
   - `docker compose up -d`
5. Basic verification:
   - `docker ps` shows expected containers healthy/running
   - application-level health check (if available)

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
