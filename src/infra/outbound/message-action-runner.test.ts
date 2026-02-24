import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MoltbotConfig } from "../../config/config.js";
import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { createIMessageTestPlugin, createTestRegistry } from "../../test-utils/channel-plugins.js";
import { slackPlugin } from "../../../extensions/slack/src/channel.js";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
import { whatsappPlugin } from "../../../extensions/whatsapp/src/channel.js";
import { loadWebMedia } from "../../web/media.js";
import { runMessageAction } from "./message-action-runner.js";
import { jsonResult } from "../../agents/tools/common.js";
import type { ChannelPlugin } from "../../channels/plugins/types.js";

vi.mock("../../web/media.js", async () => {
  const actual = await vi.importActual<typeof import("../../web/media.js")>("../../web/media.js");
  return {
    ...actual,
    loadWebMedia: vi.fn(actual.loadWebMedia),
  };
});

const slackConfig = {
  channels: {
    slack: {
      botToken: "xoxb-test",
      appToken: "xapp-test",
    },
  },
} as MoltbotConfig;

const whatsappConfig = {
  channels: {
    whatsapp: {
      allowFrom: ["*"],
    },
  },
} as MoltbotConfig;

describe("runMessageAction context isolation", () => {
  beforeEach(async () => {
    const { createPluginRuntime } = await import("../../plugins/runtime/index.js");
    const { setSlackRuntime } = await import("../../../extensions/slack/src/runtime.js");
    const { setTelegramRuntime } = await import("../../../extensions/telegram/src/runtime.js");
    const { setWhatsAppRuntime } = await import("../../../extensions/whatsapp/src/runtime.js");
    const runtime = createPluginRuntime();
    setSlackRuntime(runtime);
    setTelegramRuntime(runtime);
    setWhatsAppRuntime(runtime);
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "slack",
          source: "test",
          plugin: slackPlugin,
        },
        {
          pluginId: "whatsapp",
          source: "test",
          plugin: whatsappPlugin,
        },
        {
          pluginId: "telegram",
          source: "test",
          plugin: telegramPlugin,
        },
        {
          pluginId: "imessage",
          source: "test",
          plugin: createIMessageTestPlugin(),
        },
      ]),
    );
  });

  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
  });

  it("allows send when target matches current channel", async () => {
    const result = await runMessageAction({
      cfg: slackConfig,
      action: "send",
      params: {
        channel: "slack",
        target: "#C12345678",
        message: "hi",
      },
      toolContext: { currentChannelId: "C12345678" },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
  });

  it("accepts legacy to parameter for send", async () => {
    const result = await runMessageAction({
      cfg: slackConfig,
      action: "send",
      params: {
        channel: "slack",
        to: "#C12345678",
        message: "hi",
      },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
  });

  it("defaults to current channel when target is omitted", async () => {
    const result = await runMessageAction({
      cfg: slackConfig,
      action: "send",
      params: {
        channel: "slack",
        message: "hi",
      },
      toolContext: { currentChannelId: "C12345678" },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
  });

  it("allows media-only send when target matches current channel", async () => {
    const result = await runMessageAction({
      cfg: slackConfig,
      action: "send",
      params: {
        channel: "slack",
        target: "#C12345678",
        media: "https://example.com/note.ogg",
      },
      toolContext: { currentChannelId: "C12345678" },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
  });

  it("requires message when no media hint is provided", async () => {
    await expect(
      runMessageAction({
        cfg: slackConfig,
        action: "send",
        params: {
          channel: "slack",
          target: "#C12345678",
        },
        toolContext: { currentChannelId: "C12345678" },
        dryRun: true,
      }),
    ).rejects.toThrow(/message required/i);
  });

  it("blocks send when target differs from current channel", async () => {
    const result = await runMessageAction({
      cfg: slackConfig,
      action: "send",
      params: {
        channel: "slack",
        target: "channel:C99999999",
        message: "hi",
      },
      toolContext: { currentChannelId: "C12345678", currentChannelProvider: "slack" },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
  });

  it("blocks thread-reply when channelId differs from current channel", async () => {
    const result = await runMessageAction({
      cfg: slackConfig,
      action: "thread-reply",
      params: {
        channel: "slack",
        target: "C99999999",
        message: "hi",
      },
      toolContext: { currentChannelId: "C12345678", currentChannelProvider: "slack" },
      dryRun: true,
    });

    expect(result.kind).toBe("action");
  });

  it("allows WhatsApp send when target matches current chat", async () => {
    const result = await runMessageAction({
      cfg: whatsappConfig,
      action: "send",
      params: {
        channel: "whatsapp",
        target: "123@g.us",
        message: "hi",
      },
      toolContext: { currentChannelId: "123@g.us" },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
  });

  it("blocks WhatsApp send when target differs from current chat", async () => {
    const result = await runMessageAction({
      cfg: whatsappConfig,
      action: "send",
      params: {
        channel: "whatsapp",
        target: "456@g.us",
        message: "hi",
      },
      toolContext: { currentChannelId: "123@g.us", currentChannelProvider: "whatsapp" },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
  });

  it("allows iMessage send when target matches current handle", async () => {
    const result = await runMessageAction({
      cfg: whatsappConfig,
      action: "send",
      params: {
        channel: "imessage",
        target: "imessage:+15551234567",
        message: "hi",
      },
      toolContext: { currentChannelId: "imessage:+15551234567" },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
  });

  it("blocks iMessage send when target differs from current handle", async () => {
    const result = await runMessageAction({
      cfg: whatsappConfig,
      action: "send",
      params: {
        channel: "imessage",
        target: "imessage:+15551230000",
        message: "hi",
      },
      toolContext: {
        currentChannelId: "imessage:+15551234567",
        currentChannelProvider: "imessage",
      },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
  });

  it("infers channel + target from tool context when missing", async () => {
    const multiConfig = {
      channels: {
        slack: {
          botToken: "xoxb-test",
          appToken: "xapp-test",
        },
        telegram: {
          token: "tg-test",
        },
      },
    } as MoltbotConfig;

    const result = await runMessageAction({
      cfg: multiConfig,
      action: "send",
      params: {
        message: "hi",
      },
      toolContext: { currentChannelId: "C12345678", currentChannelProvider: "slack" },
      dryRun: true,
    });

    expect(result.kind).toBe("send");
    expect(result.channel).toBe("slack");
  });

  it("blocks cross-provider sends by default", async () => {
    await expect(
      runMessageAction({
        cfg: slackConfig,
        action: "send",
        params: {
          channel: "telegram",
          target: "telegram:@ops",
          message: "hi",
        },
        toolContext: { currentChannelId: "C12345678", currentChannelProvider: "slack" },
        dryRun: true,
      }),
    ).rejects.toThrow(/Cross-context messaging denied/);
  });

  it("blocks same-provider cross-context when disabled", async () => {
    const cfg = {
      ...slackConfig,
      tools: {
        message: {
          crossContext: {
            allowWithinProvider: false,
          },
        },
      },
    } as MoltbotConfig;

    await expect(
      runMessageAction({
        cfg,
        action: "send",
        params: {
          channel: "slack",
          target: "channel:C99999999",
          message: "hi",
        },
        toolContext: { currentChannelId: "C12345678", currentChannelProvider: "slack" },
        dryRun: true,
      }),
    ).rejects.toThrow(/Cross-context messaging denied/);
  });

  it("aborts send when abortSignal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      runMessageAction({
        cfg: slackConfig,
        action: "send",
        params: {
          channel: "slack",
          target: "#C12345678",
          message: "hi",
        },
        dryRun: true,
        abortSignal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("aborts broadcast when abortSignal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      runMessageAction({
        cfg: slackConfig,
        action: "broadcast",
        params: {
          targets: ["channel:C12345678"],
          channel: "slack",
          message: "hi",
        },
        dryRun: true,
        abortSignal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("runMessageAction sendAttachment hydration", () => {
  const cfg = {
    channels: {
      bluebubbles: {
        enabled: true,
        serverUrl: "http://localhost:1234",
        password: "test-password",
      },
    },
  } as OpenClawConfig;
  const attachmentPlugin: ChannelPlugin = {
    id: "bluebubbles",
    meta: {
      id: "bluebubbles",
      label: "BlueBubbles",
      selectionLabel: "BlueBubbles",
      docsPath: "/channels/bluebubbles",
      blurb: "BlueBubbles test plugin.",
    },
    capabilities: { chatTypes: ["direct", "group"], media: true },
    config: {
      listAccountIds: () => ["default"],
      resolveAccount: () => ({ enabled: true }),
      isConfigured: () => true,
    },
    actions: {
      listActions: () => ["sendAttachment", "setGroupIcon"],
      supportsAction: ({ action }) => action === "sendAttachment" || action === "setGroupIcon",
      handleAction: async ({ params }) =>
        jsonResult({
          ok: true,
          buffer: params.buffer,
          filename: params.filename,
          caption: params.caption,
          contentType: params.contentType,
        }),
    },
  };

  beforeEach(() => {
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "bluebubbles",
          source: "test",
          plugin: attachmentPlugin,
        },
      ]),
    );
    vi.mocked(loadWebMedia).mockResolvedValue({
      buffer: Buffer.from("hello"),
      contentType: "image/png",
      kind: "image",
      fileName: "pic.png",
    });
  });

  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
    vi.clearAllMocks();
  });

<<<<<<< HEAD
  it("hydrates buffer and filename from media for sendAttachment", async () => {
    const cfg = {
      channels: {
        bluebubbles: {
          enabled: true,
          serverUrl: "http://localhost:1234",
          password: "test-password",
        },
      },
    } as MoltbotConfig;
=======
  async function restoreRealMediaLoader() {
    const actual = await vi.importActual<typeof import("../../web/media.js")>("../../web/media.js");
    vi.mocked(loadWebMedia).mockImplementation(actual.loadWebMedia);
  }
>>>>>>> 270ab03e3 (fix: enforce local media root checks for attachment hydration)

  it("hydrates buffer and filename from media for sendAttachment", async () => {
    const result = await runMessageAction({
      cfg,
      action: "sendAttachment",
      params: {
        channel: "bluebubbles",
        target: "+15551234567",
        media: "https://example.com/pic.png",
        message: "caption",
      },
    });

    expect(result.kind).toBe("action");
    expect(result.payload).toMatchObject({
      ok: true,
      filename: "pic.png",
      caption: "caption",
      contentType: "image/png",
    });
    expect((result.payload as { buffer?: string }).buffer).toBe(
      Buffer.from("hello").toString("base64"),
    );
  });
<<<<<<< HEAD
=======

  it("rewrites sandboxed media paths for sendAttachment", async () => {
    await withSandbox(async (sandboxDir) => {
      await runMessageAction({
        cfg,
        action: "sendAttachment",
        params: {
          channel: "bluebubbles",
          target: "+15551234567",
          media: "./data/pic.png",
          message: "caption",
        },
        sandboxRoot: sandboxDir,
      });

      const call = vi.mocked(loadWebMedia).mock.calls[0];
      expect(call?.[0]).toBe(path.join(sandboxDir, "data", "pic.png"));
    });
  });

  it("rejects local absolute path for sendAttachment when sandboxRoot is missing", async () => {
    await restoreRealMediaLoader();

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "msg-attachment-"));
    try {
      const outsidePath = path.join(tempDir, "secret.txt");
      await fs.writeFile(outsidePath, "secret", "utf8");

      await expect(
        runMessageAction({
          cfg,
          action: "sendAttachment",
          params: {
            channel: "bluebubbles",
            target: "+15551234567",
            media: outsidePath,
            message: "caption",
          },
        }),
      ).rejects.toThrow(/allowed directory|path-not-allowed/i);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects local absolute path for setGroupIcon when sandboxRoot is missing", async () => {
    await restoreRealMediaLoader();

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "msg-group-icon-"));
    try {
      const outsidePath = path.join(tempDir, "secret.txt");
      await fs.writeFile(outsidePath, "secret", "utf8");

      await expect(
        runMessageAction({
          cfg,
          action: "setGroupIcon",
          params: {
            channel: "bluebubbles",
            target: "group:123",
            media: outsidePath,
          },
        }),
      ).rejects.toThrow(/allowed directory|path-not-allowed/i);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("runMessageAction sandboxed media validation", () => {
  beforeEach(() => {
    installChannelRuntimes({ includeTelegram: false, includeWhatsApp: false });
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "slack",
          source: "test",
          plugin: slackPlugin,
        },
      ]),
    );
  });

  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
  });

  it.each(["/etc/passwd", "file:///etc/passwd"])(
    "rejects out-of-sandbox media reference: %s",
    async (media) => {
      await withSandbox(async (sandboxDir) => {
        await expect(
          runDrySend({
            cfg: slackConfig,
            actionParams: {
              channel: "slack",
              target: "#C12345678",
              media,
              message: "",
            },
            sandboxRoot: sandboxDir,
          }),
        ).rejects.toThrow(/sandbox/i);
      });
    },
  );

  it("rejects data URLs in media params", async () => {
    await expect(
      runDrySend({
        cfg: slackConfig,
        actionParams: {
          channel: "slack",
          target: "#C12345678",
          media: "data:image/png;base64,abcd",
          message: "",
        },
      }),
    ).rejects.toThrow(/data:/i);
  });

  it("rewrites sandbox-relative media paths", async () => {
    await withSandbox(async (sandboxDir) => {
      await expectSandboxMediaRewrite({
        sandboxDir,
        media: "./data/file.txt",
        message: "",
        expectedRelativePath: path.join("data", "file.txt"),
      });
    });
  });

  it("rewrites /workspace media paths to host sandbox root", async () => {
    await withSandbox(async (sandboxDir) => {
      await expectSandboxMediaRewrite({
        sandboxDir,
        media: "/workspace/data/file.txt",
        message: "",
        expectedRelativePath: path.join("data", "file.txt"),
      });
    });
  });

  it("rewrites MEDIA directives under sandbox", async () => {
    await withSandbox(async (sandboxDir) => {
      await expectSandboxMediaRewrite({
        sandboxDir,
        message: "Hello\nMEDIA: ./data/note.ogg",
        expectedRelativePath: path.join("data", "note.ogg"),
      });
    });
  });

  it("allows media paths under preferred OpenClaw tmp root", async () => {
    const tmpRoot = resolvePreferredOpenClawTmpDir();
    await fs.mkdir(tmpRoot, { recursive: true });
    const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), "msg-sandbox-"));
    try {
      const tmpFile = path.join(tmpRoot, "test-media-image.png");
      const result = await runMessageAction({
        cfg: slackConfig,
        action: "send",
        params: {
          channel: "slack",
          target: "#C12345678",
          media: tmpFile,
          message: "",
        },
        sandboxRoot: sandboxDir,
        dryRun: true,
      });

      expect(result.kind).toBe("send");
      if (result.kind !== "send") {
        throw new Error("expected send result");
      }
      expect(result.sendResult?.mediaUrl).toBe(tmpFile);
      const hostTmpOutsideOpenClaw = path.join(os.tmpdir(), "outside-openclaw", "test-media.png");
      await expect(
        runMessageAction({
          cfg: slackConfig,
          action: "send",
          params: {
            channel: "slack",
            target: "#C12345678",
            media: hostTmpOutsideOpenClaw,
            message: "",
          },
          sandboxRoot: sandboxDir,
          dryRun: true,
        }),
      ).rejects.toThrow(/sandbox/i);
    } finally {
      await fs.rm(sandboxDir, { recursive: true, force: true });
    }
  });
});

describe("runMessageAction media caption behavior", () => {
  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
  });

  it("promotes caption to message for media sends when message is empty", async () => {
    const sendMedia = vi.fn().mockResolvedValue({
      channel: "testchat",
      messageId: "m1",
      chatId: "c1",
    });
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "testchat",
          source: "test",
          plugin: createOutboundTestPlugin({
            id: "testchat",
            outbound: {
              deliveryMode: "direct",
              sendText: vi.fn().mockResolvedValue({
                channel: "testchat",
                messageId: "t1",
                chatId: "c1",
              }),
              sendMedia,
            },
          }),
        },
      ]),
    );
    const cfg = {
      channels: {
        testchat: {
          enabled: true,
        },
      },
    } as OpenClawConfig;

    const result = await runMessageAction({
      cfg,
      action: "send",
      params: {
        channel: "testchat",
        target: "channel:abc",
        media: "https://example.com/cat.png",
        caption: "caption-only text",
      },
      dryRun: false,
    });

    expect(result.kind).toBe("send");
    expect(sendMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "caption-only text",
        mediaUrl: "https://example.com/cat.png",
      }),
    );
  });
});

describe("runMessageAction card-only send behavior", () => {
  const handleAction = vi.fn(async ({ params }: { params: Record<string, unknown> }) =>
    jsonResult({
      ok: true,
      card: params.card ?? null,
      message: params.message ?? null,
    }),
  );

  const cardPlugin: ChannelPlugin = {
    id: "cardchat",
    meta: {
      id: "cardchat",
      label: "Card Chat",
      selectionLabel: "Card Chat",
      docsPath: "/channels/cardchat",
      blurb: "Card-only send test plugin.",
    },
    capabilities: { chatTypes: ["direct"] },
    config: createAlwaysConfiguredPluginConfig(),
    actions: {
      listActions: () => ["send"],
      supportsAction: ({ action }) => action === "send",
      handleAction,
    },
  };

  beforeEach(() => {
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "cardchat",
          source: "test",
          plugin: cardPlugin,
        },
      ]),
    );
    handleAction.mockClear();
  });

  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
    vi.clearAllMocks();
  });

  it("allows card-only sends without text or media", async () => {
    const cfg = {
      channels: {
        cardchat: {
          enabled: true,
        },
      },
    } as OpenClawConfig;

    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [{ type: "TextBlock", text: "Card-only payload" }],
    };

    const result = await runMessageAction({
      cfg,
      action: "send",
      params: {
        channel: "cardchat",
        target: "channel:test-card",
        card,
      },
      dryRun: false,
    });

    expect(result.kind).toBe("send");
    expect(result.handledBy).toBe("plugin");
    expect(handleAction).toHaveBeenCalled();
    expect(result.payload).toMatchObject({
      ok: true,
      card,
    });
  });
});

describe("runMessageAction components parsing", () => {
  const handleAction = vi.fn(async ({ params }: { params: Record<string, unknown> }) =>
    jsonResult({
      ok: true,
      components: params.components ?? null,
    }),
  );

  const componentsPlugin: ChannelPlugin = {
    id: "discord",
    meta: {
      id: "discord",
      label: "Discord",
      selectionLabel: "Discord",
      docsPath: "/channels/discord",
      blurb: "Discord components send test plugin.",
    },
    capabilities: { chatTypes: ["direct"] },
    config: createAlwaysConfiguredPluginConfig({}),
    actions: {
      listActions: () => ["send"],
      supportsAction: ({ action }) => action === "send",
      handleAction,
    },
  };

  beforeEach(() => {
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "discord",
          source: "test",
          plugin: componentsPlugin,
        },
      ]),
    );
    handleAction.mockClear();
  });

  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
    vi.clearAllMocks();
  });

  it("parses components JSON strings before plugin dispatch", async () => {
    const components = {
      text: "hello",
      buttons: [{ label: "A", customId: "a" }],
    };
    const result = await runMessageAction({
      cfg: {} as OpenClawConfig,
      action: "send",
      params: {
        channel: "discord",
        target: "channel:123",
        message: "hi",
        components: JSON.stringify(components),
      },
      dryRun: false,
    });

    expect(result.kind).toBe("send");
    expect(handleAction).toHaveBeenCalled();
    expect(result.payload).toMatchObject({ ok: true, components });
  });

  it("throws on invalid components JSON strings", async () => {
    await expect(
      runMessageAction({
        cfg: {} as OpenClawConfig,
        action: "send",
        params: {
          channel: "discord",
          target: "channel:123",
          message: "hi",
          components: "{not-json}",
        },
        dryRun: false,
      }),
    ).rejects.toThrow(/--components must be valid JSON/);

    expect(handleAction).not.toHaveBeenCalled();
  });
>>>>>>> 270ab03e3 (fix: enforce local media root checks for attachment hydration)
});

describe("runMessageAction accountId defaults", () => {
  const handleAction = vi.fn(async () => jsonResult({ ok: true }));
  const accountPlugin: ChannelPlugin = {
    id: "discord",
    meta: {
      id: "discord",
      label: "Discord",
      selectionLabel: "Discord",
      docsPath: "/channels/discord",
      blurb: "Discord test plugin.",
    },
    capabilities: { chatTypes: ["direct"] },
    config: {
      listAccountIds: () => ["default"],
      resolveAccount: () => ({}),
    },
    actions: {
      listActions: () => ["send"],
      handleAction,
    },
  };

  beforeEach(() => {
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "discord",
          source: "test",
          plugin: accountPlugin,
        },
      ]),
    );
    handleAction.mockClear();
  });

  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
    vi.clearAllMocks();
  });

  it("propagates defaultAccountId into params", async () => {
    await runMessageAction({
      cfg: {} as MoltbotConfig,
      action: "send",
      params: {
        channel: "discord",
        target: "channel:123",
        message: "hi",
      },
      defaultAccountId: "ops",
    });

    expect(handleAction).toHaveBeenCalled();
    const ctx = handleAction.mock.calls[0]?.[0] as {
      accountId?: string | null;
      params: Record<string, unknown>;
    };
    expect(ctx.accountId).toBe("ops");
    expect(ctx.params.accountId).toBe("ops");
  });
});
