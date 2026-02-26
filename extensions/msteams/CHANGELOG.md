# Changelog

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
## 2026.2.1
=======
=======
=======
=======
=======
=======
## 2026.2.17
=======
## 2026.2.18
>>>>>>> 4bf333883 (chore: bump version to 2026.2.18 unreleased)
=======
## 2026.2.19
>>>>>>> b0e55283d (chore: bump release metadata to 2026.2.19)
=======
## 2026.2.26

### Changes

- Version alignment with core OpenClaw release numbers.

## 2026.2.25
>>>>>>> caace61ba (chore: bump versions to 2026.2.26)

### Changes

- Version alignment with core OpenClaw release numbers.

>>>>>>> 9a2c39419 (chore(release): bump version to 2026.2.17)
## 2026.2.16

### Changes

- Version alignment with core OpenClaw release numbers.

>>>>>>> 39fa81dc9 (chore: bump version to 2026.2.16)
## 2026.2.15

### Changes

- Version alignment with core OpenClaw release numbers.

>>>>>>> 379b44558 (chore: bump version to 2026.2.15)
## 2026.2.14

### Changes

- Version alignment with core OpenClaw release numbers.

## 2026.2.13

### Changes

- Version alignment with core OpenClaw release numbers.

## 2026.2.6-3

### Changes

- Version alignment with core OpenClaw release numbers.

## 2026.2.6-2

### Changes

- Version alignment with core OpenClaw release numbers.

>>>>>>> 1ff15e60d (chore(release): bump versions to 2026.2.14)
## 2026.2.6

### Changes

- Version alignment with core OpenClaw release numbers.

>>>>>>> 677450cd9 (chore(release): bump version to 2026.2.6)
## 2026.2.4
>>>>>>> 5031b283a (chore: bump version to 2026.2.4)

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.31

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.30

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.29

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.23

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.22

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.21

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.20

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.17-1

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.17

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.16

### Changes
- Version alignment with core OpenClaw release numbers.

## 2026.1.15

### Features
- Bot Framework gateway monitor (Express + JWT auth) with configurable webhook path/port and `/api/messages` fallback.
- Onboarding flow for Azure Bot credentials (config + env var detection) and DM policy setup.
- Channel capabilities: DMs, group chats, channels, threads, media, polls, and `teams` alias.
- DM pairing/allowlist enforcement plus group policies with per-team/channel overrides and mention gating.
- Inbound debounce + history context for room/group chats; mention tag stripping and timestamp parsing.
- Proactive messaging via stored conversation references (file store with TTL/size pruning).
- Outbound text/media send with markdown chunking, 4k limit, split/inline media handling.
- Adaptive Card polls: build cards, parse votes, and persist poll state with vote tracking.
- Attachment processing: placeholders + HTML summaries, inline image extraction (including data: URLs).
- Media downloads with host allowlist, auth scope fallback, and Graph hostedContents/attachments fallback.
- Retry/backoff on transient/throttled sends with classified errors + helpful hints.
