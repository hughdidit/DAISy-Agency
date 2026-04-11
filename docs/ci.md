---
title: CI Pipeline
description: How the OpenClaw CI pipeline works
summary: "CI job graph, scope gates, and local command equivalents"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# CI Pipeline

The CI workflow runs on pull requests targeting `daisy/dev` or `daisy/main`, plus manual `workflow_dispatch`. It uses docs and changed-scope gates to keep expensive Linux, iOS, and Android validation scoped to the changes in the PR.

## Job Overview

| Job                     | Purpose                                                  | When it runs                        |
| ----------------------- | -------------------------------------------------------- | ----------------------------------- |
| `docs-scope`            | Detect docs-only changes                                 | Always                              |
| `changed-scope`         | Detect which areas changed (`node` / `ios` / `android`)  | Non-doc changes and manual dispatch |
| `anti-mock`             | Block new mock-pattern files                             | Always                              |
| `check-docs`            | Markdown lint + broken link check                        | Docs changed                        |
| `check`                 | TypeScript types, lint, format, strict build smoke       | Node-relevant changes               |
| `build-artifacts`       | Dedicated Linux build smoke for `dist/`                  | Node-relevant changes               |
| `checks`                | Node test shards, protocol check, GWS toolkit, Bun tests | Node-relevant changes               |
| `skills-python`         | Lint and test Python skill scripts                       | Node-relevant changes               |
| `secrets`               | Detect leaked secrets and audit workflow changes         | Always                              |
| `ios`                   | Supported Apple mobile validation                        | iOS / shared / Swabble changes      |
| `android`               | Supported Android validation                             | Android / shared changes            |
| `CI / Linux Required`   | Stable required gate for Linux validation                | Every pull request                  |
| `CI / iOS Required`     | Stable required gate for supported Apple mobile changes  | Every pull request                  |
| `CI / Android Required` | Stable required gate for Android changes                 | Every pull request                  |

## Fail-Fast Order

Jobs are ordered so cheap checks fail before expensive ones run:

1. `docs-scope`, `anti-mock`, and `secrets`
2. `changed-scope`, `check-docs`, and `check`
3. `build-artifacts`, `checks`, `skills-python`, `ios`, and `android`
4. Stable gate jobs (`CI / Linux Required`, `CI / iOS Required`, `CI / Android Required`)

Scope logic lives in `scripts/ci-changed-scope.mjs` and is covered by unit tests in `src/scripts/ci-changed-scope.test.ts`.

## Runners

| Runner          | Jobs                                                         |
| --------------- | ------------------------------------------------------------ |
| `ubuntu-latest` | Scope detection, Linux validation, stable gate jobs, secrets |
| `macos-latest`  | `ios`                                                        |

## Local Equivalents

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
```
