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
- Prompt injection attacks

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
