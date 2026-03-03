import { describe, expect, it } from "vitest";
import {
  buildTelegramThreadParams,
  buildTypingThreadParams,
  normalizeForwardedContext,
  resolveTelegramForumThreadId,
  resolveTelegramThreadSpec,
} from "./helpers.js";

describe("resolveTelegramForumThreadId", () => {
  it("returns undefined for non-forum groups even with messageThreadId", () => {
    // Reply threads in regular groups should not create separate sessions
    expect(resolveTelegramForumThreadId({ isForum: false, messageThreadId: 42 })).toBeUndefined();
  });

  it("returns undefined for non-forum groups without messageThreadId", () => {
    expect(
      resolveTelegramForumThreadId({ isForum: false, messageThreadId: undefined }),
    ).toBeUndefined();
    expect(
      resolveTelegramForumThreadId({ isForum: undefined, messageThreadId: 99 }),
    ).toBeUndefined();
  });

  it("returns General topic (1) for forum groups without messageThreadId", () => {
    expect(resolveTelegramForumThreadId({ isForum: true, messageThreadId: undefined })).toBe(1);
    expect(resolveTelegramForumThreadId({ isForum: true, messageThreadId: null })).toBe(1);
  });

  it("returns the topic id for forum groups with messageThreadId", () => {
    expect(resolveTelegramForumThreadId({ isForum: true, messageThreadId: 99 })).toBe(99);
  });
});

describe("resolveTelegramThreadSpec", () => {
  it("returns dm scope for plain DM (no forum, no thread id)", () => {
    expect(resolveTelegramThreadSpec({ isGroup: false })).toEqual({ scope: "dm" });
  });

  it("preserves thread id with dm scope when DM has thread id but is not a forum", () => {
    expect(
      resolveTelegramThreadSpec({ isGroup: false, isForum: false, messageThreadId: 42 }),
    ).toEqual({ id: 42, scope: "dm" });
  });

  it("returns forum scope when DM has isForum and thread id", () => {
    expect(
      resolveTelegramThreadSpec({ isGroup: false, isForum: true, messageThreadId: 99 }),
    ).toEqual({ id: 99, scope: "forum" });
  });

  it("falls back to dm scope when DM has isForum but no thread id", () => {
    expect(resolveTelegramThreadSpec({ isGroup: false, isForum: true })).toEqual({ scope: "dm" });
  });

  it("delegates to group path for groups", () => {
    expect(
      resolveTelegramThreadSpec({ isGroup: true, isForum: true, messageThreadId: 50 }),
    ).toEqual({ id: 50, scope: "forum" });
  });
});

describe("buildTelegramThreadParams", () => {
  it("omits General topic thread id for message sends", () => {
    expect(buildTelegramThreadParams({ id: 1, scope: "forum" })).toBeUndefined();
  });

  it("includes non-General topic thread ids", () => {
    expect(buildTelegramThreadParams({ id: 99, scope: "forum" })).toEqual({
      message_thread_id: 99,
    });
  });

  it("skips thread id for dm threads (DMs don't have threads)", () => {
    expect(buildTelegramThreadParams({ id: 1, scope: "dm" })).toBeUndefined();
    expect(buildTelegramThreadParams({ id: 2, scope: "dm" })).toBeUndefined();
  });

  it("normalizes and skips thread id for dm threads even with edge values", () => {
    expect(buildTelegramThreadParams({ id: 0, scope: "dm" })).toBeUndefined();
    expect(buildTelegramThreadParams({ id: -1, scope: "dm" })).toBeUndefined();
    expect(buildTelegramThreadParams({ id: 1.9, scope: "dm" })).toBeUndefined();
  });

  it("handles thread id 0 for non-dm scopes", () => {
    // id=0 should be included for forum and none scopes (not falsy)
    expect(buildTelegramThreadParams({ id: 0, scope: "forum" })).toEqual({
      message_thread_id: 0,
    });
    expect(buildTelegramThreadParams({ id: 0, scope: "none" })).toEqual({
      message_thread_id: 0,
    });
  });

  it("normalizes thread ids to integers", () => {
    expect(buildTelegramThreadParams({ id: 42.9, scope: "forum" })).toEqual({
      message_thread_id: 42,
    });
  });
});

describe("buildTypingThreadParams", () => {
  it("returns undefined when no thread id is provided", () => {
    expect(buildTypingThreadParams(undefined)).toBeUndefined();
  });

  it("includes General topic thread id for typing indicators", () => {
    expect(buildTypingThreadParams(1)).toEqual({ message_thread_id: 1 });
  });

  it("normalizes thread ids to integers", () => {
    expect(buildTypingThreadParams(42.9)).toEqual({ message_thread_id: 42 });
  });
});

describe("normalizeForwardedContext", () => {
  it("handles forward_origin users", () => {
    const ctx = normalizeForwardedContext({
      forward_origin: {
        type: "user",
        sender_user: { first_name: "Ada", last_name: "Lovelace", username: "ada", id: 42 },
        date: 123,
      },
    } as any);
    expect(ctx).not.toBeNull();
    expect(ctx?.from).toBe("Ada Lovelace (@ada)");
    expect(ctx?.fromType).toBe("user");
    expect(ctx?.fromId).toBe("42");
    expect(ctx?.fromUsername).toBe("ada");
    expect(ctx?.fromTitle).toBe("Ada Lovelace");
    expect(ctx?.date).toBe(123);
  });

  it("handles hidden forward_origin names", () => {
    const ctx = normalizeForwardedContext({
      forward_origin: { type: "hidden_user", sender_user_name: "Hidden Name", date: 456 },
    } as any);
    expect(ctx).not.toBeNull();
    expect(ctx?.from).toBe("Hidden Name");
    expect(ctx?.fromType).toBe("hidden_user");
    expect(ctx?.fromTitle).toBe("Hidden Name");
    expect(ctx?.date).toBe(456);
  });

  it("handles legacy forwards with signatures", () => {
    const ctx = normalizeForwardedContext({
      forward_from_chat: {
        title: "Moltbot Updates",
        username: "moltbot",
        id: 99,
        type: "channel",
      },
      forward_signature: "Stan",
      forward_date: 789,
    } as any);
    expect(ctx).not.toBeNull();
    expect(ctx?.from).toBe("Moltbot Updates (Stan)");
    expect(ctx?.fromType).toBe("legacy_channel");
    expect(ctx?.fromId).toBe("99");
    expect(ctx?.fromUsername).toBe("moltbot");
    expect(ctx?.fromTitle).toBe("Moltbot Updates");
    expect(ctx?.fromSignature).toBe("Stan");
    expect(ctx?.date).toBe(789);
  });

  it("handles legacy hidden sender names", () => {
    const ctx = normalizeForwardedContext({
      forward_sender_name: "Legacy Hidden",
      forward_date: 111,
    } as any);
    expect(ctx).not.toBeNull();
    expect(ctx?.from).toBe("Legacy Hidden");
    expect(ctx?.fromType).toBe("legacy_hidden_user");
    expect(ctx?.date).toBe(111);
  });
});
