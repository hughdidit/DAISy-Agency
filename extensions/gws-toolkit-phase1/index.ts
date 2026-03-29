import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { createAuditLogger } from "./src/audit.js";
import { executeCalendarRead } from "./src/commands/calendar-read.js";
import { executeDriveRead } from "./src/commands/drive-read.js";
import { executeGmailRead } from "./src/commands/gmail-read.js";
import { createRuntimeDeps } from "./src/commands/helpers.js";
import { buildConfigResolutionDeniedEnvelope, executeStatus } from "./src/commands/status.js";
import { resolveConfig } from "./src/config.js";
import { PluginError } from "./src/errors.js";
import { createRedactingLogger } from "./src/logger.js";
import type { GwsToolkitConfig, InvocationContext, StructuredEnvelope } from "./src/types.js";

function toToolResult(payload: StructuredEnvelope) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload),
      },
    ],
    details: payload,
  };
}

function defaultConfig(): GwsToolkitConfig {
  return {
    enabledServices: ["drive", "gmail", "calendar"],
    approvedCredentialDirs: [],
    tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
    timeoutMs: 15000,
    maxStdoutBytes: 1048576,
    maxStderrBytes: 262144,
    safeMode: true,
    allowedCredentialModes: ["oauth", "credentials_file", "token"],
    defaultScopesProfile: "minimal",
  };
}

function createContext(overrides: Partial<InvocationContext> = {}): InvocationContext {
  return {
    agentId: "cli",
    sessionId: "cli",
    ...overrides,
  };
}

type GwsRuntimeEnv = Record<string, string>;

async function ensurePrivateDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    await fs.chmod(dir, 0o700);
  } catch {
    // chmod may be a no-op or unsupported on some local dev filesystems.
  }
}

async function prepareRuntimeEnv(stateDir: string): Promise<GwsRuntimeEnv> {
  const rootDir = path.join(stateDir, "plugins", "gws-toolkit-phase1", "runtime");
  const homeDir = path.join(rootDir, "home");
  const tempDir = path.join(rootDir, "tmp");
  const configDir = path.join(rootDir, "xdg-config");
  const cacheDir = path.join(rootDir, "xdg-cache");

  await ensurePrivateDir(rootDir);
  await ensurePrivateDir(homeDir);
  await ensurePrivateDir(tempDir);
  await ensurePrivateDir(configDir);
  await ensurePrivateDir(cacheDir);

  return {
    HOME: homeDir,
    TMPDIR: tempDir,
    XDG_CONFIG_HOME: configDir,
    XDG_CACHE_HOME: cacheDir,
  };
}

const plugin = {
  id: "gws-toolkit-phase1",
  name: "GWS Toolkit (Phase 1)",
  description: "Security-hardened read-only Google Workspace integration via gws CLI.",
  register(api: OpenClawPluginApi) {
    const logger = createRedactingLogger(api.logger);
    const resolvedConfig = resolveConfig(api.pluginConfig);
    const runtimeConfig = resolvedConfig.ok ? resolvedConfig.value.config : defaultConfig();
    const posture = resolvedConfig.ok ? resolvedConfig.value.posture : resolvedConfig.posture;
    const configResolution = resolvedConfig.ok
      ? { ok: true as const, config: runtimeConfig, posture }
      : {
          ok: false as const,
          message: resolvedConfig.error.error.message,
          posture,
          fallbackConfig: runtimeConfig,
        };

    const audit = createAuditLogger(logger);
    const baseDeps = createRuntimeDeps(runtimeConfig, audit);
    let runtimeEnv: GwsRuntimeEnv | null = null;
    let runtimeEnvPromise: Promise<GwsRuntimeEnv> | null = null;

    async function ensureRuntimeEnv(): Promise<GwsRuntimeEnv | undefined> {
      const resolveStateDir = api.runtime?.state?.resolveStateDir;
      if (typeof resolveStateDir !== "function") {
        return undefined;
      }
      if (runtimeEnv) {
        return runtimeEnv;
      }
      try {
        if (!runtimeEnvPromise) {
          const stateDir = resolveStateDir(process.env);
          runtimeEnvPromise = prepareRuntimeEnv(stateDir)
            .then((value) => {
              runtimeEnv = value;
              return value;
            })
            .catch((error) => {
              runtimeEnvPromise = null;
              throw error;
            });
        }
        return await runtimeEnvPromise;
      } catch (error) {
        runtimeEnvPromise = null;
        throw new PluginError("INTERNAL_ERROR", "Failed to prepare gws runtime directories", {
          cause: error instanceof Error ? error.message : String(error),
        });
      }
    }

    api.registerTool({
      name: "gws_status",
      label: "GWS Status",
      description:
        "Check gws binary/version/auth-source/config posture and enabled read-only services.",
      parameters: Type.Object(
        {
          includeVersion: Type.Optional(Type.Boolean()),
          includeAuthStatus: Type.Optional(Type.Boolean()),
        },
        { additionalProperties: false },
      ),
      async execute(_id: string, params: Record<string, unknown>) {
        const envelope = await executeStatus({
          ctx: createContext(),
          audit,
          configResolution,
          rawParams: params,
          resolveRuntimeEnv: resolvedConfig.ok ? ensureRuntimeEnv : undefined,
        });
        return toToolResult(envelope);
      },
    });

    api.registerTool({
      name: "gws_drive_read",
      label: "GWS Drive Read",
      description:
        "Read-only Google Drive operations (list_files, get_file_metadata, export_file).",
      parameters: Type.Object(
        {
          action: Type.String({ enum: ["list_files", "get_file_metadata", "export_file"] }),
          pageSize: Type.Optional(Type.Number()),
          query: Type.Optional(Type.String()),
          fileId: Type.Optional(Type.String()),
          mimeType: Type.Optional(Type.String()),
        },
        { additionalProperties: false },
      ),
      async execute(_id: string, params: Record<string, unknown>) {
        if (!resolvedConfig.ok) {
          return toToolResult(
            buildConfigResolutionDeniedEnvelope({
              tool: "gws_drive_read",
              service: "drive",
              action: typeof params.action === "string" ? params.action : "unknown",
              configResolution,
              ctx: createContext(),
              audit,
            }),
          );
        }
        const envelope = await executeDriveRead({
          ctx: createContext(),
          deps: {
            ...baseDeps,
            resolveRuntimeEnv: ensureRuntimeEnv,
          },
          rawParams: params,
        });
        return toToolResult(envelope);
      },
    });

    api.registerTool({
      name: "gws_gmail_read",
      label: "GWS Gmail Read",
      description: "Read-only Gmail operations (list_messages, get_message_metadata).",
      parameters: Type.Object(
        {
          action: Type.String({ enum: ["list_messages", "get_message_metadata"] }),
          query: Type.Optional(Type.String()),
          maxResults: Type.Optional(Type.Number()),
          messageId: Type.Optional(Type.String()),
        },
        { additionalProperties: false },
      ),
      async execute(_id: string, params: Record<string, unknown>) {
        if (!resolvedConfig.ok) {
          return toToolResult(
            buildConfigResolutionDeniedEnvelope({
              tool: "gws_gmail_read",
              service: "gmail",
              action: typeof params.action === "string" ? params.action : "unknown",
              configResolution,
              ctx: createContext(),
              audit,
            }),
          );
        }
        const envelope = await executeGmailRead({
          ctx: createContext(),
          deps: {
            ...baseDeps,
            resolveRuntimeEnv: ensureRuntimeEnv,
          },
          rawParams: params,
        });
        return toToolResult(envelope);
      },
    });

    api.registerTool({
      name: "gws_calendar_read",
      label: "GWS Calendar Read",
      description: "Read-only Calendar operations (list_events, get_event).",
      parameters: Type.Object(
        {
          action: Type.String({ enum: ["list_events", "get_event"] }),
          calendarId: Type.Optional(Type.String()),
          eventId: Type.Optional(Type.String()),
          pageSize: Type.Optional(Type.Number()),
          timeMin: Type.Optional(Type.String()),
          timeMax: Type.Optional(Type.String()),
        },
        { additionalProperties: false },
      ),
      async execute(_id: string, params: Record<string, unknown>) {
        if (!resolvedConfig.ok) {
          return toToolResult(
            buildConfigResolutionDeniedEnvelope({
              tool: "gws_calendar_read",
              service: "calendar",
              action: typeof params.action === "string" ? params.action : "unknown",
              configResolution,
              ctx: createContext(),
              audit,
            }),
          );
        }
        const envelope = await executeCalendarRead({
          ctx: createContext(),
          deps: {
            ...baseDeps,
            resolveRuntimeEnv: ensureRuntimeEnv,
          },
          rawParams: params,
        });
        return toToolResult(envelope);
      },
    });

    api.registerCli(
      ({ program }) => {
        const gws = program.command("gws").description("GWS Toolkit Phase 1 diagnostics");
        gws
          .command("doctor")
          .description("Run toolkit health checks")
          .action(async () => {
            const payload = await executeStatus({
              ctx: createContext(),
              audit,
              configResolution,
              resolveRuntimeEnv: resolvedConfig.ok ? ensureRuntimeEnv : undefined,
            });
            console.log(JSON.stringify(payload, null, 2));
          });

        gws
          .command("auth-status")
          .description("Report auth-source posture for gws toolkit")
          .action(async () => {
            const payload = await executeStatus({
              ctx: createContext(),
              audit,
              configResolution,
              rawParams: { includeVersion: false, includeAuthStatus: true },
              resolveRuntimeEnv: resolvedConfig.ok ? ensureRuntimeEnv : undefined,
            });
            console.log(JSON.stringify(payload, null, 2));
          });
      },
      { commands: ["gws"] },
    );
  },
};

export default plugin;
