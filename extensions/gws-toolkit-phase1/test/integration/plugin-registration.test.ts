import { describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig } from "../fixtures/harness.js";

describe("integration: plugin registration", () => {
  it("registers the phase 2 tool surface and gws CLI command", () => {
    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    expect([...harness.tools.keys()].sort()).toEqual([
      "gws_calendar_read",
      "gws_calendar_write",
      "gws_docs_read",
      "gws_docs_write",
      "gws_drive_read",
      "gws_drive_write",
      "gws_gmail_read",
      "gws_gmail_write",
      "gws_sheets_read",
      "gws_sheets_write",
      "gws_status",
    ]);
    expect(harness.cliCommands).toContain("gws");
  });
}
