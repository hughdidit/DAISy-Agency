import { describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

describe("integration: migration compatibility", () => {
  it("accepts legacy phase1 config and surfaces migration warning through status", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig({
        enabledServices: ["drive"],
        allowedCredentialModes: ["token"],
      }),
    });

    const status = await executeTool(harness, "gws_status", {});
    expect(status.ok).toBe(true);
    expect(status.data.config.warnings.join("\n")).toContain("legacy single-credential");
    expect(status.data.config.allowUnboundAgents).toBe(true);
    expect(status.data.config.defaultCredentialRoute).toBe("legacy-default");
    expect(status.data.routes[0].name).toBe("legacy-default");
  });
});
