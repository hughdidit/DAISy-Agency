<<<<<<< HEAD
import { describe, expect, it, vi } from "vitest";

import { createTelegramDraftStream } from "./draft-stream.js";

=======
import type { Bot } from "grammy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTelegramDraftStream } from "./draft-stream.js";

function createMockDraftApi(sendMessageImpl?: () => Promise<{ message_id: number }>) {
  return {
    sendMessage: vi.fn(sendMessageImpl ?? (async () => ({ message_id: 17 }))),
    editMessageText: vi.fn().mockResolvedValue(true),
    deleteMessage: vi.fn().mockResolvedValue(true),
  };
}

function createForumDraftStream(api: ReturnType<typeof createMockDraftApi>) {
  return createThreadedDraftStream(api, { id: 99, scope: "forum" });
}

function createThreadedDraftStream(
  api: ReturnType<typeof createMockDraftApi>,
  thread: { id: number; scope: "forum" | "dm" },
) {
  return createTelegramDraftStream({
    api: api as unknown as Bot["api"],
    chatId: 123,
    thread,
  });
}

async function expectInitialForumSend(
  api: ReturnType<typeof createMockDraftApi>,
  text = "Hello",
): Promise<void> {
  await vi.waitFor(() =>
    expect(api.sendMessage).toHaveBeenCalledWith(123, text, { message_thread_id: 99 }),
  );
}

>>>>>>> 63b4c500d (fix: prevent Telegram preview stream cross-edit race (#23202))
describe("createTelegramDraftStream", () => {
  it("passes message_thread_id when provided", () => {
    const api = { sendMessageDraft: vi.fn().mockResolvedValue(true) };
    const stream = createTelegramDraftStream({
      api: api as any,
      chatId: 123,
      draftId: 42,
      thread: { id: 99, scope: "forum" },
    });

    stream.update("Hello");

    expect(api.sendMessageDraft).toHaveBeenCalledWith(123, 42, "Hello", {
      message_thread_id: 99,
    });
  });

  it("omits message_thread_id for general topic id", () => {
    const api = { sendMessageDraft: vi.fn().mockResolvedValue(true) };
    const stream = createTelegramDraftStream({
      api: api as any,
      chatId: 123,
      draftId: 42,
      thread: { id: 1, scope: "forum" },
    });

    stream.update("Hello");

    expect(api.sendMessageDraft).toHaveBeenCalledWith(123, 42, "Hello", undefined);
  });

<<<<<<< HEAD
  it("keeps message_thread_id for dm threads", () => {
    const api = { sendMessageDraft: vi.fn().mockResolvedValue(true) };
=======
  it("omits message_thread_id for dm threads and clears preview on cleanup", async () => {
    const api = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 17 }),
      editMessageText: vi.fn().mockResolvedValue(true),
      deleteMessage: vi.fn().mockResolvedValue(true),
    };
>>>>>>> cc0bfa0f3 (fix(telegram): restore thread_id=1 handling for DMs (regression from 19b8416a8) (openclaw#10942) thanks @garnetlyx)
    const stream = createTelegramDraftStream({
<<<<<<< HEAD
      api: api as any,
=======
      api: api as unknown as Bot["api"],
>>>>>>> 63b4c500d (fix: prevent Telegram preview stream cross-edit race (#23202))
      chatId: 123,
      draftId: 42,
      thread: { id: 1, scope: "dm" },
    });

    stream.update("Hello");
<<<<<<< HEAD
=======
    await vi.waitFor(() => expect(api.sendMessage).toHaveBeenCalledWith(123, "Hello", undefined));
    await stream.clear();
>>>>>>> cc0bfa0f3 (fix(telegram): restore thread_id=1 handling for DMs (regression from 19b8416a8) (openclaw#10942) thanks @garnetlyx)

<<<<<<< HEAD
    expect(api.sendMessageDraft).toHaveBeenCalledWith(123, 42, "Hello", {
      message_thread_id: 1,
=======
    // Normal edit (same message)
    stream.update("Hello edited");
    await stream.flush();
    expect(api.editMessageText).toHaveBeenCalledWith(123, 17, "Hello edited");

    // Force new message (e.g. after thinking block ends)
    stream.forceNewMessage();
    stream.update("After thinking");
    await stream.flush();

    // Should have sent a second new message, not edited the first
    expect(api.sendMessage).toHaveBeenCalledTimes(2);
    expect(api.sendMessage).toHaveBeenLastCalledWith(123, "After thinking", undefined);
  });

<<<<<<< HEAD
=======
  it("sends first update immediately after forceNewMessage within throttle window", async () => {
    vi.useFakeTimers();
    try {
      const api = {
        sendMessage: vi
          .fn()
          .mockResolvedValueOnce({ message_id: 17 })
          .mockResolvedValueOnce({ message_id: 42 }),
        editMessageText: vi.fn().mockResolvedValue(true),
        deleteMessage: vi.fn().mockResolvedValue(true),
      };
      const stream = createTelegramDraftStream({
        api: api as unknown as Bot["api"],
        chatId: 123,
        throttleMs: 1000,
      });

      stream.update("Hello");
      await vi.waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(1));

      stream.update("Hello edited");
      expect(api.editMessageText).not.toHaveBeenCalled();

      stream.forceNewMessage();
      stream.update("Second message");
      await vi.waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(2));
      expect(api.sendMessage).toHaveBeenLastCalledWith(123, "Second message", undefined);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not rebind to an old message when forceNewMessage races an in-flight send", async () => {
    let resolveFirstSend: ((value: { message_id: number }) => void) | undefined;
    const firstSend = new Promise<{ message_id: number }>((resolve) => {
      resolveFirstSend = resolve;
    });
    const api = {
      sendMessage: vi.fn().mockReturnValueOnce(firstSend).mockResolvedValueOnce({ message_id: 42 }),
      editMessageText: vi.fn().mockResolvedValue(true),
      deleteMessage: vi.fn().mockResolvedValue(true),
    };
    const onSupersededPreview = vi.fn();
    const stream = createTelegramDraftStream({
      api: api as unknown as Bot["api"],
      chatId: 123,
      onSupersededPreview,
    });

    stream.update("Message A partial");
    await vi.waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(1));

    // Rotate to message B before message A send resolves.
    stream.forceNewMessage();
    stream.update("Message B partial");

    resolveFirstSend?.({ message_id: 17 });
    await stream.flush();

    expect(onSupersededPreview).toHaveBeenCalledWith({
      messageId: 17,
      textSnapshot: "Message A partial",
      parseMode: undefined,
    });
    expect(api.sendMessage).toHaveBeenCalledTimes(2);
    expect(api.sendMessage).toHaveBeenNthCalledWith(2, 123, "Message B partial", undefined);
    expect(api.editMessageText).not.toHaveBeenCalledWith(123, 17, "Message B partial");
  });

>>>>>>> 63b4c500d (fix: prevent Telegram preview stream cross-edit race (#23202))
  it("supports rendered previews with parse_mode", async () => {
    const api = createMockDraftApi();
    const stream = createTelegramDraftStream({
      api: api as unknown as Bot["api"],
      chatId: 123,
      renderText: (text) => ({ text: `<i>${text}</i>`, parseMode: "HTML" }),
    });

    stream.update("hello");
    await stream.flush();
    expect(api.sendMessage).toHaveBeenCalledWith(123, "<i>hello</i>", { parse_mode: "HTML" });

    stream.update("hello again");
    await stream.flush();
    expect(api.editMessageText).toHaveBeenCalledWith(123, 17, "<i>hello again</i>", {
      parse_mode: "HTML",
    });
  });

  it("enforces maxChars after renderText expansion", async () => {
    const api = createMockDraftApi();
    const warn = vi.fn();
    const stream = createTelegramDraftStream({
      api: api as unknown as Bot["api"],
      chatId: 123,
      maxChars: 100,
      renderText: () => ({ text: `<b>${"<".repeat(120)}</b>`, parseMode: "HTML" }),
      warn,
    });

    stream.update("short raw text");
    await stream.flush();

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(api.editMessageText).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("telegram stream preview stopped (text length 127 > 100)"),
    );
  });
});

describe("draft stream initial message debounce", () => {
  const createMockApi = () => ({
    sendMessage: vi.fn().mockResolvedValue({ message_id: 42 }),
    editMessageText: vi.fn().mockResolvedValue(true),
    deleteMessage: vi.fn().mockResolvedValue(true),
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isFinal has highest priority", () => {
    it("sends immediately on stop() even with 1 character", async () => {
      const api = createMockApi();
      const stream = createTelegramDraftStream({
        api: api as unknown as Bot["api"],
        chatId: 123,
        minInitialChars: 30,
      });

      stream.update("Y");
      await stream.stop();
      await stream.flush();

      expect(api.sendMessage).toHaveBeenCalledWith(123, "Y", undefined);
    });

    it("sends immediately on stop() with short sentence", async () => {
      const api = createMockApi();
      const stream = createTelegramDraftStream({
        api: api as unknown as Bot["api"],
        chatId: 123,
        minInitialChars: 30,
      });

      stream.update("Ok.");
      await stream.stop();
      await stream.flush();

      expect(api.sendMessage).toHaveBeenCalledWith(123, "Ok.", undefined);
    });
  });

  describe("minInitialChars threshold", () => {
    it("does not send first message below threshold", async () => {
      const api = createMockApi();
      const stream = createTelegramDraftStream({
        api: api as unknown as Bot["api"],
        chatId: 123,
        minInitialChars: 30,
      });

      stream.update("Processing"); // 10 chars, below 30
      await stream.flush();

      expect(api.sendMessage).not.toHaveBeenCalled();
    });

    it("sends first message when reaching threshold", async () => {
      const api = createMockApi();
      const stream = createTelegramDraftStream({
        api: api as unknown as Bot["api"],
        chatId: 123,
        minInitialChars: 30,
      });

      // Exactly 30 chars
      stream.update("I am processing your request..");
      await stream.flush();

      expect(api.sendMessage).toHaveBeenCalled();
    });

    it("works with longer text above threshold", async () => {
      const api = createMockApi();
      const stream = createTelegramDraftStream({
        api: api as unknown as Bot["api"],
        chatId: 123,
        minInitialChars: 30,
      });

      stream.update("I am processing your request, please wait a moment"); // 50 chars
      await stream.flush();

      expect(api.sendMessage).toHaveBeenCalled();
    });
  });

  describe("subsequent updates after first message", () => {
    it("edits normally after first message is sent", async () => {
      const api = createMockApi();
      const stream = createTelegramDraftStream({
        api: api as unknown as Bot["api"],
        chatId: 123,
        minInitialChars: 30,
      });

      // First message at threshold (30 chars)
      stream.update("I am processing your request..");
      await stream.flush();
      expect(api.sendMessage).toHaveBeenCalledTimes(1);

      // Subsequent updates should edit, not wait for threshold
      stream.update("I am processing your request.. and summarizing");
      await stream.flush();

      expect(api.editMessageText).toHaveBeenCalled();
      expect(api.sendMessage).toHaveBeenCalledTimes(1); // still only 1 send
    });
  });

  describe("default behavior without debounce params", () => {
    it("sends immediately without minInitialChars set (backward compatible)", async () => {
      const api = createMockApi();
      const stream = createTelegramDraftStream({
        api: api as unknown as Bot["api"],
        chatId: 123,
        // no minInitialChars (backward-compatible behavior)
      });

      stream.update("Hi");
      await stream.flush();

      expect(api.sendMessage).toHaveBeenCalledWith(123, "Hi", undefined);
>>>>>>> ab256b8ec (fix: split telegram reasoning and answer draft streams (#20774))
    });
  });
});
