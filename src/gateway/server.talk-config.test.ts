import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadOrCreateDeviceIdentity,
  publicKeyRawBase64UrlFromPem,
  signDevicePayload,
} from "../infra/device-identity.js";
import { buildDeviceAuthPayload } from "./device-auth.js";
import {
  connectOk,
  installGatewayTestHooks,
  readConnectChallengeNonce,
  rpcReq,
} from "./test-helpers.js";
import { withServer } from "./test-with-server.js";

installGatewayTestHooks({ scope: "suite" });

<<<<<<< HEAD
async function createFreshOperatorDevice(scopes: string[], nonce: string) {
  const signedAtMs = Date.now();
  const payload = buildDeviceAuthPayload({
    deviceId: TALK_CONFIG_DEVICE.deviceId,
    clientId: "test",
    clientMode: "test",
    role: "operator",
    scopes,
    signedAtMs,
    token: "secret",
    nonce,
  });

  return {
    id: TALK_CONFIG_DEVICE.deviceId,
    publicKey: publicKeyRawBase64UrlFromPem(TALK_CONFIG_DEVICE.publicKeyPem),
    signature: signDevicePayload(TALK_CONFIG_DEVICE.privateKeyPem, payload),
    signedAt: signedAtMs,
    nonce,
  };
}

>>>>>>> 8887f41d7 (refactor(gateway)!: remove legacy v1 device-auth handshake)
describe("gateway talk.config", () => {
  it("returns redacted talk config for read scope", async () => {
    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      talk: {
        voiceId: "voice-123",
        apiKey: "secret-key-abc",
      },
      session: {
        mainKey: "main-test",
      },
      ui: {
        seamColor: "#112233",
      },
    });

    await withServer(async (ws) => {
<<<<<<< HEAD
      await connectOk(ws, { token: "secret", scopes: ["operator.read"] });
=======
      await connectOperator(ws, ["operator.read"]);
>>>>>>> 296b19e41 (test: dedupe gateway browser discord and channel coverage)
      const res = await rpcReq<{ config?: { talk?: { apiKey?: string; voiceId?: string } } }>(
        ws,
        "talk.config",
        {},
      );
      expect(res.ok).toBe(true);
      expect(res.payload?.config?.talk?.provider).toBe("elevenlabs");
      expect(res.payload?.config?.talk?.providers?.elevenlabs?.voiceId).toBe("voice-123");
      expect(res.payload?.config?.talk?.providers?.elevenlabs?.apiKey).toBe(
        "__OPENCLAW_REDACTED__",
      );
      expect(res.payload?.config?.talk?.voiceId).toBe("voice-123");
      expect(res.payload?.config?.talk?.apiKey).toBe("__OPENCLAW_REDACTED__");
    });
  });

  it("requires operator.talk.secrets for includeSecrets", async () => {
    await writeTalkConfig({ apiKey: "secret-key-abc" });

    await withServer(async (ws) => {
<<<<<<< HEAD
      await connectOk(ws, { token: "secret", scopes: ["operator.read"] });
=======
      await connectOperator(ws, ["operator.read"]);
>>>>>>> 296b19e41 (test: dedupe gateway browser discord and channel coverage)
      const res = await rpcReq(ws, "talk.config", { includeSecrets: true });
      expect(res.ok).toBe(false);
      expect(res.error?.message).toContain("missing scope: operator.talk.secrets");
    });
  });

  it("returns secrets for operator.talk.secrets scope", async () => {
    await writeTalkConfig({ apiKey: "secret-key-abc" });

    await withServer(async (ws) => {
      const nonce = await readConnectChallengeNonce(ws);
      expect(nonce).toBeTruthy();
      await connectOk(ws, {
        token: "secret",
        scopes: ["operator.read", "operator.write", "operator.talk.secrets"],
<<<<<<< HEAD
      });
=======
      await connectOperator(ws, ["operator.read", "operator.write", "operator.talk.secrets"]);
>>>>>>> 296b19e41 (test: dedupe gateway browser discord and channel coverage)
      const res = await rpcReq<{ config?: { talk?: { apiKey?: string } } }>(ws, "talk.config", {
        includeSecrets: true,
      });
      expect(res.ok).toBe(true);
      expect(res.payload?.config?.talk?.apiKey).toBe("secret-key-abc");
    });
  });

  it("prefers normalized provider payload over conflicting legacy talk keys", async () => {
    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      talk: {
        provider: "elevenlabs",
        providers: {
          elevenlabs: {
            voiceId: "voice-normalized",
          },
        },
        voiceId: "voice-legacy",
      },
    });

    await withServer(async (ws) => {
      await connectOperator(ws, ["operator.read"]);
      const res = await rpcReq<{
        config?: {
          talk?: {
            provider?: string;
            providers?: {
              elevenlabs?: { voiceId?: string };
            };
            voiceId?: string;
          };
        };
      }>(ws, "talk.config", {});
      expect(res.ok).toBe(true);
      expect(res.payload?.config?.talk?.provider).toBe("elevenlabs");
      expect(res.payload?.config?.talk?.providers?.elevenlabs?.voiceId).toBe("voice-normalized");
      expect(res.payload?.config?.talk?.voiceId).toBe("voice-normalized");
    });
  });
});
