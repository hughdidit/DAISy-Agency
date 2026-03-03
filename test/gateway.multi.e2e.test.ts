import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { GatewayClient } from "../src/gateway/client.js";
import { connectGatewayClient } from "../src/gateway/test-helpers.e2e.js";
<<<<<<< HEAD
import { loadOrCreateDeviceIdentity } from "../src/infra/device-identity.js";
import { GatewayClient } from "../src/gateway/client.js";
=======
>>>>>>> 13541864e (refactor: extract telegram lane delivery and e2e harness)
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../src/utils/message-channel.js";
import {
  type ChatEventPayload,
  type GatewayInstance,
  connectNode,
  extractFirstTextBlock,
  postJson,
  spawnGatewayInstance,
  stopGatewayInstance,
  waitForChatFinalEvent,
  waitForNodeStatus,
} from "./helpers/gateway-e2e-harness.js";

const E2E_TIMEOUT_MS = 120_000;
const GATEWAY_CONNECT_STATUS_TIMEOUT_MS = 2_000;
const GATEWAY_NODE_STATUS_TIMEOUT_MS = 4_000;
const GATEWAY_NODE_STATUS_POLL_MS = 20;

const getFreePort = async () => {
  const srv = net.createServer();
  await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
  const addr = srv.address();
  if (!addr || typeof addr === "string") {
    srv.close();
    throw new Error("failed to bind ephemeral port");
  }
  await new Promise<void>((resolve) => srv.close(() => resolve()));
  return addr.port;
};

const waitForPortOpen = async (
  proc: ChildProcessWithoutNullStreams,
  chunksOut: string[],
  chunksErr: string[],
  port: number,
  timeoutMs: number,
) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (proc.exitCode !== null) {
      const stdout = chunksOut.join("");
      const stderr = chunksErr.join("");
      throw new Error(
        `gateway exited before listening (code=${String(proc.exitCode)} signal=${String(proc.signalCode)})\n` +
          `--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
      );
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect({ host: "127.0.0.1", port });
        socket.once("connect", () => {
          socket.destroy();
          resolve();
        });
        socket.once("error", (err) => {
          socket.destroy();
          reject(err);
        });
      });
      return;
    } catch {
      // keep polling
    }

    await sleep(10);
  }
  const stdout = chunksOut.join("");
  const stderr = chunksErr.join("");
  throw new Error(
    `timeout waiting for gateway to listen on port ${port}\n` +
      `--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
  );
};

const spawnGatewayInstance = async (name: string): Promise<GatewayInstance> => {
  const port = await getFreePort();
  const hookToken = `token-${name}-${randomUUID()}`;
  const gatewayToken = `gateway-${name}-${randomUUID()}`;
  const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), `moltbot-e2e-${name}-`));
  const configDir = path.join(homeDir, ".clawdbot");
  await fs.mkdir(configDir, { recursive: true });
  const configPath = path.join(configDir, "moltbot.json");
  const stateDir = path.join(configDir, "state");
  const config = {
    gateway: { port, auth: { mode: "token", token: gatewayToken } },
    hooks: { enabled: true, token: hookToken, path: "/hooks" },
  };
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8");

  const stdout: string[] = [];
  const stderr: string[] = [];
  let child: ChildProcessWithoutNullStreams | null = null;

  try {
    child = spawn(
      "node",
      [
        "dist/index.js",
        "gateway",
        "--port",
        String(port),
        "--bind",
        "loopback",
        "--allow-unconfigured",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HOME: homeDir,
          CLAWDBOT_CONFIG_PATH: configPath,
          CLAWDBOT_STATE_DIR: stateDir,
          CLAWDBOT_GATEWAY_TOKEN: "",
          CLAWDBOT_GATEWAY_PASSWORD: "",
          CLAWDBOT_SKIP_CHANNELS: "1",
          CLAWDBOT_SKIP_BROWSER_CONTROL_SERVER: "1",
          CLAWDBOT_SKIP_CANVAS_HOST: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (d) => stdout.push(String(d)));
    child.stderr?.on("data", (d) => stderr.push(String(d)));

    await waitForPortOpen(child, stdout, stderr, port, GATEWAY_START_TIMEOUT_MS);

    return {
      name,
      port,
      hookToken,
      gatewayToken,
      homeDir,
      stateDir,
      configPath,
      child,
      stdout,
      stderr,
    };
  } catch (err) {
    if (child && child.exitCode === null && !child.killed) {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }
    await fs.rm(homeDir, { recursive: true, force: true });
    throw err;
  }
};

const stopGatewayInstance = async (inst: GatewayInstance) => {
  if (inst.child.exitCode === null && !inst.child.killed) {
    try {
      inst.child.kill("SIGTERM");
    } catch {
      // ignore
    }
  }
  const exited = await Promise.race([
    new Promise<boolean>((resolve) => {
      if (inst.child.exitCode !== null) {
        return resolve(true);
      }
      inst.child.once("exit", () => resolve(true));
    }),
    sleep(GATEWAY_STOP_TIMEOUT_MS).then(() => false),
  ]);
  if (!exited && inst.child.exitCode === null && !inst.child.killed) {
    try {
      inst.child.kill("SIGKILL");
    } catch {
      // ignore
    }
  }
  await fs.rm(inst.homeDir, { recursive: true, force: true });
};

const postJson = async (url: string, body: unknown, headers?: Record<string, string>) => {
  const payload = JSON.stringify(body);
  const parsed = new URL(url);
  return await new Promise<{ status: number; json: unknown }>((resolve, reject) => {
    const req = httpRequest(
      {
        method: "POST",
        hostname: parsed.hostname,
        port: Number(parsed.port),
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let json: unknown = null;
          if (data.trim()) {
            try {
              json = JSON.parse(data);
            } catch {
              json = data;
            }
          }
          resolve({ status: res.statusCode ?? 0, json });
        });
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
};

const connectNode = async (
  inst: GatewayInstance,
  label: string,
): Promise<{ client: GatewayClient; nodeId: string }> => {
  const identityPath = path.join(inst.homeDir, `${label}-device.json`);
  const deviceIdentity = loadOrCreateDeviceIdentity(identityPath);
  const nodeId = deviceIdentity.deviceId;
  const client = await connectGatewayClient({
    url: `ws://127.0.0.1:${inst.port}`,
    token: inst.gatewayToken,
    clientName: GATEWAY_CLIENT_NAMES.NODE_HOST,
    clientDisplayName: label,
    clientVersion: "1.0.0",
    platform: "ios",
    mode: GATEWAY_CLIENT_MODES.NODE,
    role: "node",
    scopes: [],
    caps: ["system"],
    commands: ["system.run"],
    deviceIdentity,
    timeoutMessage: `timeout waiting for ${label} to connect`,
  });
  return { client, nodeId };
};

const connectStatusClient = async (
  inst: GatewayInstance,
  timeoutMs = GATEWAY_CONNECT_STATUS_TIMEOUT_MS,
): Promise<GatewayClient> => {
  let settled = false;
  let timer: NodeJS.Timeout | null = null;

  return await new Promise<GatewayClient>((resolve, reject) => {
    const finish = (err?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (err) {
        reject(err);
        return;
      }
      resolve(client);
    };

    const client = new GatewayClient({
      url: `ws://127.0.0.1:${inst.port}`,
      connectDelayMs: 0,
      token: inst.gatewayToken,
      clientName: GATEWAY_CLIENT_NAMES.CLI,
      clientDisplayName: `status-${inst.name}`,
      clientVersion: "1.0.0",
      platform: "test",
      mode: GATEWAY_CLIENT_MODES.CLI,
      onHelloOk: () => {
        finish();
      },
      onConnectError: (err) => finish(err),
      onClose: (code, reason) => {
        finish(new Error(`gateway closed (${code}): ${reason}`));
      },
    });

    timer = setTimeout(() => {
      finish(new Error("timeout waiting for node.list"));
    }, timeoutMs);

    client.start();
  });
};

const waitForNodeStatus = async (
  inst: GatewayInstance,
  nodeId: string,
  timeoutMs = GATEWAY_NODE_STATUS_TIMEOUT_MS,
) => {
  const deadline = Date.now() + timeoutMs;
<<<<<<< HEAD
<<<<<<< HEAD
  while (Date.now() < deadline) {
<<<<<<< HEAD
    const list = (await runCliJson(
      ["nodes", "status", "--json", "--url", `ws://127.0.0.1:${inst.port}`],
      {
        CLAWDBOT_GATEWAY_TOKEN: inst.gatewayToken,
        CLAWDBOT_GATEWAY_PASSWORD: "",
      },
    )) as NodeListPayload;
    const match = list.nodes?.find((n) => n.nodeId === nodeId);
    if (match?.connected && match?.paired) {
      return;
=======
  const client = await connectStatusClient(inst);
=======
  const client = await connectStatusClient(
    inst,
    Math.min(GATEWAY_CONNECT_STATUS_TIMEOUT_MS, timeoutMs),
  );
>>>>>>> 4a2ff03f4 (test: dedupe channel/web cases and tighten gateway e2e waits)
  try {
    while (Date.now() < deadline) {
      const list = await client.request<NodeListPayload>("node.list", {});
      const match = list.nodes?.find((n) => n.nodeId === nodeId);
      if (match?.connected && match?.paired) {
        return;
      }
      await sleep(50);
>>>>>>> b05c41f34 (perf: reduce gateway multi e2e websocket churn)
    }
  } finally {
    client.stop();
  }
  throw new Error(`timeout waiting for node status for ${nodeId}`);
};

function extractFirstTextBlock(message: unknown): string | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  const content = (message as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length === 0) {
    return undefined;
  }
  const first = content[0];
  if (!first || typeof first !== "object") {
    return undefined;
  }
  const text = (first as { text?: unknown }).text;
  return typeof text === "string" ? text : undefined;
}

const waitForChatFinalEvent = async (params: {
  events: ChatEventPayload[];
  runId: string;
  sessionKey: string;
  timeoutMs?: number;
}): Promise<ChatEventPayload> => {
  const deadline = Date.now() + (params.timeoutMs ?? 15_000);
  while (Date.now() < deadline) {
    const match = params.events.find(
      (evt) =>
        evt.runId === params.runId && evt.sessionKey === params.sessionKey && evt.state === "final",
    );
    if (match) {
      return match;
    }
    await sleep(20);
  }
  throw new Error(`timeout waiting for final chat event (runId=${params.runId})`);
};
=======
>>>>>>> 13541864e (refactor: extract telegram lane delivery and e2e harness)

describe("gateway multi-instance e2e", () => {
  const instances: GatewayInstance[] = [];
  const nodeClients: GatewayClient[] = [];
  const chatClients: GatewayClient[] = [];

  afterAll(async () => {
    for (const client of nodeClients) {
      client.stop();
    }
    for (const client of chatClients) {
      client.stop();
    }
    for (const inst of instances) {
      await stopGatewayInstance(inst);
    }
  });

  it(
    "spins up two gateways and exercises WS + HTTP + node pairing",
    { timeout: E2E_TIMEOUT_MS },
    async () => {
      const [gwA, gwB] = await Promise.all([spawnGatewayInstance("a"), spawnGatewayInstance("b")]);
      instances.push(gwA, gwB);

      const [healthA, healthB] = (await Promise.all([
        runCliJson(["health", "--json", "--timeout", "10000"], {
          CLAWDBOT_GATEWAY_PORT: String(gwA.port),
          CLAWDBOT_GATEWAY_TOKEN: gwA.gatewayToken,
          CLAWDBOT_GATEWAY_PASSWORD: "",
        }),
        runCliJson(["health", "--json", "--timeout", "10000"], {
          CLAWDBOT_GATEWAY_PORT: String(gwB.port),
          CLAWDBOT_GATEWAY_TOKEN: gwB.gatewayToken,
          CLAWDBOT_GATEWAY_PASSWORD: "",
        }),
      ])) as [HealthPayload, HealthPayload];
      expect(healthA.ok).toBe(true);
      expect(healthB.ok).toBe(true);

      const [hookResA, hookResB] = await Promise.all([
        postJson(
          `http://127.0.0.1:${gwA.port}/hooks/wake`,
          {
            text: "wake a",
            mode: "now",
          },
          { "x-openclaw-token": gwA.hookToken },
        ),
        postJson(
          `http://127.0.0.1:${gwB.port}/hooks/wake`,
          {
            text: "wake b",
            mode: "now",
          },
          { "x-openclaw-token": gwB.hookToken },
        ),
      ]);
      expect(hookResA.status).toBe(200);
      expect((hookResA.json as { ok?: boolean } | undefined)?.ok).toBe(true);
      expect(hookResB.status).toBe(200);
      expect((hookResB.json as { ok?: boolean } | undefined)?.ok).toBe(true);

      const [nodeA, nodeB] = await Promise.all([
        connectNode(gwA, "node-a"),
        connectNode(gwB, "node-b"),
      ]);
      nodeClients.push(nodeA.client, nodeB.client);

      await Promise.all([
        waitForNodeStatus(gwA, nodeA.nodeId),
        waitForNodeStatus(gwB, nodeB.nodeId),
      ]);
    },
  );

  it(
    "delivers final chat event for telegram-shaped session keys",
    { timeout: E2E_TIMEOUT_MS },
    async () => {
      const gw = await spawnGatewayInstance("chat-telegram-fixture");
      instances.push(gw);

      const chatEvents: ChatEventPayload[] = [];
      const chatClient = await connectGatewayClient({
        url: `ws://127.0.0.1:${gw.port}`,
        token: gw.gatewayToken,
        clientName: GATEWAY_CLIENT_NAMES.CLI,
        clientDisplayName: "chat-e2e-cli",
        clientVersion: "1.0.0",
        platform: "test",
        mode: GATEWAY_CLIENT_MODES.CLI,
        onEvent: (evt) => {
          if (evt.event === "chat" && evt.payload && typeof evt.payload === "object") {
            chatEvents.push(evt.payload as ChatEventPayload);
          }
        },
      });
      chatClients.push(chatClient);

      const sessionKey = "agent:main:telegram:direct:123456";
      const idempotencyKey = `idem-${randomUUID()}`;
      const sendRes = await chatClient.request<{ runId?: string; status?: string }>("chat.send", {
        sessionKey,
        message: "/context list",
        idempotencyKey,
      });
      expect(sendRes.status).toBe("started");
      const runId = sendRes.runId;
      expect(typeof runId).toBe("string");

      const finalEvent = await waitForChatFinalEvent({
        events: chatEvents,
        runId: String(runId),
        sessionKey,
      });
      const finalText = extractFirstTextBlock(finalEvent.message);
      expect(typeof finalText).toBe("string");
      expect(finalText?.length).toBeGreaterThan(0);
    },
  );
});
