---
summary: "How the installer scripts work (install.sh, install-cli.sh, install.ps1), flags, and automation"
read_when:
<<<<<<< HEAD
  - You want to understand `molt.bot/install.sh`
=======
  - You want to understand `openclaw.ai/install.sh`
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "Installer Internals"
---

# Installer internals

<<<<<<< HEAD
Moltbot ships two installer scripts (served from `molt.bot`):

<<<<<<< HEAD
<<<<<<< HEAD
- `https://molt.bot/install.sh` — “recommended” installer (global npm install by default; can also install from a GitHub checkout)
- `https://molt.bot/install-cli.sh` — non-root-friendly CLI installer (installs into a prefix with its own Node)
 - `https://molt.bot/install.ps1` — Windows PowerShell installer (npm by default; optional git install)
=======
- `https://openclaw.ai/install.sh` — “recommended” installer (global npm install by default; can also install from a GitHub checkout)
- `https://openclaw.ai/install-cli.sh` — non-root-friendly CLI installer (installs into a prefix with its own Node)
- `https://openclaw.ai/install.ps1` — Windows PowerShell installer (npm by default; optional git install)
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
=======
- `https://openclaw.ai/install.sh` - "recommended" installer (global npm install by default; can also install from a GitHub checkout)
- `https://openclaw.ai/install-cli.sh` - non-root-friendly CLI installer (installs into a prefix with its own Node)
- `https://openclaw.ai/install.ps1` - Windows PowerShell installer (npm by default; optional git install)
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))
=======
OpenClaw ships three installer scripts, served from `openclaw.ai`.

<<<<<<< HEAD
| Script                              | Platform             | What it does                                                                                 |
| ----------------------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| [`install.sh`](#install-sh)         | macOS / Linux / WSL  | Installs Node if needed, installs OpenClaw via npm (default) or git, and can run onboarding. |
| [`install-cli.sh`](#install-cli-sh) | macOS / Linux / WSL  | Installs Node + OpenClaw into a local prefix (`~/.openclaw`). No root required.              |
| [`install.ps1`](#install-ps1)       | Windows (PowerShell) | Installs Node if needed, installs OpenClaw via npm (default) or git, and can run onboarding. |
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))
=======
| Script                             | Platform             | What it does                                                                                 |
| ---------------------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | Installs Node if needed, installs OpenClaw via npm (default) or git, and can run onboarding. |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | Installs Node + OpenClaw into a local prefix (`~/.openclaw`). No root required.              |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | Installs Node if needed, installs OpenClaw via npm (default) or git, and can run onboarding. |
>>>>>>> 5163833be (docs: fix markdownlint fragments + headings)

## Quick commands

<<<<<<< HEAD
```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash -s -- --help
=======
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --help
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```
=======
<Tabs>
  <Tab title="install.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --help
    ```

<<<<<<< HEAD
```powershell
& ([scriptblock]::Create((iwr -useb https://molt.bot/install.ps1))) -?
```

<<<<<<< HEAD
If the installer completes but `moltbot` is not found in a new terminal, it’s usually a Node/npm PATH issue. See: [Install](/install#nodejs--npm-path-sanity).
=======
If the installer completes but `openclaw` is not found in a new terminal, it's usually a Node/npm PATH issue. See: [Node.js](/install/node#troubleshooting).
=======
  </Tab>
  <Tab title="install-cli.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --help
    ```
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))

  </Tab>
  <Tab title="install.ps1">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```

    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag beta -NoOnboard -DryRun
    ```

  </Tab>
</Tabs>

<Note>
If install succeeds but `openclaw` is not found in a new terminal, see [Node.js troubleshooting](/install/node#troubleshooting).
</Note>

---

## install.sh

<Tip>
Recommended for most interactive installs on macOS/Linux/WSL.
</Tip>

<<<<<<< HEAD
<<<<<<< HEAD
| Variable                           | Description                                                  |
| ---------------------------------- | ------------------------------------------------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | Install method                                               |
| `OPENCLAW_GIT_DIR=<path>`          | Source checkout location                                     |
| `OPENCLAW_GIT_UPDATE=0\|1`         | Toggle git pull                                              |
| `OPENCLAW_NO_PROMPT=1`             | Disable prompts                                              |
| `OPENCLAW_DRY_RUN=1`               | Dry run mode                                                 |
| `OPENCLAW_NO_ONBOARD=1`            | Skip onboarding                                              |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1` | Avoid `sharp` building against system libvips (default: `1`) |
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))
=======
### Flow
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))
=======
### Flow (install.sh)
>>>>>>> 5163833be (docs: fix markdownlint fragments + headings)

<Steps>
  <Step title="Detect OS">
    Supports macOS and Linux (including WSL). If macOS is detected, installs Homebrew if missing.
  </Step>
  <Step title="Ensure Node.js 22+">
    Checks Node version and installs Node 22 if needed (Homebrew on macOS, NodeSource setup scripts on Linux apt/dnf/yum).
  </Step>
  <Step title="Ensure Git">
    Installs Git if missing.
  </Step>
  <Step title="Install OpenClaw">
    - `npm` method (default): global npm install
    - `git` method: clone/update repo, install deps with pnpm, build, then install wrapper at `~/.local/bin/openclaw`
  </Step>
  <Step title="Post-install tasks">
    - Runs `openclaw doctor --non-interactive` on upgrades and git installs (best effort)
    - Attempts onboarding when appropriate (TTY available, onboarding not disabled, and bootstrap/config checks pass)
    - Defaults `SHARP_IGNORE_GLOBAL_LIBVIPS=1`
  </Step>
</Steps>

### Source checkout detection

<<<<<<< HEAD
- Detect OS (macOS / Linux / WSL).
- Ensure Node.js **22+** (macOS via Homebrew; Linux via NodeSource).
- Choose install method:
  - `npm` (default): `npm install -g moltbot@latest`
  - `git`: clone/build a source checkout and install a wrapper script
<<<<<<< HEAD
- On Linux: avoid global npm permission errors by switching npm’s prefix to `~/.npm-global` when needed.
- If upgrading an existing install: runs `moltbot doctor --non-interactive` (best effort).
- For git installs: runs `moltbot doctor --non-interactive` after install/update (best effort).
=======
- On Linux: avoid global npm permission errors by switching npm's prefix to `~/.npm-global` when needed.
- If upgrading an existing install: runs `openclaw doctor --non-interactive` (best effort).
- For git installs: runs `openclaw doctor --non-interactive` after install/update (best effort).
>>>>>>> 23f0efbf0 (docs: use straight quotes for code terms in installer guide)
- Mitigates `sharp` native install gotchas by defaulting `SHARP_IGNORE_GLOBAL_LIBVIPS=1` (avoids building against system libvips).

<<<<<<< HEAD
If you *want* `sharp` to link against a globally-installed libvips (or you’re debugging), set:
=======
If you _want_ `sharp` to link against a globally-installed libvips (or you're debugging), set:
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

```bash
<<<<<<< HEAD
SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL https://molt.bot/install.sh | bash
=======
SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL https://openclaw.ai/install.sh | bash
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```
=======
If run inside an OpenClaw checkout (`package.json` + `pnpm-workspace.yaml`), the script offers:

- use checkout (`git`), or
- use global install (`npm`)

If no TTY is available and no install method is set, it defaults to `npm` and warns.
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))

The script exits with code `2` for invalid method selection or invalid `--install-method` values.

<<<<<<< HEAD
<<<<<<< HEAD
If you run the installer while **already inside a Moltbot source checkout** (detected via `package.json` + `pnpm-workspace.yaml`), it prompts:
=======
### Examples
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))
=======
### Examples (install.sh)
>>>>>>> 5163833be (docs: fix markdownlint fragments + headings)

<Tabs>
  <Tab title="Default">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```
  </Tab>
  <Tab title="Skip onboarding">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard
    ```
  </Tab>
  <Tab title="Git install">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```
  </Tab>
  <Tab title="Dry run">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run
    ```
  </Tab>
</Tabs>

<<<<<<< HEAD
In non-interactive contexts (no TTY / `--no-prompt`), you must pass `--install-method git|npm` (or set `CLAWDBOT_INSTALL_METHOD`), otherwise the script exits with code `2`.
=======
<AccordionGroup>
  <Accordion title="Flags reference">
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))

| Flag                            | Description                                                |
| ------------------------------- | ---------------------------------------------------------- |
| `--install-method npm\|git`     | Choose install method (default: `npm`). Alias: `--method`  |
| `--npm`                         | Shortcut for npm method                                    |
| `--git`                         | Shortcut for git method. Alias: `--github`                 |
| `--version <version\|dist-tag>` | npm version or dist-tag (default: `latest`)                |
| `--beta`                        | Use beta dist-tag if available, else fallback to `latest`  |
| `--git-dir <path>`              | Checkout directory (default: `~/openclaw`). Alias: `--dir` |
| `--no-git-update`               | Skip `git pull` for existing checkout                      |
| `--no-prompt`                   | Disable prompts                                            |
| `--no-onboard`                  | Skip onboarding                                            |
| `--onboard`                     | Enable onboarding                                          |
| `--dry-run`                     | Print actions without applying changes                     |
| `--verbose`                     | Enable debug output (`set -x`, npm notice-level logs)      |
| `--help`                        | Show usage (`-h`)                                          |

  </Accordion>

<<<<<<< HEAD
For `npm` installs, Git is *usually* not required, but some environments still end up needing it (e.g. when a package or dependency is fetched via a git URL). The installer currently ensures Git is present to avoid `spawn git ENOENT` surprises on fresh distros.
=======
  <Accordion title="Environment variables reference">
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))

| Variable                                    | Description                                   |
| ------------------------------------------- | --------------------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`          | Install method                                |
| `OPENCLAW_VERSION=latest\|next\|<semver>`   | npm version or dist-tag                       |
| `OPENCLAW_BETA=0\|1`                        | Use beta if available                         |
| `OPENCLAW_GIT_DIR=<path>`                   | Checkout directory                            |
| `OPENCLAW_GIT_UPDATE=0\|1`                  | Toggle git updates                            |
| `OPENCLAW_NO_PROMPT=1`                      | Disable prompts                               |
| `OPENCLAW_NO_ONBOARD=1`                     | Skip onboarding                               |
| `OPENCLAW_DRY_RUN=1`                        | Dry run mode                                  |
| `OPENCLAW_VERBOSE=1`                        | Debug mode                                    |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm log level                                 |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | Control sharp/libvips behavior (default: `1`) |

  </Accordion>
</AccordionGroup>

---

## install-cli.sh

<Info>
Designed for environments where you want everything under a local prefix (default `~/.openclaw`) and no system Node dependency.
</Info>

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
This script installs `moltbot` into a prefix (default: `~/.clawdbot`) and also installs a dedicated Node runtime under that prefix, so it can work on machines where you don’t want to touch the system Node/npm.
=======
This script installs `openclaw` into a prefix (default: `~/.openclaw`) and also installs a dedicated Node runtime under that prefix, so it can work on machines where you don't want to touch the system Node/npm.
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))
=======
### Flow
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))
=======
### Flow (install-cli.sh)
>>>>>>> 5163833be (docs: fix markdownlint fragments + headings)

<Steps>
  <Step title="Install local Node runtime">
    Downloads Node tarball (default `22.22.0`) to `<prefix>/tools/node-v<version>` and verifies SHA-256.
  </Step>
  <Step title="Ensure Git">
    If Git is missing, attempts install via apt/dnf/yum on Linux or Homebrew on macOS.
  </Step>
  <Step title="Install OpenClaw under prefix">
    Installs with npm using `--prefix <prefix>`, then writes wrapper to `<prefix>/bin/openclaw`.
  </Step>
</Steps>

<<<<<<< HEAD
<<<<<<< HEAD
```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install-cli.sh | bash -s -- --help
=======
curl -fsSL https://openclaw.ai/install-cli.sh | bash -s -- --help
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```
=======
### Examples
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))
=======
### Examples (install-cli.sh)
>>>>>>> 5163833be (docs: fix markdownlint fragments + headings)

<Tabs>
  <Tab title="Default">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```
  </Tab>
  <Tab title="Custom prefix + version">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest
    ```
  </Tab>
  <Tab title="Automation JSON output">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw
    ```
  </Tab>
  <Tab title="Run onboarding">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Flags reference">

<<<<<<< HEAD
- Ensure Node.js **22+** (winget/Chocolatey/Scoop or manual).
- Choose install method:
  - `npm` (default): `npm install -g moltbot@latest`
  - `git`: clone/build a source checkout and install a wrapper script
- Runs `moltbot doctor --non-interactive` on upgrades and git installs (best effort).
=======
| Flag                   | Description                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- |
| `--prefix <path>`      | Install prefix (default: `~/.openclaw`)                                         |
| `--version <ver>`      | OpenClaw version or dist-tag (default: `latest`)                                |
| `--node-version <ver>` | Node version (default: `22.22.0`)                                               |
| `--json`               | Emit NDJSON events                                                              |
| `--onboard`            | Run `openclaw onboard` after install                                            |
| `--no-onboard`         | Skip onboarding (default)                                                       |
| `--set-npm-prefix`     | On Linux, force npm prefix to `~/.npm-global` if current prefix is not writable |
| `--help`               | Show usage (`-h`)                                                               |
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))

  </Accordion>

<<<<<<< HEAD
```powershell
iwr -useb https://molt.bot/install.ps1 | iex
```

```powershell
iwr -useb https://molt.bot/install.ps1 | iex -InstallMethod git
```

```powershell
iwr -useb https://molt.bot/install.ps1 | iex -InstallMethod git -GitDir "C:\\moltbot"
```
=======
  <Accordion title="Environment variables reference">

| Variable                                    | Description                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | Install prefix                                                                    |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw version or dist-tag                                                      |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node version                                                                      |
| `OPENCLAW_NO_ONBOARD=1`                     | Skip onboarding                                                                   |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm log level                                                                     |
| `OPENCLAW_GIT_DIR=<path>`                   | Legacy cleanup lookup path (used when removing old `Peekaboo` submodule checkout) |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | Control sharp/libvips behavior (default: `1`)                                     |

  </Accordion>
</AccordionGroup>
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))

---

<<<<<<< HEAD
- `CLAWDBOT_INSTALL_METHOD=git|npm`
- `CLAWDBOT_GIT_DIR=...`
=======
## install.ps1
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))

### Flow (install.ps1)

<Steps>
  <Step title="Ensure PowerShell + Windows environment">
    Requires PowerShell 5+.
  </Step>
  <Step title="Ensure Node.js 22+">
    If missing, attempts install via winget, then Chocolatey, then Scoop.
  </Step>
  <Step title="Install OpenClaw">
    - `npm` method (default): global npm install using selected `-Tag`
    - `git` method: clone/update repo, install/build with pnpm, and install wrapper at `%USERPROFILE%\.local\bin\openclaw.cmd`
  </Step>
  <Step title="Post-install tasks">
    Adds needed bin directory to user PATH when possible, then runs `openclaw doctor --non-interactive` on upgrades and git installs (best effort).
  </Step>
</Steps>

### Examples (install.ps1)

<<<<<<< HEAD
- **npm error spawn git / ENOENT**: install Git for Windows and reopen PowerShell, then rerun the installer.
- **"moltbot" is not recognized**: your npm global bin folder is not on PATH. Most systems use
  `%AppData%\\npm`. You can also run `npm config get prefix` and add `\\bin` to PATH, then reopen PowerShell.
=======
<Tabs>
  <Tab title="Default">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```
  </Tab>
  <Tab title="Git install">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git
    ```
  </Tab>
  <Tab title="Custom git directory">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw"
    ```
  </Tab>
  <Tab title="Dry run">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Flags reference">

| Flag                      | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `-InstallMethod npm\|git` | Install method (default: `npm`)                        |
| `-Tag <tag>`              | npm dist-tag (default: `latest`)                       |
| `-GitDir <path>`          | Checkout directory (default: `%USERPROFILE%\openclaw`) |
| `-NoOnboard`              | Skip onboarding                                        |
| `-NoGitUpdate`            | Skip `git pull`                                        |
| `-DryRun`                 | Print actions only                                     |

  </Accordion>

  <Accordion title="Environment variables reference">

| Variable                           | Description        |
| ---------------------------------- | ------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | Install method     |
| `OPENCLAW_GIT_DIR=<path>`          | Checkout directory |
| `OPENCLAW_NO_ONBOARD=1`            | Skip onboarding    |
| `OPENCLAW_GIT_UPDATE=0`            | Disable git pull   |
| `OPENCLAW_DRY_RUN=1`               | Dry run mode       |

  </Accordion>
</AccordionGroup>

<Note>
If `-InstallMethod git` is used and Git is missing, the script exits and prints the Git for Windows link.
</Note>

---

## CI and automation

Use non-interactive flags/env vars for predictable runs.

<Tabs>
  <Tab title="install.sh (non-interactive npm)">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard
    ```
  </Tab>
  <Tab title="install.sh (non-interactive git)">
    ```bash
    OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \
      curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```
  </Tab>
  <Tab title="install-cli.sh (JSON)">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw
    ```
  </Tab>
  <Tab title="install.ps1 (skip onboarding)">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    ```
  </Tab>
</Tabs>

---

## Troubleshooting

<AccordionGroup>
  <Accordion title="Why is Git required?">
    Git is required for `git` install method. For `npm` installs, Git is still checked/installed to avoid `spawn git ENOENT` failures when dependencies use git URLs.
  </Accordion>

  <Accordion title="Why does npm hit EACCES on Linux?">
    Some Linux setups point npm global prefix to root-owned paths. `install.sh` can switch prefix to `~/.npm-global` and append PATH exports to shell rc files (when those files exist).
  </Accordion>

  <Accordion title="sharp/libvips issues">
    The scripts default `SHARP_IGNORE_GLOBAL_LIBVIPS=1` to avoid sharp building against system libvips. To override:

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

  <Accordion title='Windows: "npm error spawn git / ENOENT"'>
    Install Git for Windows, reopen PowerShell, rerun installer.
  </Accordion>

  <Accordion title='Windows: "openclaw is not recognized"'>
    Run `npm config get prefix`, append `\bin`, add that directory to user PATH, then reopen PowerShell.
  </Accordion>

  <Accordion title="openclaw not found after install">
    Usually a PATH issue. See [Node.js troubleshooting](/install/node#troubleshooting).
  </Accordion>
</AccordionGroup>
>>>>>>> 991cf4d7f (Docs: revamp installer internals for readability and accuracy (#10499))
