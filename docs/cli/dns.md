---
summary: "CLI reference for `moltbot dns` (wide-area discovery helpers)"
read_when:
  - You want wide-area discovery (DNS-SD) via Tailscale + CoreDNS
<<<<<<< HEAD
  - You’re setting up split DNS for moltbot.internal
=======
  - You’re setting up split DNS for a custom discovery domain (example: openclaw.internal)
title: "dns"
>>>>>>> abcaa8c7a (Docs: add nav titles across docs (#5689))
---

# `moltbot dns`

DNS helpers for wide-area discovery (Tailscale + CoreDNS). Currently focused on macOS + Homebrew CoreDNS.

Related:
- Gateway discovery: [Discovery](/gateway/discovery)
- Wide-area discovery config: [Configuration](/gateway/configuration)

## Setup

```bash
moltbot dns setup
moltbot dns setup --apply
```

