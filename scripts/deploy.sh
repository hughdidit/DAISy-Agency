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

# TODO: implement real deployment steps for your infra
echo "Real deploy requested, but deployment is not implemented yet."
exit 1
