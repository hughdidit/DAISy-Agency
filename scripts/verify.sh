#!/usr/bin/env bash
set -euo pipefail

echo "Environment: ${VERIFY_ENV:-unknown}"
echo "Deployed ref: ${DEPLOYED_REF:-unknown}"

if [[ "${DRY_RUN:-false}" == "true" ]]; then
  echo "DRY_RUN=true; skipping smoke check."
  exit 0
fi

if [[ -z "${SMOKE_URL:-}" ]]; then
  echo "TODO: set SMOKE_URL to the deployed health endpoint."
  echo "Skipping smoke check."
  exit 0
fi

echo "Running smoke check against ${SMOKE_URL}"
curl --fail --show-error --silent "${SMOKE_URL}"
