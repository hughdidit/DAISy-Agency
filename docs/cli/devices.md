---
summary: "CLI reference for `moltbot devices` (device pairing + token rotation/revocation)"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
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
### `openclaw devices approve [requestId] [--latest]`
>>>>>>> b114c8270 (CLI: approve latest pending device request)

Approve a pending device pairing request. If `requestId` is omitted, OpenClaw
automatically approves the most recent pending request.

```
<<<<<<< HEAD
moltbot devices approve <requestId>
=======
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
>>>>>>> b114c8270 (CLI: approve latest pending device request)
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
