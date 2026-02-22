---
summary: "CLI reference for `moltbot voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `moltbot voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:
- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
moltbot voicecall status --call-id <id>
moltbot voicecall call --to "+15555550123" --message "Hello" --mode notify
moltbot voicecall continue --call-id <id> --message "Any questions?"
moltbot voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
<<<<<<< HEAD
moltbot voicecall expose --mode serve
moltbot voicecall expose --mode funnel
moltbot voicecall unexpose
=======
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
>>>>>>> 3461dda88 (docs: fix voicecall expose disable example)
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.

