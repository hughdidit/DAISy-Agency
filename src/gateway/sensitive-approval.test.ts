import { describe, expect, it, vi } from "vitest";
import { ExecApprovalManager } from "./exec-approval-manager.js";
import { requireSensitiveGatewayApprovalIfNeeded } from "./sensitive-approval.js";
import type { GatewayClient, GatewayRequestContext, RespondFn } from "./server-methods/types.js";

function createContext(params: {
  broadcast?: GatewayRequestContext["broadcast"];
  hasExecApprovalClients?: () => boolean;
}): GatewayRequestContext {
  return {
    execApprovalManager: new ExecApprovalManager(),
    broadcast: params.broadcast ?? vi.fn(),
    hasExecApprovalClients: params.hasExecApprovalClients ?? (() => false),
  } as unknown as GatewayRequestContext;
}

function createClient(scopes: string[]): GatewayClient {
  return {
    connect: {
      role: "operator",
      scopes,
      client: {
        id: "test-client",
        displayName: "Test Client",
      },
    },
  } as GatewayClient;
}

describe("requireSensitiveGatewayApprovalIfNeeded", () => {
  it("allows admin-scoped cleanup deletion methods without a Hugh approval prompt", async () => {
    const broadcast = vi.fn();
    const respond = vi.fn<RespondFn>();
    const context = createContext({
      broadcast: broadcast as GatewayRequestContext["broadcast"],
      hasExecApprovalClients: () => true,
    });
    const client = createClient(["operator.admin"]);

    await expect(
      requireSensitiveGatewayApprovalIfNeeded({
        method: "sessions.delete",
        requestParams: { key: "agent:main:cron:job-1:run:run-1" },
        client,
        context,
        respond,
      }),
    ).resolves.toBe(true);

    await expect(
      requireSensitiveGatewayApprovalIfNeeded({
        method: "cron.remove",
        requestParams: { id: "job-1" },
        client,
        context,
        respond,
      }),
    ).resolves.toBe(true);

    expect(broadcast).not.toHaveBeenCalled();
    expect(respond).not.toHaveBeenCalled();
  });

  it("keeps non-admin session deletion behind Hugh approval", async () => {
    const broadcast = vi.fn();
    const respond = vi.fn<RespondFn>();
    const context = createContext({
      broadcast: broadcast as GatewayRequestContext["broadcast"],
      hasExecApprovalClients: () => false,
    });

    await expect(
      requireSensitiveGatewayApprovalIfNeeded({
        method: "sessions.delete",
        requestParams: { key: "agent:main:cron:job-1:run:run-1" },
        client: createClient(["operator.write"]),
        context,
        respond,
      }),
    ).resolves.toBe(false);

    expect(broadcast).toHaveBeenCalledWith(
      "exec.approval.requested",
      expect.objectContaining({
        request: expect.objectContaining({
          category: "deletion",
          host: "gateway",
        }),
      }),
      { dropIfSlow: true },
    );
    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({
        message:
          "Sensitive deletion action blocked: Hugh approval was not granted for this exact operation.",
      }),
    );
  });
});
