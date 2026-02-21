import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD

import type { MoltbotConfig } from "../../config/config.js";
=======
import type { OpenClawConfig } from "../../config/config.js";
import { captureEnv } from "../../test-utils/env.js";
>>>>>>> 884166c7a (refactor(test): snapshot telegram action env in e2e suite)
import { handleTelegramAction, readTelegramButtons } from "./telegram-actions.js";

const reactMessageTelegram = vi.fn(async () => ({ ok: true }));
const sendMessageTelegram = vi.fn(async () => ({
  messageId: "789",
  chatId: "123",
}));
const sendStickerTelegram = vi.fn(async () => ({
  messageId: "456",
  chatId: "123",
}));
const deleteMessageTelegram = vi.fn(async () => ({ ok: true }));
let envSnapshot: ReturnType<typeof captureEnv>;

vi.mock("../../telegram/send.js", () => ({
  reactMessageTelegram: (...args: Parameters<typeof reactMessageTelegram>) =>
    reactMessageTelegram(...args),
  sendMessageTelegram: (...args: Parameters<typeof sendMessageTelegram>) =>
    sendMessageTelegram(...args),
  sendStickerTelegram: (...args: Parameters<typeof sendStickerTelegram>) =>
    sendStickerTelegram(...args),
  deleteMessageTelegram: (...args: Parameters<typeof deleteMessageTelegram>) =>
    deleteMessageTelegram(...args),
}));

describe("handleTelegramAction", () => {
  const defaultReactionAction = {
    action: "react",
    chatId: "123",
    messageId: "456",
    emoji: "✅",
  } as const;

  function reactionConfig(reactionLevel: "minimal" | "extensive" | "off" | "ack"): OpenClawConfig {
    return {
      channels: { telegram: { botToken: "tok", reactionLevel } },
    } as OpenClawConfig;
  }

  function telegramConfig(overrides?: Record<string, unknown>): OpenClawConfig {
    return {
      channels: {
        telegram: {
          botToken: "tok",
          ...overrides,
        },
      },
    } as OpenClawConfig;
  }

  async function expectReactionAdded(reactionLevel: "minimal" | "extensive") {
    await handleTelegramAction(defaultReactionAction, reactionConfig(reactionLevel));
    expect(reactMessageTelegram).toHaveBeenCalledWith(
      "123",
      456,
      "✅",
      expect.objectContaining({ token: "tok", remove: false }),
    );
  }

  beforeEach(() => {
    envSnapshot = captureEnv(["TELEGRAM_BOT_TOKEN"]);
    reactMessageTelegram.mockClear();
    sendMessageTelegram.mockClear();
    sendStickerTelegram.mockClear();
    deleteMessageTelegram.mockClear();
    process.env.TELEGRAM_BOT_TOKEN = "tok";
  });

  afterEach(() => {
    envSnapshot.restore();
  });

  it("adds reactions when reactionLevel is minimal", async () => {
<<<<<<< HEAD
    const cfg = {
      channels: { telegram: { botToken: "tok", reactionLevel: "minimal" } },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
        action: "react",
        chatId: "123",
        messageId: "456",
        emoji: "✅",
      },
      cfg,
    );
    expect(reactMessageTelegram).toHaveBeenCalledWith(
      "123",
      456,
      "✅",
      expect.objectContaining({ token: "tok", remove: false }),
    );
=======
    await expectReactionAdded("minimal");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
  });

  it("surfaces non-fatal reaction warnings", async () => {
    reactMessageTelegram.mockResolvedValueOnce({
      ok: false,
      warning: "Reaction unavailable: ✅",
    } as unknown as Awaited<ReturnType<typeof reactMessageTelegram>>);
    const result = await handleTelegramAction(defaultReactionAction, reactionConfig("minimal"));
    const textPayload = result.content.find((item) => item.type === "text");
    expect(textPayload?.type).toBe("text");
    const parsed = JSON.parse((textPayload as { type: "text"; text: string }).text) as {
      ok: boolean;
      warning?: string;
      added?: string;
    };
    expect(parsed).toMatchObject({
      ok: false,
      warning: "Reaction unavailable: ✅",
      added: "✅",
    });
  });

  it("adds reactions when reactionLevel is extensive", async () => {
<<<<<<< HEAD
    const cfg = {
      channels: { telegram: { botToken: "tok", reactionLevel: "extensive" } },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
        action: "react",
        chatId: "123",
        messageId: "456",
        emoji: "✅",
      },
      cfg,
    );
    expect(reactMessageTelegram).toHaveBeenCalledWith(
      "123",
      456,
      "✅",
      expect.objectContaining({ token: "tok", remove: false }),
    );
=======
    await expectReactionAdded("extensive");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
  });

  it("removes reactions on empty emoji", async () => {
    const cfg = {
      channels: { telegram: { botToken: "tok", reactionLevel: "minimal" } },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
        action: "react",
        chatId: "123",
        messageId: "456",
        emoji: "",
      },
      cfg,
    );
    expect(reactMessageTelegram).toHaveBeenCalledWith(
      "123",
      456,
      "",
      expect.objectContaining({ token: "tok", remove: false }),
    );
  });

  it("rejects sticker actions when disabled by default", async () => {
    const cfg = { channels: { telegram: { botToken: "tok" } } } as MoltbotConfig;
    await expect(
      handleTelegramAction(
        {
          action: "sendSticker",
          to: "123",
          fileId: "sticker",
        },
        cfg,
      ),
    ).rejects.toThrow(/sticker actions are disabled/i);
    expect(sendStickerTelegram).not.toHaveBeenCalled();
  });

  it("sends stickers when enabled", async () => {
    const cfg = {
      channels: { telegram: { botToken: "tok", actions: { sticker: true } } },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
        action: "sendSticker",
        to: "123",
        fileId: "sticker",
      },
      cfg,
    );
    expect(sendStickerTelegram).toHaveBeenCalledWith(
      "123",
      "sticker",
      expect.objectContaining({ token: "tok" }),
    );
  });

  it("removes reactions when remove flag set", async () => {
<<<<<<< HEAD
    const cfg = {
      channels: { telegram: { botToken: "tok", reactionLevel: "extensive" } },
    } as MoltbotConfig;
=======
    const cfg = reactionConfig("extensive");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    await handleTelegramAction(
      {
        action: "react",
        chatId: "123",
        messageId: "456",
        emoji: "✅",
        remove: true,
      },
      cfg,
    );
    expect(reactMessageTelegram).toHaveBeenCalledWith(
      "123",
      456,
      "✅",
      expect.objectContaining({ token: "tok", remove: true }),
    );
  });

<<<<<<< HEAD
  it("blocks reactions when reactionLevel is off", async () => {
<<<<<<< HEAD
    const cfg = {
      channels: { telegram: { botToken: "tok", reactionLevel: "off" } },
    } as MoltbotConfig;
=======
    const cfg = reactionConfig("off");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
=======
  it.each([
    {
      level: "off" as const,
      expectedMessage: /Telegram agent reactions disabled.*reactionLevel="off"/,
    },
    {
      level: "ack" as const,
      expectedMessage: /Telegram agent reactions disabled.*reactionLevel="ack"/,
    },
  ])("blocks reactions when reactionLevel is $level", async ({ level, expectedMessage }) => {
>>>>>>> 2595690a4 (test(actions): table-drive slack and telegram action cases)
    await expect(
      handleTelegramAction(
        {
          action: "react",
          chatId: "123",
          messageId: "456",
          emoji: "✅",
        },
        reactionConfig(level),
      ),
<<<<<<< HEAD
    ).rejects.toThrow(/Telegram agent reactions disabled.*reactionLevel="off"/);
  });

  it("blocks reactions when reactionLevel is ack", async () => {
<<<<<<< HEAD
    const cfg = {
      channels: { telegram: { botToken: "tok", reactionLevel: "ack" } },
    } as MoltbotConfig;
=======
    const cfg = reactionConfig("ack");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    await expect(
      handleTelegramAction(
        {
          action: "react",
          chatId: "123",
          messageId: "456",
          emoji: "✅",
        },
        cfg,
      ),
    ).rejects.toThrow(/Telegram agent reactions disabled.*reactionLevel="ack"/);
=======
    ).rejects.toThrow(expectedMessage);
>>>>>>> 2595690a4 (test(actions): table-drive slack and telegram action cases)
  });

  it("also respects legacy actions.reactions gating", async () => {
    const cfg = {
      channels: {
        telegram: {
          botToken: "tok",
          reactionLevel: "minimal",
          actions: { reactions: false },
        },
      },
    } as MoltbotConfig;
    await expect(
      handleTelegramAction(
        {
          action: "react",
          chatId: "123",
          messageId: "456",
          emoji: "✅",
        },
        cfg,
      ),
    ).rejects.toThrow(/Telegram reactions are disabled via actions.reactions/);
  });

  it("sends a text message", async () => {
<<<<<<< HEAD
    const cfg = {
      channels: { telegram: { botToken: "tok" } },
    } as MoltbotConfig;
=======
>>>>>>> 2595690a4 (test(actions): table-drive slack and telegram action cases)
    const result = await handleTelegramAction(
      {
        action: "sendMessage",
        to: "@testchannel",
        content: "Hello, Telegram!",
      },
      telegramConfig(),
    );
    expect(sendMessageTelegram).toHaveBeenCalledWith(
      "@testchannel",
      "Hello, Telegram!",
      expect.objectContaining({ token: "tok", mediaUrl: undefined }),
    );
    expect(result.content).toContainEqual({
      type: "text",
      text: expect.stringContaining('"ok": true'),
    });
  });

<<<<<<< HEAD
  it("sends a message with media", async () => {
    const cfg = {
      channels: { telegram: { botToken: "tok" } },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
=======
  it.each([
    {
      name: "media",
      params: {
>>>>>>> 2595690a4 (test(actions): table-drive slack and telegram action cases)
        action: "sendMessage",
        to: "123456",
        content: "Check this image!",
        mediaUrl: "https://example.com/image.jpg",
      },
<<<<<<< HEAD
      cfg,
    );
    expect(sendMessageTelegram).toHaveBeenCalledWith(
      "123456",
      "Check this image!",
      expect.objectContaining({
        token: "tok",
        mediaUrl: "https://example.com/image.jpg",
      }),
    );
  });

  it("passes quoteText when provided", async () => {
    const cfg = {
      channels: { telegram: { botToken: "tok" } },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
=======
      expectedTo: "123456",
      expectedContent: "Check this image!",
      expectedOptions: { mediaUrl: "https://example.com/image.jpg" },
    },
    {
      name: "quoteText",
      params: {
>>>>>>> 2595690a4 (test(actions): table-drive slack and telegram action cases)
        action: "sendMessage",
        to: "123456",
        content: "Replying now",
        replyToMessageId: 144,
        quoteText: "The text you want to quote",
      },
      expectedTo: "123456",
      expectedContent: "Replying now",
      expectedOptions: {
        replyToMessageId: 144,
        quoteText: "The text you want to quote",
<<<<<<< HEAD
      }),
    );
  });

  it("allows media-only messages without content", async () => {
    const cfg = {
      channels: { telegram: { botToken: "tok" } },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
=======
      },
    },
    {
      name: "media-only",
      params: {
>>>>>>> 2595690a4 (test(actions): table-drive slack and telegram action cases)
        action: "sendMessage",
        to: "123456",
        mediaUrl: "https://example.com/note.ogg",
      },
      expectedTo: "123456",
      expectedContent: "",
      expectedOptions: { mediaUrl: "https://example.com/note.ogg" },
    },
  ] as const)("maps sendMessage params for $name", async (testCase) => {
    await handleTelegramAction(testCase.params, telegramConfig());
    expect(sendMessageTelegram).toHaveBeenCalledWith(
      testCase.expectedTo,
      testCase.expectedContent,
      expect.objectContaining({
        token: "tok",
        ...testCase.expectedOptions,
      }),
    );
  });

  it("requires content when no mediaUrl is provided", async () => {
<<<<<<< HEAD
    const cfg = {
      channels: { telegram: { botToken: "tok" } },
    } as MoltbotConfig;
=======
>>>>>>> 2595690a4 (test(actions): table-drive slack and telegram action cases)
    await expect(
      handleTelegramAction(
        {
          action: "sendMessage",
          to: "123456",
        },
        telegramConfig(),
      ),
    ).rejects.toThrow(/content required/i);
  });

  it("respects sendMessage gating", async () => {
    const cfg = {
      channels: {
        telegram: { botToken: "tok", actions: { sendMessage: false } },
      },
    } as MoltbotConfig;
    await expect(
      handleTelegramAction(
        {
          action: "sendMessage",
          to: "@testchannel",
          content: "Hello!",
        },
        cfg,
      ),
    ).rejects.toThrow(/Telegram sendMessage is disabled/);
  });

  it("deletes a message", async () => {
    const cfg = {
      channels: { telegram: { botToken: "tok" } },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
        action: "deleteMessage",
        chatId: "123",
        messageId: 456,
      },
      cfg,
    );
    expect(deleteMessageTelegram).toHaveBeenCalledWith(
      "123",
      456,
      expect.objectContaining({ token: "tok" }),
    );
  });

  it("respects deleteMessage gating", async () => {
    const cfg = {
      channels: {
        telegram: { botToken: "tok", actions: { deleteMessage: false } },
      },
    } as MoltbotConfig;
    await expect(
      handleTelegramAction(
        {
          action: "deleteMessage",
          chatId: "123",
          messageId: 456,
        },
        cfg,
      ),
    ).rejects.toThrow(/Telegram deleteMessage is disabled/);
  });

  it("throws on missing bot token for sendMessage", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const cfg = {} as MoltbotConfig;
    await expect(
      handleTelegramAction(
        {
          action: "sendMessage",
          to: "@testchannel",
          content: "Hello!",
        },
        cfg,
      ),
    ).rejects.toThrow(/Telegram bot token missing/);
  });

  it("allows inline buttons by default (allowlist)", async () => {
    const cfg = {
      channels: { telegram: { botToken: "tok" } },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
        action: "sendMessage",
        to: "@testchannel",
        content: "Choose",
        buttons: [[{ text: "Ok", callback_data: "cmd:ok" }]],
      },
      cfg,
    );
    expect(sendMessageTelegram).toHaveBeenCalled();
  });

<<<<<<< HEAD
  it("blocks inline buttons when scope is off", async () => {
    const cfg = {
      channels: {
        telegram: { botToken: "tok", capabilities: { inlineButtons: "off" } },
      },
    } as MoltbotConfig;
=======
  it.each([
    {
      name: "scope is off",
      to: "@testchannel",
      inlineButtons: "off" as const,
      expectedMessage: /inline buttons are disabled/i,
    },
    {
      name: "scope is dm and target is group",
      to: "-100123456",
      inlineButtons: "dm" as const,
      expectedMessage: /inline buttons are limited to DMs/i,
    },
  ])("blocks inline buttons when $name", async ({ to, inlineButtons, expectedMessage }) => {
>>>>>>> 2595690a4 (test(actions): table-drive slack and telegram action cases)
    await expect(
      handleTelegramAction(
        {
          action: "sendMessage",
          to,
          content: "Choose",
          buttons: [[{ text: "Ok", callback_data: "cmd:ok" }]],
        },
        telegramConfig({ capabilities: { inlineButtons } }),
      ),
<<<<<<< HEAD
    ).rejects.toThrow(/inline buttons are disabled/i);
  });

  it("blocks inline buttons in groups when scope is dm", async () => {
    const cfg = {
      channels: {
        telegram: { botToken: "tok", capabilities: { inlineButtons: "dm" } },
      },
    } as MoltbotConfig;
    await expect(
      handleTelegramAction(
        {
          action: "sendMessage",
          to: "-100123456",
          content: "Choose",
          buttons: [[{ text: "Ok", callback_data: "cmd:ok" }]],
        },
        cfg,
      ),
    ).rejects.toThrow(/inline buttons are limited to DMs/i);
=======
    ).rejects.toThrow(expectedMessage);
>>>>>>> 2595690a4 (test(actions): table-drive slack and telegram action cases)
  });

  it("allows inline buttons in DMs with tg: prefixed targets", async () => {
    const cfg = {
      channels: {
        telegram: { botToken: "tok", capabilities: { inlineButtons: "dm" } },
      },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
        action: "sendMessage",
        to: "tg:5232990709",
        content: "Choose",
        buttons: [[{ text: "Ok", callback_data: "cmd:ok" }]],
      },
      cfg,
    );
    expect(sendMessageTelegram).toHaveBeenCalled();
  });

  it("allows inline buttons in groups with topic targets", async () => {
    const cfg = {
      channels: {
        telegram: { botToken: "tok", capabilities: { inlineButtons: "group" } },
      },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
        action: "sendMessage",
        to: "telegram:group:-1001234567890:topic:456",
        content: "Choose",
        buttons: [[{ text: "Ok", callback_data: "cmd:ok" }]],
      },
      cfg,
    );
    expect(sendMessageTelegram).toHaveBeenCalled();
  });

  it("sends messages with inline keyboard buttons when enabled", async () => {
    const cfg = {
      channels: {
        telegram: { botToken: "tok", capabilities: { inlineButtons: "all" } },
      },
    } as MoltbotConfig;
    await handleTelegramAction(
      {
        action: "sendMessage",
        to: "@testchannel",
        content: "Choose",
        buttons: [[{ text: "  Option A ", callback_data: " cmd:a " }]],
      },
      cfg,
    );
    expect(sendMessageTelegram).toHaveBeenCalledWith(
      "@testchannel",
      "Choose",
      expect.objectContaining({
        buttons: [[{ text: "Option A", callback_data: "cmd:a" }]],
      }),
    );
  });

  it("forwards optional button style", async () => {
    const cfg = {
      channels: {
        telegram: { botToken: "tok", capabilities: { inlineButtons: "all" } },
      },
    } as OpenClawConfig;
    await handleTelegramAction(
      {
        action: "sendMessage",
        to: "@testchannel",
        content: "Choose",
        buttons: [
          [
            {
              text: "Option A",
              callback_data: "cmd:a",
              style: "primary",
            },
          ],
        ],
      },
      cfg,
    );
    expect(sendMessageTelegram).toHaveBeenCalledWith(
      "@testchannel",
      "Choose",
      expect.objectContaining({
        buttons: [
          [
            {
              text: "Option A",
              callback_data: "cmd:a",
              style: "primary",
            },
          ],
        ],
      }),
    );
  });
});

describe("readTelegramButtons", () => {
  it("returns trimmed button rows for valid input", () => {
    const result = readTelegramButtons({
      buttons: [[{ text: "  Option A ", callback_data: " cmd:a " }]],
    });
    expect(result).toEqual([[{ text: "Option A", callback_data: "cmd:a" }]]);
  });

  it("normalizes optional style", () => {
    const result = readTelegramButtons({
      buttons: [
        [
          {
            text: "Option A",
            callback_data: "cmd:a",
            style: " PRIMARY ",
          },
        ],
      ],
    });
    expect(result).toEqual([
      [
        {
          text: "Option A",
          callback_data: "cmd:a",
          style: "primary",
        },
      ],
    ]);
  });

  it("rejects unsupported button style", () => {
    expect(() =>
      readTelegramButtons({
        buttons: [[{ text: "Option A", callback_data: "cmd:a", style: "secondary" }]],
      }),
    ).toThrow(/style must be one of danger, success, primary/i);
  });
});

describe("handleTelegramAction per-account gating", () => {
  async function expectAccountStickerSend(cfg: OpenClawConfig, accountId = "media") {
    await handleTelegramAction(
      { action: "sendSticker", to: "123", fileId: "sticker-id", accountId },
      cfg,
    );
    expect(sendStickerTelegram).toHaveBeenCalledWith(
      "123",
      "sticker-id",
      expect.objectContaining({ token: "tok-media" }),
    );
  }

  it("allows sticker when account config enables it", async () => {
    const cfg = {
      channels: {
        telegram: {
          accounts: {
            media: { botToken: "tok-media", actions: { sticker: true } },
          },
        },
      },
    } as OpenClawConfig;
    await expectAccountStickerSend(cfg);
  });

  it("blocks sticker when account omits it", async () => {
    const cfg = {
      channels: {
        telegram: {
          accounts: {
            chat: { botToken: "tok-chat" },
          },
        },
      },
    } as OpenClawConfig;

    await expect(
      handleTelegramAction(
        { action: "sendSticker", to: "123", fileId: "sticker-id", accountId: "chat" },
        cfg,
      ),
    ).rejects.toThrow(/sticker actions are disabled/i);
  });

  it("uses account-merged config, not top-level config", async () => {
    // Top-level has no sticker enabled, but the account does
    const cfg = {
      channels: {
        telegram: {
          botToken: "tok-base",
          accounts: {
            media: { botToken: "tok-media", actions: { sticker: true } },
          },
        },
      },
    } as OpenClawConfig;
    await expectAccountStickerSend(cfg);
  });

  it("inherits top-level reaction gate when account overrides sticker only", async () => {
    const cfg = {
      channels: {
        telegram: {
          actions: { reactions: false },
          accounts: {
            media: { botToken: "tok-media", actions: { sticker: true } },
          },
        },
      },
    } as OpenClawConfig;

    await expect(
      handleTelegramAction(
        {
          action: "react",
          chatId: "123",
          messageId: 1,
          emoji: "👀",
          accountId: "media",
        },
        cfg,
      ),
    ).rejects.toThrow(/reactions are disabled via actions.reactions/i);
  });

  it("allows account to explicitly re-enable top-level disabled reaction gate", async () => {
    const cfg = {
      channels: {
        telegram: {
          actions: { reactions: false },
          accounts: {
            media: { botToken: "tok-media", actions: { sticker: true, reactions: true } },
          },
        },
      },
    } as OpenClawConfig;

    await handleTelegramAction(
      {
        action: "react",
        chatId: "123",
        messageId: 1,
        emoji: "👀",
        accountId: "media",
      },
      cfg,
    );

    expect(reactMessageTelegram).toHaveBeenCalledWith(
      "123",
      1,
      "👀",
      expect.objectContaining({ token: "tok-media", accountId: "media" }),
    );
  });
});
