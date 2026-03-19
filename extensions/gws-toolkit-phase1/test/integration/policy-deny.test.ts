import { describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

describe("integration: policy deny", () => {
  it("denies disabled service and write-like request shape", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const disabledHarness = createHarness({
      pluginConfig: defaultPluginConfig({ enabledServices: ["drive"] }),
    });
    const disabled = await executeTool(disabledHarness, "gws_gmail_read", {
      action: "list_messages",
    });
    expect(disabled.ok).toBe(false);
    expect(disabled.error).toMatchObject({ code: "DENY_POLICY" });

    const writeLikeHarness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });
    const writeLike = await executeTool(writeLikeHarness, "gws_calendar_read", {
      action: "list_events",
      timeMin: "update this",
    });
    expect(writeLike.ok).toBe(false);
    expect(writeLike.error).toMatchObject({ code: "DENY_POLICY" });
  });

  it("emits audit event for validation denials", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const malformed = await executeTool(harness, "gws_gmail_read", {
      action: "list_messages",
      unknownParam: true,
    });
    expect(malformed.ok).toBe(false);
    expect(malformed.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const joinedLogs = harness.logs.join("\n");
    expect(joinedLogs).toContain('"resultCode":"VALIDATION_ERROR"');
    expect(joinedLogs).toContain('"decision":"deny"');
  });
});