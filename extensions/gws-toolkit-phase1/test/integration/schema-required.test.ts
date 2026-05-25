import { describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

describe("integration: action-specific required params", () => {
  it("rejects missing required ids at schema layer", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const driveMissingFileId = await executeTool(harness, "gws_drive_read", {
      action: "get_file_metadata",
    });
    expect(driveMissingFileId.ok).toBe(false);
    expect(driveMissingFileId.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const downloadMissingFileId = await executeTool(harness, "gws_drive_read", {
      action: "download_file",
    });
    expect(downloadMissingFileId.ok).toBe(false);
    expect(downloadMissingFileId.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const calendarMissingEventId = await executeTool(harness, "gws_calendar_read", {
      action: "get_event",
    });
    expect(calendarMissingEventId.ok).toBe(false);
    expect(calendarMissingEventId.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const gmailMissingMessageId = await executeTool(harness, "gws_gmail_write", {
      action: "mark_message_read",
      confirm: true,
    });
    expect(gmailMissingMessageId.ok).toBe(false);
    expect(gmailMissingMessageId.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("accepts Drive download params but rejects unknown read params", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const download = await executeTool(harness, "gws_drive_read", {
      action: "download_file",
      fileId: "file-1",
      outputPath: "reports/report.pdf",
      overwrite: true,
    });
    expect(download.ok).toBe(false);
    expect(download.error).toMatchObject({ code: "AUTH_ERROR" });
    expect(download.error.message).toContain("delegated Google API transport");

    const unknown = await executeTool(harness, "gws_drive_read", {
      action: "download_file",
      fileId: "file-1",
      destination: "reports/report.pdf",
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
