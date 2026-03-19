import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createHarness,
  defaultPluginConfig,
  executeTool,
  withTempFile,
} from "../fixtures/harness.js";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
  delete process.env.MOCK_GWS_MODE;
});

describe("gws-toolkit-phase1 acceptance contracts", () => {
  it("returns structured status success", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token-for-tests";
    process.env.OPENCLAW_CONFIG_FILE = path.resolve("openclaw.config.json");

    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const result = await executeTool(harness, "gws_status", {});
    expect(result.ok).toBe(true);
    expect(result.meta).toMatchObject({
      tool: "gws_status",
      resultCode: "OK",
    });
  });

  it("supports drive/gmail/calendar read success paths", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token-for-tests";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const drive = await executeTool(harness, "gws_drive_read", { action: "list_files" });
    const gmail = await executeTool(harness, "gws_gmail_read", { action: "list_messages" });
    const calendar = await executeTool(harness, "gws_calendar_read", { action: "list_events" });

    expect(drive.ok).toBe(true);
    expect(gmail.ok).toBe(true);
    expect(calendar.ok).toBe(true);
  });

  it("denies unsupported write-like action and malformed params", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token-for-tests";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const writeLike = await executeTool(harness, "gws_drive_read", {
      action: "list_files",
      query: "send this file",
    });
    expect(writeLike.ok).toBe(false);
    expect(writeLike.error).toMatchObject({ code: "DENY_POLICY" });

    const malformed = await executeTool(harness, "gws_gmail_read", {
      action: "list_messages",
      unknownParam: true,
    });
    expect(malformed.ok).toBe(false);
    expect(malformed.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("maps missing binary and unsupported version errors", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token-for-tests";

    const missingBinaryHarness = createHarness({
      pluginConfig: defaultPluginConfig({
        binaryPath: path.resolve("extensions/gws-toolkit-phase1/test/fixtures/no-such-gws.js"),
      }),
    });

    const missingBinary = await executeTool(missingBinaryHarness, "gws_status", {});
    expect(missingBinary.ok).toBe(false);
    expect(missingBinary.error).toMatchObject({ code: "BINARY_NOT_FOUND" });

    process.env.MOCK_GWS_MODE = "old_version";
    const oldVersionHarness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });
    const unsupportedVersion = await executeTool(oldVersionHarness, "gws_status", {});
    expect(unsupportedVersion.ok).toBe(false);
    expect(unsupportedVersion.error).toMatchObject({ code: "UNSUPPORTED_GWS_VERSION" });
  });

  it("fails closed on non-json output and timeout", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token-for-tests";

    process.env.MOCK_GWS_MODE = "non_json";
    const nonJsonHarness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });
    const nonJson = await executeTool(nonJsonHarness, "gws_drive_read", { action: "list_files" });
    expect(nonJson.ok).toBe(false);
    expect(nonJson.error).toMatchObject({ code: "NON_JSON_OUTPUT" });

    process.env.MOCK_GWS_MODE = "timeout";
    const timeoutHarness = createHarness({
      pluginConfig: defaultPluginConfig({ timeoutMs: 200 }),
    });
    const timeout = await executeTool(timeoutHarness, "gws_drive_read", { action: "list_files" });
    expect(timeout.ok).toBe(false);
    expect(timeout.error).toMatchObject({ code: "EXEC_TIMEOUT" });
  });

  it("enforces credential directory boundary", async () => {
    const credentialsFile = path.resolve("extensions/gws-toolkit-phase1/test/fixtures/mock-gws.js");
    const harness = createHarness({
      pluginConfig: defaultPluginConfig({
        allowedCredentialModes: ["credentials_file"],
        credentialsFile,
        approvedCredentialDirs: [path.resolve("extensions/gws-toolkit-phase1/test")],
      }),
    });

    const allowed = await executeTool(harness, "gws_drive_read", { action: "list_files" });
    expect(allowed.ok).toBe(true);

    const deniedHarness = createHarness({
      pluginConfig: defaultPluginConfig({
        allowedCredentialModes: ["credentials_file"],
        credentialsFile,
        approvedCredentialDirs: [path.resolve("extensions/gws-toolkit-phase1/test/acceptance")],
      }),
    });

    const denied = await executeTool(deniedHarness, "gws_drive_read", { action: "list_files" });
    expect(denied.ok).toBe(false);
    expect(denied.error).toMatchObject({ code: "AUTH_ERROR" });
  });

  it("returns structured config error when plugin config is missing from loaded config source", async () => {
    const tempPath = await withTempFile(JSON.stringify({ plugins: { entries: {} } }));
    process.env.OPENCLAW_CONFIG_FILE = tempPath;

    const harness = createHarness({
      pluginConfig: undefined,
    });

    const result = await executeTool(harness, "gws_status", {});
    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ code: "CONFIG_ERROR" });
    expect(result.error.details).toMatchObject({
      posture: {
        sourcePathPresent: true,
        pluginConfigProvided: false,
      },
    });
  });
});
