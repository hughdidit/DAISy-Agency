import { beforeEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";

import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { createTestRegistry } from "../../test-utils/channel-plugins.js";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
import { whatsappPlugin } from "../../../extensions/whatsapp/src/channel.js";
import { resolveOutboundTarget, resolveSessionDeliveryTarget } from "./targets.js";

describe("resolveOutboundTarget", () => {
  beforeEach(() => {
    setActivePluginRegistry(
      createTestRegistry([
        { pluginId: "whatsapp", plugin: whatsappPlugin, source: "test" },
        { pluginId: "telegram", plugin: telegramPlugin, source: "test" },
      ]),
    );
  });

  it("falls back to whatsapp allowFrom via config", () => {
    const cfg: OpenClawConfig = {
      channels: { whatsapp: { allowFrom: ["+1555"] } },
    };
    const res = resolveOutboundTarget({
      channel: "whatsapp",
      to: "",
      cfg,
      mode: "explicit",
    });
    expect(res).toEqual({ ok: true, to: "+1555" });
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
      name: "falls back to whatsapp allowFrom",
      input: { channel: "whatsapp" as const, to: "", allowFrom: ["+1555"] },
      expected: { ok: true as const, to: "+1555" },
    },
    {
      name: "normalizes whatsapp allowFrom fallback targets",
      input: {
        channel: "whatsapp" as const,
        to: "",
        allowFrom: ["whatsapp:(555) 123-4567"],
      },
      expected: { ok: true as const, to: "+5551234567" },
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
});

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
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: undefined,
      lastThreadId: undefined,
    });
  });

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
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: undefined,
      lastThreadId: undefined,
    });
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
        lastChannel: "slack",       // <- concurrently overwritten
        lastTo: "U0AEMECNCBV",     // <- Slack user (wrong target)
      },
      requestedChannel: "last",
      turnSourceChannel: "whatsapp",    // <- originated from WhatsApp
      turnSourceTo: "+66972796305",     // <- WhatsApp user (correct target)
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
});
