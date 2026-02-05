---
summary: "CLI reference for `moltbot onboard` (interactive onboarding wizard)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `moltbot onboard`

Interactive onboarding wizard (local or remote Gateway setup).

<<<<<<< HEAD
Related:
- Wizard guide: [Onboarding](/start/onboarding)
=======
## Related guides

- CLI onboarding hub: [Onboarding Wizard (CLI)](/start/wizard)
- CLI onboarding reference: [CLI Onboarding Reference](/start/wizard-cli-reference)
- CLI automation: [CLI Automation](/start/wizard-cli-automation)
- macOS onboarding: [Onboarding (macOS App)](/start/onboarding)
>>>>>>> 9e0030b75 (docs(onboarding): streamline CLI onboarding docs (#9830))

## Examples

```bash
moltbot onboard
moltbot onboard --flow quickstart
moltbot onboard --flow manual
moltbot onboard --mode remote --remote-url ws://gateway-host:18789
```

Flow notes:
- `quickstart`: minimal prompts, auto-generates a gateway token.
- `manual`: full prompts for port/bind/auth (alias of `advanced`).
<<<<<<< HEAD
- Fastest first chat: `moltbot dashboard` (Control UI, no channel setup).
=======
- Fastest first chat: `openclaw dashboard` (Control UI, no channel setup).

## Common follow-up commands

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` does not imply non-interactive mode. Use `--non-interactive` for scripts.
</Note>
>>>>>>> 9e0030b75 (docs(onboarding): streamline CLI onboarding docs (#9830))
