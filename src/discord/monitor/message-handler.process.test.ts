<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

=======
>>>>>>> 93ca0ed54 (refactor(channels): dedupe transport and gateway test scaffolds)
=======
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
>>>>>>> 7c240a2b5 (feat(discord): faster reaction status state machine (watchdog + debounce) (#18248))
=======
>>>>>>> 05bfb7f9f (refactor(test): reuse discord message handler base context harness)
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBaseDiscordMessageContext } from "./message-handler.test-harness.js";

const reactMessageDiscord = vi.fn(async () => {});
const removeReactionDiscord = vi.fn(async () => {});
const dispatchInboundMessage = vi.fn(async () => ({
  queuedFinal: false,
  counts: { final: 0, tool: 0, block: 0 },
}));

vi.mock("../send.js", () => ({
  reactMessageDiscord: (...args: unknown[]) => reactMessageDiscord(...args),
  removeReactionDiscord: (...args: unknown[]) => removeReactionDiscord(...args),
}));

vi.mock("../../auto-reply/dispatch.js", () => ({
  dispatchInboundMessage: (...args: unknown[]) => dispatchInboundMessage(...args),
}));

vi.mock("../../auto-reply/reply/reply-dispatcher.js", () => ({
  createReplyDispatcherWithTyping: vi.fn(() => ({
    dispatcher: {
      sendToolResult: vi.fn(() => true),
      sendBlockReply: vi.fn(() => true),
      sendFinalReply: vi.fn(() => true),
      waitForIdle: vi.fn(async () => {}),
      getQueuedCounts: vi.fn(() => ({ tool: 0, block: 0, final: 0 })),
      markComplete: vi.fn(),
    },
    replyOptions: {},
    markDispatchIdle: vi.fn(),
  })),
}));

import { processDiscordMessage } from "./message-handler.process.js";

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
async function createBaseContext(overrides: Record<string, unknown> = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-discord-"));
=======
async function createBaseContext(overrides: Record<string, unknown> = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-discord-"));
>>>>>>> 7c240a2b5 (feat(discord): faster reaction status state machine (watchdog + debounce) (#18248))
  const storePath = path.join(dir, "sessions.json");
  return {
    cfg: { messages: { ackReaction: "👀" }, session: { store: storePath } },
    discordConfig: {},
    accountId: "default",
    token: "token",
    runtime: { log: () => {}, error: () => {} },
    guildHistories: new Map(),
    historyLimit: 0,
    mediaMaxBytes: 1024,
    textLimit: 4000,
    replyToMode: "off",
    ackReactionScope: "group-mentions",
    groupPolicy: "open",
    data: { guild: { id: "g1", name: "Guild" } },
    client: { rest: {} },
    message: {
      id: "m1",
      channelId: "c1",
      timestamp: new Date().toISOString(),
      attachments: [],
    },
    messageChannelId: "c1",
    author: {
      id: "U1",
      username: "alice",
      discriminator: "0",
      globalName: "Alice",
    },
    channelInfo: { name: "general" },
    channelName: "general",
    isGuildMessage: true,
    isDirectMessage: false,
    isGroupDm: false,
    commandAuthorized: true,
    baseText: "hi",
    messageText: "hi",
    wasMentioned: false,
    shouldRequireMention: true,
    canDetectMention: true,
    effectiveWasMentioned: true,
    shouldBypassMention: false,
    threadChannel: null,
    threadParentId: undefined,
    threadParentName: undefined,
    threadParentType: undefined,
    threadName: undefined,
    displayChannelSlug: "general",
    guildInfo: null,
    guildSlug: "guild",
    channelConfig: null,
    baseSessionKey: "agent:main:discord:guild:g1",
    route: {
      agentId: "main",
      channel: "discord",
      accountId: "default",
      sessionKey: "agent:main:discord:guild:g1",
      mainSessionKey: "agent:main:main",
    },
<<<<<<< HEAD
=======
    sender: { label: "user" },
>>>>>>> 7c240a2b5 (feat(discord): faster reaction status state machine (watchdog + debounce) (#18248))
    ...overrides,
  };
}
=======
const createBaseContext = createBaseDiscordMessageContext;
>>>>>>> 05bfb7f9f (refactor(test): reuse discord message handler base context harness)

<<<<<<< HEAD
=======
>>>>>>> 93ca0ed54 (refactor(channels): dedupe transport and gateway test scaffolds)
=======
>>>>>>> 7c240a2b5 (feat(discord): faster reaction status state machine (watchdog + debounce) (#18248))
beforeEach(() => {
  vi.useRealTimers();
  reactMessageDiscord.mockClear();
  removeReactionDiscord.mockClear();
  dispatchInboundMessage.mockReset();
  dispatchInboundMessage.mockResolvedValue({
    queuedFinal: false,
    counts: { final: 0, tool: 0, block: 0 },
  });
});

describe("processDiscordMessage ack reactions", () => {
  it("skips ack reactions for group-mentions when mentions are not required", async () => {
    const ctx = await createBaseContext({
      shouldRequireMention: false,
      effectiveWasMentioned: false,
    });

    // oxlint-disable-next-line typescript/no-explicit-any
    await processDiscordMessage(ctx as any);

    expect(reactMessageDiscord).not.toHaveBeenCalled();
  });

  it("sends ack reactions for mention-gated guild messages when mentioned", async () => {
    const ctx = await createBaseContext({
      shouldRequireMention: true,
      effectiveWasMentioned: true,
    });

    // oxlint-disable-next-line typescript/no-explicit-any
    await processDiscordMessage(ctx as any);

    expect(reactMessageDiscord.mock.calls[0]).toEqual(["c1", "m1", "👀", { rest: {} }]);
  });

  it("uses preflight-resolved messageChannelId when message.channelId is missing", async () => {
    const ctx = await createBaseContext({
      message: {
        id: "m1",
        timestamp: new Date().toISOString(),
        attachments: [],
      },
      messageChannelId: "fallback-channel",
      shouldRequireMention: true,
      effectiveWasMentioned: true,
    });

    // oxlint-disable-next-line typescript/no-explicit-any
    await processDiscordMessage(ctx as any);

    expect(reactMessageDiscord.mock.calls[0]).toEqual([
      "fallback-channel",
      "m1",
      "👀",
      { rest: {} },
    ]);
  });

  it("debounces intermediate phase reactions and jumps to done for short runs", async () => {
    dispatchInboundMessage.mockImplementationOnce(
      async (params: {
        replyOptions?: {
          onReasoningStream?: () => Promise<void> | void;
          onToolStart?: (payload: { name?: string }) => Promise<void> | void;
        };
      }) => {
        await params.replyOptions?.onReasoningStream?.();
        await params.replyOptions?.onToolStart?.({ name: "exec" });
        return { queuedFinal: false, counts: { final: 0, tool: 0, block: 0 } };
      },
    );

    const ctx = await createBaseContext();

    // oxlint-disable-next-line typescript/no-explicit-any
    await processDiscordMessage(ctx as any);

    const emojis = reactMessageDiscord.mock.calls.map((call) => call[2]);
    expect(emojis).toContain("👀");
    expect(emojis).toContain("✅");
    expect(emojis).not.toContain("🧠");
    expect(emojis).not.toContain("💻");
  });

  it("shows stall emojis for long no-progress runs", async () => {
    vi.useFakeTimers();
    dispatchInboundMessage.mockImplementationOnce(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 31_000);
      });
      return { queuedFinal: false, counts: { final: 0, tool: 0, block: 0 } };
    });

    const ctx = await createBaseContext();
    // oxlint-disable-next-line typescript/no-explicit-any
    const runPromise = processDiscordMessage(ctx as any);

    let settled = false;
    void runPromise.finally(() => {
      settled = true;
    });
    for (let i = 0; i < 120 && !settled; i++) {
      await vi.advanceTimersByTimeAsync(1_000);
    }

    await runPromise;
    const emojis = reactMessageDiscord.mock.calls.map((call) => call[2]);
    expect(emojis).toContain("⏳");
    expect(emojis).toContain("⚠️");
    expect(emojis).toContain("✅");
  });
});
