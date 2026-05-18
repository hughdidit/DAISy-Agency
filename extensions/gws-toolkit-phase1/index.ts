import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@sinclair/typebox";
import { resolveAgentConfig } from "../../src/agents/agent-scope.js";
import type { AnyAgentTool } from "../../src/agents/tools/common.js";
import type { OpenClawConfig } from "../../src/config/config.js";
import type { OpenClawPluginApi, OpenClawPluginToolContext } from "../../src/plugins/types.js";
import { createAuditLogger } from "./src/audit.js";
import { executeCalendarRead } from "./src/commands/calendar-read.js";
import { executeCalendarWrite } from "./src/commands/calendar-write.js";
import { executeDocsRead } from "./src/commands/docs-read.js";
import { executeDocsWrite } from "./src/commands/docs-write.js";
import { executeDriveRead } from "./src/commands/drive-read.js";
import { executeDriveWrite } from "./src/commands/drive-write.js";
import { executeGmailRead } from "./src/commands/gmail-read.js";
import { executeGmailWrite } from "./src/commands/gmail-write.js";
import { createRuntimeDeps } from "./src/commands/helpers.js";
import { executeSheetsRead } from "./src/commands/sheets-read.js";
import { executeSheetsWrite } from "./src/commands/sheets-write.js";
import {
  buildConfigResolutionDeniedEnvelope,
  executeAuthHealth,
  executeAuthPosture,
  executeStatus,
} from "./src/commands/status.js";
import { resolveConfig } from "./src/config.js";
import { PluginError } from "./src/errors.js";
import { GMAIL_TRIAGE_TOOL_DESCRIPTION } from "./src/gmail-triage-skill.js";
import { createRedactingLogger } from "./src/logger.js";
import type {
  ConfigPosture,
  GwsToolkitConfig,
  InvocationContext,
  StructuredEnvelope,
  ToolName,
} from "./src/types.js";

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

function withLabel<T extends { name: string }>(tool: T): T & { label: string } {
  return {
    ...tool,
    label: tool.name,
  };
}

function defaultConfig(): GwsToolkitConfig {
  return {
    enabledServices: ["drive", "gmail", "calendar"],
    enabledWriteServices: [],
    approvedCredentialDirs: [],
    tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
    timeoutMs: 15000,
    maxStdoutBytes: 1048576,
    maxStderrBytes: 262144,
    safeMode: true,
    allowedCredentialModes: ["credentials_file", "token"],
    allowWriteOperations: false,
    allowUnboundAgents: false,
    defaultCredentialRoute: null,
    credentialRoutes: {},
    agentCredentialBindings: {},
    workspaceIdentityDomains: [],
    defaultScopesProfile: "minimal",
    requireHumanApprovalFor: [],
    warnings: [],
  };
}

function resolveGoogleWorkspaceEmail(
  config: OpenClawConfig | undefined,
  agentId: string | undefined,
) {
  if (!config || !agentId) {
    return undefined;
  }
  return resolveAgentConfig(config, agentId)?.googleWorkspace?.email?.trim().toLowerCase();
}

function createContext(
  overrides: Partial<InvocationContext> = {},
  config?: OpenClawConfig,
): InvocationContext {
  const agentId = overrides.agentId ?? "cli";
  return {
    agentId,
    sessionId: "cli",
    sessionKey: "agent:cli:main",
    googleWorkspaceEmail: resolveGoogleWorkspaceEmail(config, agentId),
    ...overrides,
  };
}

function createToolContext(ctx: OpenClawPluginToolContext): InvocationContext {
  return {
    agentId: ctx.agentId,
    sessionId: ctx.sessionId,
    sessionKey: ctx.sessionKey,
    messageChannel: ctx.messageChannel,
    workspaceDir: ctx.workspaceDir,
    googleWorkspaceEmail: resolveGoogleWorkspaceEmail(ctx.config, ctx.agentId),
  };
}

type ConfigResolution =
  | { ok: true; config: GwsToolkitConfig; posture: ConfigPosture }
  | { ok: false; posture: ConfigPosture; message: string; fallbackConfig: GwsToolkitConfig };

type CliDiagnosticContextResult =
  | { ok: true; ctx: InvocationContext }
  | { ok: false; subject: string };

function normalizeDiagnosticAgentId(value: string | undefined): string {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || "main";
}

function createCliDiagnosticContext(
  configResolution: ConfigResolution,
  openClawConfig?: OpenClawConfig,
): InvocationContext {
  const makeAgentContext = (agentId: string): InvocationContext =>
    createContext(
      {
        agentId,
        sessionId: "cli-diagnostics",
        sessionKey: `agent:${agentId}:main`,
      },
      openClawConfig,
    );

  const makeSubagentContext = (agentId: string): InvocationContext =>
    createContext(
      {
        agentId,
        sessionId: "cli-diagnostics",
        sessionKey: `subagent:${agentId}`,
      },
      openClawConfig,
    );

  if (!configResolution.ok) {
    return makeAgentContext("main");
  }

  const subjects = Object.keys(configResolution.config.agentCredentialBindings);
  if (subjects.includes("agent:main")) {
    return makeAgentContext("main");
  }

  const firstAgentSubject = subjects.find((subject) => subject.startsWith("agent:"));
  if (firstAgentSubject) {
    return makeAgentContext(normalizeDiagnosticAgentId(firstAgentSubject.slice("agent:".length)));
  }

  const firstSubagentSubject = subjects.find((subject) => subject.startsWith("subagent:"));
  if (firstSubagentSubject) {
    return makeSubagentContext(
      normalizeDiagnosticAgentId(firstSubagentSubject.slice("subagent:".length)),
    );
  }

  return makeAgentContext("main");
}

function createCliDiagnosticContextForSubject(
  configResolution: ConfigResolution,
  subjectRaw: string | undefined,
  openClawConfig?: OpenClawConfig,
): CliDiagnosticContextResult {
  const subject = subjectRaw?.trim();
  if (!subject) {
    return {
      ok: true,
      ctx: createCliDiagnosticContext(configResolution, openClawConfig),
    };
  }

  const match = /^(agent|subagent):([A-Za-z0-9._-]+)$/.exec(subject);
  if (!match) {
    return {
      ok: false,
      subject,
    };
  }
  const kind = match[1];
  const agentId = normalizeDiagnosticAgentId(match[2]);
  if (kind === "agent") {
    return {
      ok: true,
      ctx: createContext(
        {
          agentId,
          sessionId: "cli-diagnostics",
          sessionKey: `agent:${agentId}:main`,
          bindingSubject: `agent:${agentId}`,
        },
        openClawConfig,
      ),
    };
  }
  return {
    ok: true,
    ctx: createContext(
      {
        agentId,
        sessionId: "cli-diagnostics",
        sessionKey: `subagent:${agentId}`,
        bindingSubject: `subagent:${agentId}`,
      },
      openClawConfig,
    ),
  };
}

function emitInvalidSubjectError(action: string, subject: string) {
  const payload: StructuredEnvelope = {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid --subject value. Use agent:<id> or subagent:<id>.",
      details: {
        subject,
      },
    },
    meta: {
      tool: "gws_status",
      action,
      service: "status",
      latencyMs: 0,
    },
  };
  console.log(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
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

function createTools(params: {
  toolCtx: OpenClawPluginToolContext;
  configResolution: ConfigResolution;
  baseDeps: ReturnType<typeof createRuntimeDeps>;
  audit: ReturnType<typeof createAuditLogger>;
  ensureRuntimeEnv: () => Promise<GwsRuntimeEnv | undefined>;
}) {
  const ctx = createToolContext(params.toolCtx);
  const configResolution = params.configResolution;

  const statusTool: AnyAgentTool = withLabel({
    name: "gws_status",
    description:
      "Check gws binary/version/auth-source/config posture, route diagnostics, scope posture, and write readiness.",
    parameters: Type.Object(
      {
        includeVersion: Type.Optional(Type.Boolean()),
        includeAuthStatus: Type.Optional(Type.Boolean()),
      },
      { additionalProperties: false },
    ),
    async execute(_id: string, rawParams: Record<string, unknown>) {
      return toToolResult(
        await executeStatus({
          ctx,
          audit: params.audit,
          configResolution,
          rawParams,
          resolveRuntimeEnv: configResolution.ok ? params.ensureRuntimeEnv : undefined,
        }),
      );
    },
  });

  const deps = {
    ...params.baseDeps,
    resolveRuntimeEnv: params.ensureRuntimeEnv,
  };

  const guarded = (
    tool: AnyAgentTool & { name: ToolName },
    service: "drive" | "gmail" | "calendar" | "docs" | "sheets",
  ): AnyAgentTool => ({
    ...tool,
    async execute(id: string, rawParams: Record<string, unknown>) {
      if (!configResolution.ok) {
        return toToolResult(
          buildConfigResolutionDeniedEnvelope({
            tool: tool.name,
            service,
            action: typeof rawParams.action === "string" ? rawParams.action : "unknown",
            configResolution,
            ctx,
            audit: params.audit,
          }),
        );
      }
      return tool.execute(id, rawParams);
    },
  });

  const tools: AnyAgentTool[] = [
    statusTool,
    guarded(
      withLabel({
        name: "gws_drive_read",
        description: "Read-only Google Drive operations.",
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
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeDriveRead({ ctx, deps, rawParams }));
        },
      }),
      "drive",
    ),
    guarded(
      withLabel({
        name: "gws_gmail_read",
        description: `Read-only Gmail operations. ${GMAIL_TRIAGE_TOOL_DESCRIPTION}`,
        parameters: Type.Object(
          {
            action: Type.String({ enum: ["list_messages", "get_message_metadata"] }),
            query: Type.Optional(Type.String()),
            fromEmail: Type.Optional(
              Type.String({ pattern: "^[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+$" }),
            ),
            fromDomain: Type.Optional(
              Type.String({ pattern: "^@?[A-Za-z0-9][A-Za-z0-9.-]*\\.[A-Za-z]{2,}$" }),
            ),
            unread: Type.Optional(Type.Boolean()),
            inbox: Type.Optional(Type.Boolean()),
            maxResults: Type.Optional(Type.Number()),
            messageId: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeGmailRead({ ctx, deps, rawParams }));
        },
      }),
      "gmail",
    ),
    guarded(
      withLabel({
        name: "gws_calendar_read",
        description: "Read-only Calendar operations.",
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
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeCalendarRead({ ctx, deps, rawParams }));
        },
      }),
      "calendar",
    ),
    guarded(
      withLabel({
        name: "gws_docs_read",
        description: "Read-only Google Docs operations.",
        parameters: Type.Object(
          {
            action: Type.String({ enum: ["get_document"] }),
            documentId: Type.String(),
          },
          { additionalProperties: false },
        ),
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeDocsRead({ ctx, deps, rawParams }));
        },
      }),
      "docs",
    ),
    guarded(
      withLabel({
        name: "gws_sheets_read",
        description: "Read-only Google Sheets operations.",
        parameters: Type.Object(
          {
            action: Type.String({ enum: ["get_spreadsheet", "get_values"] }),
            spreadsheetId: Type.String(),
            range: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeSheetsRead({ ctx, deps, rawParams }));
        },
      }),
      "sheets",
    ),
    guarded(
      withLabel({
        name: "gws_drive_write",
        description: "Write-capable Google Drive operations.",
        parameters: Type.Object(
          {
            action: Type.String({ enum: ["create_folder", "upload_file", "update_file_metadata"] }),
            confirm: Type.Boolean(),
            name: Type.Optional(Type.String()),
            parentId: Type.Optional(Type.String()),
            filePath: Type.Optional(Type.String()),
            fileId: Type.Optional(Type.String()),
            mimeType: Type.Optional(Type.String()),
            description: Type.Optional(Type.String()),
            addParents: Type.Optional(Type.Array(Type.String())),
            removeParents: Type.Optional(Type.Array(Type.String())),
          },
          { additionalProperties: false },
        ),
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeDriveWrite({ ctx, deps, rawParams }));
        },
      }),
      "drive",
    ),
    guarded(
      withLabel({
        name: "gws_gmail_write",
        description: `Write-capable Gmail operations. Follow gmail-triage policy before drafting or sending Gmail replies.`,
        parameters: Type.Object(
          {
            action: Type.String({ enum: ["draft_message", "send_message"] }),
            confirm: Type.Boolean(),
            to: Type.Union([Type.String(), Type.Array(Type.String())]),
            cc: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
            bcc: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
            replyTo: Type.Optional(Type.String()),
            subject: Type.Optional(Type.String()),
            bodyText: Type.Optional(Type.String()),
            bodyHtml: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeGmailWrite({ ctx, deps, rawParams }));
        },
      }),
      "gmail",
    ),
    guarded(
      withLabel({
        name: "gws_calendar_write",
        description: "Write-capable Calendar operations.",
        parameters: Type.Object(
          {
            action: Type.String({ enum: ["create_event", "update_event"] }),
            confirm: Type.Boolean(),
            calendarId: Type.Optional(Type.String()),
            eventId: Type.Optional(Type.String()),
            summary: Type.Optional(Type.String()),
            description: Type.Optional(Type.String()),
            location: Type.Optional(Type.String()),
            start: Type.Optional(Type.String()),
            end: Type.Optional(Type.String()),
            attendees: Type.Optional(Type.Array(Type.String())),
          },
          { additionalProperties: false },
        ),
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeCalendarWrite({ ctx, deps, rawParams }));
        },
      }),
      "calendar",
    ),
    guarded(
      withLabel({
        name: "gws_docs_write",
        description: "Write-capable Google Docs operations.",
        parameters: Type.Object(
          {
            action: Type.String({
              enum: ["create_document", "append_text", "batch_update_document"],
            }),
            confirm: Type.Boolean(),
            title: Type.Optional(Type.String()),
            documentId: Type.Optional(Type.String()),
            text: Type.Optional(Type.String()),
            requests: Type.Optional(Type.Array(Type.Object({}, { additionalProperties: true }))),
          },
          { additionalProperties: false },
        ),
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeDocsWrite({ ctx, deps, rawParams }));
        },
      }),
      "docs",
    ),
    guarded(
      withLabel({
        name: "gws_sheets_write",
        description: "Write-capable Google Sheets operations.",
        parameters: Type.Object(
          {
            action: Type.String({
              enum: ["append_values", "update_values", "create_spreadsheet"],
            }),
            confirm: Type.Boolean(),
            spreadsheetId: Type.Optional(Type.String()),
            range: Type.Optional(Type.String()),
            values: Type.Optional(Type.Array(Type.Array(Type.Any()))),
            title: Type.Optional(Type.String()),
            valueInputOption: Type.Optional(Type.String({ enum: ["RAW", "USER_ENTERED"] })),
          },
          { additionalProperties: false },
        ),
        async execute(_id: string, rawParams: Record<string, unknown>) {
          return toToolResult(await executeSheetsWrite({ ctx, deps, rawParams }));
        },
      }),
      "sheets",
    ),
  ];

  return tools;
}

const plugin = {
  id: "gws-toolkit-phase1",
  name: "GWS Toolkit",
  description: "Security-hardened Google Workspace integration via delegated Google API transport.",
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

    api.registerTool(
      (toolCtx) =>
        createTools({
          toolCtx,
          configResolution,
          baseDeps,
          audit,
          ensureRuntimeEnv,
        }),
      {
        names: [
          "gws_status",
          "gws_drive_read",
          "gws_gmail_read",
          "gws_calendar_read",
          "gws_docs_read",
          "gws_sheets_read",
          "gws_drive_write",
          "gws_gmail_write",
          "gws_calendar_write",
          "gws_docs_write",
          "gws_sheets_write",
        ],
      },
    );

    api.registerCli(
      ({ program }) => {
        const gws = program.command("gws").description("GWS Toolkit diagnostics");

        gws
          .command("doctor")
          .description(
            "Run toolkit posture checks; use --auth-health for real route-bound auth health",
          )
          .option(
            "--subject <bindingSubject>",
            "Resolve diagnostics for a specific binding subject (agent:<id> or subagent:<id>)",
          )
          .option("--auth-health", "Run real gws auth status under the resolved route environment")
          .action(async (opts?: { authHealth?: boolean; subject?: string }) => {
            const diagnosticsCtxResult = createCliDiagnosticContextForSubject(
              configResolution,
              opts?.subject,
              api.config,
            );
            if (!diagnosticsCtxResult.ok) {
              emitInvalidSubjectError("doctor", diagnosticsCtxResult.subject);
              return;
            }
            const diagnosticsCtx = diagnosticsCtxResult.ctx;
            const posturePayload = await executeStatus({
              ctx: diagnosticsCtx,
              audit,
              configResolution,
              resolveRuntimeEnv: configResolution.ok ? ensureRuntimeEnv : undefined,
            });
            if (!opts?.authHealth) {
              console.log(JSON.stringify(posturePayload, null, 2));
              if (!posturePayload.ok) {
                process.exitCode = 1;
              }
              return;
            }
            const healthPayload = await executeAuthHealth({
              ctx: diagnosticsCtx,
              audit,
              configResolution,
              resolveRuntimeEnv: configResolution.ok ? ensureRuntimeEnv : undefined,
            });
            console.log(
              JSON.stringify(
                {
                  posture: posturePayload,
                  health: healthPayload,
                },
                null,
                2,
              ),
            );
            if (!posturePayload.ok || !healthPayload.ok) {
              process.exitCode = 1;
            }
          });

        gws
          .command("auth-posture")
          .description("Report route-bound auth posture without executing gws auth status")
          .option(
            "--subject <bindingSubject>",
            "Resolve diagnostics for a specific binding subject (agent:<id> or subagent:<id>)",
          )
          .action(async (opts?: { subject?: string }) => {
            const diagnosticsCtxResult = createCliDiagnosticContextForSubject(
              configResolution,
              opts?.subject,
              api.config,
            );
            if (!diagnosticsCtxResult.ok) {
              emitInvalidSubjectError("auth-posture", diagnosticsCtxResult.subject);
              return;
            }
            const payload = await executeAuthPosture({
              ctx: diagnosticsCtxResult.ctx,
              audit,
              configResolution,
              resolveRuntimeEnv: configResolution.ok ? ensureRuntimeEnv : undefined,
            });
            console.log(JSON.stringify(payload, null, 2));
            if (!payload.ok) {
              process.exitCode = 1;
            }
          });

        gws
          .command("auth-health")
          .description("Report real gws auth status health under resolved route credentials")
          .option(
            "--subject <bindingSubject>",
            "Resolve diagnostics for a specific binding subject (agent:<id> or subagent:<id>)",
          )
          .action(async (opts?: { subject?: string }) => {
            const diagnosticsCtxResult = createCliDiagnosticContextForSubject(
              configResolution,
              opts?.subject,
              api.config,
            );
            if (!diagnosticsCtxResult.ok) {
              emitInvalidSubjectError("auth-health", diagnosticsCtxResult.subject);
              return;
            }
            const payload = await executeAuthHealth({
              ctx: diagnosticsCtxResult.ctx,
              audit,
              configResolution,
              resolveRuntimeEnv: configResolution.ok ? ensureRuntimeEnv : undefined,
            });
            console.log(JSON.stringify(payload, null, 2));
            if (!payload.ok) {
              process.exitCode = 1;
            }
          });

        gws
          .command("auth-status")
          .description("Deprecated alias for auth-health")
          .option(
            "--subject <bindingSubject>",
            "Resolve diagnostics for a specific binding subject (agent:<id> or subagent:<id>)",
          )
          .action(async (opts?: { subject?: string }) => {
            const diagnosticsCtxResult = createCliDiagnosticContextForSubject(
              configResolution,
              opts?.subject,
              api.config,
            );
            if (!diagnosticsCtxResult.ok) {
              emitInvalidSubjectError("auth-status", diagnosticsCtxResult.subject);
              return;
            }
            const payload = await executeAuthHealth({
              ctx: diagnosticsCtxResult.ctx,
              audit,
              configResolution,
              resolveRuntimeEnv: configResolution.ok ? ensureRuntimeEnv : undefined,
              deprecatedAliasUsed: true,
            });
            console.log(JSON.stringify(payload, null, 2));
            if (!payload.ok) {
              process.exitCode = 1;
            }
          });

        gws
          .command("routes")
          .description("Report credential-route bindings and posture")
          .option(
            "--subject <bindingSubject>",
            "Resolve diagnostics for a specific binding subject (agent:<id> or subagent:<id>)",
          )
          .action(async (opts?: { subject?: string }) => {
            const diagnosticsCtxResult = createCliDiagnosticContextForSubject(
              configResolution,
              opts?.subject,
              api.config,
            );
            if (!diagnosticsCtxResult.ok) {
              emitInvalidSubjectError("routes", diagnosticsCtxResult.subject);
              return;
            }
            const payload = await executeAuthPosture({
              ctx: diagnosticsCtxResult.ctx,
              audit,
              configResolution,
              resolveRuntimeEnv: configResolution.ok ? ensureRuntimeEnv : undefined,
            });
            console.log(JSON.stringify(payload, null, 2));
            if (!payload.ok) {
              process.exitCode = 1;
            }
          });

        gws
          .command("write-readiness")
          .description("Report per-service write readiness without executing a write")
          .option(
            "--subject <bindingSubject>",
            "Resolve diagnostics for a specific binding subject (agent:<id> or subagent:<id>)",
          )
          .action(async (opts?: { subject?: string }) => {
            const diagnosticsCtxResult = createCliDiagnosticContextForSubject(
              configResolution,
              opts?.subject,
              api.config,
            );
            if (!diagnosticsCtxResult.ok) {
              emitInvalidSubjectError("write-readiness", diagnosticsCtxResult.subject);
              return;
            }
            const payload = await executeStatus({
              ctx: diagnosticsCtxResult.ctx,
              audit,
              configResolution,
              rawParams: { includeVersion: false, includeAuthStatus: false },
              resolveRuntimeEnv: configResolution.ok ? ensureRuntimeEnv : undefined,
            });
            console.log(JSON.stringify(payload, null, 2));
            if (!payload.ok) {
              process.exitCode = 1;
            }
          });
      },
      { commands: ["gws"] },
    );
  },
};

export default plugin;
