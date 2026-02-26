import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

<<<<<<< HEAD
const reactMessageDiscord = vi.fn(async () => {});
const removeReactionDiscord = vi.fn(async () => {});
=======
const sendMocks = vi.hoisted(() => ({
  reactMessageDiscord: vi.fn(async () => {}),
  removeReactionDiscord: vi.fn(async () => {}),
}));
function createMockDraftStream() {
  return {
    update: vi.fn<(text: string) => void>(() => {}),
    flush: vi.fn(async () => {}),
    messageId: vi.fn(() => "preview-1"),
    clear: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    forceNewMessage: vi.fn(() => {}),
  };
}

const deliveryMocks = vi.hoisted(() => ({
  editMessageDiscord: vi.fn(async () => ({})),
  deliverDiscordReply: vi.fn(async () => {}),
  createDiscordDraftStream: vi.fn(() => createMockDraftStream()),
}));
const editMessageDiscord = deliveryMocks.editMessageDiscord;
const deliverDiscordReply = deliveryMocks.deliverDiscordReply;
const createDiscordDraftStream = deliveryMocks.createDiscordDraftStream;
type DispatchInboundParams = {
  dispatcher: {
    sendBlockReply: (payload: {
      text?: string;
      isReasoning?: boolean;
    }) => boolean | Promise<boolean>;
    sendFinalReply: (payload: {
      text?: string;
      isReasoning?: boolean;
    }) => boolean | Promise<boolean>;
  };
  replyOptions?: {
    onReasoningStream?: () => Promise<void> | void;
    onReasoningEnd?: () => Promise<void> | void;
    onToolStart?: (payload: { name?: string }) => Promise<void> | void;
    onPartialReply?: (payload: { text?: string }) => Promise<void> | void;
    onAssistantMessageStart?: () => Promise<void> | void;
  };
};
const dispatchInboundMessage = vi.fn(async (_params?: DispatchInboundParams) => ({
  queuedFinal: false,
  counts: { final: 0, tool: 0, block: 0 },
}));
const recordInboundSession = vi.fn(async () => {});
const configSessionsMocks = vi.hoisted(() => ({
  readSessionUpdatedAt: vi.fn(() => undefined),
  resolveStorePath: vi.fn(() => "/tmp/openclaw-discord-process-test-sessions.json"),
}));
const readSessionUpdatedAt = configSessionsMocks.readSessionUpdatedAt;
const resolveStorePath = configSessionsMocks.resolveStorePath;
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))

vi.mock("../send.js", () => ({
  reactMessageDiscord: (...args: unknown[]) => reactMessageDiscord(...args),
  removeReactionDiscord: (...args: unknown[]) => removeReactionDiscord(...args),
}));

vi.mock("../../auto-reply/reply/dispatch-from-config.js", () => ({
  dispatchReplyFromConfig: vi.fn(async () => ({
    queuedFinal: false,
    counts: { final: 0, tool: 0, block: 0 },
  })),
}));

vi.mock("../../auto-reply/reply/reply-dispatcher.js", () => ({
  createReplyDispatcherWithTyping: vi.fn(() => ({
    dispatcher: {},
    replyOptions: {},
    markDispatchIdle: vi.fn(),
  })),
}));

import { processDiscordMessage } from "./message-handler.process.js";

<<<<<<< HEAD
async function createBaseContext(overrides: Record<string, unknown> = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-discord-"));
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
    ...overrides,
  };
}
=======
vi.mock("../../config/sessions.js", () => ({
  readSessionUpdatedAt: configSessionsMocks.readSessionUpdatedAt,
  resolveStorePath: configSessionsMocks.resolveStorePath,
}));

const { processDiscordMessage } = await import("./message-handler.process.js");

const createBaseContext = createBaseDiscordMessageContext;
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))

beforeEach(() => {
  reactMessageDiscord.mockClear();
  removeReactionDiscord.mockClear();
});

describe("processDiscordMessage ack reactions", () => {
  it("skips ack reactions for group-mentions when mentions are not required", async () => {
    const ctx = await createBaseContext({
      shouldRequireMention: false,
      effectiveWasMentioned: false,
    });

    await processDiscordMessage(ctx as any);

    expect(reactMessageDiscord).not.toHaveBeenCalled();
  });

  it("sends ack reactions for mention-gated guild messages when mentioned", async () => {
    const ctx = await createBaseContext({
      shouldRequireMention: true,
      effectiveWasMentioned: true,
    });

    await processDiscordMessage(ctx as any);

    expect(reactMessageDiscord).toHaveBeenCalledWith("c1", "m1", "👀", { rest: {} });
  });
});
