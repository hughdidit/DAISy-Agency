#!/usr/bin/env bash
set -euo pipefail

# Deploy script for DAISy staging/production
# Uses gcloud compute ssh with IAP tunneling for secure access
# Usage: deploy.sh [--resolve-only] <metadata-path>

if [[ "${1:-}" == "--resolve-only" ]]; then
  META_PATH="${2:?metadata path required}"
  RESOLVE_ONLY="true"
else
  META_PATH="${1:?metadata path required}"
  RESOLVE_ONLY="false"
fi

chmod +x scripts/read-release-metadata.sh

IMAGE="$(scripts/read-release-metadata.sh "$META_PATH" image)"
DIGEST="$(scripts/read-release-metadata.sh "$META_PATH" digest)"
FIRST_TAG="$(scripts/read-release-metadata.sh "$META_PATH" first_tag)"

if [[ -z "${IMAGE//[[:space:]]/}" ]]; then
  echo "ERROR: release metadata missing required field: image" >&2
  exit 3
fi

if [[ -n "${IMAGE_REF_OVERRIDE:-}" ]]; then
  RESOLVED_REF="${IMAGE_REF_OVERRIDE}"
elif [[ -n "${DIGEST}" ]]; then
  RESOLVED_REF="${IMAGE}@${DIGEST}"
elif [[ -n "${FIRST_TAG}" ]]; then
  RESOLVED_REF="${IMAGE}:${FIRST_TAG}"
else
  echo "ERROR: No image reference available (no override, no digest, no tags)." >&2
  exit 3
fi

if [[ "${RESOLVE_ONLY}" == "true" ]]; then
  echo "${RESOLVED_REF}"
  exit 0
fi

echo "DEPLOY_ENV: ${DEPLOY_ENV:-<unset>}"
echo "DRY_RUN:    ${DRY_RUN:-<unset>}"
echo "DEPLOY_REF: ${RESOLVED_REF}"

if [[ "${DRY_RUN:-true}" == "true" ]]; then
  echo "Dry-run enabled: no deployment performed."
  exit 0
fi

# Validate required environment variables for IAP deploy
: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required for real deploy}"
: "${GCP_ZONE:?GCP_ZONE is required for real deploy}"
: "${GCE_INSTANCE_NAME:?GCE_INSTANCE_NAME is required for real deploy}"
: "${GHCR_USERNAME:?GHCR_USERNAME is required for real deploy}"
: "${GHCR_TOKEN:?GHCR_TOKEN is required for real deploy}"

DEPLOY_DIR="${DEPLOY_DIR:-/opt/DAISy}"

echo "Deploying to ${GCE_INSTANCE_NAME} via IAP (dir: ${DEPLOY_DIR})..."

# Build the remote script as a variable (avoids heredoc/pipe conflict)
# shellcheck disable=SC2016
REMOTE_SCRIPT='
set -euo pipefail

DEPLOY_REF="$1"
DEPLOY_DIR="$2"
GHCR_USERNAME="$3"

# Read GHCR token from stdin (passed by outer script)
read -r GHCR_TOKEN

echo "Deploy ref: ${DEPLOY_REF}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required on the target host." >&2
  exit 127
fi

if [[ ! -f "${DEPLOY_DIR}/docker-compose.yml" ]]; then
  echo "ERROR: docker-compose.yml not found at ${DEPLOY_DIR}." >&2
  exit 6
fi

cd "${DEPLOY_DIR}"

# Authenticate to GHCR (token read from stdin)
docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin <<<"${GHCR_TOKEN}"

# Pull and deploy (using CLAWDBOT_IMAGE which matches docker-compose.yml)
export CLAWDBOT_IMAGE="${DEPLOY_REF}"
docker compose pull
docker compose up -d --remove-orphans
echo "Deployment complete."
'

# Use gcloud compute ssh with IAP tunneling (enforces IAM before connection)
# Pass GHCR_TOKEN via stdin; script passed as bash -c argument to avoid stdin conflict
printf '%s\n' "${GHCR_TOKEN}" | gcloud compute ssh "${GCE_INSTANCE_NAME}" \
  --project "${GCP_PROJECT_ID}" \
  --zone "${GCP_ZONE}" \
  --tunnel-through-iap \
  --command "bash -c '${REMOTE_SCRIPT}' -- '${RESOLVED_REF}' '${DEPLOY_DIR}' '${GHCR_USERNAME}'"
