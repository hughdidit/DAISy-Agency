import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/policy.js";
import type { GwsToolkitConfig } from "../../src/types.js";

const config: GwsToolkitConfig = {
  enabledServices: ["drive", "gmail", "calendar"],
  approvedCredentialDirs: [],
  tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
  timeoutMs: 1000,
  maxStdoutBytes: 1024,
  maxStderrBytes: 1024,
  safeMode: true,
  allowedCredentialModes: ["oauth", "token", "credentials_file"],
  defaultScopesProfile: "minimal",
};

describe("policy", () => {
  it("denies disabled services", () => {
    const decision = evaluatePolicy({
      tool: "gws_drive_read",
      service: "drive",
      action: "list_files",
      payload: {},
      config: { ...config, enabledServices: ["gmail"] },
    });
    expect(decision.allowed).toBe(false);
  });

  it("denies unsupported actions", () => {
    const decision = evaluatePolicy({
      tool: "gws_gmail_read",
      service: "gmail",
      action: "send_message",
      payload: {},
      config,
    });
    expect(decision.allowed).toBe(false);
  });

  it("denies write/raw-like payload shapes", () => {
    const decision = evaluatePolicy({
      tool: "gws_calendar_read",
      service: "calendar",
      action: "list_events",
      payload: { query: "please update and send" },
      config,
    });
    expect(decision.allowed).toBe(false);
  });

  it("avoids substring false positives on safe values", () => {
    const decision = evaluatePolicy({
      tool: "gws_gmail_read",
      service: "gmail",
      action: "list_messages",
      payload: { query: "from:sender@example.com subject:planning" },
      config,
    });
    expect(decision.allowed).toBe(true);
  });
});
