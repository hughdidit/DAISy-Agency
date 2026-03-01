---
summary: "Troubleshooting hub: symptoms → checks → fixes"
read_when:
  - You see an error and want the fix path
  - The installer says “success” but the CLI doesn’t work
---

# Troubleshooting

## First 60 seconds

Run these in order:

```bash
moltbot status
moltbot status --all
moltbot gateway probe
moltbot logs --follow
moltbot doctor
```

If the gateway is reachable, deep probes:

<<<<<<< HEAD
```bash
moltbot status --deep
=======
- `openclaw status` → shows configured channels and no obvious auth errors.
- `openclaw status --all` → full report is present and shareable.
- `openclaw gateway probe` → expected gateway target is reachable.
- `openclaw gateway status` → `Runtime: running` and `RPC probe: ok`.
- `openclaw doctor` → no blocking config/service errors.
- `openclaw channels status --probe` → channels report `connected` or `ready`.
- `openclaw logs --follow` → steady activity, no repeating fatal errors.

## Anthropic long context 429

If you see:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`,
go to [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

## Decision tree

```mermaid
flowchart TD
  A[OpenClaw is not working] --> B{What breaks first}
  B --> C[No replies]
  B --> D[Dashboard or Control UI will not connect]
  B --> E[Gateway will not start or service not running]
  B --> F[Channel connects but messages do not flow]
  B --> G[Cron or heartbeat did not fire or did not deliver]
  B --> H[Node is paired but camera canvas screen exec fails]
  B --> I[Browser tool fails]

  C --> C1[/No replies section/]
  D --> D1[/Control UI section/]
  E --> E1[/Gateway section/]
  F --> F1[/Channel flow section/]
  G --> G1[/Automation section/]
  H --> H1[/Node tools section/]
  I --> I1[/Browser section/]
>>>>>>> 063c4f00e (docs: clarify Anthropic context1m long-context requirements)
```

## Common “it broke” cases

### `moltbot: command not found`

Almost always a Node/npm PATH issue. Start here:

- [Install (Node/npm PATH sanity)](/install#nodejs--npm-path-sanity)

### Installer fails (or you need full logs)

Re-run the installer in verbose mode to see the full trace and npm output:

<<<<<<< HEAD
```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --verbose
```
=======
    - [/gateway/troubleshooting#no-replies](/gateway/troubleshooting#no-replies)
    - [/channels/troubleshooting](/channels/troubleshooting)
    - [/channels/pairing](/channels/pairing)
>>>>>>> 929a3725d (docs: canonicalize docs paths and align zh navigation (#11428))

For beta installs:

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --beta --verbose
```

You can also set `CLAWDBOT_VERBOSE=1` instead of the flag.

### Gateway “unauthorized”, can’t connect, or keeps reconnecting

- [Gateway troubleshooting](/gateway/troubleshooting)
- [Gateway authentication](/gateway/authentication)

### Control UI fails on HTTP (device identity required)

- [Gateway troubleshooting](/gateway/troubleshooting)
- [Control UI](/web/control-ui#insecure-http)

### `docs.molt.bot` shows an SSL error (Comcast/Xfinity)

Some Comcast/Xfinity connections block `docs.molt.bot` via Xfinity Advanced Security.
Disable Advanced Security or add `docs.molt.bot` to the allowlist, then retry.

- Xfinity Advanced Security help: https://www.xfinity.com/support/articles/using-xfinity-xfi-advanced-security
- Quick sanity checks: try a mobile hotspot or VPN to confirm it’s ISP-level filtering

### Service says running, but RPC probe fails

- [Gateway troubleshooting](/gateway/troubleshooting)
- [Background process / service](/gateway/background-process)

### Model/auth failures (rate limit, billing, “all models failed”)

- [Models](/cli/models)
- [OAuth / auth concepts](/concepts/oauth)

### `/model` says `model not allowed`

This usually means `agents.defaults.models` is configured as an allowlist. When it’s non-empty,
only those provider/model keys can be selected.

- Check the allowlist: `moltbot config get agents.defaults.models`
- Add the model you want (or clear the allowlist) and retry `/model`
- Use `/models` to browse the allowed providers/models

### When filing an issue

Paste a safe report:

```bash
moltbot status --all
```

If you can, include the relevant log tail from `moltbot logs --follow`.
