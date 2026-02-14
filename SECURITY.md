# Security Policy

If you believe you've found a security issue in Moltbot, please report it privately.

## Reporting

- Email: `steipete@gmail.com`
- What to include: reproduction steps, impact assessment, and (if possible) a minimal PoC.

<<<<<<< HEAD
=======
## Bug Bounties

OpenClaw is a labor of love. There is no bug bounty program and no budget for paid reports. Please still disclose responsibly so we can fix issues quickly.
The best way to help the project right now is by sending PRs.

## Out of Scope

- Public Internet Exposure
- Using OpenClaw in ways that the docs recommend not to
- Prompt injection attacks

>>>>>>> a767c584c (Add prompt injection attacks to out of scope section)
## Operational Guidance

For threat model + hardening guidance (including `moltbot security audit --deep` and `--fix`), see:

- `https://docs.molt.bot/gateway/security`

### Web Interface Safety

<<<<<<< HEAD
Moltbot's web interface is intended for local use only. Do **not** bind it to the public internet; it is not hardened for public exposure.
=======
OpenClaw's web interface (Gateway Control UI + HTTP endpoints) is intended for **local use only**.

- Recommended: keep the Gateway **loopback-only** (`127.0.0.1` / `::1`).
  - Config: `gateway.bind="loopback"` (default).
  - CLI: `openclaw gateway run --bind loopback`.
- Do **not** expose it to the public internet (no direct bind to `0.0.0.0`, no public reverse proxy). It is not hardened for public exposure.
- If you need remote access, prefer an SSH tunnel or Tailscale serve/funnel (so the Gateway still binds to loopback), plus strong Gateway auth.
>>>>>>> e21a7aad5 (docs: recommend loopback-only gateway bind)

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
