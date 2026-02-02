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
python3 - "${META_PATH}" "${FIELD}" <<'PY'
import json
import sys

path = sys.argv[1]
field = sys.argv[2]

try:
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
except json.JSONDecodeError as exc:
    print(f"Failed to parse JSON from {path}: {exc}", file=sys.stderr)
    sys.exit(3)

if field == "tags":
    raw_tags = data.get("tags")
    tags = raw_tags if isinstance(raw_tags, list) else []
    print(" ".join(str(tag) for tag in tags))
elif field == "first_tag":
    raw_tags = data.get("tags")
    tags = raw_tags if isinstance(raw_tags, list) else []
    print(tags[0] if tags else "")
else:
    print(data.get(field, ""))
PY
