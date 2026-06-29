import { describe, expect, it } from "vitest";
import { installGatewayTestHooks, startServerWithClient } from "../../gateway/test-helpers.js";
import { withEnvAsync } from "../../test-utils/env.js";
import { createOpenClawTools } from "../openclaw-tools.js";
import {
  listCoreToolSections,
  resolveCoreToolCapabilityBoundary,
  resolveCoreToolProfiles,
} from "../tool-catalog.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError } from "./common.js";
import type { GatewayCallOptions } from "./gateway.js";
import { createKanbanTools } from "./kanban-tool.js";

installGatewayTestHooks();

function requireTool(tools: AnyAgentTool[], name: string) {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool?.execute) {
    throw new Error(`missing executable tool: ${name}`);
  }
  return tool as AnyAgentTool & { execute: NonNullable<AnyAgentTool["execute"]> };
}

describe("kanban agent tools", () => {
  it("registers the five Kanban tools in the core runtime and catalog", () => {
    const expectedNames = [
      "kanban_read",
      "kanban_write",
      "kanban_pick_task",
      "kanban_handoff",
      "kanban_complete",
    ];

    const runtimeToolNames = createOpenClawTools().map((tool) => tool.name);
    for (const name of expectedNames) {
      expect(runtimeToolNames).toContain(name);
      expect(resolveCoreToolProfiles(name)).toContain("coding");
      expect(resolveCoreToolCapabilityBoundary(name)).toBe("gateway-brokered");
    }

    const kanbanSection = listCoreToolSections().find((section) => section.id === "kanban");
    expect(kanbanSection?.tools.map((tool) => tool.id)).toEqual(expectedNames);
  });

  it("validates required write and completion parameters before gateway calls", async () => {
    const tools = createKanbanTools();
    const writeTool = requireTool(tools, "kanban_write");
    const handoffTool = requireTool(tools, "kanban_handoff");
    const completeTool = requireTool(tools, "kanban_complete");

    await expect(
      writeTool.execute("call", {
        action: "move_card",
        cardId: "card-1",
        lane: "review",
      }),
    ).rejects.toThrow(ToolInputError);

    await expect(
      handoffTool.execute("call", {
        cardId: "card-1",
        summary: "Needs review",
      }),
    ).rejects.toThrow(/expectedVersion required/);

    await expect(
      completeTool.execute("call", {
        cardId: "card-1",
        expectedVersion: 1.5,
        summary: "Finished",
      }),
    ).rejects.toThrow(/expectedVersion must be an integer/);

    await expect(
      completeTool.execute("call", {
        cardId: "card-1",
        expectedVersion: 1,
      }),
    ).rejects.toThrow(/summary required/);
  });

  it("reads Kanban status through a real gateway RPC", async () => {
    const started = await startServerWithClient("kanban-tool-secret");
    try {
      await withEnvAsync(
        {
          OPENCLAW_GATEWAY_PORT: String(started.port),
          OPENCLAW_GATEWAY_TOKEN: "kanban-tool-secret",
        },
        async () => {
          const readTool = requireTool(createKanbanTools(), "kanban_read");
          const result = await readTool.execute("call", {
            action: "status",
            gatewayUrl: `ws://127.0.0.1:${started.port}`,
            gatewayToken: "kanban-tool-secret",
            timeoutMs: 10_000,
          });

          expect(result.details).toMatchObject({
            ok: false,
            available: false,
          });
          expect(JSON.stringify(result.details)).not.toContain("kanban-tool-secret");
        },
      );
    } finally {
      started.ws.close();
      await started.server.close();
      started.envSnapshot.restore();
    }
  });

  it("allows archived card reconciliation pages up to the Kanban read ceiling", async () => {
    const calls: Array<{ method: string; params?: unknown }> = [];
    const readTool = requireTool(
      createKanbanTools(
        {},
        {
          callGatewayTool: async <T = Record<string, unknown>>(
            method: string,
            _opts: GatewayCallOptions,
            params?: unknown,
          ): Promise<T> => {
            calls.push({ method, params });
            return { cards: [] } as T;
          },
        },
      ),
      "kanban_read",
    );

    const result = await readTool.execute("call", {
      action: "list_cards",
      includeArchived: true,
      limit: 2_000,
    });

    expect(result.details).toEqual({ cards: [] });
    expect(calls).toEqual([
      {
        method: "kanban.cards.list",
        params: {
          boardId: undefined,
          includeArchived: true,
          limit: 2_000,
        },
      },
    ]);
  });

  it("rejects active card pages above the active-card read ceiling", async () => {
    const readTool = requireTool(createKanbanTools(), "kanban_read");

    await expect(
      readTool.execute("call", {
        action: "list_cards",
        limit: 501,
      }),
    ).rejects.toThrow(/limit must be at most 500/);
  });
});
