import type { RequiredSkillInvocation } from "./types.js";

export const GMAIL_TRIAGE_SKILL_NAME = "gmail-triage";

export const GMAIL_TRIAGE_SKILL_INVOCATION: RequiredSkillInvocation = {
  name: GMAIL_TRIAGE_SKILL_NAME,
  timing: "before_reply_or_action",
  reason:
    "Gmail email content was read; read and follow gmail-triage before deciding whether to reply, draft, send, act, or record memory.",
};

export const GMAIL_TRIAGE_TOOL_DESCRIPTION =
  "Automatically requires the gmail-triage skill whenever Gmail email is read or handled.";
