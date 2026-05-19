import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/policy.js";
import type { AuthResolution, GwsToolkitConfig } from "../../src/types.js";

const config: GwsToolkitConfig = {
  enabledServices: ["drive", "gmail", "calendar", "docs", "sheets"],
  enabledWriteServices: ["drive"],
  approvedCredentialDirs: [],
  tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
  timeoutMs: 1000,
  maxStdoutBytes: 1024,
  maxStderrBytes: 1024,
  safeMode: true,
  allowedCredentialModes: ["token", "credentials_file"],
  allowWriteOperations: true,
  allowUnboundAgents: false,
  defaultCredentialRoute: null,
  credentialRoutes: {},
  agentCredentialBindings: {},
  workspaceIdentityDomains: [],
  defaultScopesProfile: "minimal",
  requireHumanApprovalFor: [],
  warnings: [],
};

const auth: AuthResolution = {
  mode: "token" as const,
  env: {},
  args: [],
  bindingSubject: "agent:main",
  transport: "gws_cli",
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

  it("applies gmail contact policy after existing write gates", () => {
    const gmailConfig: GwsToolkitConfig = {
      ...config,
      enabledWriteServices: ["gmail"],
      gmailPolicy: {
        whitelist: {
          emails: ["approved@example.com"],
          domains: ["trusted.example"],
        },
        blacklist: {
          emails: ["blocked@example.com"],
          domains: [],
        },
      },
    };
    const gmailAuth: AuthResolution = {
      ...auth,
      route: {
        ...auth.route,
        allowedServices: ["gmail"],
        allowedTools: ["gws_gmail_write"],
        allowedActions: ["send_message", "draft_message", "gmail:mark_message_read"],
      },
    };

    expect(
      evaluatePolicy({
        tool: "gws_gmail_write",
        service: "gmail",
        action: "send_message",
        payload: { to: ["approved@example.com", "ops@trusted.example"] },
        config: gmailConfig,
        auth: gmailAuth,
        isWrite: true,
        confirm: true,
      }).allowed,
    ).toBe(true);
    expect(
      evaluatePolicy({
        tool: "gws_gmail_write",
        service: "gmail",
        action: "draft_message",
        payload: { to: "unknown@example.com" },
        config: gmailConfig,
        auth: gmailAuth,
        isWrite: true,
        confirm: true,
      }).allowed,
    ).toBe(true);
    expect(
      evaluatePolicy({
        tool: "gws_gmail_write",
        service: "gmail",
        action: "send_message",
        payload: { to: "unknown@example.com" },
        config: gmailConfig,
        auth: gmailAuth,
        isWrite: true,
        confirm: true,
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluatePolicy({
        tool: "gws_gmail_write",
        service: "gmail",
        action: "draft_message",
        payload: { to: "blocked@example.com" },
        config: gmailConfig,
        auth: gmailAuth,
        isWrite: true,
        confirm: true,
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluatePolicy({
        tool: "gws_gmail_write",
        service: "gmail",
        action: "mark_message_read",
        payload: { messageId: "msg-123" },
        config: gmailConfig,
        auth: gmailAuth,
        isWrite: true,
        confirm: true,
      }).allowed,
    ).toBe(true);
    expect(
      evaluatePolicy({
        tool: "gws_gmail_write",
        service: "gmail",
        action: "mark_message_read",
        payload: { messageId: "msg-123" },
        config: gmailConfig,
        auth: gmailAuth,
        isWrite: true,
        confirm: false,
      }).reason,
    ).toContain("confirm=true");
    expect(
      evaluatePolicy({
        tool: "gws_gmail_write",
        service: "gmail",
        action: "mark_message_read",
        payload: { messageId: "msg-123" },
        config: gmailConfig,
        auth: {
          ...gmailAuth,
          route: {
            ...gmailAuth.route,
            allowedActions: ["send_message", "draft_message"],
          },
        },
        isWrite: true,
        confirm: true,
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluatePolicy({
        tool: "gws_gmail_write",
        service: "gmail",
        action: "send_message",
        payload: { to: "approved@example.com" },
        config: gmailConfig,
        auth: gmailAuth,
        isWrite: true,
        confirm: false,
      }).reason,
    ).toContain("confirm=true");
  });
});
