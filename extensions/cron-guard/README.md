# Cron Guard Plugin

Cron Guard provides read-only cron visibility for agents and routes cron write intents through a human approval queue before any live mutation occurs.

## Purpose

- `cron_guard_status` and `cron_guard_list` expose redacted, read-only cron state.
- `cron_guard_add_request`, `cron_guard_update_request`, and `cron_guard_remove_request` create approval requests instead of mutating cron immediately.
- Approvers resolve pending requests through plugin commands and, when enabled, Discord interactive actions.

## Setup

1. Enable the plugin under `plugins.entries.cron-guard`.
2. Configure `approvers` with channel-scoped principals such as `discord:123456789`.
3. Deny raw `cron` for the target agent and allow only the `cron_guard_*` tools.

## Operating Model

1. Agent creates a guarded request.
2. Request is persisted under the gateway state directory.
3. Human approver reviews, optionally modifies, then approves or denies.
4. Approved requests apply through the existing live cron service.
