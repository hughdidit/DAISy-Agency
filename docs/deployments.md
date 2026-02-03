# Deployments

This repository uses GitHub Actions environments to gate deployments to staging and production. The deploy workflow is a minimal stub that validates inputs and prints intent until real infrastructure wiring is added.

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

## Manual deploy workflow

Run the Deploy workflow from GitHub Actions using workflow dispatch inputs:

- environment: staging or production
- release_run_id: docker-release workflow run ID to deploy (from Actions UI)
- image_ref: optional override for a full image ref (tag or digest)
- dry_run: true keeps the deploy as a no-op

The workflow downloads the release metadata artifact from the selected docker-release run and passes it into scripts/deploy.sh.

## Deploy script behavior

- Dry run exits successfully after printing the resolved image reference.
- Real deploy validates environment secrets and exits with a TODO message until the deploy implementation is added.

## Operator notes

### How to find release_run_id

1. Go to GitHub → Actions.
2. Open the Docker release workflow.
3. Click the specific run you want to deploy.
4. Copy the run id from the URL.

The URL contains `/actions/runs/<RUN_ID>`.

Example: `.../actions/runs/1234567890` → `release_run_id=1234567890`.

### How Patchbot promotes a release

#### Staging

When a Docker release run completes successfully, Deploy staging on release triggers automatically.

It deploys the exact artifact from that Docker release run (`release-metadata` → digest/tag).

After deploy, run Verify for staging (or confirm the pipeline ran it automatically, depending on configuration).

#### Production

Production is never automatic.

Run Promote to Production manually:

- input `release_run_id` from the Docker release run you intend to ship
- (optional) `image_ref` override only for emergencies

GitHub will pause at the production environment approval gate (required reviewers).

After approval, deployment proceeds and then Verify runs for production (if configured).

### Troubleshooting: “release-metadata not found”

If deploy fails to download `release-metadata`:

- Confirm the `release_run_id` is from the Docker release workflow (not CI or Deploy).
- Confirm that run uploaded an artifact named `release-metadata`.
- Re-run the Docker release workflow if needed, then retry deploy with the new run id.
