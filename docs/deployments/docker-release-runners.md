# Docker Release Self-Hosted Runners

This runbook covers the dedicated GCP self-hosted runner pools used by
`.github/workflows/docker-release.yml`.

Scope of this runbook:

- `build-amd64`
- `build-arm64`
- `build-sandbox`
- `build-sandbox-browser`

Out of scope:

- `create-manifest`
- `deploy.yml`
- `verify.yml`
- provisioning the runner VMs from this repository

## Phase-one model

DAISy uses a split release model:

- Heavy image builds run on dedicated self-hosted GCP runner pools
- Manifest creation and `release-metadata` upload stay on GitHub-hosted runners
- Deploy and verify stay on GitHub-hosted runners with environment protection

This keeps release orchestration compatible with the existing deploy contract
while avoiding QEMU for `arm64` builds.

## Required runner labels

The Docker Release workflow expects these exact labels to exist before merge:

- amd64 pool: `self-hosted`, `linux`, `x64`, `docker-release`, `docker-release-amd64`
- arm64 pool: `self-hosted`, `linux`, `arm64`, `docker-release`, `docker-release-arm64`

Recommended pool names:

- `docker-release-amd64`
- `docker-release-arm64`

Recommended job mapping:

- `build-amd64` -> amd64 pool
- `build-sandbox` -> amd64 pool
- `build-sandbox-browser` -> amd64 pool
- `build-arm64` -> arm64 pool

## Host and lifecycle requirements

- Runner hosts must be dedicated GCP VMs, not local workstations.
- The staging or production deploy VM must never be registered as a runner.
- Target model: runners are ephemeral, with one runner instance serving one job before deregistration and teardown.
- Phase one may use dedicated persistent GCP runner VMs only if they provide equivalent isolation between jobs.
- Before a persistent runner accepts another job, it must fully reset runner state and discard local Docker state, Buildx state, workspace contents, temp files, and any residual credentials from the previous job.
- Whether the host is destroyed or reused, no job may inherit credentials, filesystem contents, container state, caches, or other mutable state from a previous job unless that state is intentionally managed and documented for the runner pool.

Recommended host shape:

- amd64 pool: GCE x86 VM sized for Docker Buildx workloads with fast scratch disk
- arm64 pool: native GCE `arm64` VM such as Tau T2A or equivalent

## GitHub access and trust boundary

Runner group guidance:

- Restrict the runner group to this repository
- Reserve the group for Docker Release build jobs only
- Do not expose these labels to general CI by default

Credential and permission rules:

- Build jobs may use the workflow `GITHUB_TOKEN` for GHCR package push
- Build jobs must not receive deploy environment secrets
- Production approval gates must remain attached to deploy and promote workflows only
- `release-metadata` remains generated on the GitHub-hosted `create-manifest` job

Trust boundary:

- Self-hosted build runners may build and publish release images
- Self-hosted build runners may not deploy those images
- GitHub-hosted deploy and verify jobs may pull and validate release artifacts

## Network and bootstrap hardening

- Restrict egress to GitHub, GHCR, Docker Hub (`docker.io` and its backing registry endpoints for public base-image pulls), and required OS package/bootstrap endpoints
- Limit SSH to administrators, or disable routine SSH access entirely
- Use trusted base images or startup scripts only
- Prefer short-lived registration and teardown over long-lived pets
- Send runner lifecycle logs to a centralized GCP sink for incident review

## Caching

Phase one keeps the existing registry-backed cache strategy:

- app amd64 cache: `ghcr.io/<owner>/daisy-agency-cache:amd64`
- app arm64 cache: `ghcr.io/<owner>/daisy-agency-cache:arm64`
- sandbox amd64 cache: `ghcr.io/<owner>/daisy-agency-sandbox-cache:amd64`
- sandbox browser amd64 cache: `ghcr.io/<owner>/daisy-agency-sandbox-browser-cache:amd64`

Do not make persistent local disk cache a rollout dependency. Add local cache
only after measured evidence shows the registry cache is insufficient.

## Rollout checklist

Before merge:

- Create both runner pools and attach the expected labels
- Confirm the deploy VM is not registered as a runner
- Confirm Docker Release runner groups are restricted to this repository
- Confirm a native `arm64` runner is available for `build-arm64`

After merge:

- Trigger Docker Release either via `workflow_dispatch` on the merged ref or by merging a change that matches the release path filters
- Confirm each build job lands on the intended runner pool
- Confirm `build-arm64` runs without QEMU and still publishes to GHCR
- Confirm `create-manifest` stays on `ubuntu-latest`
- Confirm `release-metadata` is still uploaded and deployable by `release_run_id`

Acceptance targets:

- amd64 build wall clock improves relative to the GitHub-hosted baseline
- arm64 build wall clock improves relative to the previous QEMU lane
- total Docker Release wall clock improves on comparable commits
- failed or successful jobs leave no stale registered runner past the cleanup threshold

## Rollback

If the self-hosted pools are unhealthy:

1. Stop merging Docker Release workflow changes until the pools are repaired
2. Fix runner registration, labeling, teardown, or GHCR reachability out of band
3. Re-run Docker Release and confirm `release-metadata` is still produced

This repository does not ship automated GCP provisioning for the runner VMs in
phase one. Infrastructure lifecycle is managed out of band by operators.
