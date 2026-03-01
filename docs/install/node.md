---
title: "Node.js"
summary: "Install and configure Node.js for OpenClaw — version requirements, install options, and PATH troubleshooting"
read_when:
<<<<<<< HEAD
  - "You installed Moltbot but `moltbot` is “command not found”"
  - "You’re setting up Node.js/npm on a new machine"
  - "npm install -g ... fails with permissions or PATH issues"
=======
  - "You need to install Node.js before installing OpenClaw"
  - "You installed OpenClaw but `openclaw` is command not found"
  - "npm install -g fails with permissions or PATH issues"
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))
---

# Node.js

<<<<<<< HEAD
Moltbot’s runtime baseline is **Node 22+**.

If you can run `npm install -g moltbot@latest` but later see `moltbot: command not found`, it’s almost always a **PATH** issue: the directory where npm puts global binaries isn’t on your shell’s PATH.

## Quick diagnosis

Run:
=======
OpenClaw requires **Node 22 or newer**. The [installer script](/install#install-methods) will detect and install Node automatically — this page is for when you want to set up Node yourself and make sure everything is wired up correctly (versions, PATH, global installs).

## Check your version
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

```bash
node -v
```

<<<<<<< HEAD
If `$(npm prefix -g)/bin` (macOS/Linux) or `$(npm prefix -g)` (Windows) is **not** present inside `echo "$PATH"`, your shell can’t find global npm binaries (including `moltbot`).
=======
If this prints `v22.x.x` or higher, you're good. If Node isn't installed or the version is too old, pick an install method below.
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

## Install Node

<<<<<<< HEAD
1) Find your global npm prefix:
=======
<Tabs>
  <Tab title="macOS">
    **Homebrew** (recommended):

    ```bash
    brew install node
    ```

    Or download the macOS installer from [nodejs.org](https://nodejs.org/).

  </Tab>
  <Tab title="Linux">
    **Ubuntu / Debian:**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    **Fedora / RHEL:**

    ```bash
    sudo dnf install nodejs
    ```

    Or use a version manager (see below).

  </Tab>
  <Tab title="Windows">
    **winget** (recommended):

    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```

    **Chocolatey:**

    ```powershell
    choco install nodejs-lts
    ```

    Or download the Windows installer from [nodejs.org](https://nodejs.org/).

  </Tab>
</Tabs>

<Accordion title="Using a version manager (nvm, fnm, mise, asdf)">
  Version managers let you switch between Node versions easily. Popular options:

- [**fnm**](https://github.com/Schniz/fnm) — fast, cross-platform
- [**nvm**](https://github.com/nvm-sh/nvm) — widely used on macOS/Linux
- [**mise**](https://mise.jdx.dev/) — polyglot (Node, Python, Ruby, etc.)

Example with fnm:
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

```bash
fnm install 22
fnm use 22
```

<<<<<<< HEAD
2) Add the global npm bin directory to your shell startup file:
=======
  <Warning>
  Make sure your version manager is initialized in your shell startup file (`~/.zshrc` or `~/.bashrc`). If it isn't, `openclaw` may not be found in new terminal sessions because the PATH won't include Node's bin directory.
  </Warning>
</Accordion>
>>>>>>> 18b480dd3 (Docs: sharpen Install tab to stop duplicating Getting Started (#10416))

## Troubleshooting

### `openclaw: command not found`

This almost always means npm's global bin directory isn't on your PATH.

<Steps>
  <Step title="Find your global npm prefix">
    ```bash
    npm prefix -g
    ```
  </Step>
  <Step title="Check if it's on your PATH">
    ```bash
    echo "$PATH"
    ```

    Look for `<npm-prefix>/bin` (macOS/Linux) or `<npm-prefix>` (Windows) in the output.

  </Step>
  <Step title="Add it to your shell startup file">
    <Tabs>
      <Tab title="macOS / Linux">
        Add to `~/.zshrc` or `~/.bashrc`:

        ```bash
        export PATH="$(npm prefix -g)/bin:$PATH"
        ```

        Then open a new terminal (or run `rehash` in zsh / `hash -r` in bash).
      </Tab>
      <Tab title="Windows">
        Add the output of `npm prefix -g` to your system PATH via Settings → System → Environment Variables.
      </Tab>
    </Tabs>

  </Step>
</Steps>

### Permission errors on `npm install -g` (Linux)

If you see `EACCES` errors, switch npm's global prefix to a user-writable directory:

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

Add the `export PATH=...` line to your `~/.bashrc` or `~/.zshrc` to make it permanent.
