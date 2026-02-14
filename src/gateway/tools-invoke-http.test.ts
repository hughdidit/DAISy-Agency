import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IncomingMessage, ServerResponse } from "node:http";
<<<<<<< HEAD
import { promises as fs } from "node:fs";
import path from "node:path";
<<<<<<< HEAD

=======
import { beforeEach, describe, expect, it, vi } from "vitest";
=======
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> 8899f9e94 (perf(test): optimize heavy suites and stabilize lock timing)
import { createTestRegistry } from "../test-utils/channel-plugins.js";
import { resetTestPluginRegistry, setTestPluginRegistry, testState } from "./test-helpers.mocks.js";
>>>>>>> 476f367cf (Gateway: avoid writing host config in tools invoke test)
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
  if (!token) {
    throw new Error("test gateway token missing");
  }
  return token;
};

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
    headers: { "content-type": "application/json", connection: "close", ...params.headers },
    body: JSON.stringify(body),
  });
};

<<<<<<< HEAD
=======
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
    headers: { "content-type": "application/json", connection: "close", ...params.headers },
    body: JSON.stringify(body),
  });
};

>>>>>>> 4bef423d8 (perf(test): reduce gateway reload waits and trim duplicate invoke coverage)
describe("POST /tools/invoke", () => {
  let sharedPort = 0;
  let sharedServer: Awaited<ReturnType<typeof startGatewayServer>>;

  beforeAll(async () => {
    sharedPort = await getFreePort();
    sharedServer = await startGatewayServer(sharedPort, {
      bind: "loopback",
    });
  });

  afterAll(async () => {
    await sharedServer.close();
  });

  it("invokes a tool and returns {ok:true,result}", async () => {
    allowAgentsListForMain();
    const token = resolveGatewayToken();

    const res = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty("result");
  });

  it("supports tools.alsoAllow in profile and implicit modes", async () => {
    testState.agentsConfig = {
      list: [{ id: "main" }],
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;

    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      tools: { profile: "minimal", alsoAllow: ["agents_list"] },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any);
    const token = resolveGatewayToken();

    const resProfile = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(resProfile.status).toBe(200);
    const profileBody = await resProfile.json();
    expect(profileBody.ok).toBe(true);

    await writeConfigFile({
      tools: { alsoAllow: ["agents_list"] },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any);
    const resImplicit = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(resImplicit.status).toBe(200);
    const implicitBody = await resImplicit.json();
    expect(implicitBody.ok).toBe(true);
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

    allowAgentsListForMain();
    try {
      const token = resolveGatewayToken();
      const res = await invokeAgentsList({
        port: sharedPort,
        headers: { authorization: `Bearer ${token}` },
        sessionKey: "main",
      });

      expect(res.status).toBe(200);
      expect(pluginHandler).not.toHaveBeenCalled();
    } finally {
      resetTestPluginRegistry();
    }
  });

  it("returns 404 when denylisted or blocked by tools.profile", async () => {
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: {
            deny: ["agents_list"],
          },
        },
      ],
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;
    const token = resolveGatewayToken();

    const denyRes = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(denyRes.status).toBe(404);

    allowAgentsListForMain();

    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      tools: { profile: "minimal" },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any);

    const profileRes = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(profileRes.status).toBe(404);
  });

<<<<<<< HEAD
=======
  it("denies sessions_spawn via HTTP even when agent policy allows", async () => {
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: { allow: ["sessions_spawn"] },
        },
      ],
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;

    const token = resolveGatewayToken();

    const res = await invokeTool({
      port: sharedPort,
      tool: "sessions_spawn",
      args: { task: "test" },
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.type).toBe("not_found");
  });

  it("denies sessions_send via HTTP gateway", async () => {
    testState.agentsConfig = {
      list: [{ id: "main", tools: { allow: ["sessions_send"] } }],
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;

    const token = resolveGatewayToken();

    const res = await invokeTool({
      port: sharedPort,
      tool: "sessions_send",
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(res.status).toBe(404);
  });

  it("denies gateway tool via HTTP", async () => {
    testState.agentsConfig = {
      list: [{ id: "main", tools: { allow: ["gateway"] } }],
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;

    const token = resolveGatewayToken();

    const res = await invokeTool({
      port: sharedPort,
      tool: "gateway",
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(res.status).toBe(404);
  });

<<<<<<< HEAD
>>>>>>> 644251295 (perf: reduce hotspot test startup and timeout costs)
=======
  it("allows gateway tool via HTTP when explicitly enabled in gateway.tools.allow", async () => {
    testState.agentsConfig = {
      list: [{ id: "main", tools: { allow: ["gateway"] } }],
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;
    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      gateway: { tools: { allow: ["gateway"] } },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any);

    const token = resolveGatewayToken();

    try {
      const res = await invokeTool({
        port: sharedPort,
        tool: "gateway",
        headers: { authorization: `Bearer ${token}` },
        sessionKey: "main",
      });

      // Ensure we didn't hit the HTTP deny list (404). Invalid args should map to 400.
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error?.type).toBe("tool_error");
    } finally {
      await writeConfigFile({
        // oxlint-disable-next-line typescript/no-explicit-any
      } as any);
    }
  });

  it("treats gateway.tools.deny as higher priority than gateway.tools.allow", async () => {
    testState.agentsConfig = {
      list: [{ id: "main", tools: { allow: ["gateway"] } }],
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;
    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      gateway: { tools: { allow: ["gateway"], deny: ["gateway"] } },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any);

    const token = resolveGatewayToken();

    try {
      const res = await invokeTool({
        port: sharedPort,
        tool: "gateway",
        headers: { authorization: `Bearer ${token}` },
        sessionKey: "main",
      });

      expect(res.status).toBe(404);
    } finally {
      await writeConfigFile({
        // oxlint-disable-next-line typescript/no-explicit-any
      } as any);
    }
  });

>>>>>>> a7a08b665 (test(gateway): cover tools allow/deny precedence)
  it("uses the configured main session key when sessionKey is missing or main", async () => {
    testState.agentsConfig = {
      list: [
        {
          id: "main",
          tools: {
            deny: ["agents_list"],
          },
        },
        {
          id: "ops",
          default: true,
          tools: {
            allow: ["agents_list"],
          },
        },
      ],
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;
    testState.sessionConfig = { mainKey: "primary" };

    const token = resolveGatewayToken();

    const resDefault = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resDefault.status).toBe(200);

    const resMain = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(resMain.status).toBe(200);
  });
});
