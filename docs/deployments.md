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
