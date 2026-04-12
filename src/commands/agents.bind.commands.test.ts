import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseConfigSnapshot, createTestRuntime } from "./test-runtime-config-helpers.js";

const readConfigFileSnapshotMock = vi.hoisted(() => vi.fn());
const writeConfigFileMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("../config/config.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../config/config.js")>()),
  readConfigFileSnapshot: readConfigFileSnapshotMock,
  writeConfigFile: writeConfigFileMock,
}));

vi.mock("../channels/plugins/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../channels/plugins/index.js")>();
  return {
    ...actual,
    getChannelPlugin: (channel: string) => {
      if (channel === "matrix-js") {
        return {
          id: "matrix-js",
          setup: {
            resolveBindingAccountId: ({ agentId }: { agentId: string }) => agentId.toLowerCase(),
          },
        };
      }
      return actual.getChannelPlugin(channel);
    },
    normalizeChannelId: (channel: string) => {
      if (channel.trim().toLowerCase() === "matrix-js") {
        return "matrix-js";
      }
      return actual.normalizeChannelId(channel);
    },
  };
});

import { agentsBindCommand, agentsBindingsCommand, agentsUnbindCommand } from "./agents.js";

const runtime = createTestRuntime();

describe("agents bind/unbind commands", () => {
  beforeEach(() => {
    readConfigFileSnapshotMock.mockClear();
    writeConfigFileMock.mockClear();
    runtime.log.mockClear();
    runtime.error.mockClear();
    runtime.exit.mockClear();
  });

  it("lists all bindings by default", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({
      ...baseConfigSnapshot,
      config: {
        bindings: [
          { agentId: "main", match: { channel: "matrix-js" } },
          { agentId: "ops", match: { channel: "telegram", accountId: "work" } },
        ],
      },
    });

    await agentsBindingsCommand({}, runtime);

    expect(runtime.log).toHaveBeenCalledWith(expect.stringContaining("main <- matrix-js"));
    expect(runtime.log).toHaveBeenCalledWith(
      expect.stringContaining("ops <- telegram accountId=work"),
    );
  });

  it("binds routes to default agent when --agent is omitted", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({
      ...baseConfigSnapshot,
      config: {},
    });

    await agentsBindCommand({ bind: ["telegram"] }, runtime);

    expect(writeConfigFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bindings: [{ agentId: "main", match: { channel: "telegram" } }],
      }),
    );
    expect(runtime.exit).not.toHaveBeenCalled();
  });

  it("writes both agent and subagent GWS bindings by default", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({
      ...baseConfigSnapshot,
      config: {
        agents: { list: [{ id: "ops", workspace: "/tmp/ops" }] },
        plugins: {
          entries: {
            "gws-toolkit-phase1": {
              enabled: true,
              config: {
                credentialRoutes: {
                  "ops-main": {
                    mode: "oauth",
                    allowedServices: ["gmail"],
                    allowedTools: ["gws_gmail_read", "gws_gmail_write"],
                    allowedActions: ["draft_message"],
                  },
                },
                agentCredentialBindings: {},
              },
            },
          },
        },
      },
    });

    await agentsBindCommand({ agent: "ops", gwsRoute: "ops-main" }, runtime);

    expect(writeConfigFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: expect.objectContaining({
          entries: expect.objectContaining({
            "gws-toolkit-phase1": expect.objectContaining({
              config: expect.objectContaining({
                agentCredentialBindings: {
                  "agent:ops": "ops-main",
                  "subagent:ops": "ops-main",
                },
              }),
            }),
          }),
        }),
      }),
    );
    expect(runtime.log).toHaveBeenCalledWith("Added GWS bindings:");
    expect(runtime.exit).not.toHaveBeenCalled();
  });

  it("supports a distinct subagent GWS route override", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({
      ...baseConfigSnapshot,
      config: {
        agents: { list: [{ id: "ops", workspace: "/tmp/ops" }] },
        plugins: {
          entries: {
            "gws-toolkit-phase1": {
              enabled: true,
              config: {
                credentialRoutes: {
                  "ops-main": { mode: "oauth", allowedServices: ["gmail"], allowedTools: [] },
                  "ops-subagent": { mode: "oauth", allowedServices: ["calendar"], allowedTools: [] },
                },
                agentCredentialBindings: {},
              },
            },
          },
        },
      },
    });

    await agentsBindCommand(
      {
        agent: "ops",
        gwsRoute: "ops-main",
        subagentGwsRoute: "ops-subagent",
      },
      runtime,
    );

    expect(writeConfigFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: expect.objectContaining({
          entries: expect.objectContaining({
            "gws-toolkit-phase1": expect.objectContaining({
              config: expect.objectContaining({
                agentCredentialBindings: {
                  "agent:ops": "ops-main",
                  "subagent:ops": "ops-subagent",
                },
              }),
            }),
          }),
        }),
      }),
    );
    expect(runtime.exit).not.toHaveBeenCalled();
  });

  it("defaults matrix-js accountId to the target agent id when omitted", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({
      ...baseConfigSnapshot,
      config: {},
    });

    await agentsBindCommand({ agent: "main", bind: ["matrix-js"] }, runtime);

    expect(writeConfigFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bindings: [{ agentId: "main", match: { channel: "matrix-js", accountId: "main" } }],
      }),
    );
    expect(runtime.exit).not.toHaveBeenCalled();
  });

  it("upgrades existing channel-only binding when accountId is later provided", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({
      ...baseConfigSnapshot,
      config: {
        bindings: [{ agentId: "main", match: { channel: "telegram" } }],
      },
    });

    await agentsBindCommand({ bind: ["telegram:work"] }, runtime);

    expect(writeConfigFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bindings: [{ agentId: "main", match: { channel: "telegram", accountId: "work" } }],
      }),
    );
    expect(runtime.log).toHaveBeenCalledWith("Updated bindings:");
    expect(runtime.exit).not.toHaveBeenCalled();
  });

  it("unbinds all routes for an agent", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({
      ...baseConfigSnapshot,
      config: {
        agents: { list: [{ id: "ops", workspace: "/tmp/ops" }] },
        bindings: [
          { agentId: "main", match: { channel: "matrix-js" } },
          { agentId: "ops", match: { channel: "telegram", accountId: "work" } },
        ],
      },
    });

    await agentsUnbindCommand({ agent: "ops", all: true }, runtime);

    expect(writeConfigFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bindings: [{ agentId: "main", match: { channel: "matrix-js" } }],
      }),
    );
    expect(runtime.exit).not.toHaveBeenCalled();
  });

  it("reports ownership conflicts during unbind and exits 1", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({
      ...baseConfigSnapshot,
      config: {
        agents: { list: [{ id: "ops", workspace: "/tmp/ops" }] },
        bindings: [{ agentId: "main", match: { channel: "telegram", accountId: "ops" } }],
      },
    });

    await agentsUnbindCommand({ agent: "ops", bind: ["telegram:ops"] }, runtime);

    expect(writeConfigFileMock).not.toHaveBeenCalled();
    expect(runtime.error).toHaveBeenCalledWith("Bindings are owned by another agent:");
    expect(runtime.exit).toHaveBeenCalledWith(1);
  });

  it("keeps role-based bindings when removing channel-level discord binding", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({
      ...baseConfigSnapshot,
      config: {
        bindings: [
          {
            agentId: "main",
            match: {
              channel: "discord",
              accountId: "guild-a",
              roles: ["111", "222"],
            },
          },
          {
            agentId: "main",
            match: {
              channel: "discord",
              accountId: "guild-a",
            },
          },
        ],
      },
    });

    await agentsUnbindCommand({ bind: ["discord:guild-a"] }, runtime);

    expect(writeConfigFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bindings: [
          {
            agentId: "main",
            match: {
              channel: "discord",
              accountId: "guild-a",
              roles: ["111", "222"],
            },
          },
        ],
      }),
    );
    expect(runtime.exit).not.toHaveBeenCalled();
  });
});
