import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

import { installGatewayTestHooks, getFreePort, startGatewayServer } from "./test-helpers.server.js";
import { resetTestPluginRegistry, setTestPluginRegistry, testState } from "./test-helpers.mocks.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";
import { CONFIG_PATH } from "../config/config.js";

<<<<<<< HEAD
installGatewayTestHooks({ scope: "suite" });
=======
// Perf: keep this suite pure unit. Mock heavyweight config/session modules.
vi.mock("../config/config.js", () => ({
  loadConfig: () => cfg,
}));

vi.mock("../config/sessions.js", () => ({
  resolveMainSessionKey: (params?: {
    session?: { scope?: string; mainKey?: string };
    agents?: { list?: Array<{ id?: string; default?: boolean }> };
  }) => {
    if (params?.session?.scope === "global") {
      return "global";
    }
    const agents = params?.agents?.list ?? [];
    const rawDefault = agents.find((agent) => agent?.default)?.id ?? agents[0]?.id ?? "main";
    const agentId =
      String(rawDefault ?? "main")
        .trim()
        .toLowerCase() || "main";
    const mainKeyRaw = String(params?.session?.mainKey ?? "main")
      .trim()
      .toLowerCase();
    const mainKey = mainKeyRaw || "main";
    return `agent:${agentId}:${mainKey}`;
  },
}));

vi.mock("./auth.js", () => ({
  authorizeHttpGatewayConnect: async () => ({ ok: true }),
}));

vi.mock("../logger.js", () => ({
  logWarn: () => {},
}));

vi.mock("../plugins/config-state.js", () => ({
  isTestDefaultMemorySlotDisabled: () => false,
}));

vi.mock("../plugins/tools.js", () => ({
  getPluginToolMeta: () => undefined,
}));

// Perf: the real tool factory instantiates many tools per request; for these HTTP
// routing/policy tests we only need a small set of tool names.
vi.mock("../agents/openclaw-tools.js", () => {
  const toolInputError = (message: string) => {
    const err = new Error(message);
    err.name = "ToolInputError";
    return err;
  };
  const toolAuthorizationError = (message: string) => {
    const err = new Error(message) as Error & { status?: number };
    err.name = "ToolAuthorizationError";
    err.status = 403;
    return err;
  };

  const tools = [
    {
      name: "session_status",
      parameters: { type: "object", properties: {} },
      execute: async () => ({ ok: true }),
    },
    {
      name: "agents_list",
      parameters: { type: "object", properties: { action: { type: "string" } } },
      execute: async () => ({ ok: true, result: [] }),
    },
    {
      name: "sessions_spawn",
      parameters: { type: "object", properties: {} },
      execute: async () => ({ ok: true }),
    },
    {
      name: "sessions_send",
      parameters: { type: "object", properties: {} },
      execute: async () => ({ ok: true }),
    },
    {
      name: "gateway",
      parameters: { type: "object", properties: {} },
      execute: async () => {
        throw toolInputError("invalid args");
      },
    },
    {
      name: "tools_invoke_test",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string" },
        },
        required: ["mode"],
        additionalProperties: false,
      },
      execute: async (_toolCallId: string, args: unknown) => {
        const mode = (args as { mode?: unknown })?.mode;
        if (mode === "input") {
          throw toolInputError("mode invalid");
        }
        if (mode === "auth") {
          throw toolAuthorizationError("mode forbidden");
        }
        if (mode === "crash") {
          throw new Error("boom");
        }
        return { ok: true };
      },
    },
  ];

  return {
    createOpenClawTools: () => tools,
  };
});

const { handleToolsInvokeHttpRequest } = await import("./tools-invoke-http.js");

let pluginHttpHandlers: Array<(req: IncomingMessage, res: ServerResponse) => Promise<boolean>> = [];

let sharedPort = 0;
let sharedServer: ReturnType<typeof createServer> | undefined;

beforeAll(async () => {
  sharedServer = createServer((req, res) => {
    void (async () => {
      const handled = await handleToolsInvokeHttpRequest(req, res, {
        auth: { mode: "token", token: TEST_GATEWAY_TOKEN, allowTailscale: false },
      });
      if (handled) {
        return;
      }
      for (const handler of pluginHttpHandlers) {
        if (await handler(req, res)) {
          return;
        }
      }
      res.statusCode = 404;
      res.end("not found");
    })().catch((err) => {
      res.statusCode = 500;
      res.end(String(err));
    });
  });

  await new Promise<void>((resolve, reject) => {
    sharedServer?.once("error", reject);
    sharedServer?.listen(0, "127.0.0.1", () => {
      const address = sharedServer?.address() as AddressInfo | null;
      sharedPort = address?.port ?? 0;
      resolve();
    });
  });
});

afterAll(async () => {
  const server = sharedServer;
  if (!server) {
    return;
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  sharedServer = undefined;
});
>>>>>>> 10b8839a8 (fix(security): centralize WhatsApp outbound auth and return 403 tool auth errors)

beforeEach(() => {
  // Ensure these tests are not affected by host env vars.
  delete process.env.OPENCLAW_GATEWAY_TOKEN;
  delete process.env.OPENCLAW_GATEWAY_PASSWORD;
});

const resolveGatewayToken = (): string => {
  const token = (testState.gatewayAuth as { token?: string } | undefined)?.token;
  if (!token) throw new Error("test gateway token missing");
  return token;
};

describe("POST /tools/invoke", () => {
  it("invokes a tool and returns {ok:true,result}", async () => {
    // Allow the sessions_list tool for main agent.
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: {
            allow: ["sessions_list"],
          },
        },
      ],
    } as any;

    const port = await getFreePort();
    const server = await startGatewayServer(port, {
      bind: "loopback",
    });
    const token = resolveGatewayToken();

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool: "sessions_list", action: "json", args: {}, sessionKey: "main" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty("result");

    await server.close();
  });

  it("supports tools.alsoAllow as additive allowlist (profile stage)", async () => {
    // No explicit tool allowlist; rely on profile + alsoAllow.
    testState.agentsConfig = {
      list: [{ id: "main" }],
    } as any;

    // minimal profile does NOT include sessions_list, but alsoAllow should.
    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      tools: { profile: "minimal", alsoAllow: ["sessions_list"] },
    } as any);

    const port = await getFreePort();
    const server = await startGatewayServer(port, { bind: "loopback" });
    const token = resolveGatewayToken();

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool: "sessions_list", action: "json", args: {}, sessionKey: "main" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    await server.close();
  });

  it("supports tools.alsoAllow without allow/profile (implicit allow-all)", async () => {
    testState.agentsConfig = {
      list: [{ id: "main" }],
    } as any;

    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify({ tools: { alsoAllow: ["sessions_list"] } }, null, 2),
      "utf-8",
    );

    const port = await getFreePort();
    const server = await startGatewayServer(port, { bind: "loopback" });
    const token = resolveGatewayToken();

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool: "sessions_list", action: "json", args: {}, sessionKey: "main" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    await server.close();
  });

  it("accepts password auth when bearer token matches", async () => {
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: {
            allow: ["sessions_list"],
          },
        },
      ],
    } as any;

    const port = await getFreePort();
    const server = await startGatewayServer(port, {
      bind: "loopback",
      auth: { mode: "password", password: "secret" },
    });

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer secret",
      },
      body: JSON.stringify({ tool: "sessions_list", action: "json", args: {}, sessionKey: "main" }),
    });

    expect(res.status).toBe(200);

    await server.close();
  });

  it("routes tools invoke before plugin HTTP handlers", async () => {
    const pluginHandler = vi.fn(async (_req: IncomingMessage, res: ServerResponse) => {
      res.statusCode = 418;
      res.end("plugin");
      return true;
    });
    const registry = createTestRegistry();
    registry.httpHandlers = [
      {
        pluginId: "test-plugin",
        source: "test",
        handler: pluginHandler as unknown as (
          req: import("node:http").IncomingMessage,
          res: import("node:http").ServerResponse,
        ) => Promise<boolean>,
      },
    ];
    setTestPluginRegistry(registry);

    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: {
            allow: ["sessions_list"],
          },
        },
      ],
    } as any;

    const port = await getFreePort();
    const server = await startGatewayServer(port, { bind: "loopback" });
    try {
      const token = resolveGatewayToken();
      const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tool: "sessions_list",
          action: "json",
          args: {},
          sessionKey: "main",
        }),
      });

      expect(res.status).toBe(200);
      expect(pluginHandler).not.toHaveBeenCalled();
    } finally {
      await server.close();
      resetTestPluginRegistry();
    }
  });

  it("rejects unauthorized when auth mode is token and header is missing", async () => {
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: {
            allow: ["sessions_list"],
          },
        },
      ],
    } as any;

    const port = await getFreePort();
    const server = await startGatewayServer(port, {
      bind: "loopback",
      auth: { mode: "token", token: "t" },
    });

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tool: "sessions_list", action: "json", args: {}, sessionKey: "main" }),
    });

    expect(res.status).toBe(401);

    await server.close();
  });

  it("returns 404 when tool is not allowlisted", async () => {
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: {
            deny: ["sessions_list"],
          },
        },
      ],
    } as any;

    const port = await getFreePort();
    const server = await startGatewayServer(port, { bind: "loopback" });
    const token = resolveGatewayToken();

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool: "sessions_list", action: "json", args: {}, sessionKey: "main" }),
    });

    expect(res.status).toBe(404);

    await server.close();
  });

  it("respects tools.profile allowlist", async () => {
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: {
            allow: ["sessions_list"],
          },
        },
      ],
    } as any;

    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      tools: { profile: "minimal" },
    } as any);

    const port = await getFreePort();
    const server = await startGatewayServer(port, { bind: "loopback" });
    const token = resolveGatewayToken();

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool: "sessions_list", action: "json", args: {}, sessionKey: "main" }),
    });

    expect(res.status).toBe(404);

    await server.close();
  });

  it("denies sessions_spawn via HTTP even when agent policy allows", async () => {
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: { allow: ["sessions_spawn"] },
        },
      ],
    } as any;

    const port = await getFreePort();
    const server = await startGatewayServer(port, { bind: "loopback" });
    const token = resolveGatewayToken();

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool: "sessions_spawn", args: { task: "test" }, sessionKey: "main" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.type).toBe("not_found");

    await server.close();
  });

  it("denies sessions_send via HTTP gateway", async () => {
    testState.agentsConfig = {
      list: [{ id: "main", tools: { allow: ["sessions_send"] } }],
    } as any;

    const port = await getFreePort();
    const server = await startGatewayServer(port, { bind: "loopback" });
    const token = resolveGatewayToken();

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool: "sessions_send", args: {}, sessionKey: "main" }),
    });

    expect(res.status).toBe(404);
    await server.close();
  });

  it("denies gateway tool via HTTP", async () => {
    testState.agentsConfig = {
      list: [{ id: "main", tools: { allow: ["gateway"] } }],
    } as any;

    const port = await getFreePort();
    const server = await startGatewayServer(port, { bind: "loopback" });
    const token = resolveGatewayToken();

    const res = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tool: "gateway", args: {}, sessionKey: "main" }),
    });

    expect(res.status).toBe(404);
    await server.close();
  });

  it("uses the configured main session key when sessionKey is missing or main", async () => {
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: {
            deny: ["sessions_list"],
          },
        },
        {
          id: "ops",
          default: true,
          tools: {
            allow: ["sessions_list"],
          },
        },
      ],
    } as any;
    testState.sessionConfig = { mainKey: "primary" };

    const port = await getFreePort();
    const server = await startGatewayServer(port, { bind: "loopback" });

    const payload = { tool: "sessions_list", action: "json", args: {} };
    const token = resolveGatewayToken();

    const resDefault = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    expect(resDefault.status).toBe(200);

    const resMain = await fetch(`http://127.0.0.1:${port}/tools/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...payload, sessionKey: "main" }),
    });
    expect(resMain.status).toBe(200);

<<<<<<< HEAD
    await server.close();
=======
  it("maps tool input/auth errors to 400/403 and unexpected execution errors to 500", async () => {
    cfg = {
      ...cfg,
      agents: {
        list: [{ id: "main", default: true, tools: { allow: ["tools_invoke_test"] } }],
      },
    };

    const inputRes = await invokeToolAuthed({
      tool: "tools_invoke_test",
      args: { mode: "input" },
      sessionKey: "main",
    });
    expect(inputRes.status).toBe(400);
    const inputBody = await inputRes.json();
    expect(inputBody.ok).toBe(false);
    expect(inputBody.error?.type).toBe("tool_error");
    expect(inputBody.error?.message).toBe("mode invalid");

    const authRes = await invokeToolAuthed({
      tool: "tools_invoke_test",
      args: { mode: "auth" },
      sessionKey: "main",
    });
    expect(authRes.status).toBe(403);
    const authBody = await authRes.json();
    expect(authBody.ok).toBe(false);
    expect(authBody.error?.type).toBe("tool_error");
    expect(authBody.error?.message).toBe("mode forbidden");

    const crashRes = await invokeToolAuthed({
      tool: "tools_invoke_test",
      args: { mode: "crash" },
      sessionKey: "main",
    });
    expect(crashRes.status).toBe(500);
    const crashBody = await crashRes.json();
    expect(crashBody.ok).toBe(false);
    expect(crashBody.error?.type).toBe("tool_error");
    expect(crashBody.error?.message).toBe("tool execution failed");
>>>>>>> 10b8839a8 (fix(security): centralize WhatsApp outbound auth and return 403 tool auth errors)
  });
});
