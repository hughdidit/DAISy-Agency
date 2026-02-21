import fs from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import { getDeterministicFreePortBlock } from "../test-utils/ports.js";
=======
import { getFreePortBlockWithPermissionFallback } from "../test-utils/ports.js";
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
=======
=======
import type { GatewayAuthConfig } from "../config/config.js";
>>>>>>> 6264c5e84 (chore: Fix types in tests 41/N.)
import { makeTempWorkspace } from "../test-helpers/workspace.js";
import { captureEnv } from "../test-utils/env.js";
import { getFreePortBlockWithPermissionFallback } from "../test-utils/ports.js";
import {
  createThrowingRuntime,
  readJsonFile,
  runNonInteractiveOnboarding,
} from "./onboard-non-interactive.test-helpers.js";
>>>>>>> 9adcaccd0 (refactor(test): share non-interactive onboarding test helpers)

const gatewayClientCalls: Array<{
  url?: string;
  token?: string;
  password?: string;
  onHelloOk?: () => void;
  onClose?: (code: number, reason: string) => void;
}> = [];

vi.mock("../gateway/client.js", () => ({
  GatewayClient: class {
    params: {
      url?: string;
      token?: string;
      password?: string;
      onHelloOk?: () => void;
    };
    constructor(params: {
      url?: string;
      token?: string;
      password?: string;
      onHelloOk?: () => void;
    }) {
      this.params = params;
      gatewayClientCalls.push(params);
    }
    async request() {
      return { ok: true };
    }
    start() {
      queueMicrotask(() => this.params.onHelloOk?.());
    }
    stop() {}
  },
}));

async function getFreePort(): Promise<number> {
<<<<<<< HEAD
  return await new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close();
        reject(new Error("failed to acquire free port"));
        return;
      }
      const port = addr.port;
      srv.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(port);
        }
      });
    });
=======
  return await getFreePortBlockWithPermissionFallback({
    offsets: [0],
    fallbackBase: 30_000,
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
  });
}

async function getFreeGatewayPort(): Promise<number> {
<<<<<<< HEAD
  return await getDeterministicFreePortBlock({ offsets: [0, 1, 2, 4] });
=======
  return await getFreePortBlockWithPermissionFallback({
    offsets: [0, 1, 2, 4],
    fallbackBase: 40_000,
  });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
}

const runtime = createThrowingRuntime();

async function expectGatewayTokenAuth(params: {
  authConfig: GatewayAuthConfig | null | undefined;
  token: string;
  env: NodeJS.ProcessEnv;
}) {
  const { authorizeGatewayConnect, resolveGatewayAuth } = await import("../gateway/auth.js");
  const auth = resolveGatewayAuth({ authConfig: params.authConfig, env: params.env });
  const resNoToken = await authorizeGatewayConnect({ auth, connectAuth: { token: undefined } });
  expect(resNoToken.ok).toBe(false);
  const resToken = await authorizeGatewayConnect({ auth, connectAuth: { token: params.token } });
  expect(resToken.ok).toBe(true);
}

describe("onboard (non-interactive): gateway and remote auth", () => {
<<<<<<< HEAD
  const prev = {
    home: process.env.HOME,
    stateDir: process.env.CLAWDBOT_STATE_DIR,
    configPath: process.env.CLAWDBOT_CONFIG_PATH,
    skipChannels: process.env.CLAWDBOT_SKIP_CHANNELS,
    skipGmail: process.env.CLAWDBOT_SKIP_GMAIL_WATCHER,
    skipCron: process.env.CLAWDBOT_SKIP_CRON,
    skipCanvas: process.env.CLAWDBOT_SKIP_CANVAS_HOST,
    skipBrowser: process.env.CLAWDBOT_SKIP_BROWSER_CONTROL_SERVER,
    token: process.env.CLAWDBOT_GATEWAY_TOKEN,
    password: process.env.CLAWDBOT_GATEWAY_PASSWORD,
  };
=======
  let envSnapshot: ReturnType<typeof captureEnv>;
>>>>>>> dda9e9f09 (refactor(test): snapshot onboarding gateway env via helper)
  let tempHome: string | undefined;

  const initStateDir = async (prefix: string) => {
    if (!tempHome) {
      throw new Error("temp home not initialized");
    }
    const stateDir = await fs.mkdtemp(path.join(tempHome, prefix));
    process.env.CLAWDBOT_STATE_DIR = stateDir;
    delete process.env.CLAWDBOT_CONFIG_PATH;
    return stateDir;
  };
  const withStateDir = async (
    prefix: string,
    run: (stateDir: string) => Promise<void>,
  ): Promise<void> => {
    const stateDir = await initStateDir(prefix);
    try {
      await run(stateDir);
    } finally {
      await fs.rm(stateDir, { recursive: true, force: true });
    }
  };
  beforeAll(async () => {
<<<<<<< HEAD
    process.env.CLAWDBOT_SKIP_CHANNELS = "1";
    process.env.CLAWDBOT_SKIP_GMAIL_WATCHER = "1";
    process.env.CLAWDBOT_SKIP_CRON = "1";
    process.env.CLAWDBOT_SKIP_CANVAS_HOST = "1";
    process.env.CLAWDBOT_SKIP_BROWSER_CONTROL_SERVER = "1";
    delete process.env.CLAWDBOT_GATEWAY_TOKEN;
    delete process.env.CLAWDBOT_GATEWAY_PASSWORD;
=======
    envSnapshot = captureEnv([
      "HOME",
      "OPENCLAW_STATE_DIR",
      "OPENCLAW_CONFIG_PATH",
      "OPENCLAW_SKIP_CHANNELS",
      "OPENCLAW_SKIP_GMAIL_WATCHER",
      "OPENCLAW_SKIP_CRON",
      "OPENCLAW_SKIP_CANVAS_HOST",
      "OPENCLAW_SKIP_BROWSER_CONTROL_SERVER",
      "OPENCLAW_GATEWAY_TOKEN",
      "OPENCLAW_GATEWAY_PASSWORD",
    ]);
    process.env.OPENCLAW_SKIP_CHANNELS = "1";
    process.env.OPENCLAW_SKIP_GMAIL_WATCHER = "1";
    process.env.OPENCLAW_SKIP_CRON = "1";
    process.env.OPENCLAW_SKIP_CANVAS_HOST = "1";
    process.env.OPENCLAW_SKIP_BROWSER_CONTROL_SERVER = "1";
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
    delete process.env.OPENCLAW_GATEWAY_PASSWORD;
>>>>>>> dda9e9f09 (refactor(test): snapshot onboarding gateway env via helper)

<<<<<<< HEAD
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-onboard-"));
=======
    tempHome = await makeTempWorkspace("openclaw-onboard-");
>>>>>>> 9adcaccd0 (refactor(test): share non-interactive onboarding test helpers)
    process.env.HOME = tempHome;
  });

  afterAll(async () => {
    if (tempHome) {
      await fs.rm(tempHome, { recursive: true, force: true });
    }
<<<<<<< HEAD
    process.env.HOME = prev.home;
    process.env.CLAWDBOT_STATE_DIR = prev.stateDir;
    process.env.CLAWDBOT_CONFIG_PATH = prev.configPath;
    process.env.CLAWDBOT_SKIP_CHANNELS = prev.skipChannels;
    process.env.CLAWDBOT_SKIP_GMAIL_WATCHER = prev.skipGmail;
    process.env.CLAWDBOT_SKIP_CRON = prev.skipCron;
    process.env.CLAWDBOT_SKIP_CANVAS_HOST = prev.skipCanvas;
    process.env.CLAWDBOT_SKIP_BROWSER_CONTROL_SERVER = prev.skipBrowser;
    process.env.CLAWDBOT_GATEWAY_TOKEN = prev.token;
    process.env.CLAWDBOT_GATEWAY_PASSWORD = prev.password;
=======
    envSnapshot.restore();
>>>>>>> dda9e9f09 (refactor(test): snapshot onboarding gateway env via helper)
  });

  it("writes gateway token auth into config and gateway enforces it", async () => {
<<<<<<< HEAD
    const stateDir = await initStateDir("state-noninteractive-");
    const token = "tok_test_123";
    const workspace = path.join(stateDir, "clawd");
=======
    await withStateDir("state-noninteractive-", async (stateDir) => {
      const token = "tok_test_123";
      const workspace = path.join(stateDir, "openclaw");
>>>>>>> a948a3bd0 (refactor(test): share gateway onboarding state-dir lifecycle)

      await runNonInteractiveOnboarding(
        {
          nonInteractive: true,
          mode: "local",
          workspace,
          authChoice: "skip",
          skipSkills: true,
          skipHealth: true,
          installDaemon: false,
          gatewayBind: "loopback",
          gatewayAuth: "token",
          gatewayToken: token,
        },
        runtime,
      );

      const { resolveConfigPath } = await import("../config/paths.js");
      const configPath = resolveConfigPath(process.env, stateDir);
      const cfg = await readJsonFile<{
        gateway?: { auth?: GatewayAuthConfig };
        agents?: { defaults?: { workspace?: string } };
      }>(configPath);

      expect(cfg?.agents?.defaults?.workspace).toBe(workspace);
      expect(cfg?.gateway?.auth?.mode).toBe("token");
      expect(cfg?.gateway?.auth?.token).toBe(token);

      await expectGatewayTokenAuth({
        authConfig: cfg.gateway?.auth,
        token,
        env: process.env,
      });
    });
  }, 60_000);

  it("writes gateway.remote url/token and callGateway uses them", async () => {
    await withStateDir("state-remote-", async () => {
      const port = await getFreePort();
      const token = "tok_remote_123";
      await runNonInteractiveOnboarding(
        {
          nonInteractive: true,
          mode: "remote",
          remoteUrl: `ws://127.0.0.1:${port}`,
          remoteToken: token,
          authChoice: "skip",
          json: true,
        },
        runtime,
      );

      const { resolveConfigPath } = await import("../config/config.js");
      const cfg = await readJsonFile<{
        gateway?: { mode?: string; remote?: { url?: string; token?: string } };
      }>(resolveConfigPath());

      expect(cfg.gateway?.mode).toBe("remote");
      expect(cfg.gateway?.remote?.url).toBe(`ws://127.0.0.1:${port}`);
      expect(cfg.gateway?.remote?.token).toBe(token);

      gatewayClientCalls.length = 0;
      const { callGateway } = await import("../gateway/call.js");
      const health = await callGateway<{ ok?: boolean }>({ method: "health" });
      expect(health?.ok).toBe(true);
      const lastCall = gatewayClientCalls[gatewayClientCalls.length - 1];
      expect(lastCall?.url).toBe(`ws://127.0.0.1:${port}`);
      expect(lastCall?.token).toBe(token);
    });
  }, 60_000);

  it("auto-generates token auth when binding LAN and persists the token", async () => {
    if (process.platform === "win32") {
      // Windows runner occasionally drops the temp config write in this flow; skip to keep CI green.
      return;
    }
<<<<<<< HEAD
    const stateDir = await initStateDir("state-lan-");
    process.env.CLAWDBOT_STATE_DIR = stateDir;
    process.env.CLAWDBOT_CONFIG_PATH = path.join(stateDir, "moltbot.json");

    const port = await getFreeGatewayPort();
    const workspace = path.join(stateDir, "clawd");
=======
    await withStateDir("state-lan-", async (stateDir) => {
      process.env.OPENCLAW_STATE_DIR = stateDir;
      process.env.OPENCLAW_CONFIG_PATH = path.join(stateDir, "openclaw.json");

      const port = await getFreeGatewayPort();
      const workspace = path.join(stateDir, "openclaw");
>>>>>>> a948a3bd0 (refactor(test): share gateway onboarding state-dir lifecycle)

      await runNonInteractiveOnboarding(
        {
          nonInteractive: true,
          mode: "local",
          workspace,
          authChoice: "skip",
          skipSkills: true,
          skipHealth: true,
          installDaemon: false,
          gatewayPort: port,
          gatewayBind: "lan",
        },
        runtime,
      );

      const { resolveConfigPath } = await import("../config/paths.js");
      const configPath = resolveConfigPath(process.env, stateDir);
      const cfg = await readJsonFile<{
        gateway?: {
          bind?: string;
          port?: number;
          auth?: GatewayAuthConfig;
        };
      }>(configPath);

      expect(cfg.gateway?.bind).toBe("lan");
      expect(cfg.gateway?.port).toBe(port);
      expect(cfg.gateway?.auth?.mode).toBe("token");
      const token = cfg.gateway?.auth?.token ?? "";
      expect(token.length).toBeGreaterThan(8);

      await expectGatewayTokenAuth({
        authConfig: cfg.gateway?.auth,
        token,
        env: process.env,
      });
    });
  }, 60_000);
});
