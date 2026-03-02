---
<<<<<<< HEAD
summary: "CLI reference for `moltbot config` (get/set/unset config values)"
=======
summary: "CLI reference for `openclaw config` (get/set/unset values and config file path)"
>>>>>>> 96ffbb5aa (CLI: add config path subcommand to print active config file path (#26256))
read_when:
  - You want to read or edit config non-interactively
---

# `moltbot config`

<<<<<<< HEAD
Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `moltbot configure`).
=======
Config helpers: get/set/unset values by path and print the active config file.
Run without a subcommand to open
the configure wizard (same as `openclaw configure`).
>>>>>>> 96ffbb5aa (CLI: add config path subcommand to print active config file path (#26256))

## Examples

```bash
<<<<<<< HEAD
moltbot config get browser.executablePath
moltbot config set browser.executablePath "/usr/bin/google-chrome"
moltbot config set agents.defaults.heartbeat.every "2h"
moltbot config set agents.list[0].tools.exec.node "node-id-or-name"
moltbot config unset tools.web.search.apiKey
=======
openclaw config file
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config unset tools.web.search.apiKey
>>>>>>> 96ffbb5aa (CLI: add config path subcommand to print active config file path (#26256))
```

## Paths

Paths use dot or bracket notation:

```bash
moltbot config get agents.defaults.workspace
moltbot config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
moltbot config get agents.list
moltbot config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--strict-json` to require JSON5 parsing. `--json` remains supported as a legacy alias.

```bash
<<<<<<< HEAD
moltbot config set agents.defaults.heartbeat.every "0m"
moltbot config set gateway.port 19001 --json
moltbot config set channels.whatsapp.groups '["*"]' --json
=======
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
>>>>>>> d871ee91d (fix(config-cli): correct misleading --json flag description (#21332))
```

## Subcommands

- `config file`: Print the active config file path (resolved from `OPENCLAW_CONFIG_PATH` or default location).

Restart the gateway after edits.
