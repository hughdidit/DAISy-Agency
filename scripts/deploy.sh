#!/usr/bin/env bash
set -euo pipefail

echo "=== Patchbot Deploy Stub ==="
echo "DEPLOY_ENV: ${DEPLOY_ENV:-<unset>}"
echo "DEPLOY_REF: ${DEPLOY_REF:-<unset>}"
echo "DRY_RUN:    ${DRY_RUN:-<unset>}"

if [[ "${DRY_RUN:-true}" == "true" ]]; then
  echo "Dry-run enabled: no deployment performed."
  exit 0
fi

: "${DEPLOY_TARGET:?DEPLOY_TARGET is required for real deploy}"
: "${DEPLOY_TOKEN:?DEPLOY_TOKEN is required for real deploy}"

echo "Real deploy requested, but deploy is not implemented yet."
echo "TODO: implement deployment to ${DEPLOY_TARGET} using environment-scoped credentials."
exit 1
