import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callGatewayTool: vi.fn(),
}));

vi.mock("../../../src/agents/tools/gateway.js", () => ({
  callGatewayTool: mocks.callGatewayTool,
  readGatewayCallOptions: (params: Record<string, unknown>) => ({
    gatewayUrl: params.gatewayUrl,
    gatewayToken: params.gatewayToken,
    timeoutMs: params.timeoutMs,
  }),
}));

import { createCronGuardTools } from "./tools.js";

describe("cron-guard tools", () => {
  beforeEach(() => {
    mocks.callGatewayTool.mockReset();
    mocks.callGatewayTool.mockResolvedValue({ ok: true });
  });

  it("routes list through the guarded read gateway method", async () => {
    const tools = createCronGuardTools({
      config: {
        enabled: true,
        approvers: ["discord:1"],
        approvalTtlMs: 1000,
        read: { redactWebhookTargets: true },
        discord: {
          enabled: false,
          target: "dm",
          cleanupAfterResolve: false,
          agentFilter: [],
          sessionFilter: [],
        },
        audit: { retention: { maxAgeMs: 1000, maxResolved: 10 } },
      },
      ctx: {
        agentId: "agent-1",
        sessionKey: "session-1",
      },
    });

    const tool = tools.find((entry) => entry.name === "cron_guard_list");
    expect(tool).toBeDefined();
    await tool!.execute("call-1", { limit: 5, includeDisabled: true });

    expect(mocks.callGatewayTool).toHaveBeenCalledWith(
      "cron.guard.list",
      {
        gatewayUrl: undefined,
        gatewayToken: undefined,
        timeoutMs: undefined,
      },
      {
        includeDisabled: true,
        limit: 5,
        offset: undefined,
        query: undefined,
        enabled: undefined,
        sortBy: undefined,
        sortDir: undefined,
      },
    );
  });

  it("routes add requests through the guarded approval queue method", async () => {
    const tools = createCronGuardTools({
      config: {
        enabled: true,
        approvers: ["discord:1"],
        approvalTtlMs: 1000,
        read: { redactWebhookTargets: true },
        discord: {
          enabled: false,
          target: "dm",
          cleanupAfterResolve: false,
          agentFilter: [],
          sessionFilter: [],
        },
        audit: { retention: { maxAgeMs: 1000, maxResolved: 10 } },
      },
      ctx: {
        agentId: "agent-1",
        sessionKey: "session-1",
        requesterSenderId: "discord:999",
      },
    });

    const tool = tools.find((entry) => entry.name === "cron_guard_add_request");
    await tool!.execute("call-2", {
      job: {
        name: "job-1",
      },
    });

    expect(mocks.callGatewayTool).toHaveBeenCalledWith(
      "cron.guard.request.add",
      {
        gatewayUrl: undefined,
        gatewayToken: undefined,
        timeoutMs: undefined,
      },
      {
        payload: {
          name: "job-1",
        },
        requester: expect.objectContaining({
          agentId: "agent-1",
          sessionKey: "session-1",
          requesterSenderId: "discord:999",
          toolName: "cron_guard_add_request",
        }),
      },
    );
  });
});
