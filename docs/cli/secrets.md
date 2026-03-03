---
summary: "CLI reference for `openclaw secrets` (reload and migration operations)"
read_when:
  - Re-resolving secret refs at runtime
  - Migrating plaintext secrets into file-backed refs
  - Rolling back secrets migration backups
title: "secrets"
---

# `openclaw secrets`

Use `openclaw secrets` to migrate credentials from plaintext to SecretRefs and keep the active secrets runtime healthy.

Command roles:

- `reload`: gateway RPC (`secrets.reload`) that re-resolves refs and swaps runtime snapshot only on full success (no config writes).
- `audit`: read-only scan of config + auth stores + legacy residues (`.env`, `auth.json`) for plaintext, unresolved refs, and precedence drift.
- `configure`: interactive planner for provider setup + target mapping + preflight (TTY required).
- `apply`: execute a saved plan (`--dry-run` for validation only), then scrub migrated plaintext residues.

Recommended operator loop:

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

Exit code note for CI/gates:

- `audit --check` returns `1` on findings, `2` when refs are unresolved.

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
- If resolution fails, gateway keeps last-known-good snapshot and returns an error (no partial activation).
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

Rollback a previous migration:

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
