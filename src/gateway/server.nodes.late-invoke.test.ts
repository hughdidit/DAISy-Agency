<<<<<<< HEAD
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { WebSocket } from "ws";

import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../utils/message-channel.js";
import { loadOrCreateDeviceIdentity } from "../infra/device-identity.js";

vi.mock("../infra/update-runner.js", () => ({
  runGatewayUpdate: vi.fn(async () => ({
    status: "ok",
    mode: "git",
    root: "/repo",
    steps: [],
    durationMs: 12,
  })),
}));

import {
  connectOk,
  getFreePort,
  installGatewayTestHooks,
  rpcReq,
  startGatewayServer,
} from "./test-helpers.js";
import { testState } from "./test-helpers.mocks.js";

installGatewayTestHooks({ scope: "suite" });

let server: Awaited<ReturnType<typeof startGatewayServer>>;
let port: number;
let nodeWs: WebSocket;
let nodeId: string;

beforeAll(async () => {
  const token = "test-gateway-token-1234567890";
  testState.gatewayAuth = { mode: "token", token };
  port = await getFreePort();
  server = await startGatewayServer(port, { bind: "loopback" });

  nodeWs = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve) => nodeWs.once("open", resolve));

  const identity = loadOrCreateDeviceIdentity();
  nodeId = identity.deviceId;
  await connectOk(nodeWs, {
    role: "node",
    client: {
      id: GATEWAY_CLIENT_NAMES.NODE_HOST,
      version: "1.0.0",
      platform: "darwin",
      mode: GATEWAY_CLIENT_MODES.NODE,
    },
    commands: ["canvas.snapshot"],
    token,
  });
});

afterAll(async () => {
  nodeWs.terminate();
  await server.close();
});
=======
import { describe, expect, test, vi } from "vitest";
import { handleNodeInvokeResult } from "./server-methods/nodes.handlers.invoke-result.js";
>>>>>>> 615c9c3c9 (perf(test): avoid gateway boot for late invoke results)

describe("late-arriving invoke results", () => {
  test("returns success for unknown invoke ids for both success and error payloads", async () => {
    const nodeId = "node-123";
    const cases = [
      {
        id: "unknown-invoke-id-12345",
        ok: true,
        payloadJSON: JSON.stringify({ result: "late" }),
      },
      {
        id: "another-unknown-invoke-id",
        ok: false,
        error: { code: "FAILED", message: "test error" },
      },
    ] as const;

    for (const params of cases) {
      const respond = vi.fn();
      const context = {
        nodeRegistry: { handleInvokeResult: () => false },
        logGateway: { debug: vi.fn() },
      } as any;
      const client = {
        connect: { device: { id: nodeId } },
      } as any;

      await handleNodeInvokeResult({
        req: { method: "node.invoke.result" } as any,
        params: { ...params, nodeId } as any,
        client,
        isWebchatConnect: () => false,
        respond,
        context,
      });

      const [ok, payload, error] = respond.mock.lastCall ?? [];

      // Late-arriving results return success instead of error to reduce log noise.
      expect(ok).toBe(true);
      expect(error).toBeUndefined();
      expect(payload?.ok).toBe(true);
      expect(payload?.ignored).toBe(true);
    }
  });
});
