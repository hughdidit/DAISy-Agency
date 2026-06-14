import { Command } from "commander";
import { describe, expect, it } from "vitest";
import type { AnyAgentTool } from "../../../src/agents/tools/common.js";
import type { OpenClawPluginApi, OpenClawPluginToolContext } from "../../../src/plugins/types.js";
import plugin from "../index.js";

function createHarness(pluginConfig: unknown = {}) {
  const factories: Array<
    (ctx: OpenClawPluginToolContext) => AnyAgentTool | AnyAgentTool[] | null | undefined
  > = [];
  const cliCommands: string[] = [];
  const api = {
    pluginConfig,
    logger: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    },
    registerTool: (
      factory: (ctx: OpenClawPluginToolContext) => AnyAgentTool | AnyAgentTool[] | null | undefined,
    ) => {
      factories.push(factory);
    },
    registerCli: (register: (ctx: { program: Command }) => void) => {
      const program = new Command();
      register({ program });
      for (const command of program.commands) {
        cliCommands.push(command.name());
        for (const subcommand of command.commands) {
          cliCommands.push(`${command.name()} ${subcommand.name()}`);
        }
      }
    },
  } as unknown as OpenClawPluginApi;

  plugin.register(api);
  const tools = new Map<string, AnyAgentTool>();
  for (const factory of factories) {
    const produced = factory({
      agentId: "daisy",
      sessionId: "session-1",
      sessionKey: "agent:daisy:main",
      config: {
        plugins: {
          entries: {
            "trello-toolkit": {
              enabled: true,
              config: pluginConfig as Record<string, unknown>,
            },
          },
        },
      },
    });
    for (const tool of Array.isArray(produced) ? produced : produced ? [produced] : []) {
      tools.set(tool.name, tool);
    }
  }
  return { tools, cliCommands };
}

describe("trello-toolkit plugin registration", () => {
  it("registers the brokered Trello tool surface and CLI command", () => {
    const harness = createHarness({
      allowUnboundAgents: true,
      defaultRoute: "default",
      routes: {
        default: {
          allowedTools: ["trello_status", "trello_read", "trello_write"],
          allowedActions: ["list_boards", "create_card"],
        },
      },
    });

    expect([...harness.tools.keys()].sort()).toEqual([
      "trello_read",
      "trello_status",
      "trello_write",
    ]);
    expect(harness.tools.get("trello_read")?.description).toContain("Read Trello");
    expect(harness.tools.get("trello_write")?.description).toContain("Write Trello");
    expect(harness.cliCommands).toEqual(["trello", "trello status"]);
  });
});
