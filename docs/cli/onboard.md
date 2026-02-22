---
summary: "CLI reference for `moltbot onboard` (interactive onboarding wizard)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
---

# `moltbot onboard`

Interactive onboarding wizard (local or remote Gateway setup).

Related:
- Wizard guide: [Onboarding](/start/onboarding)

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
- Local onboarding defaults `session.dmScope` to `per-channel-peer` unless `session.dmScope` is already set.
- Fastest first chat: `openclaw dashboard` (Control UI, no channel setup).
- Custom Provider: connect any OpenAI or Anthropic compatible endpoint,
  including hosted providers not listed. Use Unknown to auto-detect.

## Common follow-up commands

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` does not imply non-interactive mode. Use `--non-interactive` for scripts.
</Note>
>>>>>>> 65dccbdb4 (fix: document onboarding dmScope default as breaking change (#23468) (thanks @bmendonca3))
