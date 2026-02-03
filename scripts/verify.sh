#!/usr/bin/env bash
set -euo pipefail

VERIFY_ENV="${VERIFY_ENV:-}"
DEPLOYED_REF="${DEPLOYED_REF:-}"

if [[ -z "${VERIFY_ENV}" || -z "${DEPLOYED_REF}" ]]; then
  echo "ERROR: VERIFY_ENV and DEPLOYED_REF are required." >&2
  exit 2
fi

echo "=== Patchbot Verify ==="
echo "VERIFY_ENV:  ${VERIFY_ENV}"
echo "DEPLOYED_REF: ${DEPLOYED_REF}"
echo "DRY_RUN:     ${DRY_RUN:-<unset>}"

if [[ "${DRY_RUN:-true}" == "true" ]]; then
  echo "Dry-run enabled: no verification performed."
  exit 0
fi

echo "Verification is not implemented yet."
echo "TODO: add environment-specific smoke checks for ${VERIFY_ENV}."
