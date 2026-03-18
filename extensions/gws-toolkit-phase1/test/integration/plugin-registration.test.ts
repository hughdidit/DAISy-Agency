import { describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig } from "../fixtures/harness.js";

describe("integration: plugin registration", () => {
  it("registers only phase1 tool surface and gws CLI command", () => {
    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    expect([...harness.tools.keys()].sort()).toEqual([
      "gws_calendar_read",
      "gws_drive_read",
      "gws_gmail_read",
      "gws_status",
    ]);
    expect(harness.cliCommands).toContain("gws");
  });
});
