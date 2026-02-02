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
- ref: branch, tag, or SHA to deploy
- dry_run: true keeps the deploy as a no-op

The workflow checks out the selected ref and runs scripts/deploy.sh.

## Deploy script behavior

- Dry run exits successfully after printing the target environment and ref.
- Real deploy validates environment secrets and exits with a TODO message until the deploy implementation is added.
