# GWS Toolkit Phase 1 Runbook

## 1) Install gws CLI

```bash
npm install -g @googleworkspace/cli
gws --version
```

Set `binaryPath` in plugin config if `gws` is not on `PATH`.

On hardened containers with a read-only root filesystem, the plugin prepares
private runtime directories under the OpenClaw state directory and injects them
into `HOME`, `TMPDIR`, `XDG_CONFIG_HOME`, and `XDG_CACHE_HOME` before invoking
`gws`. Do not point those paths at a shared or broader writable location.

## 2) Enable Required Google APIs (minimum set)

- Google Drive API (`drive.googleapis.com`)
- Gmail API (`gmail.googleapis.com`)
- Google Calendar API (`calendar.googleapis.com`)

## 3) Configure OpenClaw Through `OPENCLAW_CONFIG_FILE`

In this repo/deploy flow, `OPENCLAW_CONFIG_FILE` is a filename (not an absolute path).
The deployed container reads the config from:

- `/home/node/.openclaw/${OPENCLAW_CONFIG_FILE}`

Set GitHub environment variable example:

```bash
OPENCLAW_CONFIG_FILE=openclaw.json
```

Add plugin config in that file under `plugins.entries.gws-toolkit-phase1.config`:

```json5
{
  plugins: {
    entries: {
      "gws-toolkit-phase1": {
        enabled: true,
        config: {
          enabledServices: ["drive", "gmail", "calendar"],
          safeMode: true,
          timeoutMs: 15000,
          maxStdoutBytes: 1048576,
          maxStderrBytes: 262144,
          allowedCredentialModes: ["credentials_file"],
          defaultScopesProfile: "minimal",
          approvedCredentialDirs: ["/home/node/.openclaw/secrets/gws"],
          credentialsFile: "/home/node/.openclaw/secrets/gws/credentials.json",
        },
      },
    },
  },
}
```

## 4) Agent Tool Restrictions (recommended)

Restrict agent-visible tools so only approved read-only GWS tools are exposed:

```json5
{
  tools: {
    allow: ["gws_status", "gws_drive_read", "gws_gmail_read", "gws_calendar_read"],
    deny: ["gws_raw", "gws_write"],
  },
}
```

Use your existing tool policy model and keep deny-by-default posture for non-required tools.

## 5) Secret Management (zero-trust)

- Keep all tokens/credentials in GitHub Secrets and runtime env/secret mounts.
- Do not commit secrets, keys, tokens, or credential file contents.
- Plugin config stores only references (env var names and paths), not secret values.

For token mode, inject:

- `GOOGLE_WORKSPACE_CLI_TOKEN` (GitHub Secret -> runtime env, token mode)

For `credentials_file` mode, inject:

- `GWS_CREDENTIALS` (GitHub Secret containing exported credentials JSON as raw JSON text)

In DAISy deploy flow, `scripts/deploy.sh` can materialize `GWS_CREDENTIALS` into:

- Host: `${DEPLOY_DIR}/config/secrets/gws/credentials.json`
- Container: `/home/node/.openclaw/secrets/gws/credentials.json`

Credential file hardening enforced by plugin:

- Must be a regular file (not directory/device)
- Must not be a symlink
- Must resolve inside one of `approvedCredentialDirs`
- On POSIX, must be owner-only permission (for example `0600`)

## 6) Auth Modes (Phase 1)

Supported:

- `oauth` (interactive trusted workstation)
- `credentials_file` (operator-managed file within approved dirs)
- `token` (pre-obtained token via env var)

Not implemented in Phase 1:

- service-account key mode
- multi-agent credential routing inside one plugin instance

Phase 1 multi-agent pattern:

- Use one runtime/config profile per agent identity.
- Each agent deployment points to its own `OPENCLAW_CONFIG_FILE` and credentials secret material.

## 7) Verify Plugin and Read-Only Operation

```bash
openclaw gws doctor
openclaw gws auth-status
```

Tool smoke checks:

- `gws_status`
- `gws_drive_read` with `action=list_files`
- `gws_gmail_read` with `action=list_messages`
- `gws_calendar_read` with `action=list_events`

For a low-level CLI probe inside a hardened container, replicate the plugin's
runtime wrapper before invoking `gws` directly:

```bash
export HOME=/home/node/.openclaw/plugins/gws-toolkit-phase1/runtime/home
export TMPDIR=/home/node/.openclaw/plugins/gws-toolkit-phase1/runtime/tmp
export XDG_CONFIG_HOME=/home/node/.openclaw/plugins/gws-toolkit-phase1/runtime/xdg-config
export XDG_CACHE_HOME=/home/node/.openclaw/plugins/gws-toolkit-phase1/runtime/xdg-cache
gws --version
```

If the raw probe still fails with `EACCES`, make sure
the execution profile permits the npm wrapper chain used by the global install:

- `/usr/local/lib/node_modules/@googleworkspace/cli/run-gws.js`
- `/usr/local/lib/node_modules/@googleworkspace/cli/node_modules/.bin_real/gws`

## 8) Verify Deny Behavior

- Unsupported action (for example send/create/update/delete)
- Unknown parameter key
- Raw/write-like request shape
- Credentials file outside `approvedCredentialDirs`
- Credentials file with permissive permissions (for example `0644`)

Expected: structured JSON deny/error payloads, with normalized audit events.
