import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { request as httpRequest } from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
<<<<<<< HEAD
=======
import { GatewayClient } from "../src/gateway/client.js";
import { connectGatewayClient } from "../src/gateway/test-helpers.e2e.js";
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
import { loadOrCreateDeviceIdentity } from "../src/infra/device-identity.js";
<<<<<<< HEAD
import { GatewayClient } from "../src/gateway/client.js";
=======
import { sleep } from "../src/utils.js";
>>>>>>> ec910a235 (refactor: consolidate duplicate utility functions (#12439))
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../src/utils/message-channel.js";

type GatewayInstance = {
  name: string;
  port: number;
  hookToken: string;
  gatewayToken: string;
  homeDir: string;
  stateDir: string;
  configPath: string;
  child: ChildProcessWithoutNullStreams;
  stdout: string[];
  stderr: string[];
};

type NodeListPayload = {
  nodes?: Array<{ nodeId?: string; connected?: boolean; paired?: boolean }>;
};

const GATEWAY_START_TIMEOUT_MS = 45_000;
const E2E_TIMEOUT_MS = 120_000;

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

    await sleep(25);
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
    sleep(5_000).then(() => false),
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
  timeoutMs = 5_000,
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

const waitForNodeStatus = async (inst: GatewayInstance, nodeId: string, timeoutMs = 10_000) => {
  const deadline = Date.now() + timeoutMs;
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
=======
    const list = await fetchNodeList(inst);
>>>>>>> fdfc34fa1 (perf(test): stabilize e2e harness and reduce flaky gateway coverage)
    const match = list.nodes?.find((n) => n.nodeId === nodeId);
    if (match?.connected && match?.paired) {
      return;
=======
  const client = await connectStatusClient(inst);
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

describe("gateway multi-instance e2e", () => {
  const instances: GatewayInstance[] = [];
  const nodeClients: GatewayClient[] = [];

  afterAll(async () => {
    for (const client of nodeClients) {
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

<<<<<<< HEAD
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

=======
>>>>>>> 3c00a9e33 (perf: remove redundant cli health checks from gateway multi e2e)
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
});
