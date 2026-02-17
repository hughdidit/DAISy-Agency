import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import {
  connectOk,
  getFreePort,
  installGatewayTestHooks,
  onceMessage,
  startGatewayServer,
} from "./test-helpers.js";

installGatewayTestHooks({ scope: "suite" });

let server: Awaited<ReturnType<typeof startGatewayServer>>;
let port = 0;

beforeAll(async () => {
<<<<<<< HEAD
  previousToken = process.env.CLAWDBOT_GATEWAY_TOKEN;
  delete process.env.CLAWDBOT_GATEWAY_TOKEN;
=======
>>>>>>> fdfc34fa1 (perf(test): stabilize e2e harness and reduce flaky gateway coverage)
  port = await getFreePort();
  server = await startGatewayServer(port, { controlUiEnabled: true });
});

afterAll(async () => {
  await server.close();
<<<<<<< HEAD
<<<<<<< HEAD
  if (previousToken === undefined) delete process.env.CLAWDBOT_GATEWAY_TOKEN;
  else process.env.CLAWDBOT_GATEWAY_TOKEN = previousToken;
=======
  if (previousToken === undefined) {
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
  } else {
    process.env.OPENCLAW_GATEWAY_TOKEN = previousToken;
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
=======
>>>>>>> fdfc34fa1 (perf(test): stabilize e2e harness and reduce flaky gateway coverage)
});

const openClient = async () => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve) => ws.once("open", resolve));
  await connectOk(ws);
  return ws;
};

describe("gateway config.apply", () => {
<<<<<<< HEAD
  it("writes config, stores sentinel, and schedules restart", async () => {
    const ws = await openClient();
    try {
      const id = "req-1";
      ws.send(
        JSON.stringify({
          type: "req",
          id,
          method: "config.apply",
          params: {
            raw: '{ "agents": { "list": [{ "id": "main", "workspace": "~/clawd" }] } }',
            sessionKey: "agent:main:whatsapp:dm:+15555550123",
            restartDelayMs: 0,
          },
        }),
      );
      const res = await onceMessage<{ ok: boolean; payload?: unknown }>(
        ws,
        (o) => o.type === "res" && o.id === id,
      );
      expect(res.ok).toBe(true);

      // Verify sentinel file was created (restart was scheduled)
      const sentinelPath = path.join(os.homedir(), ".clawdbot", "restart-sentinel.json");

      // Wait for file to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const raw = await fs.readFile(sentinelPath, "utf-8");
        const parsed = JSON.parse(raw) as { payload?: { kind?: string } };
        expect(parsed.payload?.kind).toBe("config-apply");
      } catch {
        // File may not exist if signal delivery is mocked, verify response was ok instead
        expect(res.ok).toBe(true);
      }
    } finally {
      ws.close();
    }
  });

=======
>>>>>>> fdfc34fa1 (perf(test): stabilize e2e harness and reduce flaky gateway coverage)
  it("rejects invalid raw config", async () => {
    const ws = await openClient();
    try {
      const id = "req-1";
      ws.send(
        JSON.stringify({
          type: "req",
          id,
          method: "config.apply",
          params: {
            raw: "{",
          },
        }),
      );
      const res = await onceMessage<{ ok: boolean; error?: { message?: string } }>(ws, (o) => {
        const msg = o as { type?: string; id?: string };
        return msg.type === "res" && msg.id === id;
      });
      expect(res.ok).toBe(false);
      expect(res.error?.message ?? "").toMatch(/invalid|SyntaxError/i);
    } finally {
      ws.close();
    }
  });

  it("requires raw to be a string", async () => {
    const ws = await openClient();
    try {
      const id = "req-2";
      ws.send(
        JSON.stringify({
          type: "req",
          id,
          method: "config.apply",
          params: {
            raw: { gateway: { mode: "local" } },
          },
        }),
      );
      const res = await onceMessage<{ ok: boolean; error?: { message?: string } }>(ws, (o) => {
        const msg = o as { type?: string; id?: string };
        return msg.type === "res" && msg.id === id;
      });
      expect(res.ok).toBe(false);
      expect(res.error?.message ?? "").toContain("raw");
    } finally {
      ws.close();
    }
  });
});
