---
summary: "CLI reference for `openclaw skills` (list/info/check) and skill eligibility"
read_when:
  - You want to see which skills are available and ready to run
  - You want to debug missing binaries/env/config for skills
title: "skills"
---

# `openclaw skills`

Inspect skills (bundled + workspace + managed overrides) and see what’s eligible vs missing requirements.

Related:

- Skills system: [Skills](/tools/skills)
- Skills config: [Skills config](/tools/skills-config)
- ClawHub installs: [ClawHub](/tools/clawhub)

## Commands

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

Use `openclaw skills info <name>` when you need the skill’s actual operating
contract, such as fixed launcher commands, read-only restrictions, or approval
gates. Use a tool directly only when you already know the exact tool entrypoint
and there is no skill-specific wrapper to preserve.

Common discovery examples:

```bash
openclaw skills info openclaw-readonly
openclaw skills info openclaw-doctor
```
