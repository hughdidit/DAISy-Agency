#!/usr/bin/env bash
set -euo pipefail

META_PATH="${1:?metadata path required}"
FIELD="${2:?field required}"

python3 - <<'PY'
import json
import sys

meta_path = sys.argv[1]
field = sys.argv[2]

with open(meta_path, "r", encoding="utf-8") as f:
    data = json.load(f)

if field == "image":
    print(data.get("image") or "")
elif field == "digest":
    print(data.get("digest") or "")
elif field == "tags":
    raw = data.get("tags")
    tags = raw if isinstance(raw, list) else []
    print(" ".join(str(t) for t in tags))
elif field == "first_tag":
    raw = data.get("tags")
    tags = raw if isinstance(raw, list) else []
    print(tags[0] if tags else "")
else:
    raise SystemExit(f"Unknown field: {field}")
PY "$META_PATH" "$FIELD"
