# Deployments

This repository uses GitHub Actions environments to gate deployments to staging and production. The deploy workflow validates inputs, resolves the exact image ref from release metadata, and prints intent until real infrastructure wiring is added.

## Environment setup

Create the following environments in GitHub settings:

### Staging environment

- Name: staging
- Deployment branches: daisy/dev and daisy/main
- Required reviewers: optional
- Environment secrets:
  - DEPLOY_TARGET
  - DEPLOY_TOKEN

### Production environment

- Name: production
- Deployment branches: daisy/main and optionally tags matching v*
- Required reviewers: required with at least one approver
- Environment secrets:
  - DEPLOY_TARGET
  - DEPLOY_TOKEN

Environment scoped secrets are only available after approvals, which keeps production deploys gated.

#### Secrets format

- `DEPLOY_TARGET`: SSH target for the GCP VM (for example, `DAISy@203.0.113.10`).
- `DEPLOY_TOKEN`: SSH private key (raw PEM or base64-encoded).

Optional environment overrides:

- `DEPLOY_DIR`: directory on the VM containing `docker-compose.yml` (defaults to `/opt/DAISy`).

## Deploy workflow

Deploy can run manually (workflow dispatch) or as a reusable workflow call. Inputs:

- environment: staging or production
- release_run_id: Docker release workflow run ID to deploy (from Actions UI)
- image_ref: optional override for a full image ref (tag or digest)
- dry_run: true keeps the deploy as a no-op

The workflow downloads the release metadata artifact from the selected Docker release run, resolves the immutable image ref, and passes it into `scripts/deploy.sh`.

## Verify workflow

Verify can run manually or as a reusable workflow call. Inputs:

- environment: staging or production
- deployed_ref: optional ref identifier for logging

The default implementation is a stub in `scripts/verify.sh` for now.

## Deploy script behavior

- Dry run exits successfully after printing the resolved image reference.
- Real deploy SSHes to the target VM, sets `DAISy_IMAGE` to the resolved ref, runs `docker compose pull`, then `docker compose up -d --remove-orphans`.
- The deploy fails if Docker is missing or `docker-compose.yml` is not found under `DEPLOY_DIR`.

## Operator notes

### How to find release_run_id

1. Go to GitHub → Actions.
2. Open the Docker Release workflow.
3. Click the specific run you want to deploy.
4. Copy the run id from the URL.

The URL contains `/actions/runs/<RUN_ID>`.

Example: `.../actions/runs/1234567890` → `release_run_id=1234567890`.

### How Patchbot promotes a release

#### Staging

When a Docker release run completes successfully, Deploy staging on release triggers automatically.

It deploys the exact artifact from that Docker release run (`release-metadata` → digest or tag).

After deploy, run Verify for staging or confirm a follow-up workflow handles it.

#### Production

Production is never automatic.

Run Promote to Production manually:

- input `release_run_id` from the Docker release run you intend to ship
- optional `image_ref` override only for emergencies

GitHub will pause at the production environment approval gate.

After approval, deployment proceeds and Verify can run separately.

### Troubleshooting: release-metadata not found

If deploy fails to download `release-metadata`:

- Confirm the `release_run_id` is from the Docker Release workflow (not CI or Deploy).
- Confirm that run uploaded an artifact named `release-metadata`.
- Re-run the Docker Release workflow if needed, then retry deploy with the new run id.
