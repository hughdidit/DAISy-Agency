import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callGateway: vi.fn(),
}));

vi.mock("../../../src/gateway/call.js", () => ({
  callGateway: mocks.callGateway,
}));

import { registerCronGuardCommands } from "./commands.js";

describe("cron-guard commands", () => {
  it("registers guarded cron commands and enforces approver allowlists", async () => {
    const registered: Array<{ name: string; handler: (ctx: any) => Promise<{ text?: string }> }> =
      [];
    registerCronGuardCommands(
      {
        registerCommand: (command: any) => {
          registered.push(command);
        },
      } as never,
      {
        enabled: true,
        approvers: ["discord:123"],
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
    );

    expect(registered.map((entry) => entry.name).toSorted()).toEqual([
      "cron-approve",
      "cron-deny",
      "cron-modify",
      "cron-request",
      "cron-requests",
    ]);

    const approve = registered.find((entry) => entry.name === "cron-approve");
    const unauthorized = await approve!.handler({
      channel: "discord",
      senderId: "999",
      from: "discord:999",
      args: "req-1",
    });
    expect(unauthorized.text).toContain("not authorized");

    const listRequests = registered.find((entry) => entry.name === "cron-requests");
    const unauthorizedList = await listRequests!.handler({
      channel: "discord",
      senderId: "999",
      from: "discord:999",
    });
    expect(unauthorizedList.text).toContain("not authorized");
  });
});
