import { Type } from "@sinclair/typebox";
import { createAuditLogger } from "./src/audit.js";
import { executeCalendarRead } from "./src/commands/calendar-read.js";
import { executeDriveRead } from "./src/commands/drive-read.js";
import { executeGmailRead } from "./src/commands/gmail-read.js";
import { createRuntimeDeps } from "./src/commands/helpers.js";
import { buildConfigResolutionDeniedEnvelope, executeStatus } from "./src/commands/status.js";
import { resolveConfig } from "./src/config.js";
import { createRedactingLogger } from "./src/logger.js";
import type { GwsToolkitConfig, InvocationContext, StructuredEnvelope } from "./src/types.js";

type PluginApi = {
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug?: (message: string) => void;
  };
  config: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;
  registerTool: (tool: Record<string, unknown>) => void;
  registerCli: (
    registrar: (ctx: {
      program: any;
      config: Record<string, unknown>;
      logger: PluginApi["logger"];
    }) => void,
    opts?: { commands?: string[] },
  ) => void;
};

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

const plugin = {
  id: "gws-toolkit-phase1",
  name: "GWS Toolkit (Phase 1)",
  description: "Security-hardened read-only Google Workspace integration via gws CLI.",
  register(api: PluginApi) {
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
    const deps = createRuntimeDeps(runtimeConfig, audit);

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
          deps,
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
          deps,
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
          deps,
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
            });
            console.log(JSON.stringify(payload, null, 2));
          });
      },
      { commands: ["gws"] },
    );
  },
};

export default plugin;
