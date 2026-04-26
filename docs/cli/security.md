---
summary: "CLI reference for `openclaw security` (audit and fix common security footguns)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (chmod, tighten defaults)
title: "security"
---

# `openclaw security`

Security tools (audit + optional fixes).

Related:

- Security guide: [Security](/gateway/security)

## Audit

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

The audit warns when multiple DM senders share the main session and recommends **secure DM mode**: `session.dmScope="per-channel-peer"` (or `per-account-channel-peer` for multi-account channels) for shared inboxes.
This is for cooperative/shared inbox hardening. A single Gateway shared by mutually untrusted/adversarial operators is not a recommended setup; split trust boundaries with separate gateways (or separate OS users/hosts).
It also emits `security.trust_model.multi_user_heuristic` when config suggests likely shared-user ingress (for example open DM/group policy, configured group targets, or wildcard sender rules), and reminds you that OpenClaw is a personal-assistant trust model by default.
For intentional shared-user setups, the audit guidance is to sandbox all sessions, keep filesystem access workspace-scoped, and keep personal/private identities or credentials off that runtime.
It also warns when small models (`<=300B`) are used without sandboxing and with web/browser tools enabled.
For webhook ingress, it warns when `hooks.defaultSessionKey` is unset, when request `sessionKey` overrides are enabled, and when overrides are enabled without `hooks.allowedSessionKeyPrefixes`.
It also warns about:

- Sandbox Docker settings configured while the gateway is in reduced-trust host compatibility mode (`sandbox.mode=off`).
- Unset/default `tools.exec.host="sandbox"` falling back to gateway-brokered host compatibility when sandboxing is off.
- Explicit `tools.exec.host="sandbox"` configurations that now fail closed when no sandbox runtime is available.
- Explicit host-mode stopgap opt-outs, including `tools.exec.host="gateway"`, `tools.exec.host="node"`, `tools.fs.workspaceOnly=false`, and `tools.elevated.enabled=true`.
- Ineffective pattern-like or unknown `gateway.nodes.denyCommands` entries; matching is by exact node command name, not shell text.
- Explicit dangerous node commands in `gateway.nodes.allowCommands`.
- Global `tools.profile="minimal"` overridden by agent tool profiles.
- Open groups exposing runtime/filesystem tools without sandbox/workspace guards.
- Installed extension plugin tools reachable under permissive tool policy.
- `gateway.allowRealIpFallback=true`, which can expose header-spoofing risk if proxies are misconfigured.
- `discovery.mdns.mode="full"`, which can leak metadata through mDNS TXT records.
- Sandbox browser using Docker `bridge` network without `sandbox.browser.cdpSourceRange`.
- Dangerous sandbox Docker network modes, including `host` and `container:*` namespace joins.
- Existing sandbox browser Docker containers with missing or stale hash labels, such as pre-migration containers missing `openclaw.browserConfigEpoch`.
- Npm-based plugin/hook install records that are unpinned, missing integrity metadata, or drift from installed package versions.
- Channel allowlists that rely on mutable names/emails/tags instead of stable IDs.
- `gateway.auth.mode="none"` exposing Gateway HTTP APIs without a shared secret.

Settings prefixed with `dangerous`/`dangerously` are explicit break-glass operator overrides, often granting host-level or isolation-bypass authority; enabling one is not, by itself, a security vulnerability report.
For the complete dangerous-parameter inventory, see the "Insecure or dangerous flags summary" section in [Security](/gateway/security).

## JSON output

Use `--json` for CI/policy checks:

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

If `--fix` and `--json` are combined, output includes both fix actions and final report:

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## What `--fix` changes

`--fix` applies safe, deterministic remediations:

- flips common `groupPolicy="open"` to `groupPolicy="allowlist"` (including account variants in supported channels)
- sets `logging.redactSensitive` from `"off"` to `"tools"`
- tightens permissions for state/config and common sensitive files (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session `*.jsonl`)

`--fix` does **not**:

- rotate tokens/passwords/API keys
- disable tools (`gateway`, `cron`, `exec`, etc.)
- change gateway bind/auth/network exposure choices
- remove or rewrite plugins/skills
- change host-mode stopgap policy opt-outs such as `tools.fs.workspaceOnly=false` or `tools.elevated.enabled=true`
