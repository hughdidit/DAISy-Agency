---
summary: "CLI reference for `moltbot devices` (device pairing + token rotation/revocation)"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "devices"
---

# `moltbot devices`

Manage device pairing requests and device-scoped tokens.

## Commands

### `moltbot devices list`

List pending pairing requests and paired devices.

```
moltbot devices list
moltbot devices list --json
```

<<<<<<< HEAD
### `moltbot devices approve <requestId>`
=======
### `openclaw devices remove <deviceId>`

Remove one paired device entry.

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

Clear paired devices in bulk.

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`
>>>>>>> a12cbf899 (docs: refresh CLI and trusted-proxy docs)

Approve a pending device pairing request.

```
moltbot devices approve <requestId>
```

### `moltbot devices reject <requestId>`

Reject a pending device pairing request.

```
moltbot devices reject <requestId>
```

### `moltbot devices rotate --device <id> --role <role> [--scope <scope...>]`

Rotate a device token for a specific role (optionally updating scopes).

```
moltbot devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `moltbot devices revoke --device <id> --role <role>`

Revoke a device token for a specific role.

```
moltbot devices revoke --device <deviceId> --role node
```

## Common options

- `--url <url>`: Gateway WebSocket URL (defaults to `gateway.remote.url` when configured).
- `--token <token>`: Gateway token (if required).
- `--password <password>`: Gateway password (password auth).
- `--timeout <ms>`: RPC timeout.
- `--json`: JSON output (recommended for scripting).

## Notes

- Token rotation returns a new token (sensitive). Treat it like a secret.
- These commands require `operator.pairing` (or `operator.admin`) scope.
- `devices clear` is intentionally gated by `--yes`.
- If pairing scope is unavailable on local loopback (and no explicit `--url` is passed), list/approve can use a local pairing fallback.
