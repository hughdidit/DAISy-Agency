import { describe, expect, it } from "vitest";
import { resolveConfig } from "../src/config.js";
import { evaluatePolicy } from "../src/policy.js";

describe("trello-toolkit config and policy", () => {
  it("normalizes secure defaults and rejects unknown config keys", () => {
    const config = resolveConfig({
      routes: {
        ops: {
          allowedTools: ["trello_status", "trello_read"],
          allowedActions: ["list_boards"],
          allowedBoardIds: ["board-1", "board-1"],
          allowedListIds: ["list-1"],
        },
      },
      agentRouteBindings: { "agent:daisy": "ops" },
    });

    expect(config).toMatchObject({
      ok: true,
      value: {
        config: {
          apiKeyEnvVar: "TRELLO_API_KEY",
          tokenEnvVar: "TRELLO_TOKEN",
          allowWriteOperations: false,
          allowUnboundAgents: false,
          routes: {
            ops: {
              allowedTools: ["trello_status", "trello_read"],
              allowedActions: ["list_boards"],
              allowedBoardIds: ["board-1"],
              allowedListIds: ["list-1"],
            },
          },
          agentRouteBindings: { "agent:daisy": "ops" },
        },
      },
    });

    expect(resolveConfig({ unknown: true })).toMatchObject({
      ok: false,
      error: { error: { code: "CONFIG_ERROR", message: "Unknown plugin config keys: unknown" } },
    });

    expect(resolveConfig("not an object")).toMatchObject({
      ok: false,
      error: { error: { code: "CONFIG_ERROR", message: "plugin config must be an object" } },
      posture: {
        pluginConfigProvided: true,
        valid: false,
        message: "plugin config must be an object",
      },
    });
  });

  it("requires explicit route and write approval before allowing writes", () => {
    const config = resolveConfig({
      allowWriteOperations: true,
      routes: {
        ops: {
          allowedTools: ["trello_write"],
          allowedActions: ["create_card"],
          allowedBoardIds: ["board-1"],
          allowedListIds: ["list-1"],
        },
      },
      agentRouteBindings: { "agent:daisy": "ops" },
    });
    if (!config.ok) {
      throw new Error("config should be valid");
    }

    expect(
      evaluatePolicy({
        config: config.value.config,
        subject: "agent:daisy",
        tool: "trello_write",
        action: "create_card",
        isWrite: true,
        confirm: false,
        boardId: "board-1",
        listId: "list-1",
      }),
    ).toMatchObject({ allowed: false, reason: "write operations require confirm=true" });

    expect(
      evaluatePolicy({
        config: config.value.config,
        subject: "agent:daisy",
        tool: "trello_write",
        action: "create_card",
        isWrite: true,
        confirm: true,
        boardId: "board-1",
        listId: "list-1",
      }),
    ).toMatchObject({ allowed: true, routeName: "ops" });

    expect(
      evaluatePolicy({
        config: config.value.config,
        subject: "agent:daisy",
        tool: "trello_write",
        action: "create_card",
        isWrite: true,
        confirm: true,
        boardId: "board-2",
        listId: "list-1",
      }),
    ).toMatchObject({ allowed: false, reason: "route ops does not allow board board-2" });

    expect(
      evaluatePolicy({
        config: config.value.config,
        subject: "agent:daisy",
        tool: "trello_write",
        action: "create_card",
        isWrite: true,
        confirm: true,
      }),
    ).toMatchObject({ allowed: true, routeName: "ops" });
  });
});
