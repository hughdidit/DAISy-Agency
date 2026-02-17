<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import crypto from "node:crypto";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";

=======
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { BashSandboxConfig } from "./bash-tools.shared.js";
>>>>>>> b47fa9e71 (refactor(exec): extract bash tool runtime internals)
=======
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { BashSandboxConfig } from "./bash-tools.shared.js";
>>>>>>> 607011638 (revert(exec): undo accidental merge of PR #18521)
=======
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
>>>>>>> 6b8c0bc69 (chore: Format files.)
=======
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { BashSandboxConfig } from "./bash-tools.shared.js";
>>>>>>> ed11e93cf (chore(format))
=======
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
>>>>>>> d0cb8c19b (chore: wtf.)
import {
  type ExecAsk,
  type ExecHost,
  type ExecSecurity,
  type ExecApprovalsFile,
  addAllowlistEntry,
  evaluateShellAllowlist,
  maxAsk,
  minSecurity,
  requiresExecApproval,
  resolveSafeBins,
  recordAllowlistUse,
  resolveExecApprovals,
  resolveExecApprovalsFromFile,
} from "../infra/exec-approvals.js";
import { buildNodeShellCommand } from "../infra/node-shell.js";
import {
  getShellPathFromLoginShell,
  resolveShellEnvFallbackTimeoutMs,
} from "../infra/shell-env.js";
<<<<<<< HEAD
import { enqueueSystemEvent } from "../infra/system-events.js";
import { logInfo, logWarn } from "../logger.js";
import { formatSpawnError, spawnWithFallback } from "../process/spawn-utils.js";
import {
  type ProcessSession,
  type SessionStdin,
  addSession,
  appendOutput,
  createSessionSlug,
  markBackgrounded,
  markExited,
  tail,
} from "./bash-process-registry.js";
import type { BashSandboxConfig } from "./bash-tools.shared.js";
=======
import { logInfo } from "../logger.js";
import { parseAgentSessionKey, resolveAgentIdFromSessionKey } from "../routing/session-key.js";
import { markBackgrounded, tail } from "./bash-process-registry.js";
import {
  DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS,
  DEFAULT_APPROVAL_TIMEOUT_MS,
  DEFAULT_MAX_OUTPUT,
  DEFAULT_NOTIFY_TAIL_CHARS,
  DEFAULT_PATH,
  DEFAULT_PENDING_MAX_OUTPUT,
  applyPathPrepend,
  applyShellPath,
  createApprovalSlug,
  emitExecSystemEvent,
  normalizeExecAsk,
  normalizeExecHost,
  normalizeExecSecurity,
  normalizeNotifyOutput,
  normalizePathPrepend,
  renderExecHostLabel,
  resolveApprovalRunningNoticeMs,
  runExecProcess,
  execSchema,
  type ExecProcessHandle,
  validateHostEnv,
} from "./bash-tools.exec-runtime.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b47fa9e71 (refactor(exec): extract bash tool runtime internals)
=======
import type { BashSandboxConfig } from "./bash-tools.shared.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> 607011638 (revert(exec): undo accidental merge of PR #18521)
=======
import type { BashSandboxConfig } from "./bash-tools.shared.js";
>>>>>>> 6b8c0bc69 (chore: Format files.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { BashSandboxConfig } from "./bash-tools.shared.js";
>>>>>>> d0cb8c19b (chore: wtf.)
import {
  buildSandboxEnv,
  clampWithDefault,
  coerceEnv,
  readEnvInt,
  resolveSandboxWorkdir,
  resolveWorkdir,
  truncateMiddle,
} from "./bash-tools.shared.js";
import { callGatewayTool } from "./tools/gateway.js";
import { listNodes, resolveNodeIdFromList } from "./tools/nodes-utils.js";
import { getShellConfig, sanitizeBinaryOutput } from "./shell-utils.js";
import { buildCursorPositionResponse, stripDsrRequests } from "./pty-dsr.js";
import { parseAgentSessionKey, resolveAgentIdFromSessionKey } from "../routing/session-key.js";

<<<<<<< HEAD
<<<<<<< HEAD
const DEFAULT_MAX_OUTPUT = clampNumber(
=======
// Security: Blocklist of environment variables that could alter execution flow
// or inject code when running on non-sandboxed hosts (Gateway/Node).
const DANGEROUS_HOST_ENV_VARS = new Set([
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "LD_AUDIT",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "NODE_OPTIONS",
  "NODE_PATH",
  "PYTHONPATH",
  "PYTHONHOME",
  "RUBYLIB",
  "PERL5LIB",
  "BASH_ENV",
  "ENV",
  "GCONV_PATH",
  "IFS",
  "SSLKEYLOGFILE",
]);
const DANGEROUS_HOST_ENV_PREFIXES = ["DYLD_", "LD_"];

// Centralized sanitization helper.
// Throws an error if dangerous variables or PATH modifications are detected on the host.
function validateHostEnv(env: Record<string, string>): void {
  for (const key of Object.keys(env)) {
    const upperKey = key.toUpperCase();

    // 1. Block known dangerous variables (Fail Closed)
    if (DANGEROUS_HOST_ENV_PREFIXES.some((prefix) => upperKey.startsWith(prefix))) {
      throw new Error(
        `Security Violation: Environment variable '${key}' is forbidden during host execution.`,
      );
    }
    if (DANGEROUS_HOST_ENV_VARS.has(upperKey)) {
      throw new Error(
        `Security Violation: Environment variable '${key}' is forbidden during host execution.`,
      );
    }

    // 2. Strictly block PATH modification on host
    // Allowing custom PATH on the gateway/node can lead to binary hijacking.
    if (upperKey === "PATH") {
      throw new Error(
        "Security Violation: Custom 'PATH' variable is forbidden during host execution.",
      );
    }
  }
}
const DEFAULT_MAX_OUTPUT = clampWithDefault(
>>>>>>> ec910a235 (refactor: consolidate duplicate utility functions (#12439))
  readEnvInt("PI_BASH_MAX_OUTPUT_CHARS"),
  200_000,
  1_000,
  200_000,
);
<<<<<<< HEAD
const DEFAULT_PENDING_MAX_OUTPUT = clampNumber(
  readEnvInt("CLAWDBOT_BASH_PENDING_MAX_OUTPUT_CHARS"),
=======
const DEFAULT_PENDING_MAX_OUTPUT = clampWithDefault(
  readEnvInt("OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS"),
>>>>>>> ec910a235 (refactor: consolidate duplicate utility functions (#12439))
  200_000,
  1_000,
  200_000,
);
const DEFAULT_PATH =
  process.env.PATH ?? "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
const DEFAULT_NOTIFY_TAIL_CHARS = 400;
const DEFAULT_APPROVAL_TIMEOUT_MS = 120_000;
const DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS = 130_000;
const DEFAULT_APPROVAL_RUNNING_NOTICE_MS = 10_000;
const APPROVAL_SLUG_LENGTH = 8;

type PtyExitEvent = { exitCode: number; signal?: number };
type PtyListener<T> = (event: T) => void;
type PtyHandle = {
  pid: number;
  write: (data: string | Buffer) => void;
  onData: (listener: PtyListener<string>) => void;
  onExit: (listener: PtyListener<PtyExitEvent>) => void;
};
type PtySpawn = (
  file: string,
  args: string[] | string,
  options: {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: Record<string, string>;
  },
) => PtyHandle;
type PtyModule = {
  spawn?: PtySpawn;
  default?: { spawn?: PtySpawn };
};
type PtyModuleLoader = () => Promise<PtyModule>;

const loadPtyModuleDefault: PtyModuleLoader = async () =>
  (await import("@lydell/node-pty")) as unknown as PtyModule;
let loadPtyModule: PtyModuleLoader = loadPtyModuleDefault;

export function setPtyModuleLoaderForTests(loader?: PtyModuleLoader): void {
  loadPtyModule = loader ?? loadPtyModuleDefault;
}

type ExecProcessOutcome = {
  status: "completed" | "failed";
  exitCode: number | null;
  exitSignal: NodeJS.Signals | number | null;
  durationMs: number;
  aggregated: string;
  timedOut: boolean;
  reason?: string;
};

type ExecProcessHandle = {
  session: ProcessSession;
  startedAt: number;
  pid?: number;
  promise: Promise<ExecProcessOutcome>;
  kill: () => void;
};

=======
>>>>>>> b47fa9e71 (refactor(exec): extract bash tool runtime internals)
export type ExecToolDefaults = {
  host?: ExecHost;
  security?: ExecSecurity;
  ask?: ExecAsk;
  node?: string;
  pathPrepend?: string[];
  safeBins?: string[];
  agentId?: string;
  backgroundMs?: number;
  timeoutSec?: number;
  approvalRunningNoticeMs?: number;
  sandbox?: BashSandboxConfig;
  elevated?: ExecElevatedDefaults;
  allowBackground?: boolean;
  scopeKey?: string;
  sessionKey?: string;
  messageProvider?: string;
  notifyOnExit?: boolean;
  notifyOnExitEmptySuccess?: boolean;
  cwd?: string;
};

export type { BashSandboxConfig } from "./bash-tools.shared.js";

export type ExecElevatedDefaults = {
  enabled: boolean;
  allowed: boolean;
  defaultLevel: "on" | "off" | "ask" | "full";
};

export type ExecToolDetails =
  | {
      status: "running";
      sessionId: string;
      pid?: number;
      startedAt: number;
      cwd?: string;
      tail?: string;
    }
  | {
      status: "completed" | "failed";
      exitCode: number | null;
      durationMs: number;
      aggregated: string;
      cwd?: string;
    }
  | {
      status: "approval-pending";
      approvalId: string;
      approvalSlug: string;
      expiresAtMs: number;
      host: ExecHost;
      command: string;
      cwd?: string;
      nodeId?: string;
    };

function extractScriptTargetFromCommand(
  command: string,
): { kind: "python"; relOrAbsPath: string } | { kind: "node"; relOrAbsPath: string } | null {
  const raw = command.trim();
  if (!raw) {
    return null;
  }

  // Intentionally simple parsing: we only support common forms like
  //   python file.py
  //   python3 -u file.py
  //   node --experimental-something file.js
  // If the command is more complex (pipes, heredocs, quoted paths with spaces), skip preflight.
  const pythonMatch = raw.match(/^\s*(python3?|python)\s+(?:-[^\s]+\s+)*([^\s]+\.py)\b/i);
  if (pythonMatch?.[2]) {
    return { kind: "python", relOrAbsPath: pythonMatch[2] };
  }
  const nodeMatch = raw.match(/^\s*(node)\s+(?:--[^\s]+\s+)*([^\s]+\.js)\b/i);
  if (nodeMatch?.[2]) {
    return { kind: "node", relOrAbsPath: nodeMatch[2] };
  }

  return null;
}

async function validateScriptFileForShellBleed(params: {
  command: string;
  workdir: string;
}): Promise<void> {
  const target = extractScriptTargetFromCommand(params.command);
  if (!target) {
    return;
  }

  const absPath = path.isAbsolute(target.relOrAbsPath)
    ? path.resolve(target.relOrAbsPath)
    : path.resolve(params.workdir, target.relOrAbsPath);

  // Best-effort: only validate if file exists and is reasonably small.
  let stat: { isFile(): boolean; size: number };
  try {
    stat = await fs.stat(absPath);
  } catch {
    return;
  }
  if (!stat.isFile()) {
    return;
  }
  if (stat.size > 512 * 1024) {
    return;
  }

  const content = await fs.readFile(absPath, "utf-8");

  // Common failure mode: shell env var syntax leaking into Python/JS.
  // We deliberately match all-caps/underscore vars to avoid false positives with `$` as a JS identifier.
  const envVarRegex = /\$[A-Z_][A-Z0-9_]{1,}/g;
  const first = envVarRegex.exec(content);
  if (first) {
    const idx = first.index;
    const before = content.slice(0, idx);
    const line = before.split("\n").length;
    const token = first[0];
    throw new Error(
      [
        `exec preflight: detected likely shell variable injection (${token}) in ${target.kind} script: ${path.basename(
          absPath,
        )}:${line}.`,
        target.kind === "python"
          ? `In Python, use os.environ.get(${JSON.stringify(token.slice(1))}) instead of raw ${token}.`
          : `In Node.js, use process.env[${JSON.stringify(token.slice(1))}] instead of raw ${token}.`,
        "(If this is inside a string literal on purpose, escape it or restructure the code.)",
      ].join("\n"),
    );
  }

  // Another recurring pattern from the issue: shell commands accidentally emitted as JS.
  if (target.kind === "node") {
    const firstNonEmpty = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (firstNonEmpty && /^NODE\b/.test(firstNonEmpty)) {
      throw new Error(
        `exec preflight: JS file starts with shell syntax (${firstNonEmpty}). ` +
          `This looks like a shell command, not JavaScript.`,
      );
    }
  }
}

export function createExecTool(
  defaults?: ExecToolDefaults,
  // oxlint-disable-next-line typescript/no-explicit-any
): AgentTool<any, ExecToolDetails> {
  const defaultBackgroundMs = clampWithDefault(
    defaults?.backgroundMs ?? readEnvInt("PI_BASH_YIELD_MS"),
    10_000,
    10,
    120_000,
  );
  const allowBackground = defaults?.allowBackground ?? true;
  const defaultTimeoutSec =
    typeof defaults?.timeoutSec === "number" && defaults.timeoutSec > 0
      ? defaults.timeoutSec
      : 1800;
  const defaultPathPrepend = normalizePathPrepend(defaults?.pathPrepend);
  const safeBins = resolveSafeBins(defaults?.safeBins);
  const notifyOnExit = defaults?.notifyOnExit !== false;
  const notifyOnExitEmptySuccess = defaults?.notifyOnExitEmptySuccess === true;
  const notifySessionKey = defaults?.sessionKey?.trim() || undefined;
  const approvalRunningNoticeMs = resolveApprovalRunningNoticeMs(defaults?.approvalRunningNoticeMs);
  // Derive agentId only when sessionKey is an agent session key.
  const parsedAgentSession = parseAgentSessionKey(defaults?.sessionKey);
  const agentId =
    defaults?.agentId ??
    (parsedAgentSession ? resolveAgentIdFromSessionKey(defaults?.sessionKey) : undefined);

  return {
    name: "exec",
    label: "exec",
    description:
      "Execute shell commands with background continuation. Use yieldMs/background to continue later via process tool. Use pty=true for TTY-required commands (terminal UIs, coding agents).",
    parameters: execSchema,
    execute: async (_toolCallId, args, signal, onUpdate) => {
      const params = args as {
        command: string;
        workdir?: string;
        env?: Record<string, string>;
        yieldMs?: number;
        background?: boolean;
        timeout?: number;
        pty?: boolean;
        elevated?: boolean;
        host?: string;
        security?: string;
        ask?: string;
        node?: string;
      };

      if (!params.command) {
        throw new Error("Provide a command to start.");
      }

      const maxOutput = DEFAULT_MAX_OUTPUT;
      const pendingMaxOutput = DEFAULT_PENDING_MAX_OUTPUT;
      const warnings: string[] = [];
      const backgroundRequested = params.background === true;
      const yieldRequested = typeof params.yieldMs === "number";
      if (!allowBackground && (backgroundRequested || yieldRequested)) {
        warnings.push("Warning: background execution is disabled; running synchronously.");
      }
      const yieldWindow = allowBackground
        ? backgroundRequested
          ? 0
          : clampWithDefault(
              params.yieldMs ?? defaultBackgroundMs,
              defaultBackgroundMs,
              10,
              120_000,
            )
        : null;
      const elevatedDefaults = defaults?.elevated;
      const elevatedAllowed = Boolean(elevatedDefaults?.enabled && elevatedDefaults.allowed);
      const elevatedDefaultMode =
        elevatedDefaults?.defaultLevel === "full"
          ? "full"
          : elevatedDefaults?.defaultLevel === "ask"
            ? "ask"
            : elevatedDefaults?.defaultLevel === "on"
              ? "ask"
              : "off";
      const effectiveDefaultMode = elevatedAllowed ? elevatedDefaultMode : "off";
      const elevatedMode =
        typeof params.elevated === "boolean"
          ? params.elevated
            ? elevatedDefaultMode === "full"
              ? "full"
              : "ask"
            : "off"
          : effectiveDefaultMode;
      const elevatedRequested = elevatedMode !== "off";
      if (elevatedRequested) {
        if (!elevatedDefaults?.enabled || !elevatedDefaults.allowed) {
          const runtime = defaults?.sandbox ? "sandboxed" : "direct";
          const gates: string[] = [];
          const contextParts: string[] = [];
          const provider = defaults?.messageProvider?.trim();
          const sessionKey = defaults?.sessionKey?.trim();
          if (provider) {
            contextParts.push(`provider=${provider}`);
          }
          if (sessionKey) {
            contextParts.push(`session=${sessionKey}`);
          }
          if (!elevatedDefaults?.enabled) {
            gates.push("enabled (tools.elevated.enabled / agents.list[].tools.elevated.enabled)");
          } else {
            gates.push(
              "allowFrom (tools.elevated.allowFrom.<provider> / agents.list[].tools.elevated.allowFrom.<provider>)",
            );
          }
          throw new Error(
            [
              `elevated is not available right now (runtime=${runtime}).`,
              `Failing gates: ${gates.join(", ")}`,
              contextParts.length > 0 ? `Context: ${contextParts.join(" ")}` : undefined,
              "Fix-it keys:",
              "- tools.elevated.enabled",
              "- tools.elevated.allowFrom.<provider>",
              "- agents.list[].tools.elevated.enabled",
              "- agents.list[].tools.elevated.allowFrom.<provider>",
            ]
              .filter(Boolean)
              .join("\n"),
          );
        }
      }
      if (elevatedRequested) {
        logInfo(`exec: elevated command ${truncateMiddle(params.command, 120)}`);
      }
      const configuredHost = defaults?.host ?? "sandbox";
      const requestedHost = normalizeExecHost(params.host) ?? null;
      let host: ExecHost = requestedHost ?? configuredHost;
      if (!elevatedRequested && requestedHost && requestedHost !== configuredHost) {
        throw new Error(
          `exec host not allowed (requested ${renderExecHostLabel(requestedHost)}; ` +
            `configure tools.exec.host=${renderExecHostLabel(configuredHost)} to allow).`,
        );
      }
      if (elevatedRequested) {
        host = "gateway";
      }

      const configuredSecurity = defaults?.security ?? (host === "sandbox" ? "deny" : "allowlist");
      const requestedSecurity = normalizeExecSecurity(params.security);
      let security = minSecurity(configuredSecurity, requestedSecurity ?? configuredSecurity);
      if (elevatedRequested && elevatedMode === "full") {
        security = "full";
      }
      const configuredAsk = defaults?.ask ?? "always";
      const requestedAsk = normalizeExecAsk(params.ask);
      let ask = maxAsk(configuredAsk, requestedAsk ?? configuredAsk);
      const bypassApprovals = elevatedRequested && elevatedMode === "full";
      if (bypassApprovals) {
        ask = "off";
        warnings.push(
          "elevated mode is 'full': command will execute with unrestricted security and no approval prompt",
        );
      }

      const sandbox = host === "sandbox" ? defaults?.sandbox : undefined;
      const rawWorkdir = params.workdir?.trim() || defaults?.cwd || process.cwd();
      let workdir = rawWorkdir;
      let containerWorkdir = sandbox?.containerWorkdir;
      if (sandbox) {
        const resolved = await resolveSandboxWorkdir({
          workdir: rawWorkdir,
          sandbox,
          warnings,
        });
        workdir = resolved.hostWorkdir;
        containerWorkdir = resolved.containerWorkdir;
      } else {
        workdir = resolveWorkdir(rawWorkdir, warnings);
      }

      const baseEnv = coerceEnv(process.env);
      const mergedEnv = params.env ? { ...baseEnv, ...params.env } : baseEnv;
      const env = sandbox
        ? buildSandboxEnv({
            defaultPath: DEFAULT_PATH,
            paramsEnv: params.env,
            sandboxEnv: sandbox.env,
            containerWorkdir: containerWorkdir ?? sandbox.containerWorkdir,
          })
        : mergedEnv;
      if (!sandbox && host === "gateway" && !params.env?.PATH) {
        const shellPath = getShellPathFromLoginShell({
          env: process.env,
          timeoutMs: resolveShellEnvFallbackTimeoutMs(process.env),
        });
        applyShellPath(env, shellPath);
      }
      applyPathPrepend(env, defaultPathPrepend);

      if (host === "node") {
        const approvals = resolveExecApprovals(agentId, { security, ask });
        const hostSecurity = minSecurity(security, approvals.agent.security);
        const hostAsk = maxAsk(ask, approvals.agent.ask);
        const askFallback = approvals.agent.askFallback;
        if (hostSecurity === "deny") {
          throw new Error("exec denied: host=node security=deny");
        }
        const boundNode = defaults?.node?.trim();
        const requestedNode = params.node?.trim();
        if (boundNode && requestedNode && boundNode !== requestedNode) {
          throw new Error(`exec node not allowed (bound to ${boundNode})`);
        }
        const nodeQuery = boundNode || requestedNode;
        const nodes = await listNodes({});
        if (nodes.length === 0) {
          throw new Error(
            "exec host=node requires a paired node (none available). This requires a companion app or node host.",
          );
        }
        let nodeId: string;
        try {
          nodeId = resolveNodeIdFromList(nodes, nodeQuery, !nodeQuery);
        } catch (err) {
          if (!nodeQuery && String(err).includes("node required")) {
            throw new Error(
              "exec host=node requires a node id when multiple nodes are available (set tools.exec.node or exec.node).",
              { cause: err },
            );
          }
          throw err;
        }
        const nodeInfo = nodes.find((entry) => entry.nodeId === nodeId);
        const supportsSystemRun = Array.isArray(nodeInfo?.commands)
          ? nodeInfo?.commands?.includes("system.run")
          : false;
        if (!supportsSystemRun) {
          throw new Error(
            "exec host=node requires a node that supports system.run (companion app or node host).",
          );
        }
        const argv = buildNodeShellCommand(params.command, nodeInfo?.platform);
        const nodeEnv = params.env ? { ...params.env } : undefined;
        if (nodeEnv) {
          applyPathPrepend(nodeEnv, defaultPathPrepend, { requireExisting: true });
        }
        const baseAllowlistEval = evaluateShellAllowlist({
          command: params.command,
          allowlist: [],
          safeBins: new Set(),
          cwd: workdir,
          env,
        });
        let analysisOk = baseAllowlistEval.analysisOk;
        let allowlistSatisfied = false;
        if (hostAsk === "on-miss" && hostSecurity === "allowlist" && analysisOk) {
          try {
            const approvalsSnapshot = await callGatewayTool<{ file: string }>(
              "exec.approvals.node.get",
              { timeoutMs: 10_000 },
              { nodeId },
            );
            const approvalsFile =
              approvalsSnapshot && typeof approvalsSnapshot === "object"
                ? approvalsSnapshot.file
                : undefined;
            if (approvalsFile && typeof approvalsFile === "object") {
              const resolved = resolveExecApprovalsFromFile({
                file: approvalsFile as ExecApprovalsFile,
                agentId,
                overrides: { security: "allowlist" },
              });
              // Allowlist-only precheck; safe bins are node-local and may diverge.
              const allowlistEval = evaluateShellAllowlist({
                command: params.command,
                allowlist: resolved.allowlist,
                safeBins: new Set(),
                cwd: workdir,
                env,
              });
              allowlistSatisfied = allowlistEval.allowlistSatisfied;
              analysisOk = allowlistEval.analysisOk;
            }
          } catch {
            // Fall back to requiring approval if node approvals cannot be fetched.
          }
        }
        const requiresAsk = requiresExecApproval({
          ask: hostAsk,
          security: hostSecurity,
          analysisOk,
          allowlistSatisfied,
        });
        const commandText = params.command;
        const invokeTimeoutMs = Math.max(
          10_000,
          (typeof params.timeout === "number" ? params.timeout : defaultTimeoutSec) * 1000 + 5_000,
        );
        const buildInvokeParams = (
          approvedByAsk: boolean,
          approvalDecision: "allow-once" | "allow-always" | null,
          runId?: string,
        ) =>
          ({
            nodeId,
            command: "system.run",
            params: {
              command: argv,
              rawCommand: params.command,
              cwd: workdir,
              env: nodeEnv,
              timeoutMs: typeof params.timeout === "number" ? params.timeout * 1000 : undefined,
              agentId,
              sessionKey: defaults?.sessionKey,
              approved: approvedByAsk,
              approvalDecision: approvalDecision ?? undefined,
              runId: runId ?? undefined,
            },
            idempotencyKey: crypto.randomUUID(),
          }) satisfies Record<string, unknown>;

        if (requiresAsk) {
          const approvalId = crypto.randomUUID();
          const approvalSlug = createApprovalSlug(approvalId);
          const expiresAtMs = Date.now() + DEFAULT_APPROVAL_TIMEOUT_MS;
          const contextKey = `exec:${approvalId}`;
          const noticeSeconds = Math.max(1, Math.round(approvalRunningNoticeMs / 1000));
          const warningText = warnings.length ? `${warnings.join("\n")}\n\n` : "";

          void (async () => {
            let decision: string | null = null;
            try {
              const decisionResult = await callGatewayTool<{ decision: string }>(
                "exec.approval.request",
                { timeoutMs: DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS },
                {
                  id: approvalId,
                  command: commandText,
                  cwd: workdir,
                  host: "node",
                  security: hostSecurity,
                  ask: hostAsk,
                  agentId,
                  resolvedPath: undefined,
                  sessionKey: defaults?.sessionKey,
                  timeoutMs: DEFAULT_APPROVAL_TIMEOUT_MS,
                },
              );
              decision =
                decisionResult && typeof decisionResult === "object"
                  ? (decisionResult.decision ?? null)
                  : null;
            } catch {
              emitExecSystemEvent(
                `Exec denied (node=${nodeId} id=${approvalId}, approval-request-failed): ${commandText}`,
                { sessionKey: notifySessionKey, contextKey },
              );
              return;
            }

            let approvedByAsk = false;
            let approvalDecision: "allow-once" | "allow-always" | null = null;
            let deniedReason: string | null = null;

            if (decision === "deny") {
              deniedReason = "user-denied";
            } else if (!decision) {
              if (askFallback === "full") {
                approvedByAsk = true;
                approvalDecision = "allow-once";
              } else if (askFallback === "allowlist") {
                // Defer allowlist enforcement to the node host.
              } else {
                deniedReason = "approval-timeout";
              }
            } else if (decision === "allow-once") {
              approvedByAsk = true;
              approvalDecision = "allow-once";
            } else if (decision === "allow-always") {
              approvedByAsk = true;
              approvalDecision = "allow-always";
            }

            if (deniedReason) {
              emitExecSystemEvent(
                `Exec denied (node=${nodeId} id=${approvalId}, ${deniedReason}): ${commandText}`,
                { sessionKey: notifySessionKey, contextKey },
              );
              return;
            }

            let runningTimer: NodeJS.Timeout | null = null;
            if (approvalRunningNoticeMs > 0) {
              runningTimer = setTimeout(() => {
                emitExecSystemEvent(
                  `Exec running (node=${nodeId} id=${approvalId}, >${noticeSeconds}s): ${commandText}`,
                  { sessionKey: notifySessionKey, contextKey },
                );
              }, approvalRunningNoticeMs);
            }

            try {
              await callGatewayTool(
                "node.invoke",
                { timeoutMs: invokeTimeoutMs },
                buildInvokeParams(approvedByAsk, approvalDecision, approvalId),
              );
            } catch {
              emitExecSystemEvent(
                `Exec denied (node=${nodeId} id=${approvalId}, invoke-failed): ${commandText}`,
                { sessionKey: notifySessionKey, contextKey },
              );
            } finally {
              if (runningTimer) {
                clearTimeout(runningTimer);
              }
            }
          })();

          return {
            content: [
              {
                type: "text",
                text:
                  `${warningText}Approval required (id ${approvalSlug}). ` +
                  "Approve to run; updates will arrive after completion.",
              },
            ],
            details: {
              status: "approval-pending",
              approvalId,
              approvalSlug,
              expiresAtMs,
              host: "node",
              command: commandText,
              cwd: workdir,
              nodeId,
            },
          };
        }

        const startedAt = Date.now();
        const raw = await callGatewayTool<{
          payload: {
            exitCode: number;
            success?: string;
            stdout?: string;
            stderr?: string;
            error?: string;
          };
        }>("node.invoke", { timeoutMs: invokeTimeoutMs }, buildInvokeParams(false, null));
        const payload = raw?.payload ?? {};
        return {
          content: [
            {
              type: "text",
              text: payload.stdout || payload.stderr || payload.error || "",
            },
          ],
          details: {
            status: payload.success ? "completed" : "failed",
            exitCode: payload.exitCode ?? null,
            durationMs: Date.now() - startedAt,
            aggregated: [payload.stdout, payload.stderr, payload.error].filter(Boolean).join("\n"),
            cwd: workdir,
          } satisfies ExecToolDetails,
        };
      }

      if (host === "gateway" && !bypassApprovals) {
        const approvals = resolveExecApprovals(agentId, { security, ask });
        const hostSecurity = minSecurity(security, approvals.agent.security);
        const hostAsk = maxAsk(ask, approvals.agent.ask);
        const askFallback = approvals.agent.askFallback;
        if (hostSecurity === "deny") {
          throw new Error("exec denied: host=gateway security=deny");
        }
        const allowlistEval = evaluateShellAllowlist({
          command: params.command,
          allowlist: approvals.allowlist,
          safeBins,
          cwd: workdir,
          env,
        });
        const allowlistMatches = allowlistEval.allowlistMatches;
        const analysisOk = allowlistEval.analysisOk;
        const allowlistSatisfied =
          hostSecurity === "allowlist" && analysisOk ? allowlistEval.allowlistSatisfied : false;
        const requiresAsk = requiresExecApproval({
          ask: hostAsk,
          security: hostSecurity,
          analysisOk,
          allowlistSatisfied,
        });

        if (requiresAsk) {
          const approvalId = crypto.randomUUID();
          const approvalSlug = createApprovalSlug(approvalId);
          const expiresAtMs = Date.now() + DEFAULT_APPROVAL_TIMEOUT_MS;
          const contextKey = `exec:${approvalId}`;
          const resolvedPath = allowlistEval.segments[0]?.resolution?.resolvedPath;
          const noticeSeconds = Math.max(1, Math.round(approvalRunningNoticeMs / 1000));
          const commandText = params.command;
          const effectiveTimeout =
            typeof params.timeout === "number" ? params.timeout : defaultTimeoutSec;
          const warningText = warnings.length ? `${warnings.join("\n")}\n\n` : "";

          void (async () => {
            let decision: string | null = null;
            try {
              const decisionResult = await callGatewayTool<{ decision: string }>(
                "exec.approval.request",
                { timeoutMs: DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS },
                {
                  id: approvalId,
                  command: commandText,
                  cwd: workdir,
                  host: "gateway",
                  security: hostSecurity,
                  ask: hostAsk,
                  agentId,
                  resolvedPath,
                  sessionKey: defaults?.sessionKey,
                  timeoutMs: DEFAULT_APPROVAL_TIMEOUT_MS,
                },
              );
              decision =
                decisionResult && typeof decisionResult === "object"
                  ? (decisionResult.decision ?? null)
                  : null;
            } catch {
              emitExecSystemEvent(
                `Exec denied (gateway id=${approvalId}, approval-request-failed): ${commandText}`,
                { sessionKey: notifySessionKey, contextKey },
              );
              return;
            }

            let approvedByAsk = false;
            let deniedReason: string | null = null;

            if (decision === "deny") {
              deniedReason = "user-denied";
            } else if (!decision) {
              if (askFallback === "full") {
                approvedByAsk = true;
              } else if (askFallback === "allowlist") {
                if (!analysisOk || !allowlistSatisfied) {
                  deniedReason = "approval-timeout (allowlist-miss)";
                } else {
                  approvedByAsk = true;
                }
              } else {
                deniedReason = "approval-timeout";
              }
            } else if (decision === "allow-once") {
              approvedByAsk = true;
            } else if (decision === "allow-always") {
              approvedByAsk = true;
              if (hostSecurity === "allowlist") {
                for (const segment of allowlistEval.segments) {
                  const pattern = segment.resolution?.resolvedPath ?? "";
                  if (pattern) {
                    addAllowlistEntry(approvals.file, agentId, pattern);
                  }
                }
              }
            }

            if (
              hostSecurity === "allowlist" &&
              (!analysisOk || !allowlistSatisfied) &&
              !approvedByAsk
            ) {
              deniedReason = deniedReason ?? "allowlist-miss";
            }

            if (deniedReason) {
              emitExecSystemEvent(
                `Exec denied (gateway id=${approvalId}, ${deniedReason}): ${commandText}`,
                { sessionKey: notifySessionKey, contextKey },
              );
              return;
            }

            if (allowlistMatches.length > 0) {
              const seen = new Set<string>();
              for (const match of allowlistMatches) {
                if (seen.has(match.pattern)) {
                  continue;
                }
                seen.add(match.pattern);
                recordAllowlistUse(
                  approvals.file,
                  agentId,
                  match,
                  commandText,
                  resolvedPath ?? undefined,
                );
              }
            }

            let run: ExecProcessHandle | null = null;
            try {
              run = await runExecProcess({
                command: commandText,
                workdir,
                env,
                sandbox: undefined,
                containerWorkdir: null,
                usePty: params.pty === true && !sandbox,
                warnings,
                maxOutput,
                pendingMaxOutput,
                notifyOnExit: false,
                notifyOnExitEmptySuccess: false,
                scopeKey: defaults?.scopeKey,
                sessionKey: notifySessionKey,
                timeoutSec: effectiveTimeout,
              });
            } catch {
              emitExecSystemEvent(
                `Exec denied (gateway id=${approvalId}, spawn-failed): ${commandText}`,
                { sessionKey: notifySessionKey, contextKey },
              );
              return;
            }

            markBackgrounded(run.session);

            let runningTimer: NodeJS.Timeout | null = null;
            if (approvalRunningNoticeMs > 0) {
              runningTimer = setTimeout(() => {
                emitExecSystemEvent(
                  `Exec running (gateway id=${approvalId}, session=${run?.session.id}, >${noticeSeconds}s): ${commandText}`,
                  { sessionKey: notifySessionKey, contextKey },
                );
              }, approvalRunningNoticeMs);
            }

            const outcome = await run.promise;
            if (runningTimer) {
              clearTimeout(runningTimer);
            }
            const output = normalizeNotifyOutput(
              tail(outcome.aggregated || "", DEFAULT_NOTIFY_TAIL_CHARS),
            );
            const exitLabel = outcome.timedOut ? "timeout" : `code ${outcome.exitCode ?? "?"}`;
            const summary = output
              ? `Exec finished (gateway id=${approvalId}, session=${run.session.id}, ${exitLabel})\n${output}`
              : `Exec finished (gateway id=${approvalId}, session=${run.session.id}, ${exitLabel})`;
            emitExecSystemEvent(summary, { sessionKey: notifySessionKey, contextKey });
          })();

          return {
            content: [
              {
                type: "text",
                text:
                  `${warningText}Approval required (id ${approvalSlug}). ` +
                  "Approve to run; updates will arrive after completion.",
              },
            ],
            details: {
              status: "approval-pending",
              approvalId,
              approvalSlug,
              expiresAtMs,
              host: "gateway",
              command: params.command,
              cwd: workdir,
            },
          };
        }

        if (hostSecurity === "allowlist" && (!analysisOk || !allowlistSatisfied)) {
          throw new Error("exec denied: allowlist miss");
        }

        if (allowlistMatches.length > 0) {
          const seen = new Set<string>();
          for (const match of allowlistMatches) {
            if (seen.has(match.pattern)) {
              continue;
            }
            seen.add(match.pattern);
            recordAllowlistUse(
              approvals.file,
              agentId,
              match,
              params.command,
              allowlistEval.segments[0]?.resolution?.resolvedPath,
            );
          }
        }
      }

      const effectiveTimeout =
        typeof params.timeout === "number" ? params.timeout : defaultTimeoutSec;
      const getWarningText = () => (warnings.length ? `${warnings.join("\n")}\n\n` : "");
      const usePty = params.pty === true && !sandbox;

      // Preflight: catch a common model failure mode (shell syntax leaking into Python/JS sources)
      // before we execute and burn tokens in cron loops.
      await validateScriptFileForShellBleed({ command: params.command, workdir });

      const run = await runExecProcess({
        command: params.command,
        workdir,
        env,
        sandbox,
        containerWorkdir,
        usePty,
        warnings,
        maxOutput,
        pendingMaxOutput,
        notifyOnExit,
        notifyOnExitEmptySuccess,
        scopeKey: defaults?.scopeKey,
        sessionKey: notifySessionKey,
        timeoutSec: effectiveTimeout,
        onUpdate,
      });

      let yielded = false;
      let yieldTimer: NodeJS.Timeout | null = null;

      // Tool-call abort should not kill backgrounded sessions; timeouts still must.
      const onAbortSignal = () => {
        if (yielded || run.session.backgrounded) {
          return;
        }
        run.kill();
      };

      if (signal?.aborted) {
        onAbortSignal();
      } else if (signal) {
        signal.addEventListener("abort", onAbortSignal, { once: true });
      }

      return new Promise<AgentToolResult<ExecToolDetails>>((resolve, reject) => {
        const resolveRunning = () =>
          resolve({
            content: [
              {
                type: "text",
                text: `${getWarningText()}Command still running (session ${run.session.id}, pid ${
                  run.session.pid ?? "n/a"
                }). Use process (list/poll/log/write/kill/clear/remove) for follow-up.`,
              },
            ],
            details: {
              status: "running",
              sessionId: run.session.id,
              pid: run.session.pid ?? undefined,
              startedAt: run.startedAt,
              cwd: run.session.cwd,
              tail: run.session.tail,
            },
          });

        const onYieldNow = () => {
          if (yieldTimer) {
            clearTimeout(yieldTimer);
          }
          if (yielded) {
            return;
          }
          yielded = true;
          markBackgrounded(run.session);
          resolveRunning();
        };

        if (allowBackground && yieldWindow !== null) {
          if (yieldWindow === 0) {
            onYieldNow();
          } else {
            yieldTimer = setTimeout(() => {
              if (yielded) {
                return;
              }
              yielded = true;
              markBackgrounded(run.session);
              resolveRunning();
            }, yieldWindow);
          }
        }

        run.promise
          .then((outcome) => {
            if (yieldTimer) {
              clearTimeout(yieldTimer);
            }
            if (yielded || run.session.backgrounded) {
              return;
            }
            if (outcome.status === "failed") {
              reject(new Error(outcome.reason ?? "Command failed."));
              return;
            }
            resolve({
              content: [
                {
                  type: "text",
                  text: `${getWarningText()}${outcome.aggregated || "(no output)"}`,
                },
              ],
              details: {
                status: "completed",
                exitCode: outcome.exitCode ?? 0,
                durationMs: outcome.durationMs,
                aggregated: outcome.aggregated,
                cwd: run.session.cwd,
              },
            });
          })
          .catch((err) => {
            if (yieldTimer) {
              clearTimeout(yieldTimer);
            }
            if (yielded || run.session.backgrounded) {
              return;
            }
            reject(err as Error);
          });
      });
    },
  };
}

export const execTool = createExecTool();
