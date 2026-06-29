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
    const completeTool = requireTool(tools, "kanban_complete");

    await expect(
      writeTool.execute("call", {
        action: "move_card",
        cardId: "card-1",
        lane: "review",
      }),
    ).rejects.toThrow(ToolInputError);

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
});
