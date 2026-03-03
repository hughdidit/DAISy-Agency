---
title: "Node.js"
summary: "Install and configure Node.js for OpenClaw — version requirements, install options, and PATH troubleshooting"
read_when:
  - "You installed OpenClaw but `openclaw` is “command not found”"
  - "You’re setting up Node.js/npm on a new machine"
  - "npm install -g ... fails with permissions or PATH issues"
---

# Node.js

OpenClaw’s runtime baseline is **Node 22+**.

If you can run `npm install -g openclaw@latest` but later see `openclaw: command not found`, it’s almost always a **PATH** issue: the directory where npm puts global binaries isn’t on your shell’s PATH.

## Quick diagnosis

Run:

```bash
node -v
```

If `$(npm prefix -g)/bin` (macOS/Linux) or `$(npm prefix -g)` (Windows) is **not** present inside `echo "$PATH"`, your shell can’t find global npm binaries (including `openclaw`).

## Install Node

1) Find your global npm prefix:

```bash
fnm install 22
fnm use 22
```

2) Add the global npm bin directory to your shell startup file:

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
