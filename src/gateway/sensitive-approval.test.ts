import { describe, expect, it, vi } from "vitest";
import { ExecApprovalManager } from "./exec-approval-manager.js";
import { GATEWAY_CLIENT_IDS, GATEWAY_CLIENT_MODES } from "./protocol/client-info.js";
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

function createClient(
  scopes: string[],
  clientId: (typeof GATEWAY_CLIENT_IDS)[keyof typeof GATEWAY_CLIENT_IDS] = GATEWAY_CLIENT_IDS.CLI,
): GatewayClient {
  return {
    connect: {
      role: "operator",
      scopes,
      client: {
        id: clientId,
        displayName: "Test Client",
        version: "1.0.0",
        platform: "test",
        mode:
          clientId === GATEWAY_CLIENT_IDS.CONTROL_UI
            ? GATEWAY_CLIENT_MODES.UI
            : GATEWAY_CLIENT_MODES.CLI,
      },
      minProtocol: 1,
      maxProtocol: 1,
    },
  } as unknown as GatewayClient;
}

describe("requireSensitiveGatewayApprovalIfNeeded", () => {
  it("allows control-ui admin deletion methods without a Hugh approval prompt", async () => {
    const broadcast = vi.fn();
    const respond = vi.fn<RespondFn>();
    const context = createContext({
      broadcast: broadcast as GatewayRequestContext["broadcast"],
      hasExecApprovalClients: () => true,
    });
    const client = createClient(["operator.admin"], GATEWAY_CLIENT_IDS.CONTROL_UI);

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

    await expect(
      requireSensitiveGatewayApprovalIfNeeded({
        method: "agents.delete",
        requestParams: { agentId: "temporary-agent" },
        client,
        context,
        respond,
      }),
    ).resolves.toBe(true);

    expect(broadcast).not.toHaveBeenCalled();
    expect(respond).not.toHaveBeenCalled();
  });

  it("keeps CLI admin deletion behind Hugh approval", async () => {
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
        client: createClient(["operator.admin"], GATEWAY_CLIENT_IDS.CLI),
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
  });

  it("keeps admin-scoped financial actions behind Hugh approval", async () => {
    const broadcast = vi.fn();
    const respond = vi.fn<RespondFn>();
    const context = createContext({
      broadcast: broadcast as GatewayRequestContext["broadcast"],
      hasExecApprovalClients: () => false,
    });

    await expect(
      requireSensitiveGatewayApprovalIfNeeded({
        method: "billing.charge",
        requestParams: { amountUsd: 25 },
        client: createClient(["operator.admin"]),
        context,
        respond,
      }),
    ).resolves.toBe(false);

    expect(broadcast).toHaveBeenCalledWith(
      "exec.approval.requested",
      expect.objectContaining({
        request: expect.objectContaining({
          category: "financial",
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
          "Sensitive financial action blocked: Hugh approval was not granted for this exact operation.",
      }),
    );
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
