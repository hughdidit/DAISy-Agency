import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { executeCommand } from "../../src/executor.js";
import type { GwsToolkitConfig } from "../../src/types.js";

const fixture = path.resolve("extensions/gws-toolkit-phase1/test/fixtures/mock-gws.js");

const config: GwsToolkitConfig = {
  enabledServices: ["drive", "gmail", "calendar"],
  enabledWriteServices: [],
  binaryPath: fixture,
  approvedCredentialDirs: [],
  tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
  timeoutMs: 2000,
  maxStdoutBytes: 1024,
  maxStderrBytes: 1024,
  safeMode: true,
  allowedCredentialModes: ["oauth", "token", "credentials_file"],
  allowWriteOperations: false,
  allowUnboundAgents: false,
  defaultCredentialRoute: null,
  credentialRoutes: {},
  agentCredentialBindings: {},
  defaultScopesProfile: "minimal",
  requireHumanApprovalFor: [],
  warnings: [],
};

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

describe("executor", () => {
  it("executes argv without shell interpolation and collects output", async () => {
    const result = await executeCommand({
      config,
      binaryPath: fixture,
      argv: ["drive", "files", "list", "--format", "json"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"service":"drive"');
  });

  it("times out and kills long-running process", async () => {
    process.env.MOCK_GWS_MODE = "timeout";
    const result = await executeCommand({
      config: { ...config, timeoutMs: 100 },
      binaryPath: fixture,
      argv: ["drive", "files", "list", "--format", "json"],
    });
    expect(result.timedOut).toBe(true);
  });
}
