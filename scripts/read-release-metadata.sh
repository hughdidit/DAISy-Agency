#!/usr/bin/env bash
set -euo pipefail

META_PATH="${1:-}"
FIELD="${2:-}"

if [[ -z "${META_PATH}" || -z "${FIELD}" ]]; then
  echo "Usage: $0 <path-to-release-metadata.json> <field>" >&2
  exit 2
fi

if [[ ! -f "${META_PATH}" ]]; then
  echo "Error: metadata file not found: ${META_PATH}" >&2
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed or not in PATH. Please install jq (e.g., via your package manager such as 'apt-get install jq', 'yum install jq', or 'brew install jq')." >&2
  exit 3
fi

jq -r --arg field "${FIELD}" '
  if $field == "tags" then
    (.tags // [] | map(tostring) | join(" "))
  elif $field == "first_tag" then
    ((.tags // [])[0] // "")
  else
    (.[$field] // "")
  end
' "${META_PATH}"
