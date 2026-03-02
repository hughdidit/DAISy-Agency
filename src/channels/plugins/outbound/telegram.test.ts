import { describe, expect, it, vi } from "vitest";
<<<<<<< HEAD

import type { MoltbotConfig } from "../../../config/config.js";
import { telegramOutbound } from "./telegram.js";

describe("telegramOutbound.sendPayload", () => {
  it("sends text payload with buttons", async () => {
    const sendTelegram = vi.fn(async () => ({ messageId: "m1", chatId: "c1" }));

    const result = await telegramOutbound.sendPayload?.({
      cfg: {} as MoltbotConfig,
      to: "telegram:123",
      text: "ignored",
      payload: {
        text: "Hello",
        channelData: {
          telegram: {
            buttons: [[{ text: "Option", callback_data: "/option" }]],
          },
        },
      },
      deps: { sendTelegram },
    });

    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(sendTelegram).toHaveBeenCalledWith(
      "telegram:123",
      "Hello",
      expect.objectContaining({
        buttons: [[{ text: "Option", callback_data: "/option" }]],
        textMode: "html",
      }),
    );
    expect(result).toEqual({ channel: "telegram", messageId: "m1", chatId: "c1" });
  });

  it("sends media payloads and attaches buttons only to first", async () => {
    const sendTelegram = vi
      .fn()
      .mockResolvedValueOnce({ messageId: "m1", chatId: "c1" })
      .mockResolvedValueOnce({ messageId: "m2", chatId: "c1" });

    const result = await telegramOutbound.sendPayload?.({
      cfg: {} as MoltbotConfig,
      to: "telegram:123",
      text: "ignored",
      payload: {
        text: "Caption",
        mediaUrls: ["https://example.com/a.png", "https://example.com/b.png"],
        channelData: {
          telegram: {
            buttons: [[{ text: "Go", callback_data: "/go" }]],
          },
        },
      },
=======
import type { ReplyPayload } from "../../../auto-reply/types.js";
import { telegramOutbound } from "./telegram.js";

describe("telegramOutbound", () => {
  it("passes parsed reply/thread ids for sendText", async () => {
    const sendTelegram = vi.fn().mockResolvedValue({ messageId: "tg-text-1", chatId: "123" });
    const sendText = telegramOutbound.sendText;
    expect(sendText).toBeDefined();

    const result = await sendText!({
      cfg: {},
      to: "123",
      text: "<b>hello</b>",
      accountId: "work",
      replyToId: "44",
      threadId: "55",
      deps: { sendTelegram },
    });

    expect(sendTelegram).toHaveBeenCalledWith(
      "123",
      "<b>hello</b>",
      expect.objectContaining({
        textMode: "html",
        verbose: false,
        accountId: "work",
        replyToMessageId: 44,
        messageThreadId: 55,
      }),
    );
    expect(result).toEqual({ channel: "telegram", messageId: "tg-text-1", chatId: "123" });
  });

  it("parses scoped DM thread ids for sendText", async () => {
    const sendTelegram = vi.fn().mockResolvedValue({ messageId: "tg-text-2", chatId: "12345" });
    const sendText = telegramOutbound.sendText;
    expect(sendText).toBeDefined();

    await sendText!({
      cfg: {},
      to: "12345",
      text: "<b>hello</b>",
      accountId: "work",
      threadId: "12345:99",
      deps: { sendTelegram },
    });

    expect(sendTelegram).toHaveBeenCalledWith(
      "12345",
      "<b>hello</b>",
      expect.objectContaining({
        textMode: "html",
        verbose: false,
        accountId: "work",
        messageThreadId: 99,
      }),
    );
  });

  it("passes media options for sendMedia", async () => {
    const sendTelegram = vi.fn().mockResolvedValue({ messageId: "tg-media-1", chatId: "123" });
    const sendMedia = telegramOutbound.sendMedia;
    expect(sendMedia).toBeDefined();

    const result = await sendMedia!({
      cfg: {},
      to: "123",
      text: "caption",
      mediaUrl: "https://example.com/a.jpg",
      mediaLocalRoots: ["/tmp/media"],
      accountId: "default",
      deps: { sendTelegram },
    });

    expect(sendTelegram).toHaveBeenCalledWith(
      "123",
      "caption",
      expect.objectContaining({
        textMode: "html",
        verbose: false,
        mediaUrl: "https://example.com/a.jpg",
        mediaLocalRoots: ["/tmp/media"],
      }),
    );
    expect(result).toEqual({ channel: "telegram", messageId: "tg-media-1", chatId: "123" });
  });

  it("sends payload media list and applies buttons only to first message", async () => {
    const sendTelegram = vi
      .fn()
      .mockResolvedValueOnce({ messageId: "tg-1", chatId: "123" })
      .mockResolvedValueOnce({ messageId: "tg-2", chatId: "123" });
    const sendPayload = telegramOutbound.sendPayload;
    expect(sendPayload).toBeDefined();

    const payload: ReplyPayload = {
      text: "caption",
      mediaUrls: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
      channelData: {
        telegram: {
          quoteText: "quoted",
          buttons: [[{ text: "Approve", callback_data: "ok" }]],
        },
      },
    };

    const result = await sendPayload!({
      cfg: {},
      to: "123",
      text: "",
      payload,
      mediaLocalRoots: ["/tmp/media"],
      accountId: "default",
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
      deps: { sendTelegram },
    });

    expect(sendTelegram).toHaveBeenCalledTimes(2);
    expect(sendTelegram).toHaveBeenNthCalledWith(
      1,
<<<<<<< HEAD
      "telegram:123",
      "Caption",
      expect.objectContaining({
        mediaUrl: "https://example.com/a.png",
        buttons: [[{ text: "Go", callback_data: "/go" }]],
      }),
    );
    const secondOpts = sendTelegram.mock.calls[1]?.[2] as { buttons?: unknown } | undefined;
    expect(sendTelegram).toHaveBeenNthCalledWith(
      2,
      "telegram:123",
      "",
      expect.objectContaining({
        mediaUrl: "https://example.com/b.png",
      }),
    );
    expect(secondOpts?.buttons).toBeUndefined();
    expect(result).toEqual({ channel: "telegram", messageId: "m2", chatId: "c1" });
=======
      "123",
      "caption",
      expect.objectContaining({
        mediaUrl: "https://example.com/1.jpg",
        quoteText: "quoted",
        buttons: [[{ text: "Approve", callback_data: "ok" }]],
      }),
    );
    expect(sendTelegram).toHaveBeenNthCalledWith(
      2,
      "123",
      "",
      expect.objectContaining({
        mediaUrl: "https://example.com/2.jpg",
        quoteText: "quoted",
      }),
    );
    const secondCallOpts = sendTelegram.mock.calls[1]?.[2] as Record<string, unknown>;
    expect(secondCallOpts?.buttons).toBeUndefined();
    expect(result).toEqual({ channel: "telegram", messageId: "tg-2", chatId: "123" });
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
  });
});
