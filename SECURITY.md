# Security Policy

If you believe you've found a security issue in Moltbot, please report it privately.

## Reporting

- Email: `steipete@gmail.com`
- What to include: reproduction steps, impact assessment, and (if possible) a minimal PoC.
=======

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
