import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { OpenClawPluginDiscordMonitorFactory } from "openclaw/plugin-sdk";
import plugin from "../../index.js";

type PluginApi = {
  id: string;
  name: string;
  description?: string;
  source: string;
  config: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;
  runtime: unknown;
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug?: (message: string) => void;
  };
  registerTool: (tool: unknown, opts?: unknown) => void;
  registerHook: () => void;
  registerHttpRoute: () => void;
  registerChannel: () => void;
  registerGatewayMethod: () => void;
  registerGatewayEvent: (event: string) => void;
  registerDiscordMonitor: (factory: OpenClawPluginDiscordMonitorFactory) => void;
  registerCli: (registrar: (ctx: any) => void, opts?: { commands?: string[] }) => void;
  registerService: () => void;
  registerProvider: () => void;
  registerCommand: () => void;
  resolvePath: (input: string) => string;
  on: () => void;
};

type RegisteredTool = {
  name: string;
  execute: (id: string, params: Record<string, unknown>) => Promise<{ details?: unknown }>;
};

export type Harness = {
  tools: Map<string, RegisteredTool>;
  logs: string[];
  cliCommands: string[];
};

const fixturesDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureBinaryPath = path.join(fixturesDir, "mock-gws.js");

export function createHarness(params?: {
  pluginConfig?: Record<string, unknown>;
  config?: Record<string, unknown>;
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  messageChannel?: string;
  workspaceDir?: string;
  agentDir?: string;
}): Harness {
  const tools = new Map<string, RegisteredTool>();
  const logs: string[] = [];
  const cliCommands: string[] = [];

  const api: PluginApi = {
    id: "gws-toolkit-phase1",
    name: "GWS Toolkit",
    description: "test",
    source: "test",
    config: (params?.config ?? {}) as never,
    pluginConfig: params?.pluginConfig,
    runtime: {} as never,
    logger: {
      info(message) {
        logs.push(`info:${message}`);
      },
      warn(message) {
        logs.push(`warn:${message}`);
      },
      error(message) {
        logs.push(`error:${message}`);
      },
      debug(message) {
        logs.push(`debug:${message}`);
      },
    },
    registerTool(tool) {
      if (typeof tool === "function") {
        const produced = tool({
          config: params?.config ?? {},
          workspaceDir: params?.workspaceDir ?? process.cwd(),
          agentDir: params?.agentDir ?? process.cwd(),
          agentId: params?.agentId ?? "main",
          sessionKey: params?.sessionKey ?? "agent:main:main",
          sessionId: params?.sessionId ?? "test-session",
          messageChannel: params?.messageChannel ?? "test",
        });
        const list = Array.isArray(produced) ? produced : produced ? [produced] : [];
        for (const entry of list) {
          const maybeTool = entry as { name?: string; execute?: RegisteredTool["execute"] };
          if (typeof maybeTool.name === "string" && typeof maybeTool.execute === "function") {
            tools.set(maybeTool.name, maybeTool as RegisteredTool);
          }
        }
        return;
      }
      if (!tool || typeof tool !== "object") {
        return;
      }
      const maybeTool = tool as { name?: string; execute?: RegisteredTool["execute"] };
      if (typeof maybeTool.name === "string" && typeof maybeTool.execute === "function") {
        tools.set(maybeTool.name, maybeTool as RegisteredTool);
      }
    },
    registerHook() {},
    registerHttpRoute() {},
    registerChannel() {},
    registerGatewayMethod() {},
    registerGatewayEvent(_event) {},
    registerDiscordMonitor(_factory) {},
    registerCli(registrar, opts) {
      if (opts?.commands) {
        cliCommands.push(...opts.commands);
      }
      const fakeProgram = {
        command(_name: string) {
          return {
            description() {
              return this;
            },
            action() {
              return this;
            },
            command(_sub: string) {
              return this;
            },
          };
        },
      };
      void registrar({
        program: fakeProgram,
        config: {},
        logger: {
          info(message: string) {
            logs.push(`cli-info:${message}`);
          },
          warn(message: string) {
            logs.push(`cli-warn:${message}`);
          },
          error(message: string) {
            logs.push(`cli-error:${message}`);
          },
        },
      });
    },
    registerService() {},
    registerProvider() {},
    registerCommand() {},
    resolvePath(input) {
      return input;
    },
    on() {},
  };

  (plugin as { register: (api: PluginApi) => void }).register(api);
  return { tools, logs, cliCommands };
}

export async function withTempFile(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gws-toolkit-test-"));
  const file = path.join(dir, "openclaw.config.json");
  await fs.writeFile(file, content, "utf8");
  return file;
}

export function defaultPluginConfig(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    enabledServices: ["drive", "gmail", "calendar"],
    enabledWriteServices: [],
    binaryPath: fixtureBinaryPath,
    tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
    timeoutMs: 5000,
    maxStdoutBytes: 1024 * 1024,
    maxStderrBytes: 256 * 1024,
    safeMode: true,
    allowWriteOperations: false,
    allowedCredentialModes: ["token", "oauth"],
    defaultScopesProfile: "minimal",
    approvedCredentialDirs: [fixturesDir],
    ...overrides,
  };
}

export async function executeTool(
  harness: Harness,
  toolName: string,
  params: Record<string, unknown>,
): Promise<any> {
  const tool = harness.tools.get(toolName);
  if (!tool?.execute) {
    throw new Error(`Tool not found: ${toolName}`);
  }
  const result = await tool.execute("tool-call", params);
  return result.details as Record<string, unknown>;
}
