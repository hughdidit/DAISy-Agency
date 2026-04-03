import type { AgentMessage } from "@mariozechner/pi-agent-core";

type AssistantContentBlock = Extract<AgentMessage, { role: "assistant" }>["content"][number];
type AssistantMessage = Extract<AgentMessage, { role: "assistant" }>;
type DropThinkingBlocksOptions = {
  preserveLatestAssistantTurn?: boolean;
};

export function isAssistantMessageWithContent(message: AgentMessage): message is AssistantMessage {
  return (
    !!message &&
    typeof message === "object" &&
    message.role === "assistant" &&
    Array.isArray(message.content)
  );
}

/**
 * Strip all `type: "thinking"` content blocks from assistant messages.
 * Optionally preserve the latest assistant turn verbatim.
 *
 * If an assistant message becomes empty after stripping, it is replaced with
 * a synthetic `{ type: "text", text: "" }` block to preserve turn structure
 * (some providers require strict user/assistant alternation).
 *
 * Returns the original array reference when nothing was changed (callers can
 * use reference equality to skip downstream work).
 */
export function dropThinkingBlocks(
  messages: AgentMessage[],
  options?: DropThinkingBlocksOptions,
): AgentMessage[] {
  let latestAssistantIndex = -1;
  if (options?.preserveLatestAssistantTurn) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (isAssistantMessageWithContent(messages[i])) {
        latestAssistantIndex = i;
        break;
      }
    }
  }

  let touched = false;
  const out: AgentMessage[] = [];
  for (const [index, msg] of messages.entries()) {
    if (!isAssistantMessageWithContent(msg)) {
      out.push(msg);
      continue;
    }
    if (index === latestAssistantIndex) {
      out.push(msg);
      continue;
    }
    const nextContent: AssistantContentBlock[] = [];
    let changed = false;
    for (const block of msg.content) {
      if (block && typeof block === "object" && (block as { type?: unknown }).type === "thinking") {
        touched = true;
        changed = true;
        continue;
      }
      nextContent.push(block);
    }
    if (!changed) {
      out.push(msg);
      continue;
    }
    // Preserve the assistant turn even if all blocks were thinking-only.
    const content =
      nextContent.length > 0 ? nextContent : [{ type: "text", text: "" } as AssistantContentBlock];
    out.push({ ...msg, content });
  }
  return touched ? out : messages;
}
