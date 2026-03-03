#!/usr/bin/env bash
set -euo pipefail

echo "== Codex Cloud setup: DAISy-Agency =="

# Ensure we're in repo root even if script is run from elsewhere
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
echo "Repo: $(pwd)"

# Check Node.js version
REQUIRED_NODE_MAJOR=22
NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "Error: Node.js $REQUIRED_NODE_MAJOR+ is required (found $(node -v))."
  echo "Please upgrade Node.js before proceeding."
  exit 1
fi

# Install Bun if missing (required for some scripts)
if ! command -v bun >/dev/null 2>&1; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

# Use Corepack + pnpm version pinned by package.json "packageManager"
corepack enable

# Read pnpm version from package.json packageManager (expects pnpm@X.Y.Z)
PNPM_VERSION=$(node -p "try { require('./package.json').packageManager.split('@')[1] } catch(e) { '10.23.0' }")
echo "Using pnpm@$PNPM_VERSION"
corepack prepare "pnpm@${PNPM_VERSION}" --activate

echo "Node: $(node -v)"
echo "pnpm: $(pnpm -v)"
echo "Bun: $(bun -v)"

# Install deps (prefer reproducible installs if lockfile exists)
if [ -f pnpm-lock.yaml ]; then
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile || {
    echo "Warning: Lockfile is out of sync. Running full install to update it..."
    pnpm install
  }
else
  pnpm install
fi

# Build the project (includes A2UI bundle)
echo "Building project..."
pnpm build

echo "== Setup complete =="
