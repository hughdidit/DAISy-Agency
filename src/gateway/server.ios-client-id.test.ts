import { afterAll, beforeAll, test } from "vitest";
import WebSocket from "ws";

import { PROTOCOL_VERSION } from "./protocol/index.js";
import { getFreePort, onceMessage, startGatewayServer } from "./test-helpers.server.js";

function makeConnectParams(clientId: string) {
  return {
    minProtocol: 1,
    maxProtocol: 1,
    client: {
      id: clientId,
      version: "dev",
      platform: "ios",
      mode: GATEWAY_CLIENT_MODES.NODE,
    },
    role: "node",
    scopes: [],
    caps: ["canvas"],
    commands: ["system.notify"],
    permissions: {},
  };
}

<<<<<<< HEAD
test("accepts openclaw-ios as a valid gateway client id", async () => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve) => ws.once("open", resolve));

  const res = await connectReq(ws, { clientId: "openclaw-ios", platform: "ios" });
  // We don't care if auth fails here; we only care that schema validation accepts the client id.
  // A schema rejection would close the socket before sending a response.
  if (!res.ok) {
    // allow unauthorized error when gateway requires auth
    // but reject schema validation errors
    const message = String(res.error?.message ?? "");
    if (message.includes("invalid connect params")) {
      throw new Error(message);
    }
  }

  ws.close();
});

test("accepts openclaw-android as a valid gateway client id", async () => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve) => ws.once("open", resolve));

  const res = await connectReq(ws, { clientId: "openclaw-android", platform: "android" });
  // We don't care if auth fails here; we only care that schema validation accepts the client id.
  // A schema rejection would close the socket before sending a response.
  if (!res.ok) {
    // allow unauthorized error when gateway requires auth
    // but reject schema validation errors
    const message = String(res.error?.message ?? "");
    if (message.includes("invalid connect params")) {
      throw new Error(message);
    }
  }

  ws.close();
=======
describe("connect params client id validation", () => {
  test.each([GATEWAY_CLIENT_IDS.IOS_APP, GATEWAY_CLIENT_IDS.ANDROID_APP])(
    "accepts %s as a valid gateway client id",
    (clientId) => {
      const ok = validateConnectParams(makeConnectParams(clientId));
      expect(ok).toBe(true);
      expect(validateConnectParams.errors ?? []).toHaveLength(0);
    },
  );

  test("rejects unknown client ids", () => {
    const ok = validateConnectParams(makeConnectParams("openclaw-mobile"));
    expect(ok).toBe(false);
  });
>>>>>>> f58c1ef34 (test(gateway): speed up contract and polling suites)
});
