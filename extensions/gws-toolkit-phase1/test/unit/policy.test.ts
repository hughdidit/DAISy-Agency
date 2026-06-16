import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/policy.js";
import type { AuthResolution, GwsToolkitConfig } from "../../src/types.js";

const config: GwsToolkitConfig = {
  enabledServices: ["drive", "gmail", "calendar", "docs", "sheets", "contacts", "groups"],
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

  it("allows gated Contacts group writes and denies destructive delete actions", () => {
    const contactsConfig: GwsToolkitConfig = {
      ...config,
      enabledWriteServices: ["contacts"],
    };
    const contactsAuth: AuthResolution = {
      ...auth,
      route: {
        ...auth.route,
        allowedServices: ["contacts"],
        allowedTools: ["gws_contacts_read", "gws_contacts_write"],
        allowedActions: [
          "contacts:list_contact_groups",
          "contacts:create_contact_group",
          "contacts:modify_contact_group_members",
        ],
      },
    };

    expect(
      evaluatePolicy({
        tool: "gws_contacts_write",
        service: "contacts",
        action: "modify_contact_group_members",
        payload: {
          resourceName: "contactGroups/friends",
          resourceNamesToAdd: ["people/c123"],
        },
        config: contactsConfig,
        auth: contactsAuth,
        isWrite: true,
        confirm: true,
      }).allowed,
    ).toBe(true);
    expect(
      evaluatePolicy({
        tool: "gws_contacts_write",
        service: "contacts",
        action: "delete_contact_group",
        payload: { resourceName: "contactGroups/friends" },
        config: contactsConfig,
        auth: contactsAuth,
        isWrite: true,
        confirm: true,
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluatePolicy({
        tool: "gws_contacts_write",
        service: "contacts",
        action: "create_contact_group",
        payload: { name: "Friends" },
        config: contactsConfig,
        auth: contactsAuth,
        isWrite: true,
        confirm: false,
      }).reason,
    ).toContain("confirm=true");
  });

  it("allows gated Directory Groups member writes and denies group deletion", () => {
    const groupsConfig: GwsToolkitConfig = {
      ...config,
      enabledWriteServices: ["groups"],
    };
    const groupsAuth: AuthResolution = {
      ...auth,
      route: {
        ...auth.route,
        allowedServices: ["groups"],
        allowedTools: ["gws_groups_read", "gws_groups_write"],
        allowedActions: [
          "groups:list_groups",
          "groups:add_group_member",
          "groups:remove_group_member",
        ],
      },
    };

    expect(
      evaluatePolicy({
        tool: "gws_groups_write",
        service: "groups",
        action: "add_group_member",
        payload: {
          groupKey: "agents@example.com",
          memberEmail: "daisy.ai@example.com",
        },
        config: groupsConfig,
        auth: groupsAuth,
        isWrite: true,
        confirm: true,
      }).allowed,
    ).toBe(true);
    expect(
      evaluatePolicy({
        tool: "gws_groups_write",
        service: "groups",
        action: "delete_group",
        payload: { groupKey: "agents@example.com" },
        config: groupsConfig,
        auth: groupsAuth,
        isWrite: true,
        confirm: true,
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluatePolicy({
        tool: "gws_groups_write",
        service: "groups",
        action: "remove_group_member",
        payload: {
          groupKey: "agents@example.com",
          memberKey: "daisy.ai@example.com",
        },
        config: groupsConfig,
        auth: groupsAuth,
        isWrite: true,
        confirm: false,
      }).reason,
    ).toContain("confirm=true");
  });

  it("allows Drive downloads only through the read tool and route action policy", () => {
    expect(
      evaluatePolicy({
        tool: "gws_drive_read",
        service: "drive",
        action: "download_file",
        payload: { fileId: "file-1", outputPath: "reports/report.pdf" },
        config,
        auth: {
          ...auth,
          route: {
            ...auth.route,
            allowedActions: ["drive:download_file"],
          },
        },
      }),
    ).toMatchObject({ allowed: true });

    expect(
      evaluatePolicy({
        tool: "gws_drive_read",
        service: "drive",
        action: "download_file",
        payload: { fileId: "file-1" },
        config,
        auth,
      }),
    ).toMatchObject({ allowed: false });

    expect(
      evaluatePolicy({
        tool: "gws_drive_write",
        service: "drive",
        action: "download_file",
        payload: { fileId: "file-1" },
        config,
        auth: {
          ...auth,
          route: {
            ...auth.route,
            allowedActions: ["drive:download_file"],
          },
        },
        isWrite: true,
        confirm: true,
      }),
    ).toMatchObject({ allowed: false });
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
    const wildcardRouteMarkRead = evaluatePolicy({
      tool: "gws_gmail_write",
      service: "gmail",
      action: "mark_message_read",
      payload: { messageId: "msg-123" },
      config: gmailConfig,
      auth: {
        ...gmailAuth,
        route: {
          ...gmailAuth.route,
          allowedActions: undefined,
        },
      },
      isWrite: true,
      confirm: true,
    });
    expect(wildcardRouteMarkRead).toMatchObject({ allowed: false });
    expect(wildcardRouteMarkRead.reason).toContain("must explicitly allow gmail:mark_message_read");
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
