import type { Client } from "@buape/carbon";
import { ChannelType, MessageType } from "@buape/carbon";
import { Routes } from "discord-api-types/v10";
import { beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD:src/discord/monitor.tool-result.accepts-guild-messages-mentionpatterns-match.test.ts

import { createReplyDispatcherWithTyping } from "../auto-reply/reply/reply-dispatcher.js";
>>>>>>> 9131b22a2 (test: migrate suites to e2e coverage layout):src/discord/monitor.tool-result.accepts-guild-messages-mentionpatterns-match.e2e.test.ts
import { __resetDiscordChannelInfoCacheForTest } from "./monitor/message-utils.js";
import { createNoopThreadBindingManager } from "./monitor/thread-bindings.js";
const loadConfigMock = vi.fn();

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: (...args: unknown[]) => loadConfigMock(...args),
  };
});
vi.mock("../config/sessions.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/sessions.js")>();
  return {
    ...actual,
    resolveStorePath: vi.fn(() => "/tmp/moltbot-sessions.json"),
    updateLastRoute: (...args: unknown[]) => updateLastRouteMock(...args),
    resolveSessionKey: vi.fn(),
  };
});

beforeEach(() => {
  vi.useRealTimers();
  sendMock.mockClear().mockResolvedValue(undefined);
  updateLastRouteMock.mockClear();
  dispatchMock.mockClear().mockImplementation(async (params: unknown) => {
    if (
      typeof params === "object" &&
      params !== null &&
      "dispatcher" in params &&
      typeof params.dispatcher === "object" &&
      params.dispatcher !== null &&
      "sendFinalReply" in params.dispatcher &&
      typeof params.dispatcher.sendFinalReply === "function"
    ) {
      params.dispatcher.sendFinalReply({ text: "hi" });
      return { queuedFinal: true, counts: { tool: 0, block: 0, final: 1 } };
    }
    if (
      typeof params === "object" &&
      params !== null &&
      "dispatcherOptions" in params &&
      params.dispatcherOptions
    ) {
      const { dispatcher, markDispatchIdle } = createReplyDispatcherWithTyping(
        params.dispatcherOptions as Parameters<typeof createReplyDispatcherWithTyping>[0],
      );
      dispatcher.sendFinalReply({ text: "final reply" });
      await dispatcher.waitForIdle();
      markDispatchIdle();
      return { queuedFinal: true, counts: dispatcher.getQueuedCounts() };
    }
    return { queuedFinal: false, counts: { tool: 0, block: 0, final: 0 } };
  });
  readAllowFromStoreMock.mockClear().mockResolvedValue([]);
  upsertPairingRequestMock.mockClear().mockResolvedValue({ code: "PAIRCODE", created: true });
  loadConfigMock.mockClear().mockReturnValue({});
  __resetDiscordChannelInfoCacheForTest();
});

describe("discord tool result dispatch", () => {
  it("accepts guild messages when mentionPatterns match", async () => {
    const { createDiscordMessageHandler } = await import("./monitor.js");
    const cfg = {
      agents: {
        defaults: {
          model: "anthropic/claude-opus-4-5",
          workspace: "/tmp/clawd",
        },
      },
      session: { store: "/tmp/moltbot-sessions.json" },
      channels: {
        discord: {
          dm: { enabled: true, policy: "open" },
          groupPolicy: "open",
          guilds: { "*": { requireMention: true } },
        },
      },
      messages: {
        responsePrefix: "PFX",
        groupChat: { mentionPatterns: ["\\bclawd\\b"] },
      },
    } as ReturnType<typeof import("../config/config.js").loadConfig>;
=======
      const cfg = createMentionRequiredGuildConfig({
        messages: {
          responsePrefix: "PFX",
          groupChat: { mentionPatterns: ["\\bopenclaw\\b"] },
        },
      });
>>>>>>> 296b19e41 (test: dedupe gateway browser discord and channel coverage)

    const handler = createDiscordMessageHandler({
      cfg,
      discordConfig: cfg.channels.discord,
      accountId: "default",
      token: "token",
      runtime: {
        log: vi.fn(),
        error: vi.fn(),
        exit: (code: number): never => {
          throw new Error(`exit ${code}`);
        },
      },
      botUserId: "bot-id",
      guildHistories: new Map(),
      historyLimit: 0,
      mediaMaxBytes: 10_000,
      textLimit: 2000,
      replyToMode: "off",
      dmEnabled: true,
      groupDmEnabled: false,
      guildEntries: { "*": { requireMention: true } },
    });

    const client = {
      fetchChannel: vi.fn().mockResolvedValue({
        type: ChannelType.GuildText,
        name: "general",
      }),
    } as unknown as Client;

    await handler(
      {
        message: {
          id: "m2",
          content: "clawd: hello",
          channelId: "c1",
          timestamp: new Date().toISOString(),
          type: MessageType.Default,
          attachments: [],
          embeds: [],
          mentionedEveryone: false,
          mentionedUsers: [],
          mentionedRoles: [],
          author: { id: "u1", bot: false, username: "Ada" },
        },
        author: { id: "u1", bot: false, username: "Ada" },
        member: { nickname: "Ada" },
        guild: { id: "g1", name: "Guild" },
        guild_id: "g1",
      },
      client,
    );
=======
      const client = createGuildTextClient();

      await handler(
        createGuildMessageEvent({ messageId: "m2", content: "openclaw: hello" }),
        client,
      );
>>>>>>> 296b19e41 (test: dedupe gateway browser discord and channel coverage)

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
  }, 20_000);

  it("accepts guild messages when mentionPatterns match even if another user is mentioned", async () => {
    const { createDiscordMessageHandler } = await import("./monitor.js");
    const cfg = {
      agents: {
        defaults: {
          model: "anthropic/claude-opus-4-5",
          workspace: "/tmp/clawd",
        },
      },
      session: { store: "/tmp/moltbot-sessions.json" },
      channels: {
        discord: {
          dm: { enabled: true, policy: "open" },
          groupPolicy: "open",
          guilds: { "*": { requireMention: true } },
        },
      },
      messages: {
        responsePrefix: "PFX",
        groupChat: { mentionPatterns: ["\\bclawd\\b"] },
      },
    } as ReturnType<typeof import("../config/config.js").loadConfig>;

    const handler = createDiscordMessageHandler({
      cfg,
      discordConfig: cfg.channels.discord,
      accountId: "default",
      token: "token",
      runtime: {
        log: vi.fn(),
        error: vi.fn(),
        exit: (code: number): never => {
          throw new Error(`exit ${code}`);
        },
      },
      botUserId: "bot-id",
      guildHistories: new Map(),
      historyLimit: 0,
      mediaMaxBytes: 10_000,
      textLimit: 2000,
      replyToMode: "off",
      dmEnabled: true,
      groupDmEnabled: false,
      guildEntries: { "*": { requireMention: true } },
    });

    const client = {
      fetchChannel: vi.fn().mockResolvedValue({
        type: ChannelType.GuildText,
        name: "general",
      }),
    } as unknown as Client;

    await handler(
      {
        message: {
          id: "m2",
          content: "clawd: hello",
          channelId: "c1",
          timestamp: new Date().toISOString(),
          type: MessageType.Default,
          attachments: [],
          embeds: [],
          mentionedEveryone: false,
          mentionedUsers: [{ id: "u2", bot: false, username: "Bea" }],
          mentionedRoles: [],
          author: { id: "u1", bot: false, username: "Ada" },
        },
        author: { id: "u1", bot: false, username: "Ada" },
        member: { nickname: "Ada" },
        guild: { id: "g1", name: "Guild" },
        guild_id: "g1",
      },
      client,
    );

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
  }, 20_000);

  it("accepts guild reply-to-bot messages as implicit mentions", async () => {
    const cfg = {
      agents: {
        defaults: {
          model: "anthropic/claude-opus-4-5",
          workspace: "/tmp/clawd",
        },
      },
      session: { store: "/tmp/moltbot-sessions.json" },
      channels: {
        discord: {
          dm: { enabled: true, policy: "open" },
          groupPolicy: "open",
          guilds: { "*": { requireMention: true } },
        },
      },
    } as ReturnType<typeof import("../config/config.js").loadConfig>;

    const handler = await createHandler(cfg);
    const client = createGuildTextClient();

    await handler(
      createGuildMessageEvent({
        messageId: "m3",
        content: "following up",
        messagePatch: {
          referencedMessage: {
            id: "m2",
            channelId: "c1",
            content: "bot reply",
            timestamp: new Date().toISOString(),
            type: MessageType.Default,
            attachments: [],
            embeds: [],
            mentionedEveryone: false,
            mentionedUsers: [],
            mentionedRoles: [],
            author: { id: "bot-id", bot: true, username: "Moltbot" },
          },
        },
        eventPatch: {
          channel: { id: "c1", type: ChannelType.GuildText },
          client,
          data: {
            id: "m3",
            content: "following up",
            channel_id: "c1",
            guild_id: "g1",
            type: MessageType.Default,
            mentions: [],
          },
        },
      }),
      client,
    );

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const payload = dispatchMock.mock.calls[0]?.[0]?.ctx as Record<string, unknown>;
    expect(payload.WasMentioned).toBe(true);
  });

  it("forks thread sessions and injects starter context", async () => {
    let capturedCtx:
      | {
          SessionKey?: string;
          ParentSessionKey?: string;
          ThreadStarterBody?: string;
          ThreadLabel?: string;
        }
      | undefined;
    dispatchMock.mockImplementationOnce(async ({ ctx, dispatcher }) => {
      capturedCtx = ctx;
      dispatcher.sendFinalReply({ text: "hi" });
      return { queuedFinal: true, counts: { final: 1 } };
    });

    const cfg = {
      agents: {
        defaults: {
          model: "anthropic/claude-opus-4-5",
          workspace: "/tmp/clawd",
        },
      },
      session: { store: "/tmp/moltbot-sessions.json" },
      messages: { responsePrefix: "PFX" },
      channels: {
        discord: {
          dm: { enabled: true, policy: "open" },
          groupPolicy: "open",
          guilds: { "*": { requireMention: false } },
        },
      },
    } as ReturnType<typeof import("../config/config.js").loadConfig>;

    const handler = await createHandler(cfg);
    const threadChannel = createThreadChannel({ includeStarter: true });
    const client = createThreadClient();
    await handler(createThreadEvent("m4", threadChannel), client);

    const capturedCtx = getCapturedCtx();
    expect(capturedCtx?.SessionKey).toBe("agent:main:discord:channel:t1");
    expect(capturedCtx?.ParentSessionKey).toBe("agent:main:discord:channel:p1");
    expect(capturedCtx?.ThreadStarterBody).toContain("starter message");
    expect(capturedCtx?.ThreadLabel).toContain("Discord thread #general");
  });

  it("skips thread starter context when disabled", async () => {
    const getCapturedCtx = captureNextDispatchCtx<{ ThreadStarterBody?: string }>();
    const cfg = {
      ...createDefaultThreadConfig(),
      channels: {
        discord: {
          dm: { enabled: true, policy: "open" },
          groupPolicy: "open",
          guilds: {
            "*": {
              requireMention: false,
              channels: {
                "*": { includeThreadStarter: false },
              },
            },
          },
        },
      },
    } as LoadedConfig;
    const handler = await createHandler(cfg);
    const threadChannel = createThreadChannel();
    const client = createThreadClient();
    await handler(createThreadEvent("m7", threadChannel), client);

    const capturedCtx = getCapturedCtx();
    expect(capturedCtx?.ThreadStarterBody).toBeUndefined();
  });

  it("treats forum threads as distinct sessions without channel payloads", async () => {
    const getCapturedCtx = captureNextDispatchCtx<{
      SessionKey?: string;
      ParentSessionKey?: string;
      ThreadStarterBody?: string;
      ThreadLabel?: string;
    }>();

    const cfg = {
      agent: { model: "anthropic/claude-opus-4-5", workspace: "/tmp/clawd" },
      session: { store: "/tmp/moltbot-sessions.json" },
      channels: {
        discord: {
          dm: { enabled: true, policy: "open" },
          groupPolicy: "open",
          guilds: { "*": { requireMention: false } },
        },
      },
      routing: { allowFrom: [] },
    } as ReturnType<typeof import("../config/config.js").loadConfig>;

    const handler = await createHandler(cfg);

    const fetchChannel = vi
      .fn()
      .mockResolvedValueOnce({
        type: ChannelType.PublicThread,
        name: "topic-1",
        parentId: "forum-1",
      })
      .mockResolvedValueOnce({
        type: ChannelType.GuildForum,
        name: "support",
      });
    const restGet = vi.fn().mockResolvedValue({
      content: "starter message",
      author: { id: "u1", username: "Alice", discriminator: "0001" },
      timestamp: new Date().toISOString(),
    });
    const client = createThreadClient({ fetchChannel, restGet });
    await handler(createThreadEvent("m6"), client);

    const capturedCtx = getCapturedCtx();
    expect(capturedCtx?.SessionKey).toBe("agent:main:discord:channel:t1");
    expect(capturedCtx?.ParentSessionKey).toBe("agent:main:discord:channel:forum-1");
    expect(capturedCtx?.ThreadStarterBody).toContain("starter message");
    expect(capturedCtx?.ThreadLabel).toContain("Discord thread #support");
    expect(restGet).toHaveBeenCalledWith(Routes.channelMessage("t1", "t1"));
  });

  it("scopes thread sessions to the routed agent", async () => {
    const getCapturedCtx = captureNextDispatchCtx<{
      SessionKey?: string;
      ParentSessionKey?: string;
    }>();

    const cfg = {
      agents: {
        defaults: {
          model: "anthropic/claude-opus-4-5",
          workspace: "/tmp/clawd",
        },
      },
      session: { store: "/tmp/moltbot-sessions.json" },
      messages: { responsePrefix: "PFX" },
      channels: {
        discord: {
          dm: { enabled: true, policy: "open" },
          groupPolicy: "open",
          guilds: { "*": { requireMention: false } },
        },
      },
      bindings: [{ agentId: "support", match: { channel: "discord", guildId: "g1" } }],
    } as LoadedConfig;
    loadConfigMock.mockReturnValue(cfg);

    const handler = await createHandler(cfg);

    const threadChannel = createThreadChannel();
    const client = createThreadClient();
    await handler(createThreadEvent("m5", threadChannel), client);

    const capturedCtx = getCapturedCtx();
    expect(capturedCtx?.SessionKey).toBe("agent:support:discord:channel:t1");
    expect(capturedCtx?.ParentSessionKey).toBe("agent:support:discord:channel:p1");
  });
});
