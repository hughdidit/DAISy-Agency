# ELF CLI Runbook

ELF commands are exposed through the OpenClaw plugin CLI path:

```bash
openclaw elf ingest --file extensions/learning-elf/src/fixtures/learning-events/pr-review-failure.json
openclaw elf evolve --fixture extensions/learning-elf/src/fixtures/learning-events/pr-review-failure.json --generations 3 --population 20 --seed 1234
openclaw elf candidates list
openclaw elf promotions list
openclaw elf trace show --run-id <run-id>
openclaw elf promotions export --promotion-id <promotion-id> --out .openclaw/elf/exports/<promotion-id>.md
```

Development verification commands:

```bash
pnpm test:extensions
pnpm exec vitest run --config vitest.extensions.config.ts extensions/learning-elf
pnpm lint
pnpm build:strict-smoke
```

Repository policy still applies: do not run the bot locally. Use the approved containerized/GCP development path for authoritative verification.

Fixture mode is the default for the initial implementation. It does not require network access, live LLM calls, live Atlas access, GitHub API calls, or deployment credentials.
