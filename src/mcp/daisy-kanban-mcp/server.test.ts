import { describe, expect, it } from "vitest";
import type { GatewayCallOptions } from "../../agents/tools/gateway.js";
import { createKanbanMcpRequestHandler, sanitizeGatewayUrl } from "./server.js";

type GatewayCall = {
  method: string;
  params?: unknown;
};

function createHandler(calls: GatewayCall[]) {
  return createKanbanMcpRequestHandler({
    env: {
      DAISY_KANBAN_AGENT_ID: "codex-desktop",
      DAISY_KANBAN_AGENT_NAME: "Codex Desktop",
    },
    callGateway: async <T = Record<string, unknown>>(
      method: string,
      _opts: GatewayCallOptions,
      params?: unknown,
    ): Promise<T> => {
      calls.push({ method, params });
      if (method === "kanban.codex.pickNext") {
        return {
          card: {
            id: "card-1",
            title: "Picked card",
            lane: "in_progress",
            version: 2,
          },
        } as T;
      }
      if (method === "kanban.codex.handoff") {
        return {
          card: {
            id: "card-1",
            title: "Picked card",
            lane: "review",
            version: 3,
          },
        } as T;
      }
      return { ok: true } as T;
    },
  });
}

describe("DAISy Kanban MCP server", () => {
  it("sanitizes gateway URLs without changing the WebSocket protocol", () => {
    expect(sanitizeGatewayUrl("ws://127.0.0.1:18889")).toBe("ws://127.0.0.1:18889");
    expect(sanitizeGatewayUrl("wss://gateway.example.com:443")).toBe("wss://gateway.example.com");
  });

  it("rejects unsafe gateway URL forms", () => {
    expect(() => sanitizeGatewayUrl("https://127.0.0.1:18889")).toThrow(/ws:\/\/ or wss:\/\//);
    expect(() => sanitizeGatewayUrl("ws://gateway.example.com:18889")).toThrow(/loopback/);
    expect(() => sanitizeGatewayUrl("wss://user:token@gateway.example.com")).toThrow(/credentials/);
    expect(() => sanitizeGatewayUrl("wss://gateway.example.com/kanban")).toThrow(/path/);
    expect(() => sanitizeGatewayUrl("wss://gateway.example.com?token=secret")).toThrow(
      /query or hash/,
    );
  });

  it("lists the Codex Kanban tools", async () => {
    const handler = createHandler([]);

    const response = await handler({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "kanban_read" }),
          expect.objectContaining({ name: "kanban_write" }),
          expect.objectContaining({ name: "kanban_pick_task" }),
          expect.objectContaining({ name: "kanban_handoff" }),
          expect.objectContaining({ name: "kanban_complete" }),
        ]),
      },
    });
  });

  it("maps kanban_pick_task to gateway pickNext with Codex Desktop identity", async () => {
    const calls: GatewayCall[] = [];
    const handler = createHandler(calls);

    const response = await handler({
      jsonrpc: "2.0",
      id: "pick",
      method: "tools/call",
      params: {
        name: "kanban_pick_task",
        arguments: {},
      },
    });

    expect(calls).toEqual([
      {
        method: "kanban.codex.pickNext",
        params: {
          boardId: undefined,
          agentId: "codex-desktop",
          agentName: "Codex Desktop",
        },
      },
    ]);
    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: "pick",
      result: {
        structuredContent: {
          card: {
            id: "card-1",
            lane: "in_progress",
          },
        },
      },
    });
  });

  it("maps kanban_handoff to gateway handoff", async () => {
    const calls: GatewayCall[] = [];
    const handler = createHandler(calls);

    const response = await handler({
      jsonrpc: "2.0",
      id: "handoff",
      method: "tools/call",
      params: {
        name: "kanban_handoff",
        arguments: {
          cardId: "card-1",
          expectedVersion: 2,
          summary: "Ready for review",
          reviewer: "ops-reviewer",
        },
      },
    });

    expect(calls).toEqual([
      {
        method: "kanban.codex.handoff",
        params: {
          boardId: undefined,
          cardId: "card-1",
          expectedVersion: 2,
          summary: "Ready for review",
          reviewer: "ops-reviewer",
        },
      },
    ]);
    expect(response).toMatchObject({
      result: {
        structuredContent: {
          card: {
            id: "card-1",
            lane: "review",
          },
        },
      },
    });
  });
});
