# Security Policy

If you believe you've found a security issue in Moltbot, please report it privately.

## Reporting

- Email: `steipete@gmail.com`
- What to include: reproduction steps, impact assessment, and (if possible) a minimal PoC.

## Bug Bounties

OpenClaw is a labor of love. There is no bug bounty program and no budget for paid reports. Please still disclose responsibly so we can fix issues quickly.
The best way to help the project right now is by sending PRs.

<<<<<<< HEAD
=======
## Maintainers: GHSA Updates via CLI

When patching a GHSA via `gh api`, include `X-GitHub-Api-Version: 2022-11-28` (or newer). Without it, some fields (notably CVSS) may not persist even if the request returns 200.

## Operator Trust Model (Important)

OpenClaw does **not** model one gateway as a multi-tenant, adversarial user boundary.

- Authenticated Gateway callers are treated as trusted operators for that gateway instance.
- Session identifiers (`sessionKey`, session IDs, labels) are routing controls, not per-user authorization boundaries.
- If one operator can view data from another operator on the same gateway, that is expected in this trust model.
- OpenClaw can technically run multiple gateway instances on one machine, but recommended operations are clean separation by trust boundary.
- Recommended mode: one user per machine/host (or VPS), one gateway for that user, and one or more agents inside that gateway.
- If multiple users need OpenClaw, use one VPS (or host/OS user boundary) per user.
- For advanced setups, multiple gateways on one machine are possible, but only with strict isolation and are not the recommended default.

## Out of Scope

- Public Internet Exposure
- Using OpenClaw in ways that the docs recommend not to
- Deployments where mutually untrusted/adversarial operators share one gateway host and config (for example, reports expecting per-operator isolation for `sessions.list`, `sessions.preview`, `chat.history`, or similar control-plane reads)
- Prompt injection attacks
- Reports that require write access to trusted local state (`~/.openclaw`, workspace files like `MEMORY.md` / `memory/*.md`)
- Reports that depend on trusted operator-supplied configuration values to trigger availability impact (for example custom regex patterns). These may still be fixed as defense-in-depth hardening, but are not security-boundary bypasses.
- Exposed secrets that are third-party/user-controlled credentials (not OpenClaw-owned and not granting access to OpenClaw-operated infrastructure/services) without demonstrated OpenClaw impact

## Deployment Assumptions

OpenClaw security guidance assumes:

- The host where OpenClaw runs is within a trusted OS/admin boundary.
- Anyone who can modify `~/.openclaw` state/config (including `openclaw.json`) is effectively a trusted operator.
- A single Gateway shared by mutually untrusted people is **not a recommended setup**. Use separate gateways (or at minimum separate OS users/hosts) per trust boundary.
- Authenticated Gateway callers are treated as trusted operators. Session identifiers (for example `sessionKey`) are routing controls, not per-user authorization boundaries.
- Multiple gateway instances can run on one machine, but the recommended model is clean per-user isolation (prefer one host/VPS per user).

## Workspace Memory Trust Boundary

`MEMORY.md` and `memory/*.md` are plain workspace files and are treated as trusted local operator state.

- If someone can edit workspace memory files, they already crossed the trusted operator boundary.
- Memory search indexing/recall over those files is expected behavior, not a sandbox/security boundary.
- Example report pattern considered out of scope: "attacker writes malicious content into `memory/*.md`, then `memory_search` returns it."
- If you need isolation between mutually untrusted users, split by OS user or host and run separate gateways.

## Plugin Trust Boundary

Plugins/extensions are loaded **in-process** with the Gateway and are treated as trusted code.

- Plugins can execute with the same OS privileges as the OpenClaw process.
- Runtime helpers (for example `runtime.system.runCommandWithTimeout`) are convenience APIs, not a sandbox boundary.
- Only install plugins you trust, and prefer `plugins.allow` to pin explicit trusted plugin ids.

>>>>>>> a767c584c (Add prompt injection attacks to out of scope section)
## Operational Guidance

For threat model + hardening guidance (including `moltbot security audit --deep` and `--fix`), see:

- `https://docs.molt.bot/gateway/security`

### Web Interface Safety

Moltbot's web interface is intended for local use only. Do **not** bind it to the public internet; it is not hardened for public exposure.

## Runtime Requirements

### Node.js Version

Moltbot requires **Node.js 22.12.0 or later** (LTS). This version includes important security patches:

- CVE-2025-59466: async_hooks DoS vulnerability
- CVE-2026-21636: Permission model bypass vulnerability

Verify your Node.js version:

```bash
node --version  # Should be v22.12.0 or later
```

### Docker Security

When running Moltbot in Docker:

1. The official image runs as a non-root user (`node`) for reduced attack surface
2. Use `--read-only` flag when possible for additional filesystem protection
3. Limit container capabilities with `--cap-drop=ALL`

Example secure Docker run:

```bash
docker run --read-only --cap-drop=ALL \
  -v moltbot-data:/app/data \
  moltbot/moltbot:latest
```

## Security Reviews

Security reviews are conducted before major deployments and archived in [`docs/security/reviews/`](docs/security/reviews/).

## Security Scanning

This project uses `detect-secrets` for automated secret detection in CI/CD.
See `.detect-secrets.cfg` for configuration and `.secrets.baseline` for the baseline.

Run locally:

```bash
pip install detect-secrets==1.5.0
detect-secrets scan --baseline .secrets.baseline
```
