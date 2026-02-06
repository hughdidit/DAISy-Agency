#!/usr/bin/env bash
set -euo pipefail

# Deploy script for DAISy staging/production
# Uses gcloud compute ssh with IAP tunneling for secure access
# Usage: deploy.sh [--resolve-only] [--provision] <metadata-path>

RESOLVE_ONLY="false"
PROVISION="false"

while [[ "${1:-}" == --* ]]; do
  case "${1}" in
    --resolve-only)
      RESOLVE_ONLY="true"
      shift
      ;;
    --provision)
      PROVISION="true"
      shift
      ;;
    *)
      echo "Unknown option: ${1}" >&2
      exit 1
      ;;
  esac
done

META_PATH="${1:-}"

# If IMAGE_REF_OVERRIDE is set, use it directly without reading metadata
if [[ -n "${IMAGE_REF_OVERRIDE:-}" ]]; then
  RESOLVED_REF="${IMAGE_REF_OVERRIDE}"
else
  # Require metadata path when no override
  if [[ -z "${META_PATH}" ]]; then
    echo "ERROR: metadata path required when IMAGE_REF_OVERRIDE is not set" >&2
    exit 1
  fi

  chmod +x scripts/read-release-metadata.sh

  IMAGE="$(scripts/read-release-metadata.sh "$META_PATH" image)"
  DIGEST="$(scripts/read-release-metadata.sh "$META_PATH" digest)"
  FIRST_TAG="$(scripts/read-release-metadata.sh "$META_PATH" first_tag)"

  if [[ -z "${IMAGE//[[:space:]]/}" ]]; then
    echo "ERROR: release metadata missing required field: image" >&2
    exit 3
  fi

  if [[ -n "${DIGEST}" ]]; then
    RESOLVED_REF="${IMAGE}@${DIGEST}"
  elif [[ -n "${FIRST_TAG}" ]]; then
    RESOLVED_REF="${IMAGE}:${FIRST_TAG}"
  else
    echo "ERROR: No image reference available (no digest, no tags)." >&2
    exit 3
  fi
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

# App secrets (passed to docker compose on the VM)
: "${CLAWDBOT_GATEWAY_TOKEN:?CLAWDBOT_GATEWAY_TOKEN is required for real deploy}"
: "${CLAUDE_AI_SESSION_KEY:?CLAUDE_AI_SESSION_KEY is required for real deploy}"
# CLAUDE_WEB_SESSION_KEY and CLAUDE_WEB_COOKIE are optional (usage monitoring only)
CLAUDE_WEB_SESSION_KEY="${CLAUDE_WEB_SESSION_KEY:-}"
CLAUDE_WEB_COOKIE="${CLAUDE_WEB_COOKIE:-}"

DEPLOY_DIR="${DEPLOY_DIR:-/opt/DAISy}"

echo "Deploying to ${GCE_INSTANCE_NAME} via IAP (dir: ${DEPLOY_DIR})..."
echo "Provision: ${PROVISION}"

# Provision VM if requested (creates directory structure and copies docker-compose.yml)
if [[ "${PROVISION}" == "true" ]]; then
  echo "Provisioning VM..."
  printf -v DEPLOY_DIR_ESCAPED '%q' "${DEPLOY_DIR}"

  # Base64 encode docker-compose.yml to pass as argument (stdin not forwarded by gcloud ssh --command)
  COMPOSE_B64="$(base64 -w0 docker-compose.yml)"

  # Copy docker-compose.yml to VM and set up directory structure
  gcloud compute ssh "${GCE_INSTANCE_NAME}" \
    --project "${GCP_PROJECT_ID}" \
    --zone "${GCP_ZONE}" \
    --tunnel-through-iap \
    --command "bash -c 'set -euo pipefail; DEPLOY_DIR=${DEPLOY_DIR_ESCAPED}; sudo mkdir -p \"\${DEPLOY_DIR}\"; sudo chown \"\$(whoami):\$(whoami)\" \"\${DEPLOY_DIR}\"; echo \"${COMPOSE_B64}\" | base64 -d > \"\${DEPLOY_DIR}/docker-compose.yml\"; mkdir -p \"\${DEPLOY_DIR}/config\" \"\${DEPLOY_DIR}/workspace\"; echo \"Provisioned \${DEPLOY_DIR}\"; ls -la \"\${DEPLOY_DIR}\"'"
  echo "Provisioning complete."
fi

# Build the remote script as a variable (avoids heredoc/pipe conflict)
# shellcheck disable=SC2016
REMOTE_SCRIPT='
set -euo pipefail

DEPLOY_REF="$1"
DEPLOY_DIR="$2"
GHCR_USERNAME="$3"

# Read secrets from stdin (one per line, passed by outer script)
read -r GHCR_TOKEN
read -r CLAWDBOT_GATEWAY_TOKEN
read -r CLAUDE_AI_SESSION_KEY
read -r CLAUDE_WEB_SESSION_KEY
read -r CLAUDE_WEB_COOKIE

echo "Deploy ref: ${DEPLOY_REF}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required on the target host." >&2
  exit 127
fi

# Verify sudo docker access
if ! sudo docker version >/dev/null 2>&1; then
  echo "ERROR: sudo docker access required on the target host." >&2
  exit 127
fi

if [[ ! -f "${DEPLOY_DIR}/docker-compose.yml" ]]; then
  echo "ERROR: docker-compose.yml not found at ${DEPLOY_DIR}." >&2
  exit 6
fi

cd "${DEPLOY_DIR}"

# Authenticate to GHCR (use sudo for docker access)
if ! sudo docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin <<<"${GHCR_TOKEN}"; then
  echo "ERROR: Failed to authenticate to GHCR. Check credentials and network." >&2
  exit 1
fi
unset GHCR_TOKEN

# Export app secrets for docker compose
export CLAWDBOT_IMAGE="${DEPLOY_REF}"
export CLAWDBOT_GATEWAY_TOKEN
export CLAUDE_AI_SESSION_KEY
export CLAUDE_WEB_SESSION_KEY
export CLAUDE_WEB_COOKIE
export CLAWDBOT_CONFIG_DIR="${DEPLOY_DIR}/config"
export CLAWDBOT_WORKSPACE_DIR="${DEPLOY_DIR}/workspace"

# Pull and deploy (use sudo -E to preserve environment variables)
sudo -E docker compose pull
sudo -E docker compose up -d --remove-orphans

# Clear secrets from environment
unset CLAWDBOT_GATEWAY_TOKEN CLAUDE_AI_SESSION_KEY CLAUDE_WEB_SESSION_KEY CLAUDE_WEB_COOKIE

echo "Deployment complete."
'

# Use gcloud compute ssh with IAP tunneling (enforces IAM before connection)
# Pass GHCR_TOKEN via stdin; script passed as bash -c argument to avoid stdin conflict
#
# PR #66 review: escape variables for safe shell interpolation to prevent injection
# The gcloud --command arg is passed to remote shell, so we must escape user-controlled values
printf -v RESOLVED_REF_ESCAPED '%q' "${RESOLVED_REF}"
printf -v DEPLOY_DIR_ESCAPED '%q' "${DEPLOY_DIR}"
printf -v GHCR_USERNAME_ESCAPED '%q' "${GHCR_USERNAME}"

# Pass all secrets via stdin (one per line)
{
  printf '%s\n' "${GHCR_TOKEN}"
  printf '%s\n' "${CLAWDBOT_GATEWAY_TOKEN}"
  printf '%s\n' "${CLAUDE_AI_SESSION_KEY}"
  printf '%s\n' "${CLAUDE_WEB_SESSION_KEY}"
  printf '%s\n' "${CLAUDE_WEB_COOKIE}"
} | gcloud compute ssh "${GCE_INSTANCE_NAME}" \
  --project "${GCP_PROJECT_ID}" \
  --zone "${GCP_ZONE}" \
  --tunnel-through-iap \
  --command "bash -c '${REMOTE_SCRIPT}' -- ${RESOLVED_REF_ESCAPED} ${DEPLOY_DIR_ESCAPED} ${GHCR_USERNAME_ESCAPED}"
