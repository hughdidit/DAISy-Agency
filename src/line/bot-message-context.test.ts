<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it } from "vitest";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { MessageEvent, PostbackEvent } from "@line/bot-sdk";
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
import type { ResolvedLineAccount } from "./types.js";
=======
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { buildLineMessageContext, buildLinePostbackContext } from "./bot-message-context.js";
=======
import type { MessageEvent, PostbackEvent } from "@line/bot-sdk";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { MessageEvent, PostbackEvent } from "@line/bot-sdk";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { MessageEvent, PostbackEvent } from "@line/bot-sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> ed11e93cf (chore(format))
import type { ResolvedLineAccount } from "./types.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { buildLineMessageContext, buildLinePostbackContext } from "./bot-message-context.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { ResolvedLineAccount } from "./types.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { buildLineMessageContext, buildLinePostbackContext } from "./bot-message-context.js";
import type { ResolvedLineAccount } from "./types.js";

describe("buildLineMessageContext", () => {
  let tmpDir: string;
  let storePath: string;
  let cfg: MoltbotConfig;
  const account: ResolvedLineAccount = {
    accountId: "default",
    enabled: true,
    channelAccessToken: "token",
    channelSecret: "secret",
    tokenSource: "config",
    config: {},
  };

  const createMessageEvent = (
    source: MessageEvent["source"],
    overrides?: Partial<MessageEvent>,
  ): MessageEvent =>
    ({
      type: "message",
      message: { id: "1", type: "text", text: "hello" },
      replyToken: "reply-token",
      timestamp: Date.now(),
      source,
      mode: "active",
      webhookEventId: "evt-1",
      deliveryContext: { isRedelivery: false },
      ...overrides,
    }) as MessageEvent;

  const createPostbackEvent = (
    source: PostbackEvent["source"],
    overrides?: Partial<PostbackEvent>,
  ): PostbackEvent =>
    ({
      type: "postback",
      postback: { data: "action=select" },
      replyToken: "reply-token",
      timestamp: Date.now(),
      source,
      mode: "active",
      webhookEventId: "evt-2",
      deliveryContext: { isRedelivery: false },
      ...overrides,
    }) as PostbackEvent;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-line-context-"));
    storePath = path.join(tmpDir, "sessions.json");
    cfg = { session: { store: storePath } };
  });

  afterEach(async () => {
    await fs.rm(tmpDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 50,
    });
  });

  it("routes group message replies to the group id", async () => {
    const event = createMessageEvent({ type: "group", groupId: "group-1", userId: "user-1" });

    const context = await buildLineMessageContext({
      event,
      allMedia: [],
      cfg,
      account,
    });
    expect(context).not.toBeNull();
    if (!context) {
      throw new Error("context missing");
    }

    expect(context.ctxPayload.OriginatingTo).toBe("line:group:group-1");
    expect(context.ctxPayload.To).toBe("line:group:group-1");
  });

  it("routes group postback replies to the group id", async () => {
    const event = createPostbackEvent({ type: "group", groupId: "group-2", userId: "user-2" });

    const context = await buildLinePostbackContext({
      event,
      cfg,
      account,
    });

    expect(context?.ctxPayload.OriginatingTo).toBe("line:group:group-2");
    expect(context?.ctxPayload.To).toBe("line:group:group-2");
  });

  it("routes room postback replies to the room id", async () => {
    const event = createPostbackEvent({ type: "room", roomId: "room-1", userId: "user-3" });

    const context = await buildLinePostbackContext({
      event,
      cfg,
      account,
    });

    expect(context?.ctxPayload.OriginatingTo).toBe("line:room:room-1");
    expect(context?.ctxPayload.To).toBe("line:room:room-1");
  });
});
