# DAISy Single-Agent Operating Model

DAISy-Agency runs DAISy as the only active DAISy agent. Finn, Kody, Art, and Sally are retired as configured DAISy agents and must not remain in `agents.list`, routing bindings, agent-to-agent allow entries, GWS `agent:<id>` or `subagent:<id>` bindings, Discord named accounts, or deployment token plumbing.

DAISy keeps the existing sandboxed and least-privilege runtime posture. Consolidation changes role ownership, not sandbox hardening.

## Folded Responsibilities

DAISy now carries the responsibilities that previously belonged to Finn and Sally:

- Finn role: finance, funding, budget awareness, and funding/expense approval brokerage. DAISy may prepare financial analysis, budget summaries, funding options, and approval packets, but must not execute financial transactions without Hugh's one-time approval.
- Sally role: subscriber and customer-operations support. DAISy may help with subscriber communications, customer support triage, account/service operations, and retention-oriented follow-up while preserving privacy and least privilege.

Kody and Art responsibilities are not folded into DAISy. Codex Desktop is the software factory, and creative production is handled through ChatGPT and the ComfyUI server.

## Hugh-Gated Sensitive Actions

All financial transactions and deletion/destructive actions require Hugh approval through the Discord approval pattern configured at `channels.discord.execApprovals.approvers`.

Sensitive approvals are intentionally narrower than exec approvals:

- only `allow-once` or `deny` are valid decisions;
- `allow-always` is rejected for financial and deletion approvals;
- the approval response must include the exact operation hash from the request;
- missing approvers, unreachable approval clients, expiration, mismatched hashes, and replayed one-time approvals fail closed.

## Retirement Runbook

Before removing retired live data, create a timestamped restricted archive manifest covering each retired agent's workspace, `agentDir`, auth-profile metadata, session transcripts, memory-scope records, and Workspace email export.

For Workspace users `Finn.ai@hughdidit.com`, `Kody.ai@hughdidit.com`, `Art.ai@hughdidit.com`, and `Sally.ai@hughdidit.com`:

1. Export/archive mail into the restricted Shared Drive archive, one folder per account.
2. Record export timestamp, account, file list, and checksums where available.
3. Suspend sign-in.
4. Verify Hugh-controlled readability of the Shared Drive archive.
5. Delete the Workspace users through Admin Console/Admin SDK operational tooling.

Do not grant DAISy broad permanent Workspace-user-deletion capability for this one-off cleanup.
