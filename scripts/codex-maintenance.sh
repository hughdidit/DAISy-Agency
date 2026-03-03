#!/usr/bin/env bash
set -euo pipefail

echo "== Codex Cloud maintenance: refresh deps & generated assets =="

# Run from repo root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Check Node.js version
REQUIRED_NODE_MAJOR=22
NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "Error: Node.js $REQUIRED_NODE_MAJOR+ is required (found $(node -v))."
  exit 1
fi

# Ensure Bun is available
if ! command -v bun >/dev/null 2>&1; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

corepack enable

# Pin pnpm from packageManager (pnpm@X.Y.Z)
PNPM_VERSION=$(node -p "try { require('./package.json').packageManager.split('@')[1] } catch(e) { '10.23.0' }")
corepack prepare "pnpm@${PNPM_VERSION}" --activate

echo "Node: $(node -v)"
echo "pnpm: $(pnpm -v)"
echo "Bun: $(bun -v)"

# Refresh deps (prefer frozen if lockfile exists)
if [ -f pnpm-lock.yaml ]; then
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile || {
    echo "Warning: Lockfile is out of sync. Running full install to update it..."
    pnpm install
  }
else
  pnpm install
fi

# Rebuild project
echo "Rebuilding project..."
pnpm build

echo "== Maintenance complete =="
