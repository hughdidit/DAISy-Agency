import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChannelOutboundAdapter, ChannelPlugin } from "../../channels/plugins/types.js";
import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { createTestRegistry } from "../../test-utils/channel-plugins.js";
import { createIMessageTestPlugin } from "../../test-utils/imessage-test-plugin.js";
import { sendMessage, sendPoll } from "./message.js";

const setRegistry = (registry: ReturnType<typeof createTestRegistry>) => {
  setActivePluginRegistry(registry);
};

const callGatewayMock = vi.fn();
vi.mock("../../gateway/call.js", () => ({
  callGateway: (...args: unknown[]) => callGatewayMock(...args),
  randomIdempotencyKey: () => "idem-1",
}));

describe("sendMessage channel normalization", () => {
  beforeEach(() => {
    callGatewayMock.mockReset();
    setRegistry(emptyRegistry);
  });

  afterEach(() => {
    setRegistry(emptyRegistry);
  });

  it("normalizes Teams alias", async () => {
    const sendMSTeams = vi.fn(async () => ({
      messageId: "m1",
      conversationId: "c1",
    }));
    setRegistry(
      createTestRegistry([
        {
          pluginId: "msteams",
          source: "test",
          plugin: createMSTeamsPlugin({
            outbound: createMSTeamsOutbound(),
            aliases: ["teams"],
          }),
        },
      ]),
    );
    const result = await sendMessage({
      cfg: {},
      to: "conversation:19:abc@thread.tacv2",
      content: "hi",
      channel: "teams",
      deps: { sendMSTeams },
    });

    expect(sendMSTeams).toHaveBeenCalledWith("conversation:19:abc@thread.tacv2", "hi");
    expect(result.channel).toBe("msteams");
  });

  it("normalizes iMessage alias", async () => {
    const sendIMessage = vi.fn(async () => ({ messageId: "i1" }));
    setRegistry(
      createTestRegistry([
        {
          pluginId: "imessage",
          source: "test",
          plugin: createIMessageTestPlugin(),
        },
      ]),
    );
    const result = await sendMessage({
      cfg: {},
      to: "someone@example.com",
      content: "hi",
      channel: "imsg",
      deps: { sendIMessage },
    });

    expect(sendIMessage).toHaveBeenCalledWith("someone@example.com", "hi", expect.any(Object));
    expect(result.channel).toBe("imessage");
  });
});

<<<<<<< HEAD
=======
describe("sendMessage replyToId threading", () => {
  beforeEach(() => {
    callGatewayMock.mockReset();
    setRegistry(emptyRegistry);
  });

  afterEach(() => {
    setRegistry(emptyRegistry);
  });

  const setupMattermostCapture = () => {
    const capturedCtx: Record<string, unknown>[] = [];
    const plugin = createMattermostLikePlugin({
      onSendText: (ctx) => {
        capturedCtx.push(ctx);
      },
    });
    setRegistry(createTestRegistry([{ pluginId: "mattermost", source: "test", plugin }]));
    return capturedCtx;
  };

  it("passes replyToId through to the outbound adapter", async () => {
    const capturedCtx = setupMattermostCapture();

    await sendMessage({
      cfg: {},
      to: "channel:town-square",
      content: "thread reply",
      channel: "mattermost",
      replyToId: "post123",
    });

    expect(capturedCtx).toHaveLength(1);
    expect(capturedCtx[0]?.replyToId).toBe("post123");
  });

  it("passes threadId through to the outbound adapter", async () => {
    const capturedCtx = setupMattermostCapture();

    await sendMessage({
      cfg: {},
      to: "channel:town-square",
      content: "topic reply",
      channel: "mattermost",
      threadId: "topic456",
    });

    expect(capturedCtx).toHaveLength(1);
    expect(capturedCtx[0]?.threadId).toBe("topic456");
  });
});

>>>>>>> de7d94d9e (perf(test): remove resetModules from config/sandbox/message suites)
describe("sendPoll channel normalization", () => {
  beforeEach(() => {
    callGatewayMock.mockReset();
    setRegistry(emptyRegistry);
  });

  afterEach(() => {
    setRegistry(emptyRegistry);
  });

  it("normalizes Teams alias for polls", async () => {
    callGatewayMock.mockResolvedValueOnce({ messageId: "p1" });
    setRegistry(
      createTestRegistry([
        {
          pluginId: "msteams",
          source: "test",
          plugin: createMSTeamsPlugin({
            aliases: ["teams"],
            outbound: createMSTeamsOutbound({ includePoll: true }),
          }),
        },
      ]),
    );

    const result = await sendPoll({
      cfg: {},
      to: "conversation:19:abc@thread.tacv2",
      question: "Lunch?",
      options: ["Pizza", "Sushi"],
      channel: "Teams",
    });

    const call = callGatewayMock.mock.calls[0]?.[0] as {
      params?: Record<string, unknown>;
    };
    expect(call?.params?.channel).toBe("msteams");
    expect(result.channel).toBe("msteams");
  });
});

const emptyRegistry = createTestRegistry([]);

const createMSTeamsOutbound = (opts?: { includePoll?: boolean }): ChannelOutboundAdapter => ({
  deliveryMode: "direct",
  sendText: async ({ deps, to, text }) => {
    const send = deps?.sendMSTeams;
    if (!send) {
      throw new Error("sendMSTeams missing");
    }
    const result = await send(to, text);
    return { channel: "msteams", ...result };
  },
  sendMedia: async ({ deps, to, text, mediaUrl }) => {
    const send = deps?.sendMSTeams;
    if (!send) {
      throw new Error("sendMSTeams missing");
    }
    const result = await send(to, text, { mediaUrl });
    return { channel: "msteams", ...result };
  },
  ...(opts?.includePoll
    ? {
        pollMaxOptions: 12,
        sendPoll: async () => ({ channel: "msteams", messageId: "p1" }),
      }
    : {}),
});

const createMSTeamsPlugin = (params: {
  aliases?: string[];
  outbound: ChannelOutboundAdapter;
}): ChannelPlugin => ({
  id: "msteams",
  meta: {
    id: "msteams",
    label: "Microsoft Teams",
    selectionLabel: "Microsoft Teams (Bot Framework)",
    docsPath: "/channels/msteams",
    blurb: "Bot Framework; enterprise support.",
    aliases: params.aliases,
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: () => [],
    resolveAccount: () => ({}),
  },
  outbound: params.outbound,
});
