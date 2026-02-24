# Security Policy

If you believe you've found a security issue in OpenClaw, please report it privately.

## Reporting

For full reporting instructions - including which repo to report to and how - see our [Trust page](https://trust.openclaw.ai).

Include: reproduction steps, impact assessment, and (if possible) a minimal PoC.

### Report Acceptance Gate (Triage Fast Path)

For fastest triage, include all of the following:

- Exact vulnerable path (`file`, function, and line range) on a current revision.
- Tested version details (OpenClaw version and/or commit SHA).
- Reproducible PoC against latest `main` or latest released version.
- Demonstrated impact tied to OpenClaw's documented trust boundaries.
- Scope check explaining why the report is **not** covered by the Out of Scope section below.

Reports that miss these requirements may be closed as `invalid` or `no-action`.

### Common False-Positive Patterns

These are frequently reported but are typically closed with no code change:

- Prompt-injection-only chains without a boundary bypass (prompt injection is out of scope).
- Operator-intended local features (for example TUI local `!` shell) presented as remote injection.
- Reports that assume per-user multi-tenant authorization on a shared gateway host/config.
- Missing HSTS findings on default local/loopback deployments.
- Slack webhook signature findings when HTTP mode already uses signing-secret verification.
- Discord inbound webhook signature findings for paths not used by this repo's Discord integration.
- Scanner-only claims against stale/nonexistent paths, or claims without a working repro.

### Duplicate Report Handling

- Search existing advisories before filing.
- Include likely duplicate GHSA IDs in your report when applicable.
- Maintainers may close lower-quality/later duplicates in favor of the earliest high-quality canonical report.

## Security & Trust

**Jamieson O'Reilly** ([@theonejvo](https://twitter.com/theonejvo)) is Security & Trust at OpenClaw. Jamieson is the founder of [Dvuln](https://dvuln.com) and brings extensive experience in offensive security, penetration testing, and security program development.

## Bug Bounties

OpenClaw is a labor of love. There is no bug bounty program and no budget for paid reports. Please still disclose responsibly so we can fix issues quickly.
The best way to help the project right now is by sending PRs.

## Out of Scope

- Public Internet Exposure
- Using OpenClaw in ways that the docs recommend not to
<<<<<<< HEAD
- Prompt injection attacks
=======
- Deployments where mutually untrusted/adversarial operators share one gateway host and config (for example, reports expecting per-operator isolation for `sessions.list`, `sessions.preview`, `chat.history`, or similar control-plane reads)
- Prompt-injection-only attacks (without a policy/auth/sandbox boundary bypass)
- Reports that require write access to trusted local state (`~/.openclaw`, workspace files like `MEMORY.md` / `memory/*.md`)
- Reports where the only demonstrated impact is an already-authorized sender intentionally invoking a local-action command (for example `/export-session` writing to an absolute host path) without bypassing auth, sandbox, or another documented boundary
- Any report whose only claim is that an operator-enabled `dangerous*`/`dangerously*` config option weakens defaults (these are explicit break-glass tradeoffs by design)
- Reports that depend on trusted operator-supplied configuration values to trigger availability impact (for example custom regex patterns). These may still be fixed as defense-in-depth hardening, but are not security-boundary bypasses.
- Exposed secrets that are third-party/user-controlled credentials (not OpenClaw-owned and not granting access to OpenClaw-operated infrastructure/services) without demonstrated OpenClaw impact
- Reports whose only claim is host-side exec when sandbox runtime is disabled/unavailable (documented default behavior in the trusted-operator model), without a boundary bypass.

## Deployment Assumptions

OpenClaw security guidance assumes:

- The host where OpenClaw runs is within a trusted OS/admin boundary.
- Anyone who can modify `~/.openclaw` state/config (including `openclaw.json`) is effectively a trusted operator.
- A single Gateway shared by mutually untrusted people is **not a recommended setup**. Use separate gateways (or at minimum separate OS users/hosts) per trust boundary.
- Authenticated Gateway callers are treated as trusted operators. Session identifiers (for example `sessionKey`) are routing controls, not per-user authorization boundaries.
- Multiple gateway instances can run on one machine, but the recommended model is clean per-user isolation (prefer one host/VPS per user).

## One-User Trust Model (Personal Assistant)

OpenClaw's security model is "personal assistant" (one trusted operator, potentially many agents), not "shared multi-tenant bus."

- If multiple people can message the same tool-enabled agent (for example a shared Slack workspace), they can all steer that agent within its granted permissions.
- Session or memory scoping reduces context bleed, but does **not** create per-user host authorization boundaries.
- For mixed-trust or adversarial users, isolate by OS user/host/gateway and use separate credentials per boundary.
- A company-shared agent can be a valid setup when users are in the same trust boundary and the agent is strictly business-only.
- For company-shared setups, use a dedicated machine/VM/container and dedicated accounts; avoid mixing personal data on that runtime.
- If that host/browser profile is logged into personal accounts (for example Apple/Google/personal password manager), you have collapsed the boundary and increased personal-data exposure risk.

## Agent and Model Assumptions

- The model/agent is **not** a trusted principal. Assume prompt/content injection can manipulate behavior.
- Security boundaries come from host/config trust, auth, tool policy, sandboxing, and exec approvals.
- Prompt injection by itself is not a vulnerability report unless it crosses one of those boundaries.

## Gateway and Node trust concept

OpenClaw separates routing from execution, but both remain inside the same operator trust boundary:

- **Gateway** is the control plane. If a caller passes Gateway auth, they are treated as a trusted operator for that Gateway.
- **Node** is an execution extension of the Gateway. Pairing a node grants operator-level remote capability on that node.
- **Exec approvals** (allowlist/ask UI) are operator guardrails to reduce accidental command execution, not a multi-tenant authorization boundary.
- For untrusted-user isolation, split by trust boundary: separate gateways and separate OS users/hosts per boundary.

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

## Temp Folder Boundary (Media/Sandbox)

OpenClaw uses a dedicated temp root for local media handoff and sandbox-adjacent temp artifacts:

- Preferred temp root: `/tmp/openclaw` (when available and safe on the host).
- Fallback temp root: `os.tmpdir()/openclaw` (or `openclaw-<uid>` on multi-user hosts).

Security boundary notes:

- Sandbox media validation allows absolute temp paths only under the OpenClaw-managed temp root.
- Arbitrary host tmp paths are not treated as trusted media roots.
- Plugin/extension code should use OpenClaw temp helpers (`resolvePreferredOpenClawTmpDir`, `buildRandomTempFilePath`, `withTempDownloadPath`) rather than raw `os.tmpdir()` defaults when handling media files.
- Enforcement reference points:
  - temp root resolver: `src/infra/tmp-openclaw-dir.ts`
  - SDK temp helpers: `src/plugin-sdk/temp-path.ts`
  - messaging/channel tmp guardrail: `scripts/check-no-random-messaging-tmp.mjs`
>>>>>>> def993dbd (refactor(tmp): harden temp boundary guardrails)

## Operational Guidance

For threat model + hardening guidance (including `openclaw security audit --deep` and `--fix`), see:

- `https://docs.openclaw.ai/gateway/security`

### Web Interface Safety

OpenClaw's web interface is intended for local use only. Do **not** bind it to the public internet; it is not hardened for public exposure.

## Runtime Requirements

### Node.js Version

OpenClaw requires **Node.js 22.12.0 or later** (LTS). This version includes important security patches:

- CVE-2025-59466: async_hooks DoS vulnerability
- CVE-2026-21636: Permission model bypass vulnerability

Verify your Node.js version:

```bash
node --version  # Should be v22.12.0 or later
```

### Docker Security

When running OpenClaw in Docker:

1. The official image runs as a non-root user (`node`) for reduced attack surface
2. Use `--read-only` flag when possible for additional filesystem protection
3. Limit container capabilities with `--cap-drop=ALL`

Example secure Docker run:

```bash
docker run --read-only --cap-drop=ALL \
  -v openclaw-data:/app/data \
  openclaw/openclaw:latest
```

## Security Scanning

This project uses `detect-secrets` for automated secret detection in CI/CD.
See `.detect-secrets.cfg` for configuration and `.secrets.baseline` for the baseline.

Run locally:

```bash
pip install detect-secrets==1.5.0
detect-secrets scan --baseline .secrets.baseline
```
