import { afterEach, describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
  delete process.env.MOCK_GWS_MODE;
});

describe("integration: failure mapping", () => {
  it("maps cli error, non-json, and timeout failures to structured codes", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    process.env.MOCK_GWS_MODE = "cli_error";
    const cliHarness = createHarness({ pluginConfig: defaultPluginConfig() });
    const cliError = await executeTool(cliHarness, "gws_drive_read", { action: "list_files" });
    expect(cliError.ok).toBe(false);
    expect(cliError.error).toMatchObject({ code: "CLI_ERROR" });

    process.env.MOCK_GWS_MODE = "non_json";
    const nonJsonHarness = createHarness({ pluginConfig: defaultPluginConfig() });
    const nonJson = await executeTool(nonJsonHarness, "gws_drive_read", { action: "list_files" });
    expect(nonJson.ok).toBe(false);
    expect(nonJson.error).toMatchObject({ code: "NON_JSON_OUTPUT" });

    process.env.MOCK_GWS_MODE = "timeout";
    const timeoutHarness = createHarness({
      pluginConfig: defaultPluginConfig({ timeoutMs: 100 }),
    });
    const timeout = await executeTool(timeoutHarness, "gws_drive_read", { action: "list_files" });
    expect(timeout.ok).toBe(false);
    expect(timeout.error).toMatchObject({ code: "EXEC_TIMEOUT" });
  });
});
