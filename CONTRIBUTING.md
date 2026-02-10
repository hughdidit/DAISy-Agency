# Contributing to Moltbot

Welcome to the lobster tank! 🦞

## Quick Links
<<<<<<< HEAD
- **GitHub:** https://github.com/moltbot/moltbot
=======

- **GitHub:** https://github.com/openclaw/openclaw
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
- **Discord:** https://discord.gg/qkhbAGHRBT
- **X/Twitter:** [@steipete](https://x.com/steipete) / [@moltbot](https://x.com/moltbot)

## Contributors

<<<<<<< HEAD
- **Peter Steinberger** - Benevolent Dictator
  - GitHub: [@steipete](https://github.com/steipete) · X: [@steipete](https://x.com/steipete)

- **Shadow** - Discord + Slack subsystem
  - GitHub: [@thewilloftheshadow](https://github.com/thewilloftheshadow) · X: [@4shad0wed](https://x.com/4shad0wed)

- **Jos** - Telegram, API, Nix mode
  - GitHub: [@joshp123](https://github.com/joshp123) · X: [@jjpcodes](https://x.com/jjpcodes)
=======
See [Credits & Maintainers](https://docs.openclaw.ai/reference/credits) for the full list.
>>>>>>> cc87c0ed7 (Update contributing, deduplicate more functions)

## How to Contribute

1. **Bugs & small fixes** → Open a PR!
2. **New features / architecture** → Start a [GitHub Discussion](https://github.com/moltbot/moltbot/discussions) or ask in Discord first
3. **Questions** → Discord #setup-help

## Before You PR
<<<<<<< HEAD
- Test locally with your Moltbot instance
- Run linter: `npm run lint`
=======

- Test locally with your OpenClaw instance
<<<<<<< HEAD
- Run tests: `pnpm tsgo && pnpm format && pnpm lint && pnpm build && pnpm test`
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
=======
- Run tests: `pnpm build && pnpm check && pnpm test`
- Ensure CI checks pass
>>>>>>> cc87c0ed7 (Update contributing, deduplicate more functions)
- Keep PRs focused (one thing per PR)
- Describe what & why

## Control UI Decorators

The Control UI uses Lit with **legacy** decorators (current Rollup parsing does not support
`accessor` fields required for standard decorators). When adding reactive fields, keep the
legacy style:

```ts
@state() foo = "bar";
@property({ type: Number }) count = 0;
```

The root `tsconfig.json` is configured for legacy decorators (`experimentalDecorators: true`)
with `useDefineForClassFields: false`. Avoid flipping these unless you are also updating the UI
build tooling to support standard decorators.

## AI/Vibe-Coded PRs Welcome! 🤖

Built with Codex, Claude, or other AI tools? **Awesome - just mark it!**

Please include in your PR:

- [ ] Mark as AI-assisted in the PR title or description
- [ ] Note the degree of testing (untested / lightly tested / fully tested)
- [ ] Include prompts or session logs if possible (super helpful!)
- [ ] Confirm you understand what the code does

AI PRs are first-class citizens here. We just want transparency so reviewers know what to look for.

## Current Focus & Roadmap 🗺

We are currently prioritizing:

- **Stability**: Fixing edge cases in channel connections (WhatsApp/Telegram).
- **UX**: Improving the onboarding wizard and error messages.
- **Skills**: For skill contributions, head to [ClawHub](https://clawhub.ai/) — the community hub for OpenClaw skills.
- **Performance**: Optimizing token usage and compaction logic.

Check the [GitHub Issues](https://github.com/moltbot/moltbot/issues) for "good first issue" labels!
