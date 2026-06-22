#!/usr/bin/env sh
set -eu

workspace="${1:-${KODY_WORKSPACE:-$(pwd)}}"

case "$workspace" in
  /*) ;;
  *) workspace="$(cd "$workspace" && pwd -P)" ;;
esac

tool_prefix="${KODY_CODEX_TOOL_PREFIX:-$workspace/.kody-tools}"

case "$tool_prefix" in
  "$workspace"/*) ;;
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
