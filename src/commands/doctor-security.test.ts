import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";

const note = vi.hoisted(() => vi.fn());
const pluginRegistry = vi.hoisted(() => ({ list: [] as unknown[] }));
const cronStoreMocks = vi.hoisted(() => ({
  loadCronStore: vi.fn(async () => ({ version: 1, jobs: [] })),
  resolveCronStorePath: vi.fn((value?: string) => value ?? "/tmp/cron/jobs.json"),
}));

vi.mock("../terminal/note.js", () => ({
  note,
}));

vi.mock("../channels/plugins/index.js", () => ({
  listChannelPlugins: () => pluginRegistry.list,
}));

vi.mock("../cron/store.js", () => ({
  loadCronStore: cronStoreMocks.loadCronStore,
  resolveCronStorePath: cronStoreMocks.resolveCronStorePath,
}));

import { noteSecurityWarnings } from "./doctor-security.js";

describe("noteSecurityWarnings gateway exposure", () => {
  let prevToken: string | undefined;
  let prevPassword: string | undefined;

  beforeEach(() => {
    note.mockClear();
    pluginRegistry.list = [];
    cronStoreMocks.loadCronStore.mockReset();
    cronStoreMocks.loadCronStore.mockResolvedValue({ version: 1, jobs: [] });
    cronStoreMocks.resolveCronStorePath.mockReset();
    cronStoreMocks.resolveCronStorePath.mockImplementation(
      (value?: string) => value ?? "/tmp/cron/jobs.json",
    );
    prevToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    prevPassword = process.env.OPENCLAW_GATEWAY_PASSWORD;
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
    delete process.env.OPENCLAW_GATEWAY_PASSWORD;
  });

  afterEach(() => {
    if (prevToken === undefined) {
      delete process.env.OPENCLAW_GATEWAY_TOKEN;
    } else {
      process.env.OPENCLAW_GATEWAY_TOKEN = prevToken;
    }
    if (prevPassword === undefined) {
      delete process.env.OPENCLAW_GATEWAY_PASSWORD;
    } else {
      process.env.OPENCLAW_GATEWAY_PASSWORD = prevPassword;
    }
  });

  const lastMessage = () => String(note.mock.calls.at(-1)?.[0] ?? "");

  it("warns when exposed without auth", async () => {
    const cfg = { gateway: { bind: "lan" } } as OpenClawConfig;
    await noteSecurityWarnings(cfg);
    const message = lastMessage();
    expect(message).toContain("CRITICAL");
    expect(message).toContain("without authentication");
    expect(message).toContain("Safer remote access");
    expect(message).toContain("ssh -N -L 18789:127.0.0.1:18789");
  });

  it("uses env token to avoid critical warning", async () => {
    process.env.OPENCLAW_GATEWAY_TOKEN = "token-123";
    const cfg = { gateway: { bind: "lan" } } as OpenClawConfig;
    await noteSecurityWarnings(cfg);
    const message = lastMessage();
    expect(message).toContain("WARNING");
    expect(message).not.toContain("CRITICAL");
  });

  it("treats whitespace token as missing", async () => {
    const cfg = {
      gateway: { bind: "lan", auth: { mode: "token", token: "   " } },
    } as OpenClawConfig;
    await noteSecurityWarnings(cfg);
    const message = lastMessage();
    expect(message).toContain("CRITICAL");
  });

  it("skips warning for loopback bind", async () => {
    const cfg = { gateway: { bind: "loopback" } } as OpenClawConfig;
    await noteSecurityWarnings(cfg);
    const message = lastMessage();
    expect(message).toContain("No channel security warnings detected");
    expect(message).not.toContain("Gateway bound");
  });

  it("shows explicit dmScope config command for multi-user DMs", async () => {
    pluginRegistry.list = [
      {
        id: "whatsapp",
        meta: { label: "WhatsApp" },
        config: {
          listAccountIds: () => ["default"],
          resolveAccount: () => ({}),
          isEnabled: () => true,
          isConfigured: () => true,
        },
        security: {
          resolveDmPolicy: () => ({
            policy: "allowlist",
            allowFrom: ["alice", "bob"],
            allowFromPath: "channels.whatsapp.",
            approveHint: "approve",
          }),
        },
      },
    ];
    const cfg = { session: { dmScope: "main" } } as OpenClawConfig;
    await noteSecurityWarnings(cfg);
    const message = lastMessage();
    expect(message).toContain('config set session.dmScope "per-channel-peer"');
  });

  it("clarifies approvals.exec forwarding-only behavior", async () => {
    const cfg = {
      approvals: {
        exec: {
          enabled: false,
        },
      },
    } as OpenClawConfig;
    await noteSecurityWarnings(cfg);
    const message = lastMessage();
    expect(message).toContain("disables approval forwarding only");
    expect(message).toContain("exec-approvals.json");
    expect(message).toContain("openclaw approvals get --gateway");
  });

  it("emits delegate hardening warnings for unsafe posture", async () => {
    cronStoreMocks.loadCronStore.mockResolvedValue({
      version: 1,
      jobs: [
        {
          id: "job-1",
          agentId: "ops",
          sessionTarget: "main",
          payload: { kind: "systemEvent", text: "unsafe" },
        },
      ],
    });
    const cfg = {
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "shared",
          },
        },
        list: [
          {
            id: "ops",
            workspace: "/tmp/ops",
            delegate: {
              enabled: true,
              tier: "tier3",
              authIsolation: "legacy",
            },
            sandbox: {
              mode: "non-main",
              scope: "shared",
            },
            tools: {
              allow: ["read"],
            },
          },
        ],
      },
      plugins: {
        entries: {
          "gws-toolkit-phase1": {
            enabled: true,
            config: {
              allowUnboundAgents: true,
              credentialRoutes: {
                "ops-main": {
                  mode: "oauth",
                  allowedServices: ["gmail"],
                  allowedTools: ["gws_gmail_read"],
                },
              },
              agentCredentialBindings: {
                "agent:ops": "ops-main",
              },
              enabledWriteServices: [],
              allowWriteOperations: false,
            },
          },
        },
      },
      cron: {
        enabled: false,
      },
    } as OpenClawConfig;

    await noteSecurityWarnings(cfg);
    const message = lastMessage();
    expect(message).toContain('Delegate agent "ops" is using legacy auth isolation');
    expect(message).toContain('Delegate agent "ops" must run with sandbox.mode="all"');
    expect(message).toContain("missing an explicit GWS binding for subagent:ops");
    expect(message).toContain("allowUnboundAgents=false");
    expect(message).toContain("tier3 but global cron is disabled");
    expect(message).toContain("job-1");
  });

  it("passes a hardened delegate reference posture", async () => {
    const cfg = {
      agents: {
        list: [
          {
            id: "ops",
            workspace: "/tmp/ops",
            delegate: {
              enabled: true,
              tier: "tier1",
              authIsolation: "strict",
              gwsRouting: { requireExplicitBindings: true },
              cron: { allowed: false },
            },
            sandbox: {
              mode: "all",
              scope: "agent",
            },
            tools: {
              allow: [
                "read",
                "web_fetch",
                "web_search",
                "session_status",
                "sessions_history",
                "sessions_list",
                "sessions_send",
                "sessions_spawn",
                "gws_status",
                "gws_drive_read",
                "gws_gmail_read",
                "gws_calendar_read",
                "gws_docs_read",
                "gws_sheets_read",
                "gws_gmail_write",
              ],
              deny: ["apply_patch", "browser", "canvas", "edit", "exec", "gateway", "nodes", "write", "cron"],
            },
          },
        ],
      },
      plugins: {
        entries: {
          "gws-toolkit-phase1": {
            enabled: true,
            config: {
              allowUnboundAgents: false,
              allowWriteOperations: true,
              enabledWriteServices: ["gmail"],
              credentialRoutes: {
                "ops-main": {
                  mode: "oauth",
                  allowedServices: ["gmail", "calendar"],
                  allowedTools: ["gws_gmail_read", "gws_calendar_read", "gws_gmail_write"],
                  allowedActions: ["draft_message"],
                },
              },
              agentCredentialBindings: {
                "agent:ops": "ops-main",
                "subagent:ops": "ops-main",
              },
            },
          },
        },
      },
    } as OpenClawConfig;

    await noteSecurityWarnings(cfg);
    const message = lastMessage();
    expect(message).toContain("No channel security warnings detected");
    expect(message).not.toContain('Delegate agent "ops"');
  });
});
