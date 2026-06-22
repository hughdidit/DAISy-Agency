#!/usr/bin/env sh
set -eu

workspace="${1:-${KODY_WORKSPACE:-}}"
if [ -z "$workspace" ]; then
  workspace="$(pwd)"
fi

case "$workspace" in
  /*) ;;
  *) workspace="$(cd "$workspace" && pwd -P)" ;;
esac
workspace="$(cd "$workspace" && pwd -P)"

raw_tool_prefix="${KODY_CODEX_TOOL_PREFIX:-$workspace/.kody-tools}"

case "$raw_tool_prefix" in
  /*) candidate_tool_prefix="$raw_tool_prefix" ;;
  *) candidate_tool_prefix="$workspace/$raw_tool_prefix" ;;
esac

if [ -e "$candidate_tool_prefix" ]; then
  if [ ! -d "$candidate_tool_prefix" ]; then
    echo "Codex tool prefix exists but is not a directory: $candidate_tool_prefix" >&2
    exit 2
  fi
  tool_prefix="$(cd "$candidate_tool_prefix" && pwd -P)"
else
  candidate_parent="$(dirname "$candidate_tool_prefix")"
  candidate_name="$(basename "$candidate_tool_prefix")"
  if [ ! -d "$candidate_parent" ]; then
    echo "Codex tool prefix parent does not exist: $candidate_parent" >&2
    exit 2
  fi
  tool_prefix="$(cd "$candidate_parent" && pwd -P)/$candidate_name"
fi

case "$tool_prefix" in
  "$workspace" | "$workspace"/*) ;;
  *)
    echo "Refusing to install outside Kody workspace: $tool_prefix" >&2
    exit 2
    ;;
esac

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required inside Kody's sandbox to install @openai/codex." >&2
  exit 3
fi

mkdir -p "$tool_prefix"
npm install --global --prefix "$tool_prefix" @openai/codex

codex_bin="$tool_prefix/bin/codex"
if [ ! -x "$codex_bin" ]; then
  echo "Codex binary was not installed at expected path: $codex_bin" >&2
  exit 4
fi

cat > "$tool_prefix/codex-env.sh" <<EOF
export KODY_CODEX_TOOL_PREFIX="$tool_prefix"
export PATH="$tool_prefix/bin:\$PATH"
EOF

"$codex_bin" --version
echo "Codex CLI installed for Kody workspace only: $codex_bin"
