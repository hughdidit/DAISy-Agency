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

    const calendarMissingEventId = await executeTool(harness, "gws_calendar_read", {
      action: "get_event",
    });
    expect(calendarMissingEventId.ok).toBe(false);
    expect(calendarMissingEventId.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
