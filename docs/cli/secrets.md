---
summary: "CLI reference for `openclaw secrets` (reload and migration operations)"
read_when:
  - Re-resolving secret refs at runtime
  - Migrating plaintext secrets into file-backed refs
  - Rolling back secrets migration backups
title: "secrets"
---

# `openclaw secrets`

Secrets runtime controls.

Related:

- Secrets guide: [Secrets Management](/gateway/secrets)
- Security guide: [Security](/gateway/security)

## Reload runtime snapshot

Re-resolve secret refs and atomically swap runtime snapshot.

```bash
openclaw secrets reload
openclaw secrets reload --json
```

Notes:

- Uses gateway RPC method `secrets.reload`.
- If resolution fails, gateway keeps last-known-good snapshot.
- JSON response includes `warningCount`.

## Migrate plaintext secrets

Dry-run by default:

```bash
openclaw secrets migrate
openclaw secrets migrate --json
```

Apply changes:

```bash
openclaw secrets migrate --write
```

Skip `.env` scrubbing:

```bash
openclaw secrets migrate --write --no-scrub-env
```

<<<<<<< HEAD
Rollback a previous migration:
=======
Plan contract details (allowed target paths, validation rules, and failure semantics):

- [Secrets Apply Plan Contract](/gateway/secrets-plan-contract)

## Why no rollback backups

`secrets apply` intentionally does not write rollback backups containing old plaintext values.

Safety comes from strict preflight + atomic-ish apply with best-effort in-memory restore on failure.

## Example
>>>>>>> 4380d74d4 (docs(secrets): add dedicated apply plan contract page)

```bash
openclaw secrets migrate --rollback <backup-id>
```

## Migration outputs

- Dry-run: prints what would change.
- Write mode: prints backup id and moved secret count.
- Rollback: restores files from the selected backup manifest.

Backups live under:

- `~/.openclaw/backups/secrets-migrate/<backupId>/manifest.json`

## Examples

### Preview migration impact

```bash
openclaw secrets migrate --json | jq '{mode, changed, counters, changedFiles}'
```

### Apply migration and keep a machine-readable record

```bash
openclaw secrets migrate --write --json > /tmp/openclaw-secrets-migrate.json
```

### Force a reload after updating gateway env visibility

```bash
# Ensure OPENAI_API_KEY is visible to the running gateway process first,
# then re-resolve refs:
openclaw secrets reload
```
