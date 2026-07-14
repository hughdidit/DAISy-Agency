import { describe, expect, it } from "vitest";
import { createKanbanBridgeServer } from "./server.js";

describe("kanban bridge", () => {
  it("requires the Site credential and forwards status without touching MongoDB", async () => {
    const calls: Array<{ method: string; params: unknown }> = [];
    const server = createKanbanBridgeServer({
      env: {
        DAISY_KANBAN_BRIDGE_TOKEN: "site-secret",
        DAISY_KANBAN_MCP_TOKEN: "mcp-secret",
      },
      callGateway: async (method, _options, params) => {
        calls.push({ method, params });
        return { available: true, boardSlug: "team-agents" };
      },
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bridge did not bind");
    const base = `http://127.0.0.1:${address.port}`;

    const unauthorized = await fetch(`${base}/v1/status`);
    expect(unauthorized.status).toBe(401);
    const response = await fetch(`${base}/v1/status`, {
      headers: { authorization: "Bearer site-secret" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ available: true, boardSlug: "team-agents" });
    expect(calls).toEqual([{ method: "kanban.status", params: {} }]);
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("maps task pickup to the agent-neutral RPC and rejects oversized bodies", async () => {
    const calls: Array<{ method: string; params: unknown }> = [];
    const server = createKanbanBridgeServer({
      env: { DAISY_KANBAN_BRIDGE_TOKEN: "site-secret", DAISY_KANBAN_MCP_TOKEN: "mcp-secret" },
      callGateway: async (method, _options, params) => {
        calls.push({ method, params });
        return { card: null };
      },
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bridge did not bind");
    const base = `http://127.0.0.1:${address.port}`;
    const pickup = await fetch(`${base}/v1/tasks/pick-next`, {
      method: "POST",
      headers: { authorization: "Bearer site-secret", "content-type": "application/json" },
      body: JSON.stringify({ worker: "work", agentId: "chatgpt-work" }),
    });
    expect(pickup.status).toBe(200);
    expect(calls[0]).toEqual({
      method: "kanban.agent.pickNext",
      params: { worker: "work", agentId: "chatgpt-work" },
    });
    const oversized = await fetch(`${base}/v1/cards`, {
      method: "POST",
      headers: {
        authorization: "Bearer site-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ title: "x".repeat(1_048_577) }),
    });
    expect(oversized.status).toBe(413);
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });
});
