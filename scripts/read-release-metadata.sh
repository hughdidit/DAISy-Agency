#!/usr/bin/env bash
set -euo pipefail

META_PATH="${1:-}"
FIELD="${2:-}"

if [[ -z "${META_PATH}" || -z "${FIELD}" || ! -f "${META_PATH}" ]]; then
  echo "Usage: $0 <path-to-release-metadata.json> <field>" >&2
  exit 2
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required but not installed or not in PATH." >&2
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
    print(tags[0] if tags else "")
else:
    print(data.get(field, ""))
PY
