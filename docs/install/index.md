---
summary: "Install Moltbot (recommended installer, global install, or from source)"
read_when:
  - Installing Moltbot
  - You want to install from GitHub
title: "Install"
---

# Install

Use the installer unless you have a reason not to. It sets up the CLI and runs onboarding.

## Quick install (recommended)

```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash
=======
curl -fsSL https://openclaw.ai/install.sh | bash
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```

Windows (PowerShell):

```powershell
iwr -useb https://molt.bot/install.ps1 | iex
```

Next step (if you skipped onboarding):

```bash
moltbot onboard --install-daemon
```

## System requirements

- **Node >=22**
- macOS, Linux, or Windows via WSL2
- `pnpm` only if you build from source

## Choose your install path

### 1) Installer script (recommended)

Installs `moltbot` globally via npm and runs onboarding.

```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash
=======
curl -fsSL https://openclaw.ai/install.sh | bash
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```

Installer flags:

```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash -s -- --help
=======
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --help
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```

Details: [Installer internals](/install/installer).

Non-interactive (skip onboarding):

```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash -s -- --no-onboard
=======
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```

### 2) Global install (manual)

If you already have Node:

```bash
npm install -g moltbot@latest
```

If you have libvips installed globally (common on macOS via Homebrew) and `sharp` fails to install, force prebuilt binaries:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g moltbot@latest
```

If you see `sharp: Please add node-gyp to your dependencies`, either install build tooling (macOS: Xcode CLT + `npm install -g node-gyp`) or use the `SHARP_IGNORE_GLOBAL_LIBVIPS=1` workaround above to skip the native build.

Or:

```bash
pnpm add -g moltbot@latest
```

Then:

```bash
moltbot onboard --install-daemon
```

### 3) From source (contributors/dev)

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
moltbot onboard --install-daemon
```

Tip: if you don’t have a global install yet, run repo commands via `pnpm moltbot ...`.

### 4) Other install options

- Docker: [Docker](/install/docker)
- Nix: [Nix](/install/nix)
- Ansible: [Ansible](/install/ansible)
- Bun (CLI only): [Bun](/install/bun)

## After install

- Run onboarding: `moltbot onboard --install-daemon`
- Quick check: `moltbot doctor`
- Check gateway health: `moltbot status` + `moltbot health`
- Open the dashboard: `moltbot dashboard`

## Install method: npm vs git (installer)

The installer supports two methods:

- `npm` (default): `npm install -g moltbot@latest`
- `git`: clone/build from GitHub and run from a source checkout

### CLI flags

```bash
# Explicit npm
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method npm

# Install from GitHub (source checkout)
curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method git
=======
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm

# Install from GitHub (source checkout)
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```

Common flags:

- `--install-method npm|git`
- `--git-dir <path>` (default: `~/moltbot`)
- `--no-git-update` (skip `git pull` when using an existing checkout)
- `--no-prompt` (disable prompts; required in CI/automation)
- `--dry-run` (print what would happen; make no changes)
- `--no-onboard` (skip onboarding)

### Environment variables

Equivalent env vars (useful for automation):

- `CLAWDBOT_INSTALL_METHOD=git|npm`
- `CLAWDBOT_GIT_DIR=...`
- `CLAWDBOT_GIT_UPDATE=0|1`
- `CLAWDBOT_NO_PROMPT=1`
- `CLAWDBOT_DRY_RUN=1`
- `CLAWDBOT_NO_ONBOARD=1`
- `SHARP_IGNORE_GLOBAL_LIBVIPS=0|1` (default: `1`; avoids `sharp` building against system libvips)

## Troubleshooting: `moltbot` not found (PATH)

Quick diagnosis:

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

If `$(npm prefix -g)/bin` (macOS/Linux) or `$(npm prefix -g)` (Windows) is **not** present inside `echo "$PATH"`, your shell can’t find global npm binaries (including `moltbot`).

Fix: add it to your shell startup file (zsh: `~/.zshrc`, bash: `~/.bashrc`):

```bash
# macOS / Linux
export PATH="$(npm prefix -g)/bin:$PATH"
```

On Windows, add the output of `npm prefix -g` to your PATH.

Then open a new terminal (or `rehash` in zsh / `hash -r` in bash).

## Update / uninstall

- Updates: [Updating](/install/updating)
- Migrate to a new machine: [Migrating](/install/migrating)
- Uninstall: [Uninstall](/install/uninstall)
