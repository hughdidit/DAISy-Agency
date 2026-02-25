<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { beforeEach, describe, expect, it } from "vitest";
import type { MoltbotConfig } from "../../config/config.js";

import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { createTestRegistry } from "../../test-utils/channel-plugins.js";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
import { whatsappPlugin } from "../../../extensions/whatsapp/src/channel.js";
=======
import { beforeEach, describe, expect, it } from "vitest";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
import { whatsappPlugin } from "../../../extensions/whatsapp/src/channel.js";
import type { OpenClawConfig } from "../../config/config.js";
import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { createTestRegistry } from "../../test-utils/channel-plugins.js";
>>>>>>> ee519086f (Feature/default messenger delivery target (openclaw#16985) thanks @KirillShchetinin)
=======
import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> fd8b7b5c4 (test(outbound): share resolveOutboundTarget test suite)
import { resolveOutboundTarget, resolveSessionDeliveryTarget } from "./targets.js";
import {
  installResolveOutboundTargetPluginRegistryHooks,
  runResolveOutboundTargetCoreTests,
} from "./targets.shared-test.js";

runResolveOutboundTargetCoreTests();

describe("resolveOutboundTarget defaultTo config fallback", () => {
  installResolveOutboundTargetPluginRegistryHooks();

  it("uses whatsapp defaultTo when no explicit target is provided", () => {
    const cfg: OpenClawConfig = {
      channels: { whatsapp: { defaultTo: "+15551234567", allowFrom: ["*"] } },
    };
    const res = resolveOutboundTarget({
      channel: "whatsapp",
      to: undefined,
      cfg,
      mode: "implicit",
    });
    expect(res).toEqual({ ok: true, to: "+15551234567" });
  });

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  it("falls back to whatsapp allowFrom via config", () => {
    const cfg: MoltbotConfig = {
=======
  it("rejects whatsapp with empty target even when allowFrom configured", () => {
=======
  it("uses telegram defaultTo when no explicit target is provided", () => {
    const cfg: OpenClawConfig = {
      channels: { telegram: { defaultTo: "123456789" } },
    };
    const res = resolveOutboundTarget({
      channel: "telegram",
      to: "",
      cfg,
      mode: "implicit",
    });
    expect(res).toEqual({ ok: true, to: "123456789" });
  });

  it("explicit --reply-to overrides defaultTo", () => {
    const cfg: OpenClawConfig = {
      channels: { whatsapp: { defaultTo: "+15551234567", allowFrom: ["*"] } },
    };
    const res = resolveOutboundTarget({
      channel: "whatsapp",
      to: "+15559999999",
      cfg,
      mode: "explicit",
    });
    expect(res).toEqual({ ok: true, to: "+15559999999" });
  });

  it("still errors when no defaultTo and no explicit target", () => {
>>>>>>> fd8b7b5c4 (test(outbound): share resolveOutboundTarget test suite)
    const cfg: OpenClawConfig = {
>>>>>>> 39ee708df (fix(outbound): return error instead of silently redirecting to allowList[0] (#13578))
=======
  it("rejects whatsapp with empty target even when allowFrom configured", () => {
    const cfg: OpenClawConfig = {
>>>>>>> ee519086f (Feature/default messenger delivery target (openclaw#16985) thanks @KirillShchetinin)
      channels: { whatsapp: { allowFrom: ["+1555"] } },
    };
    const res = resolveOutboundTarget({
      channel: "whatsapp",
      to: "",
      cfg,
      mode: "implicit",
    });
    expect(res.ok).toBe(false);
<<<<<<< HEAD
    if (!res.ok) {
      expect(res.error.message).toContain("WhatsApp");
    }
  });

  it.each([
    {
      name: "normalizes whatsapp target when provided",
      input: { channel: "whatsapp" as const, to: " (555) 123-4567 " },
      expected: { ok: true as const, to: "+5551234567" },
    },
    {
      name: "keeps whatsapp group targets",
      input: { channel: "whatsapp" as const, to: "120363401234567890@g.us" },
      expected: { ok: true as const, to: "120363401234567890@g.us" },
    },
    {
      name: "normalizes prefixed/uppercase whatsapp group targets",
      input: {
        channel: "whatsapp" as const,
        to: " WhatsApp:120363401234567890@G.US ",
      },
      expected: { ok: true as const, to: "120363401234567890@g.us" },
    },
    {
      name: "rejects whatsapp with empty target and allowFrom (no silent fallback)",
      input: { channel: "whatsapp" as const, to: "", allowFrom: ["+1555"] },
      expectedErrorIncludes: "WhatsApp",
    },
    {
      name: "rejects whatsapp with empty target and prefixed allowFrom (no silent fallback)",
      input: {
        channel: "whatsapp" as const,
        to: "",
        allowFrom: ["whatsapp:(555) 123-4567"],
      },
      expectedErrorIncludes: "WhatsApp",
    },
    {
      name: "rejects invalid whatsapp target",
      input: { channel: "whatsapp" as const, to: "wat" },
      expectedErrorIncludes: "WhatsApp",
    },
    {
      name: "rejects whatsapp without to when allowFrom missing",
      input: { channel: "whatsapp" as const, to: " " },
      expectedErrorIncludes: "WhatsApp",
    },
    {
      name: "rejects whatsapp allowFrom fallback when invalid",
      input: { channel: "whatsapp" as const, to: "", allowFrom: ["wat"] },
      expectedErrorIncludes: "WhatsApp",
    },
  ])("$name", ({ input, expected, expectedErrorIncludes }) => {
    const res = resolveOutboundTarget(input);
    if (expected) {
      expect(res).toEqual(expected);
      return;
    }
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.message).toContain(expectedErrorIncludes);
    }
  });

  it("rejects telegram with missing target", () => {
    const res = resolveOutboundTarget({ channel: "telegram", to: " " });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.message).toContain("Telegram");
    }
  });

  it("rejects webchat delivery", () => {
    const res = resolveOutboundTarget({ channel: "webchat", to: "x" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.message).toContain("WebChat");
    }
  });
<<<<<<< HEAD
});
=======
import { describe, expect, it } from "vitest";
import { resolveSessionDeliveryTarget } from "./targets.js";
>>>>>>> d833dcd73 (fix(telegram): cron and heartbeat messages land in wrong chat instead of target topic (#19367))
=======

  describe("defaultTo config fallback", () => {
    it("uses whatsapp defaultTo when no explicit target is provided", () => {
      const cfg: OpenClawConfig = {
        channels: { whatsapp: { defaultTo: "+15551234567", allowFrom: ["*"] } },
      };
      const res = resolveOutboundTarget({
        channel: "whatsapp",
        to: undefined,
        cfg,
        mode: "implicit",
      });
      expect(res).toEqual({ ok: true, to: "+15551234567" });
    });

    it("uses telegram defaultTo when no explicit target is provided", () => {
      const cfg: OpenClawConfig = {
        channels: { telegram: { defaultTo: "123456789" } },
      };
      const res = resolveOutboundTarget({
        channel: "telegram",
        to: "",
        cfg,
        mode: "implicit",
      });
      expect(res).toEqual({ ok: true, to: "123456789" });
    });

    it("explicit --reply-to overrides defaultTo", () => {
      const cfg: OpenClawConfig = {
        channels: { whatsapp: { defaultTo: "+15551234567", allowFrom: ["*"] } },
      };
      const res = resolveOutboundTarget({
        channel: "whatsapp",
        to: "+15559999999",
        cfg,
        mode: "explicit",
      });
      expect(res).toEqual({ ok: true, to: "+15559999999" });
    });

    it("still errors when no defaultTo and no explicit target", () => {
      const cfg: OpenClawConfig = {
        channels: { whatsapp: { allowFrom: ["+1555"] } },
      };
      const res = resolveOutboundTarget({
        channel: "whatsapp",
        to: "",
        cfg,
        mode: "implicit",
      });
      expect(res.ok).toBe(false);
    });
=======
>>>>>>> fd8b7b5c4 (test(outbound): share resolveOutboundTarget test suite)
  });
});
>>>>>>> ee519086f (Feature/default messenger delivery target (openclaw#16985) thanks @KirillShchetinin)

describe("resolveSessionDeliveryTarget", () => {
  it("derives implicit delivery from the last route", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-1",
        updatedAt: 1,
        lastChannel: " whatsapp ",
        lastTo: " +1555 ",
        lastAccountId: " acct-1 ",
      },
      requestedChannel: "last",
    });

    expect(resolved).toEqual({
      channel: "whatsapp",
      to: "+1555",
      accountId: "acct-1",
      threadId: undefined,
<<<<<<< HEAD
=======
      threadIdExplicit: false,
>>>>>>> d833dcd73 (fix(telegram): cron and heartbeat messages land in wrong chat instead of target topic (#19367))
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: "acct-1",
      lastThreadId: undefined,
    });
  });

  it("prefers explicit targets without reusing lastTo", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-2",
        updatedAt: 1,
        lastChannel: "whatsapp",
        lastTo: "+1555",
      },
      requestedChannel: "telegram",
    });

    expect(resolved).toEqual({
      channel: "telegram",
      to: undefined,
      accountId: undefined,
      threadId: undefined,
<<<<<<< HEAD
=======
      threadIdExplicit: false,
>>>>>>> d833dcd73 (fix(telegram): cron and heartbeat messages land in wrong chat instead of target topic (#19367))
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: undefined,
      lastThreadId: undefined,
    });
  });

  it("allows mismatched lastTo when configured", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-3",
        updatedAt: 1,
        lastChannel: "whatsapp",
        lastTo: "+1555",
      },
      requestedChannel: "telegram",
      allowMismatchedLastTo: true,
    });

    expect(resolved).toEqual({
      channel: "telegram",
      to: "+1555",
      accountId: undefined,
      threadId: undefined,
<<<<<<< HEAD
=======
      threadIdExplicit: false,
>>>>>>> d833dcd73 (fix(telegram): cron and heartbeat messages land in wrong chat instead of target topic (#19367))
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: undefined,
      lastThreadId: undefined,
    });
  });

<<<<<<< HEAD
=======
  it("passes through explicitThreadId when provided", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-thread",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "-100123",
        lastThreadId: 999,
      },
      requestedChannel: "last",
      explicitThreadId: 42,
    });

    expect(resolved.threadId).toBe(42);
    expect(resolved.channel).toBe("telegram");
    expect(resolved.to).toBe("-100123");
  });

  it("uses session lastThreadId when no explicitThreadId", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-thread-2",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "-100123",
        lastThreadId: 999,
      },
      requestedChannel: "last",
    });

    expect(resolved.threadId).toBe(999);
  });

>>>>>>> d833dcd73 (fix(telegram): cron and heartbeat messages land in wrong chat instead of target topic (#19367))
  it("falls back to a provided channel when requested is unsupported", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-4",
        updatedAt: 1,
        lastChannel: "whatsapp",
        lastTo: "+1555",
      },
      requestedChannel: "webchat",
      fallbackChannel: "slack",
    });

    expect(resolved).toEqual({
      channel: "slack",
      to: undefined,
      accountId: undefined,
      threadId: undefined,
<<<<<<< HEAD
=======
      threadIdExplicit: false,
>>>>>>> d833dcd73 (fix(telegram): cron and heartbeat messages land in wrong chat instead of target topic (#19367))
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: undefined,
      lastThreadId: undefined,
    });
  });
<<<<<<< HEAD
=======

  it("parses :topic:NNN from explicitTo into threadId", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-topic",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "63448508",
      },
      requestedChannel: "last",
      explicitTo: "63448508:topic:1008013",
    });

    expect(resolved.to).toBe("63448508");
    expect(resolved.threadId).toBe(1008013);
  });

  it("parses :topic:NNN even when lastTo is absent", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-no-last",
        updatedAt: 1,
        lastChannel: "telegram",
      },
      requestedChannel: "last",
      explicitTo: "63448508:topic:1008013",
    });

    expect(resolved.to).toBe("63448508");
    expect(resolved.threadId).toBe(1008013);
  });

  it("skips :topic: parsing for non-telegram channels", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-slack",
        updatedAt: 1,
        lastChannel: "slack",
        lastTo: "C12345",
      },
      requestedChannel: "last",
      explicitTo: "C12345:topic:999",
    });

    expect(resolved.to).toBe("C12345:topic:999");
    expect(resolved.threadId).toBeUndefined();
  });

  it("skips :topic: parsing when channel is explicitly non-telegram even if lastChannel was telegram", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-cross",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "63448508",
      },
      requestedChannel: "slack",
      explicitTo: "C12345:topic:999",
    });

    expect(resolved.to).toBe("C12345:topic:999");
    expect(resolved.threadId).toBeUndefined();
  });

  it("explicitThreadId takes priority over :topic: parsed value", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-priority",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "63448508",
      },
      requestedChannel: "last",
      explicitTo: "63448508:topic:1008013",
      explicitThreadId: 42,
    });

    expect(resolved.threadId).toBe(42);
    expect(resolved.to).toBe("63448508");
  });
<<<<<<< HEAD
>>>>>>> d833dcd73 (fix(telegram): cron and heartbeat messages land in wrong chat instead of target topic (#19367))
=======

  it("blocks heartbeat delivery to Slack DMs and avoids inherited threadId", () => {
    const cfg: OpenClawConfig = {};
    const resolved = resolveHeartbeatDeliveryTarget({
      cfg,
      entry: {
        sessionId: "sess-heartbeat-outbound",
        updatedAt: 1,
        lastChannel: "slack",
        lastTo: "user:U123",
        lastThreadId: "1739142736.000100",
      },
      heartbeat: {
        target: "last",
      },
    });

    expect(resolved.channel).toBe("none");
    expect(resolved.reason).toBe("dm-blocked");
    expect(resolved.threadId).toBeUndefined();
  });

  it("blocks heartbeat delivery to Discord DMs", () => {
    const cfg: OpenClawConfig = {};
    const resolved = resolveHeartbeatDeliveryTarget({
      cfg,
      entry: {
        sessionId: "sess-heartbeat-discord-dm",
        updatedAt: 1,
        lastChannel: "discord",
        lastTo: "user:12345",
      },
      heartbeat: {
        target: "last",
      },
    });

    expect(resolved.channel).toBe("none");
    expect(resolved.reason).toBe("dm-blocked");
  });

  it("blocks heartbeat delivery to Telegram direct chats", () => {
    const cfg: OpenClawConfig = {};
    const resolved = resolveHeartbeatDeliveryTarget({
      cfg,
      entry: {
        sessionId: "sess-heartbeat-telegram-direct",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "5232990709",
      },
      heartbeat: {
        target: "last",
      },
    });

    expect(resolved.channel).toBe("none");
    expect(resolved.reason).toBe("dm-blocked");
  });

  it("keeps heartbeat delivery to Telegram groups", () => {
    const cfg: OpenClawConfig = {};
    const resolved = resolveHeartbeatDeliveryTarget({
      cfg,
      entry: {
        sessionId: "sess-heartbeat-telegram-group",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "-1001234567890",
      },
      heartbeat: {
        target: "last",
      },
    });

    expect(resolved.channel).toBe("telegram");
    expect(resolved.to).toBe("-1001234567890");
  });

  it("blocks heartbeat delivery to WhatsApp direct chats", () => {
    const cfg: OpenClawConfig = {};
    const resolved = resolveHeartbeatDeliveryTarget({
      cfg,
      entry: {
        sessionId: "sess-heartbeat-whatsapp-direct",
        updatedAt: 1,
        lastChannel: "whatsapp",
        lastTo: "+15551234567",
      },
      heartbeat: {
        target: "last",
      },
    });

    expect(resolved.channel).toBe("none");
    expect(resolved.reason).toBe("dm-blocked");
  });

  it("keeps heartbeat delivery to WhatsApp groups", () => {
    const cfg: OpenClawConfig = {};
    const resolved = resolveHeartbeatDeliveryTarget({
      cfg,
      entry: {
        sessionId: "sess-heartbeat-whatsapp-group",
        updatedAt: 1,
        lastChannel: "whatsapp",
        lastTo: "120363140186826074@g.us",
      },
      heartbeat: {
        target: "last",
      },
    });

    expect(resolved.channel).toBe("whatsapp");
    expect(resolved.to).toBe("120363140186826074@g.us");
  });

  it("uses session chatType hint when target parser cannot classify", () => {
    const cfg: OpenClawConfig = {};
    const resolved = resolveHeartbeatDeliveryTarget({
      cfg,
      entry: {
        sessionId: "sess-heartbeat-imessage-direct",
        updatedAt: 1,
        lastChannel: "imessage",
        lastTo: "chat-guid-unknown-shape",
        chatType: "direct",
      },
      heartbeat: {
        target: "last",
      },
    });

    expect(resolved.channel).toBe("none");
    expect(resolved.reason).toBe("dm-blocked");
  });

  it("keeps heartbeat delivery to Discord channels", () => {
    const cfg: OpenClawConfig = {};
    const resolved = resolveHeartbeatDeliveryTarget({
      cfg,
      entry: {
        sessionId: "sess-heartbeat-discord-channel",
        updatedAt: 1,
        lastChannel: "discord",
        lastTo: "channel:999",
      },
      heartbeat: {
        target: "last",
      },
    });

    expect(resolved.channel).toBe("discord");
    expect(resolved.to).toBe("channel:999");
  });

  it("keeps explicit threadId in heartbeat mode", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-heartbeat-explicit-thread",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "-100123",
        lastThreadId: 999,
      },
      requestedChannel: "last",
      mode: "heartbeat",
      explicitThreadId: 42,
    });

    expect(resolved.channel).toBe("telegram");
    expect(resolved.to).toBe("-100123");
    expect(resolved.threadId).toBe(42);
    expect(resolved.threadIdExplicit).toBe(true);
  });

  it("parses explicit heartbeat topic targets into threadId", () => {
    const cfg: OpenClawConfig = {};
    const resolved = resolveHeartbeatDeliveryTarget({
      cfg,
      heartbeat: {
        target: "telegram",
        to: "-10063448508:topic:1008013",
      },
    });

    expect(resolved.channel).toBe("telegram");
    expect(resolved.to).toBe("-10063448508");
    expect(resolved.threadId).toBe(1008013);
  });
});

describe("resolveSessionDeliveryTarget — cross-channel reply guard (#24152)", () => {
  it("uses turnSourceChannel over session lastChannel when provided", () => {
    // Simulate: WhatsApp message originated the turn, but a Slack message
    // arrived concurrently and updated lastChannel to "slack"
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-shared",
        updatedAt: 1,
        lastChannel: "slack", // <- concurrently overwritten
        lastTo: "U0AEMECNCBV", // <- Slack user (wrong target)
      },
      requestedChannel: "last",
      turnSourceChannel: "whatsapp", // <- originated from WhatsApp
      turnSourceTo: "+66972796305", // <- WhatsApp user (correct target)
    });

    expect(resolved.channel).toBe("whatsapp");
    expect(resolved.to).toBe("+66972796305");
  });

  it("falls back to session lastChannel when turnSourceChannel is not set", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-normal",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "8587265585",
      },
      requestedChannel: "last",
    });

    expect(resolved.channel).toBe("telegram");
    expect(resolved.to).toBe("8587265585");
  });

  it("respects explicit requestedChannel over turnSourceChannel", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-explicit",
        updatedAt: 1,
        lastChannel: "slack",
        lastTo: "U12345",
      },
      requestedChannel: "telegram",
      explicitTo: "8587265585",
      turnSourceChannel: "whatsapp",
      turnSourceTo: "+66972796305",
    });

    // Explicit requestedChannel "telegram" is not "last", so it takes priority
    expect(resolved.channel).toBe("telegram");
  });

  it("preserves turnSourceAccountId and turnSourceThreadId", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-meta",
        updatedAt: 1,
        lastChannel: "slack",
        lastTo: "U_WRONG",
        lastAccountId: "wrong-account",
      },
      requestedChannel: "last",
      turnSourceChannel: "telegram",
      turnSourceTo: "8587265585",
      turnSourceAccountId: "bot-123",
      turnSourceThreadId: 42,
    });

    expect(resolved.channel).toBe("telegram");
    expect(resolved.to).toBe("8587265585");
    expect(resolved.accountId).toBe("bot-123");
    expect(resolved.threadId).toBe(42);
  });
>>>>>>> f35c902bd (style: fix oxfmt formatting in targets.test.ts)
});
