#!/usr/bin/env bash
set -euo pipefail

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

: "${DEPLOY_TARGET:?DEPLOY_TARGET is required for real deploy}"
: "${DEPLOY_TOKEN:?DEPLOY_TOKEN is required for real deploy}"

DEPLOY_DIR="${DEPLOY_DIR:-/opt/DAISy}"
SSH_KEY_FILE="$(mktemp)"
KNOWN_HOSTS_FILE="$(mktemp)"

cleanup() {
  rm -f "$SSH_KEY_FILE" "$KNOWN_HOSTS_FILE"
}
trap cleanup EXIT

if [[ "${DEPLOY_TOKEN}" == *"-----BEGIN"* ]]; then
  printf "%s\n" "${DEPLOY_TOKEN}" > "${SSH_KEY_FILE}"
else
  if ! printf "%s" "${DEPLOY_TOKEN}" | base64 --decode > "${SSH_KEY_FILE}" 2>/dev/null; then
    echo "ERROR: DEPLOY_TOKEN must be a valid SSH private key or base64-encoded key." >&2
    exit 4
  fi
fi

chmod 600 "${SSH_KEY_FILE}"

SSH_OPTS=(
  -i "${SSH_KEY_FILE}"
  -o StrictHostKeyChecking=accept-new
  -o UserKnownHostsFile="${KNOWN_HOSTS_FILE}"
)

echo "Deploying to ${DEPLOY_TARGET} (dir: ${DEPLOY_DIR})..."

ssh "${SSH_OPTS[@]}" "${DEPLOY_TARGET}" \
  DEPLOY_REF="${RESOLVED_REF}" \
  DEPLOY_DIR="${DEPLOY_DIR}" \
  bash -se <<'EOF'
set -euo pipefail

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

export DAISy_IMAGE="${DEPLOY_REF}"
docker compose pull DAISy-gateway
docker compose up -d --remove-orphans
docker image inspect "${DEPLOY_REF}" >/dev/null
echo "Deployment complete."
EOF
