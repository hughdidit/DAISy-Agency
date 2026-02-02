#!/usr/bin/env bash
set -euo pipefail

META_PATH="${1:-}"
if [[ -z "${META_PATH}" || ! -f "${META_PATH}" ]]; then
  echo "Usage: $0 <path-to-release-metadata.json>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
READ_META="${SCRIPT_DIR}/read-release-metadata.sh"
if [[ ! -f "${READ_META}" ]]; then
  echo "Missing helper script: ${READ_META}" >&2
  exit 2
fi

IMAGE="$("${READ_META}" "${META_PATH}" image)"
if [[ -z "${IMAGE}" ]]; then
  echo "ERROR: Release metadata is missing required 'image' field." >&2
  exit 3
fi
DIGEST="$("${READ_META}" "${META_PATH}" digest)"
FIRST_TAG="$("${READ_META}" "${META_PATH}" first_tag)"
if [[ -z "${IMAGE}" ]]; then
  echo "ERROR: release metadata is missing required field: image" >&2
  exit 3
fi

RESOLVED_REF=""
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

echo "=== Patchbot Deploy ==="
echo "DEPLOY_ENV: ${DEPLOY_ENV:-<unset>}"
echo "DRY_RUN:    ${DRY_RUN:-<unset>}"
echo "IMAGE:      ${IMAGE}"
echo "DIGEST:     ${DIGEST:-<none>}"
echo "DEPLOY_REF: ${RESOLVED_REF}"

if [[ "${DRY_RUN:-true}" == "true" ]]; then
  echo "Dry-run enabled: no deployment performed."
  exit 0
fi

: "${DEPLOY_TARGET:?DEPLOY_TARGET is required for real deploy}"
: "${DEPLOY_TOKEN:?DEPLOY_TOKEN is required for real deploy}"

echo "Real deploy requested, but deploy is not implemented yet."
echo "TODO: deploy ${RESOLVED_REF} to ${DEPLOY_TARGET} using environment-scoped credentials."
exit 1
