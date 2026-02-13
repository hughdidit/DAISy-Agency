import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IncomingMessage, ServerResponse } from "node:http";
<<<<<<< HEAD
import { promises as fs } from "node:fs";
import path from "node:path";

=======
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolInputError } from "../agents/tools/common.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";
import { resetTestPluginRegistry, setTestPluginRegistry, testState } from "./test-helpers.mocks.js";
>>>>>>> 767fd9f22 (fix: classify /tools/invoke errors and sanitize 500s (#13185) (thanks @davidrudduck))
import { installGatewayTestHooks, getFreePort, startGatewayServer } from "./test-helpers.server.js";
import { resetTestPluginRegistry, setTestPluginRegistry, testState } from "./test-helpers.mocks.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";
import { CONFIG_PATH } from "../config/config.js";

installGatewayTestHooks({ scope: "suite" });

beforeEach(() => {
  // Ensure these tests are not affected by host env vars.
  delete process.env.CLAWDBOT_GATEWAY_TOKEN;
  delete process.env.CLAWDBOT_GATEWAY_PASSWORD;
});

const resolveGatewayToken = (): string => {
  const token = (testState.gatewayAuth as { token?: string } | undefined)?.token;
  if (!token) throw new Error("test gateway token missing");
  return token;
};

<<<<<<< HEAD
=======
const allowAgentsListForMain = () => {
  testState.agentsConfig = {
    list: [
      {
        id: "main",
        tools: {
          allow: ["agents_list"],
        },
      },
    ],
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any;
};

const invokeAgentsList = async (params: {
  port: number;
  headers?: Record<string, string>;
  sessionKey?: string;
}) => {
  const body: Record<string, unknown> = { tool: "agents_list", action: "json", args: {} };
  if (params.sessionKey) {
    body.sessionKey = params.sessionKey;
  }
  return await fetch(`http://127.0.0.1:${params.port}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json", ...params.headers },
    body: JSON.stringify(body),
  });
};

const invokeTool = async (params: {
  port: number;
  tool: string;
  args?: Record<string, unknown>;
  action?: string;
  headers?: Record<string, string>;
  sessionKey?: string;
}) => {
  const body: Record<string, unknown> = {
    tool: params.tool,
    args: params.args ?? {},
  };
  if (params.action) {
    body.action = params.action;
  }
  if (params.sessionKey) {
    body.sessionKey = params.sessionKey;
  }
  return await fetch(`http://127.0.0.1:${params.port}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json", ...params.headers },
    body: JSON.stringify(body),
  });
};

>>>>>>> 767fd9f22 (fix: classify /tools/invoke errors and sanitize 500s (#13185) (thanks @davidrudduck))
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
      // oxlint-disable-next-line typescript/no-explicit-any
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
<<<<<<< HEAD
      list: [
        {
          id: "main",
          tools: {
            allow: ["sessions_list"],
          },
        },
      ],
=======
      list: [{ id: "main", tools: { allow: ["sessions_send"] } }],
      // oxlint-disable-next-line typescript/no-explicit-any
>>>>>>> ee31cd47b (fix: close OC-02 gaps in ACP permission + gateway HTTP deny config (#15390) (thanks @aether-ai-agent))
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

<<<<<<< HEAD
=======
  it("denies gateway tool via HTTP", async () => {
    testState.agentsConfig = {
      list: [{ id: "main", tools: { allow: ["gateway"] } }],
      // oxlint-disable-next-line typescript/no-explicit-any
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
>>>>>>> ee31cd47b (fix: close OC-02 gaps in ACP permission + gateway HTTP deny config (#15390) (thanks @aether-ai-agent))
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

    await server.close();
  });

  it("maps tool input errors to 400 and unexpected execution errors to 500", async () => {
    const registry = createTestRegistry();
    registry.tools.push({
      pluginId: "tools-invoke-test",
      source: "test",
      names: ["tools_invoke_test"],
      optional: false,
      factory: () => ({
        label: "Tools Invoke Test",
        name: "tools_invoke_test",
        description: "Test-only tool.",
        parameters: {
          type: "object",
          properties: {
            mode: { type: "string" },
          },
          required: ["mode"],
          additionalProperties: false,
        },
        execute: async (_toolCallId, args) => {
          const mode = (args as { mode?: unknown }).mode;
          if (mode === "input") {
            throw new ToolInputError("mode invalid");
          }
          if (mode === "crash") {
            throw new Error("boom");
          }
          return { ok: true };
        },
      }),
    });
    setTestPluginRegistry(registry);
    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      plugins: { enabled: true },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any);

    const token = resolveGatewayToken();

    try {
      const inputRes = await invokeTool({
        port: sharedPort,
        tool: "tools_invoke_test",
        args: { mode: "input" },
        headers: { authorization: `Bearer ${token}` },
        sessionKey: "main",
      });
      expect(inputRes.status).toBe(400);
      const inputBody = await inputRes.json();
      expect(inputBody.ok).toBe(false);
      expect(inputBody.error?.type).toBe("tool_error");
      expect(inputBody.error?.message).toBe("mode invalid");

      const crashRes = await invokeTool({
        port: sharedPort,
        tool: "tools_invoke_test",
        args: { mode: "crash" },
        headers: { authorization: `Bearer ${token}` },
        sessionKey: "main",
      });
      expect(crashRes.status).toBe(500);
      const crashBody = await crashRes.json();
      expect(crashBody.ok).toBe(false);
      expect(crashBody.error?.type).toBe("tool_error");
      expect(crashBody.error?.message).toBe("tool execution failed");
    } finally {
      await writeConfigFile({
        // oxlint-disable-next-line typescript/no-explicit-any
      } as any);
      resetTestPluginRegistry();
    }
  });
});
