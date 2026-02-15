import { describe, expect, it, vi } from "vitest";

import { createTelegramDraftStream } from "./draft-stream.js";

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
      api: api as any,
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

    expect(api.sendMessageDraft).toHaveBeenCalledWith(123, 42, "Hello", {
      message_thread_id: 1,
    });
  });
});
