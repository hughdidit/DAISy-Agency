---
<<<<<<< HEAD
summary: "Install Moltbot (recommended installer, global install, or from source)"
read_when:
  - Installing Moltbot
  - You want to install from GitHub
title: "Install Overview"
=======
summary: "Install OpenClaw — installer script, npm/pnpm, from source, Docker, and more"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "Install"
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))
---

# Install

<<<<<<< HEAD
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
=======
Already followed [Getting Started](/start/getting-started)? You're all set — this page is for alternative install methods, platform-specific instructions, and maintenance.
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

## System requirements

- **[Node 22+](/install/node)** (the [installer script](#install-methods) will install it if missing)
- macOS, Linux, or Windows
- `pnpm` only if you build from source

<Note>
On Windows, we strongly recommend running OpenClaw under [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install).
</Note>

## Install methods

<<<<<<< HEAD
Installs `moltbot` globally via npm and runs onboarding.

```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash
=======
curl -fsSL https://openclaw.ai/install.sh | bash
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```
=======
<Tip>
The **installer script** is the recommended way to install OpenClaw. It handles Node detection, installation, and onboarding in one step.
</Tip>

<AccordionGroup>
  <Accordion title="Installer script" icon="rocket" defaultOpen>
    Downloads the CLI, installs it globally via npm, and launches the onboarding wizard.
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

    <Tabs>
      <Tab title="macOS / Linux / WSL2">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

<<<<<<< HEAD
```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash -s -- --help
=======
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --help
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```
=======
    That's it — the script handles Node detection, installation, and onboarding.
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

    To skip onboarding and just install the binary:

    <Tabs>
      <Tab title="macOS / Linux / WSL2">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
        ```
      </Tab>
    </Tabs>

<<<<<<< HEAD
```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash -s -- --no-onboard
=======
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```
=======
    For all flags, env vars, and CI/automation options, see [Installer internals](/install/installer).
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

  </Accordion>

  <Accordion title="npm / pnpm" icon="package">
    If you already have Node 22+ and prefer to manage the install yourself:

<<<<<<< HEAD
```bash
npm install -g moltbot@latest
```
=======
    <Tabs>
      <Tab title="npm">
        ```bash
        npm install -g openclaw@latest
        openclaw onboard --install-daemon
        ```
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

        <Accordion title="sharp build errors?">
          If you have libvips installed globally (common on macOS via Homebrew) and `sharp` fails, force prebuilt binaries:

<<<<<<< HEAD
```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g moltbot@latest
```
=======
          ```bash
          SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
          ```
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

          If you see `sharp: Please add node-gyp to your dependencies`, either install build tooling (macOS: Xcode CLT + `npm install -g node-gyp`) or use the env var above.
        </Accordion>
      </Tab>
      <Tab title="pnpm">
        ```bash
        pnpm add -g openclaw@latest
        pnpm approve-builds -g        # approve openclaw, node-llama-cpp, sharp, etc.
        openclaw onboard --install-daemon
        ```

        <Note>
        pnpm requires explicit approval for packages with build scripts. After the first install shows the "Ignored build scripts" warning, run `pnpm approve-builds -g` and select the listed packages.
        </Note>
      </Tab>
    </Tabs>

<<<<<<< HEAD
```bash
<<<<<<< HEAD
pnpm add -g moltbot@latest
=======
pnpm add -g openclaw@latest
pnpm approve-builds -g                # approve openclaw, node-llama-cpp, sharp, etc.
pnpm add -g openclaw@latest           # re-run to execute postinstall scripts
>>>>>>> 3ae049b50 (docs(install): add pnpm approve-builds step for global installs (#5663))
```

pnpm requires explicit approval for packages with build scripts. After the first install shows the "Ignored build scripts" warning, run `pnpm approve-builds -g` and select the listed packages, then re-run the install so postinstall scripts execute.
=======
  </Accordion>

  <Accordion title="From source" icon="github">
    For contributors or anyone who wants to run from a local checkout.
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

    <Steps>
      <Step title="Clone and build">
        Clone the [OpenClaw repo](https://github.com/openclaw/openclaw) and build:

<<<<<<< HEAD
```bash
moltbot onboard --install-daemon
```
=======
        ```bash
        git clone https://github.com/openclaw/openclaw.git
        cd openclaw
        pnpm install
        pnpm ui:build
        pnpm build
        ```
      </Step>
      <Step title="Link the CLI">
        Make the `openclaw` command available globally:
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

        ```bash
        pnpm link --global
        ```

<<<<<<< HEAD
```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
moltbot onboard --install-daemon
```

Tip: if you don’t have a global install yet, run repo commands via `pnpm moltbot ...`.
=======
        Alternatively, skip the link and run commands via `pnpm openclaw ...` from inside the repo.
      </Step>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --install-daemon
        ```
      </Step>
    </Steps>

    For deeper development workflows, see [Setup](/start/setup).
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

  </Accordion>
</AccordionGroup>

## Other install methods

<CardGroup cols={2}>
  <Card title="Docker" href="/install/docker" icon="container">
    Containerized or headless deployments.
  </Card>
  <Card title="Nix" href="/install/nix" icon="snowflake">
    Declarative install via Nix.
  </Card>
  <Card title="Ansible" href="/install/ansible" icon="server">
    Automated fleet provisioning.
  </Card>
  <Card title="Bun" href="/install/bun" icon="zap">
    CLI-only usage via the Bun runtime.
  </Card>
</CardGroup>

## After install

<<<<<<< HEAD
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
=======
Verify everything is working:

```bash
openclaw doctor         # check for config issues
openclaw status         # gateway status
openclaw dashboard      # open the browser UI
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))
```

## Troubleshooting: `openclaw` not found

<<<<<<< HEAD
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
=======
<Accordion title="PATH diagnosis and fix">
  Quick diagnosis:
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

<<<<<<< HEAD
If `$(npm prefix -g)/bin` (macOS/Linux) or `$(npm prefix -g)` (Windows) is **not** present inside `echo "$PATH"`, your shell can’t find global npm binaries (including `moltbot`).
=======
If `$(npm prefix -g)/bin` (macOS/Linux) or `$(npm prefix -g)` (Windows) is **not** in your `$PATH`, your shell can't find global npm binaries (including `openclaw`).
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

Fix — add it to your shell startup file (`~/.zshrc` or `~/.bashrc`):

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

On Windows, add the output of `npm prefix -g` to your PATH.

Then open a new terminal (or `rehash` in zsh / `hash -r` in bash).
</Accordion>

## Update / uninstall

<CardGroup cols={3}>
  <Card title="Updating" href="/install/updating" icon="refresh-cw">
    Keep OpenClaw up to date.
  </Card>
  <Card title="Migrating" href="/install/migrating" icon="arrow-right">
    Move to a new machine.
  </Card>
  <Card title="Uninstall" href="/install/uninstall" icon="trash-2">
    Remove OpenClaw completely.
  </Card>
</CardGroup>
