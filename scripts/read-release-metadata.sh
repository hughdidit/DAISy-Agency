#!/usr/bin/env bash
set -euo pipefail

META_PATH="${1:-}"
FIELD="${2:-}"

if [[ -z "${META_PATH}" || -z "${FIELD}" || ! -f "${META_PATH}" ]]; then
  echo "Usage: $0 <path-to-release-metadata.json> <field>" >&2
  exit 2
fi

python3 - "${META_PATH}" "${FIELD}" <<'PY'
import json
import sys

path = sys.argv[1]
field = sys.argv[2]

with open(path, "r", encoding="utf-8") as handle:
    data = json.load(handle)

if field == "tags":
    tags = data.get("tags") or []
    print(" ".join(tags))
elif field == "first_tag":
    tags = data.get("tags") or [""]
    print(tags[0])
else:
    print(data.get(field, ""))
PY
