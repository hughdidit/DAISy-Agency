import { afterEach, describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

describe("integration: per-agent write controls", () => {
  it("allows one route and denies another based on route tool/service policy", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const allowedHarness = createHarness({
      pluginConfig: defaultPluginConfig({
        allowWriteOperations: true,
        enabledWriteServices: ["drive"],
        credentialRoutes: {
          writer: {
            mode: "token",
            allowedServices: ["drive"],
            allowedTools: ["gws_drive_read", "gws_drive_write"],
            allowedActions: ["create_folder"],
          },
        },
        agentCredentialBindings: {
          "agent:main": "writer",
        },
      }),
    });

    const allowed = await executeTool(allowedHarness, "gws_drive_write", {
      action: "create_folder",
      confirm: true,
      name: "Phase2",
    });
    expect(allowed.ok).toBe(true);

    const deniedHarness = createHarness({
      pluginConfig: defaultPluginConfig({
        allowWriteOperations: true,
        enabledWriteServices: ["drive"],
        credentialRoutes: {
          reader: {
            mode: "token",
            allowedServices: ["drive"],
            allowedTools: ["gws_drive_read"],
          },
        },
        agentCredentialBindings: {
          "agent:main": "reader",
        },
      }),
    });

    const denied = await executeTool(deniedHarness, "gws_drive_write", {
      action: "create_folder",
      confirm: true,
      name: "Phase2",
    });
    expect(denied.ok).toBe(false);
    expect(denied.error.code).toBe("DENY_POLICY");
  });
});
