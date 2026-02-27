import {
<<<<<<< HEAD
  getThreadBindingManager,
=======
  resolveAcpSessionCwd,
  resolveAcpThreadSessionDetailLines,
} from "../../../acp/runtime/session-identifiers.js";
import { readAcpSessionEntry } from "../../../acp/runtime/session-meta.js";
import {
  resolveDiscordThreadBindingIdleTimeoutMs,
  resolveDiscordThreadBindingMaxAgeMs,
>>>>>>> a7929abad (Discord: thread bindings idle + max-age lifecycle (#27845) (thanks @osolmaz))
  resolveThreadBindingIntroText,
  resolveThreadBindingThreadName,
} from "../../../discord/monitor/thread-bindings.js";
import type { CommandHandlerResult } from "../commands-types.js";
import {
  type SubagentsCommandContext,
  isDiscordSurface,
  resolveDiscordAccountId,
  resolveDiscordChannelIdForFocus,
  resolveFocusTargetSession,
  stopWithText,
} from "./shared.js";

export async function handleSubagentsFocusAction(
  ctx: SubagentsCommandContext,
): Promise<CommandHandlerResult> {
  const { params, runs, restTokens } = ctx;
  if (!isDiscordSurface(params)) {
    return stopWithText("⚠️ /focus is only available on Discord.");
  }

  const token = restTokens.join(" ").trim();
  if (!token) {
    return stopWithText("Usage: /focus <subagent-label|session-key|session-id|session-label>");
  }

  const accountId = resolveDiscordAccountId(params);
  const threadBindings = getThreadBindingManager(accountId);
  if (!threadBindings) {
    return stopWithText("⚠️ Discord thread bindings are unavailable for this account.");
  }

  const focusTarget = await resolveFocusTargetSession({ runs, token });
  if (!focusTarget) {
    return stopWithText(`⚠️ Unable to resolve focus target: ${token}`);
  }

  const currentThreadId =
    params.ctx.MessageThreadId != null ? String(params.ctx.MessageThreadId).trim() : "";
  const parentChannelId = currentThreadId ? undefined : resolveDiscordChannelIdForFocus(params);
  if (!currentThreadId && !parentChannelId) {
    return stopWithText("⚠️ Could not resolve a Discord channel for /focus.");
  }

  const senderId = params.command.senderId?.trim() || "";
  if (currentThreadId) {
    const existingBinding = threadBindings.getByThreadId(currentThreadId);
    if (
      existingBinding &&
      existingBinding.boundBy &&
      existingBinding.boundBy !== "system" &&
      senderId &&
      senderId !== existingBinding.boundBy
    ) {
      return stopWithText(`⚠️ Only ${existingBinding.boundBy} can refocus this thread.`);
    }
  }

  const label = focusTarget.label || token;
  const binding = await threadBindings.bindTarget({
    threadId: currentThreadId || undefined,
    channelId: parentChannelId,
    createThread: !currentThreadId,
    threadName: resolveThreadBindingThreadName({
      agentId: focusTarget.agentId,
      label,
    }),
    targetKind: focusTarget.targetKind,
    targetSessionKey: focusTarget.targetSessionKey,
    agentId: focusTarget.agentId,
    label,
    boundBy: senderId || "unknown",
    introText: resolveThreadBindingIntroText({
      agentId: focusTarget.agentId,
      label,
      sessionTtlMs: threadBindings.getSessionTtlMs(),
    }),
  });

<<<<<<< HEAD
  if (!binding) {
=======
  let binding;
  try {
    binding = await bindingService.bind({
      targetSessionKey: focusTarget.targetSessionKey,
      targetKind: focusTarget.targetKind === "acp" ? "session" : "subagent",
      conversation: {
        channel: "discord",
        accountId,
        conversationId,
      },
      placement,
      metadata: {
        threadName: resolveThreadBindingThreadName({
          agentId: focusTarget.agentId,
          label,
        }),
        agentId: focusTarget.agentId,
        label,
        boundBy: senderId || "unknown",
        introText: resolveThreadBindingIntroText({
          agentId: focusTarget.agentId,
          label,
          idleTimeoutMs: resolveDiscordThreadBindingIdleTimeoutMs({
            cfg: params.cfg,
            accountId,
          }),
          maxAgeMs: resolveDiscordThreadBindingMaxAgeMs({
            cfg: params.cfg,
            accountId,
          }),
          sessionCwd: focusTarget.targetKind === "acp" ? resolveAcpSessionCwd(acpMeta) : undefined,
          sessionDetails:
            focusTarget.targetKind === "acp"
              ? resolveAcpThreadSessionDetailLines({
                  sessionKey: focusTarget.targetSessionKey,
                  meta: acpMeta,
                })
              : [],
        }),
      },
    });
  } catch {
>>>>>>> a7929abad (Discord: thread bindings idle + max-age lifecycle (#27845) (thanks @osolmaz))
    return stopWithText("⚠️ Failed to bind a Discord thread to the target session.");
  }

  const actionText = currentThreadId
    ? `bound this thread to ${binding.targetSessionKey}`
    : `created thread ${binding.threadId} and bound it to ${binding.targetSessionKey}`;
  return stopWithText(`✅ ${actionText} (${binding.targetKind}).`);
}
