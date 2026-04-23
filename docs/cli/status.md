---
summary: "CLI reference for `openclaw status` (diagnostics, probes, usage snapshots)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "status"
---

# `openclaw status`

Diagnostics for channels + sessions.

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

Notes:

- `--deep` runs live probes (WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal).
- Output includes per-agent session stores when multiple agents are configured.
- Overview includes Gateway + node host service install/runtime status when available.
- Overview includes update channel + git SHA (for source checkouts).
- Update info surfaces in the Overview; if an update is available, status prints a hint to run `openclaw update` (see [Updating](/install/updating)).
- Status now includes a shared `Capabilities` section sourced from the same readiness model used by `sandbox explain` and doctor.
- Capability classes are reported as:
  - `sandbox-local`
  - `gateway-brokered`
  - `remote-node-assisted`
  - `configured-but-blocked`
  - `unsupported-in-current-runtime`
- `status --json` now includes an additive top-level `capabilities` object with counts, findings, tool groups, skills, and the resolved manifest.
