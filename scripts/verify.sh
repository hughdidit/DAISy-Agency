#!/usr/bin/env bash
set -euo pipefail

echo "Verifying environment..."
echo "DEPLOYED_REF: ${DEPLOYED_REF:-<unset>}"
# TODO: add real health checks / smoke tests
exit 0
