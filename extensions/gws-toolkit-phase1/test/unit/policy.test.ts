import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/policy.js";
import type { GwsToolkitConfig } from "../../src/types.js";

const config: GwsToolkitConfig = {
  enabledServices: ["drive", "gmail", "calendar", "docs", "sheets"],
  enabledWriteServices: ["drive"],
  approvedCredentialDirs: [],
  tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
  timeoutMs: 1000,
  maxStdoutBytes: 1024,
  maxStderrBytes: 1024,
  safeMode: true,
  allowedCredentialModes: ["oauth", "token", "credentials_file"],
  allowWriteOperations: true,
  allowUnboundAgents: false,
  defaultCredentialRoute: null,
  credentialRoutes: {},
  agentCredentialBindings: {},
  defaultScopesProfile: "minimal",
  requireHumanApprovalFor: [],
  warnings: [],
};

const auth = {
  mode: "token" as const,
  env: {},
  args: [],
  bindingSubject: "agent:main",
  route: {
    name: "default",
    mode: "token" as const,
    allowedServices: ["drive"],
    allowedTools: ["gws_drive_write", "gws_drive_read"],
    allowedActions: ["create_folder"],
  },
};

describe("policy", () => {
  it("denies disabled services", () => {
    const decision = evaluatePolicy({
      tool: "gws_drive_read",
      service: "drive",
      action: "list_files",
      payload: {},
      config: { ...config, enabledServices: ["gmail"] },
      auth,
    });
    expect(decision.allowed).toBe(false);
  });

  it("denies write without confirm", () => {
    const decision = evaluatePolicy({
      tool: "gws_drive_write",
      service: "drive",
      action: "create_folder",
      payload: { name: "Folder" },
      config,
      auth,
      isWrite: true,
      confirm: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("confirm=true");
  });

  it("denies write when service write gate is disabled", () => {
    const decision = evaluatePolicy({
      tool: "gws_calendar_write",
      service: "calendar",
      action: "create_event",
      payload: { summary: "Standup" },
      config,
      auth: {
        ...auth,
        route: {
          ...auth.route,
          allowedServices: ["calendar"],
          allowedTools: ["gws_calendar_write"],
          allowedActions: ["create_event"],
        },
      },
      isWrite: true,
      confirm: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("write service disabled");
  });

  it("denies route-disallowed actions", () => {
    const decision = evaluatePolicy({
      tool: "gws_drive_write",
      service: "drive",
      action: "upload_file",
      payload: { filePath: "/tmp/a.txt" },
      config,
      auth,
      isWrite: true,
      confirm: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("does not allow");
  });

  it("allows a fully gated write", () => {
    const decision = evaluatePolicy({
      tool: "gws_drive_write",
      service: "drive",
      action: "create_folder",
      payload: { name: "Folder" },
      config,
      auth,
      isWrite: true,
      confirm: true,
    });
    expect(decision.allowed).toBe(true);
  });
}
