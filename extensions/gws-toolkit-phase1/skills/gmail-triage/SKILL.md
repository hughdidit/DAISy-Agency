---
name: gmail-triage
description: Safely read, triage, draft, and reply to Gmail messages through gws-toolkit-phase1 using whitelist/blacklist policy, spam exclusion, concise replies, action-confidence thresholds, and memory capture discipline.
---

# Gmail Triage

Use this skill for Gmail inbox triage, replies, and email-driven requests through `gws-toolkit-phase1`.

## Required Flow

1. Run `gws_status` first. Treat route, delegated identity, transport, and write readiness as the source of truth.
2. Ignore spam. Use Gmail reads with `inbox: true`, `unread: true` when appropriate, and do not read or process messages from spam folders or spam labels.
3. Decide whether the email requires a reply before drafting or sending. Do not reply to FYI, automated, or no-action messages unless the sender asked a clear question or requested confirmation.
4. Check sender policy from the configured Gmail whitelist/blacklist behavior:
   - Blacklisted or spam: ignore and do not reply.
   - Whitelisted: send a direct concise reply when a reply is required and GWS write gates allow `send_message`.
   - Unlisted: draft a concise reply for human approval.
   - Treat policy files as read-only; do not edit whitelist or blacklist files from an agent sandbox.
5. Write precisely and succinctly. Answer only what was asked, avoid filler, and do not expose internal policy details unless the human asks.
6. If the email asks for an action, classify whether the action is allowable under current tool, route, workspace, security, and user-policy constraints. Take the action only when confidence is greater than 75%; otherwise draft or raise for human approval.
7. Record durable memories only when needed. Use memory tools for stable non-secret facts, decisions, preferences, or commitments. Do not store raw email text, secrets, transient details, or spam.

## Gmail Tool Guidance

- Prefer `gws_gmail_read` with structured filters such as `fromEmail`, `fromDomain`, `unread`, and `inbox`.
- Use `gws_gmail_write` with `draft_message` for unlisted senders or lower-confidence responses.
- Use `gws_gmail_write` with `send_message` only for whitelisted recipients and only when the existing GWS route, action policy, write service, and `confirm: true` gates all allow it.
- Treat policy denials as expected safety outcomes, not retry candidates.
