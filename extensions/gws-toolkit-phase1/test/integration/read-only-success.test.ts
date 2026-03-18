import { afterEach, describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

describe("integration: read-only success", () => {
  it("executes drive/gmail/calendar read commands successfully", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const drive = await executeTool(harness, "gws_drive_read", { action: "list_files", pageSize: 3 });
    const gmail = await executeTool(harness, "gws_gmail_read", { action: "list_messages", maxResults: 2 });
    const calendar = await executeTool(harness, "gws_calendar_read", {
      action: "list_events",
      pageSize: 1,
    });

    expect(drive.ok).toBe(true);
    expect(gmail.ok).toBe(true);
    expect(calendar.ok).toBe(true);
  });
});
