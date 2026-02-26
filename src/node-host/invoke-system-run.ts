import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveAgentConfig } from "../agents/agent-scope.js";
import { loadConfig } from "../config/config.js";
import type { GatewayClient } from "../gateway/client.js";
import {
  addAllowlistEntry,
  analyzeArgvCommand,
  evaluateExecAllowlist,
  evaluateShellAllowlist,
  recordAllowlistUse,
  requiresExecApproval,
  resolveAllowAlwaysPatterns,
  resolveExecApprovals,
  resolveSafeBins,
  type ExecAllowlistEntry,
  type ExecAsk,
  type ExecCommandSegment,
  type ExecSecurity,
  type SystemRunApprovalPlanV2,
  type SkillBinTrustEntry,
} from "../infra/exec-approvals.js";
import type { ExecHostRequest, ExecHostResponse, ExecHostRunResult } from "../infra/exec-host.js";
<<<<<<< HEAD
import { getTrustedSafeBinDirs } from "../infra/exec-safe-bin-trust.js";
=======
import { resolveExecSafeBinRuntimePolicy } from "../infra/exec-safe-bin-runtime-policy.js";
import { sameFileIdentity } from "../infra/file-identity.js";
>>>>>>> f789f880c (fix(security): harden approval-bound node exec cwd handling)
import { sanitizeSystemRunEnvOverrides } from "../infra/host-env-security.js";
import { resolveSystemRunCommand } from "../infra/system-run-command.js";

type SystemRunParams = {
  command: string[];
  rawCommand?: string | null;
  cwd?: string | null;
  env?: Record<string, string>;
  timeoutMs?: number | null;
  needsScreenRecording?: boolean | null;
  agentId?: string | null;
  sessionKey?: string | null;
  approved?: boolean | null;
  approvalDecision?: string | null;
  runId?: string | null;
};

type RunResult = {
  exitCode?: number;
  timedOut: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string | null;
  truncated: boolean;
};

type ExecEventPayload = {
  sessionKey: string;
  runId: string;
  host: string;
  command?: string;
  exitCode?: number;
  timedOut?: boolean;
  success?: boolean;
  output?: string;
  reason?: string;
};

export type SkillBinsProvider = {
  current(force?: boolean): Promise<Set<string>>;
};

type SystemRunInvokeResult = {
  ok: boolean;
  payloadJSON?: string | null;
  error?: { code?: string; message?: string } | null;
};

type SystemRunDeniedReason =
  | "security=deny"
  | "approval-required"
  | "allowlist-miss"
  | "execution-plan-miss"
  | "companion-unavailable"
  | "permission:screenRecording";

type SystemRunExecutionContext = {
  sessionKey: string;
  runId: string;
  cmdText: string;
};

type SystemRunAllowlistAnalysis = {
  analysisOk: boolean;
  allowlistMatches: ExecAllowlistEntry[];
  allowlistSatisfied: boolean;
  segments: ExecCommandSegment[];
};

function normalizeDeniedReason(reason: string | null | undefined): SystemRunDeniedReason {
  switch (reason) {
    case "security=deny":
    case "approval-required":
    case "allowlist-miss":
    case "execution-plan-miss":
    case "companion-unavailable":
    case "permission:screenRecording":
      return reason;
    default:
      return "approval-required";
  }
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isPathLikeExecutableToken(value: string): boolean {
  if (!value) {
    return false;
  }
  if (value.startsWith(".") || value.startsWith("/") || value.startsWith("\\")) {
    return true;
  }
  if (value.includes("/") || value.includes("\\")) {
    return true;
  }
  if (process.platform === "win32" && /^[a-zA-Z]:[\\/]/.test(value)) {
    return true;
  }
  return false;
}

function pathComponentsFromRootSync(targetPath: string): string[] {
  const absolute = path.resolve(targetPath);
  const parts: string[] = [];
  let cursor = absolute;
  while (true) {
    parts.unshift(cursor);
    const parent = path.dirname(cursor);
    if (parent === cursor) {
      return parts;
    }
    cursor = parent;
  }
}

function isWritableByCurrentProcessSync(candidate: string): boolean {
  try {
    fs.accessSync(candidate, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function hasMutableSymlinkPathComponentSync(targetPath: string): boolean {
  for (const component of pathComponentsFromRootSync(targetPath)) {
    try {
      if (!fs.lstatSync(component).isSymbolicLink()) {
        continue;
      }
      const parentDir = path.dirname(component);
      if (isWritableByCurrentProcessSync(parentDir)) {
        return true;
      }
    } catch {
      return true;
    }
  }
  return false;
}

function hardenApprovedExecutionPaths(params: {
  approvedByAsk: boolean;
  argv: string[];
  shellCommand: string | null;
  cwd: string | undefined;
}): { ok: true; argv: string[]; cwd: string | undefined } | { ok: false; message: string } {
  if (!params.approvedByAsk) {
    return { ok: true, argv: params.argv, cwd: params.cwd };
  }

  let hardenedCwd = params.cwd;
  if (hardenedCwd) {
    const requestedCwd = path.resolve(hardenedCwd);
    let cwdLstat: fs.Stats;
    let cwdStat: fs.Stats;
    let cwdReal: string;
    let cwdRealStat: fs.Stats;
    try {
      cwdLstat = fs.lstatSync(requestedCwd);
      cwdStat = fs.statSync(requestedCwd);
      cwdReal = fs.realpathSync(requestedCwd);
      cwdRealStat = fs.statSync(cwdReal);
    } catch {
      return {
        ok: false,
        message: "SYSTEM_RUN_DENIED: approval requires an existing canonical cwd",
      };
    }
    if (!cwdStat.isDirectory()) {
      return {
        ok: false,
        message: "SYSTEM_RUN_DENIED: approval requires cwd to be a directory",
      };
    }
    if (hasMutableSymlinkPathComponentSync(requestedCwd)) {
      return {
        ok: false,
        message: "SYSTEM_RUN_DENIED: approval requires canonical cwd (no symlink path components)",
      };
    }
    if (cwdLstat.isSymbolicLink()) {
      return {
        ok: false,
        message: "SYSTEM_RUN_DENIED: approval requires canonical cwd (no symlink cwd)",
      };
    }
    if (
      !sameFileIdentity(cwdStat, cwdLstat) ||
      !sameFileIdentity(cwdStat, cwdRealStat) ||
      !sameFileIdentity(cwdLstat, cwdRealStat)
    ) {
      return {
        ok: false,
        message: "SYSTEM_RUN_DENIED: approval cwd identity mismatch",
      };
    }
    hardenedCwd = cwdReal;
  }

  if (params.shellCommand !== null || params.argv.length === 0) {
    return { ok: true, argv: params.argv, cwd: hardenedCwd };
  }

  const argv = [...params.argv];
  const rawExecutable = argv[0] ?? "";
  if (!isPathLikeExecutableToken(rawExecutable)) {
    return { ok: true, argv, cwd: hardenedCwd };
  }

  const base = hardenedCwd ?? process.cwd();
  const candidate = path.isAbsolute(rawExecutable)
    ? rawExecutable
    : path.resolve(base, rawExecutable);
  try {
    argv[0] = fs.realpathSync(candidate);
  } catch {
    return {
      ok: false,
      message: "SYSTEM_RUN_DENIED: approval requires a stable executable path",
    };
  }
  return { ok: true, argv, cwd: hardenedCwd };
}

export function buildSystemRunApprovalPlanV2(params: {
  command?: unknown;
  rawCommand?: unknown;
  cwd?: unknown;
  agentId?: unknown;
  sessionKey?: unknown;
}): { ok: true; plan: SystemRunApprovalPlanV2; cmdText: string } | { ok: false; message: string } {
  const command = resolveSystemRunCommand({
    command: params.command,
    rawCommand: params.rawCommand,
  });
  if (!command.ok) {
    return { ok: false, message: command.message };
  }
  if (command.argv.length === 0) {
    return { ok: false, message: "command required" };
  }
  const hardening = hardenApprovedExecutionPaths({
    approvedByAsk: true,
    argv: command.argv,
    shellCommand: command.shellCommand,
    cwd: normalizeString(params.cwd) ?? undefined,
  });
  if (!hardening.ok) {
    return { ok: false, message: hardening.message };
  }
  return {
    ok: true,
    plan: {
      version: 2,
      argv: hardening.argv,
      cwd: hardening.cwd ?? null,
      rawCommand: command.cmdText.trim() || null,
      agentId: normalizeString(params.agentId),
      sessionKey: normalizeString(params.sessionKey),
    },
    cmdText: command.cmdText,
  };
}

export type HandleSystemRunInvokeOptions = {
  client: GatewayClient;
  params: SystemRunParams;
  skillBins: SkillBinsProvider;
  execHostEnforced: boolean;
  execHostFallbackAllowed: boolean;
  resolveExecSecurity: (value?: string) => ExecSecurity;
  resolveExecAsk: (value?: string) => ExecAsk;
  isCmdExeInvocation: (argv: string[]) => boolean;
  sanitizeEnv: (overrides?: Record<string, string> | null) => Record<string, string> | undefined;
  runCommand: (
    argv: string[],
    cwd: string | undefined,
    env: Record<string, string> | undefined,
    timeoutMs: number | undefined,
  ) => Promise<RunResult>;
  runViaMacAppExecHost: (params: {
    approvals: ReturnType<typeof resolveExecApprovals>;
    request: ExecHostRequest;
  }) => Promise<ExecHostResponse | null>;
  sendNodeEvent: (client: GatewayClient, event: string, payload: unknown) => Promise<void>;
  buildExecEventPayload: (payload: ExecEventPayload) => ExecEventPayload;
  sendInvokeResult: (result: SystemRunInvokeResult) => Promise<void>;
  sendExecFinishedEvent: (params: {
    sessionKey: string;
    runId: string;
    cmdText: string;
    result: {
      stdout?: string;
      stderr?: string;
      error?: string | null;
      exitCode?: number | null;
      timedOut?: boolean;
      success?: boolean;
    };
  }) => Promise<void>;
<<<<<<< HEAD
}): Promise<void> {
=======
  preferMacAppExecHost: boolean;
};

async function sendSystemRunDenied(
  opts: Pick<
    HandleSystemRunInvokeOptions,
    "client" | "sendNodeEvent" | "buildExecEventPayload" | "sendInvokeResult"
  >,
  execution: SystemRunExecutionContext,
  params: {
    reason: SystemRunDeniedReason;
    message: string;
  },
) {
  await opts.sendNodeEvent(
    opts.client,
    "exec.denied",
    opts.buildExecEventPayload({
      sessionKey: execution.sessionKey,
      runId: execution.runId,
      host: "node",
      command: execution.cmdText,
      reason: params.reason,
    }),
  );
  await opts.sendInvokeResult({
    ok: false,
    error: { code: "UNAVAILABLE", message: params.message },
  });
}

function evaluateSystemRunAllowlist(params: {
  shellCommand: string | null;
  argv: string[];
  approvals: ReturnType<typeof resolveExecApprovals>;
  security: ExecSecurity;
  safeBins: ReturnType<typeof resolveExecSafeBinRuntimePolicy>["safeBins"];
  safeBinProfiles: ReturnType<typeof resolveExecSafeBinRuntimePolicy>["safeBinProfiles"];
  trustedSafeBinDirs: ReturnType<typeof resolveExecSafeBinRuntimePolicy>["trustedSafeBinDirs"];
  cwd: string | undefined;
  env: Record<string, string> | undefined;
  skillBins: SkillBinTrustEntry[];
  autoAllowSkills: boolean;
}): SystemRunAllowlistAnalysis {
  if (params.shellCommand) {
    const allowlistEval = evaluateShellAllowlist({
      command: params.shellCommand,
      allowlist: params.approvals.allowlist,
      safeBins: params.safeBins,
      safeBinProfiles: params.safeBinProfiles,
      cwd: params.cwd,
      env: params.env,
      trustedSafeBinDirs: params.trustedSafeBinDirs,
      skillBins: params.skillBins,
      autoAllowSkills: params.autoAllowSkills,
      platform: process.platform,
    });
    return {
      analysisOk: allowlistEval.analysisOk,
      allowlistMatches: allowlistEval.allowlistMatches,
      allowlistSatisfied:
        params.security === "allowlist" && allowlistEval.analysisOk
          ? allowlistEval.allowlistSatisfied
          : false,
      segments: allowlistEval.segments,
    };
  }

  const analysis = analyzeArgvCommand({ argv: params.argv, cwd: params.cwd, env: params.env });
  const allowlistEval = evaluateExecAllowlist({
    analysis,
    allowlist: params.approvals.allowlist,
    safeBins: params.safeBins,
    safeBinProfiles: params.safeBinProfiles,
    cwd: params.cwd,
    trustedSafeBinDirs: params.trustedSafeBinDirs,
    skillBins: params.skillBins,
    autoAllowSkills: params.autoAllowSkills,
  });
  return {
    analysisOk: analysis.ok,
    allowlistMatches: allowlistEval.allowlistMatches,
    allowlistSatisfied:
      params.security === "allowlist" && analysis.ok ? allowlistEval.allowlistSatisfied : false,
    segments: analysis.segments,
  };
}

function resolvePlannedAllowlistArgv(params: {
  security: ExecSecurity;
  shellCommand: string | null;
  policy: {
    approvedByAsk: boolean;
    analysisOk: boolean;
    allowlistSatisfied: boolean;
  };
  segments: ExecCommandSegment[];
}): string[] | undefined | null {
  if (
    params.security !== "allowlist" ||
    params.policy.approvedByAsk ||
    params.shellCommand ||
    !params.policy.analysisOk ||
    !params.policy.allowlistSatisfied ||
    params.segments.length !== 1
  ) {
    return undefined;
  }
  const plannedAllowlistArgv = params.segments[0]?.resolution?.effectiveArgv;
  return plannedAllowlistArgv && plannedAllowlistArgv.length > 0 ? plannedAllowlistArgv : null;
}

function resolveSystemRunExecArgv(params: {
  plannedAllowlistArgv: string[] | undefined;
  argv: string[];
  security: ExecSecurity;
  isWindows: boolean;
  policy: {
    approvedByAsk: boolean;
    analysisOk: boolean;
    allowlistSatisfied: boolean;
  };
  shellCommand: string | null;
  segments: ExecCommandSegment[];
}): string[] {
  let execArgv = params.plannedAllowlistArgv ?? params.argv;
  if (
    params.security === "allowlist" &&
    params.isWindows &&
    !params.policy.approvedByAsk &&
    params.shellCommand &&
    params.policy.analysisOk &&
    params.policy.allowlistSatisfied &&
    params.segments.length === 1 &&
    params.segments[0]?.argv.length > 0
  ) {
    execArgv = params.segments[0].argv;
  }
  return execArgv;
}

function applyOutputTruncation(result: RunResult) {
  if (!result.truncated) {
    return;
  }
  const suffix = "... (truncated)";
  if (result.stderr.trim().length > 0) {
    result.stderr = `${result.stderr}\n${suffix}`;
  } else {
    result.stdout = `${result.stdout}\n${suffix}`;
  }
}

export { formatSystemRunAllowlistMissMessage } from "./exec-policy.js";

export async function handleSystemRunInvoke(opts: HandleSystemRunInvokeOptions): Promise<void> {
>>>>>>> 0026255de (refactor(security): harden system.run wrapper enforcement)
  const command = resolveSystemRunCommand({
    command: opts.params.command,
    rawCommand: opts.params.rawCommand,
  });
  if (!command.ok) {
    await opts.sendInvokeResult({
      ok: false,
      error: { code: "INVALID_REQUEST", message: command.message },
    });
    return;
  }
  if (command.argv.length === 0) {
    await opts.sendInvokeResult({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "command required" },
    });
    return;
  }

  const argv = command.argv;
  const shellCommand = command.shellCommand;
  const cmdText = command.cmdText;
  const agentId = opts.params.agentId?.trim() || undefined;
  const cfg = loadConfig();
  const agentExec = agentId ? resolveAgentConfig(cfg, agentId)?.tools?.exec : undefined;
  const configuredSecurity = opts.resolveExecSecurity(
    agentExec?.security ?? cfg.tools?.exec?.security,
  );
  const configuredAsk = opts.resolveExecAsk(agentExec?.ask ?? cfg.tools?.exec?.ask);
  const approvals = resolveExecApprovals(agentId, {
    security: configuredSecurity,
    ask: configuredAsk,
  });
  const security = approvals.agent.security;
  const ask = approvals.agent.ask;
  const autoAllowSkills = approvals.agent.autoAllowSkills;
  const sessionKey = opts.params.sessionKey?.trim() || "node";
  const runId = opts.params.runId?.trim() || crypto.randomUUID();
<<<<<<< HEAD
=======
  const execution: SystemRunExecutionContext = { sessionKey, runId, cmdText };
  const approvalDecision = resolveExecApprovalDecision(opts.params.approvalDecision);
>>>>>>> 0026255de (refactor(security): harden system.run wrapper enforcement)
  const envOverrides = sanitizeSystemRunEnvOverrides({
    overrides: opts.params.env ?? undefined,
    shellWrapper: shellCommand !== null,
  });
  const env = opts.sanitizeEnv(envOverrides);
<<<<<<< HEAD
  const safeBins = resolveSafeBins(agentExec?.safeBins ?? cfg.tools?.exec?.safeBins);
  const trustedSafeBinDirs = getTrustedSafeBinDirs();
  const bins = autoAllowSkills ? await opts.skillBins.current() : new Set<string>();
<<<<<<< HEAD
  let analysisOk = false;
  let allowlistMatches: ExecAllowlistEntry[] = [];
  let allowlistSatisfied = false;
  let segments: ExecCommandSegment[] = [];
  if (shellCommand) {
    const allowlistEval = evaluateShellAllowlist({
      command: shellCommand,
      allowlist: approvals.allowlist,
      safeBins,
      cwd: opts.params.cwd ?? undefined,
      env,
      trustedSafeBinDirs,
      skillBins: bins,
      autoAllowSkills,
      platform: process.platform,
    });
    analysisOk = allowlistEval.analysisOk;
    allowlistMatches = allowlistEval.allowlistMatches;
    allowlistSatisfied =
      security === "allowlist" && analysisOk ? allowlistEval.allowlistSatisfied : false;
    segments = allowlistEval.segments;
  } else {
    const analysis = analyzeArgvCommand({ argv, cwd: opts.params.cwd ?? undefined, env });
    const allowlistEval = evaluateExecAllowlist({
      analysis,
      allowlist: approvals.allowlist,
      safeBins,
      cwd: opts.params.cwd ?? undefined,
      trustedSafeBinDirs,
      skillBins: bins,
      autoAllowSkills,
    });
    analysisOk = analysis.ok;
    allowlistMatches = allowlistEval.allowlistMatches;
    allowlistSatisfied =
      security === "allowlist" && analysisOk ? allowlistEval.allowlistSatisfied : false;
    segments = analysis.segments;
  }
=======
=======
  const { safeBins, safeBinProfiles, trustedSafeBinDirs } = resolveExecSafeBinRuntimePolicy({
    global: cfg.tools?.exec,
    local: agentExec,
  });
  const bins = autoAllowSkills ? await opts.skillBins.current() : [];
>>>>>>> ffd63b7a2 (fix(security): trust resolved skill-bin paths in allowlist auto-allow)
  let { analysisOk, allowlistMatches, allowlistSatisfied, segments } = evaluateSystemRunAllowlist({
    shellCommand,
    argv,
    approvals,
    security,
    safeBins,
    safeBinProfiles,
    trustedSafeBinDirs,
    cwd: opts.params.cwd ?? undefined,
    env,
    skillBins: bins,
    autoAllowSkills,
  });
>>>>>>> 0026255de (refactor(security): harden system.run wrapper enforcement)
  const isWindows = process.platform === "win32";
  const cmdInvocation = shellCommand
    ? opts.isCmdExeInvocation(segments[0]?.argv ?? [])
    : opts.isCmdExeInvocation(argv);
<<<<<<< HEAD
  if (security === "allowlist" && isWindows && cmdInvocation) {
    analysisOk = false;
    allowlistSatisfied = false;
=======
  const policy = evaluateSystemRunPolicy({
    security,
    ask,
    analysisOk,
    allowlistSatisfied,
    approvalDecision,
    approved: opts.params.approved === true,
    isWindows,
    cmdInvocation,
    shellWrapperInvocation: shellCommand !== null,
  });
  analysisOk = policy.analysisOk;
  allowlistSatisfied = policy.allowlistSatisfied;
  if (!policy.allowed) {
    await sendSystemRunDenied(opts, execution, {
      reason: policy.eventReason,
      message: policy.errorMessage,
    });
    return;
>>>>>>> 3f0b9dbb3 (fix(security): block shell-wrapper line-continuation allowlist bypass)
  }

<<<<<<< HEAD
<<<<<<< HEAD
  const useMacAppExec = process.platform === "darwin";
=======
  let plannedAllowlistArgv: string[] | undefined;
  if (
    security === "allowlist" &&
    !policy.approvedByAsk &&
    !shellCommand &&
    policy.analysisOk &&
    policy.allowlistSatisfied &&
    segments.length === 1
  ) {
    plannedAllowlistArgv = segments[0]?.resolution?.effectiveArgv;
    if (!plannedAllowlistArgv || plannedAllowlistArgv.length === 0) {
      await opts.sendNodeEvent(
        opts.client,
        "exec.denied",
        opts.buildExecEventPayload({
          sessionKey,
          runId,
          host: "node",
          command: cmdText,
          reason: "execution-plan-miss",
        }),
      );
      await opts.sendInvokeResult({
        ok: false,
        error: { code: "UNAVAILABLE", message: "SYSTEM_RUN_DENIED: execution plan mismatch" },
      });
      return;
    }
=======
  // Fail closed if policy/runtime drift re-allows unapproved shell wrappers.
  if (security === "allowlist" && shellCommand && !policy.approvedByAsk) {
    await sendSystemRunDenied(opts, execution, {
      reason: "approval-required",
      message: "SYSTEM_RUN_DENIED: approval required",
    });
    return;
  }

  const hardenedPaths = hardenApprovedExecutionPaths({
    approvedByAsk: policy.approvedByAsk,
    argv: parsed.argv,
    shellCommand: parsed.shellCommand,
    cwd: parsed.cwd,
  });
  if (!hardenedPaths.ok) {
    await sendSystemRunDenied(opts, parsed.execution, {
      reason: "approval-required",
      message: hardenedPaths.message,
    });
    return null;
  }

  const plannedAllowlistArgv = resolvePlannedAllowlistArgv({
    security,
    shellCommand,
    policy,
    segments,
  });
  if (plannedAllowlistArgv === null) {
    await sendSystemRunDenied(opts, execution, {
      reason: "execution-plan-miss",
      message: "SYSTEM_RUN_DENIED: execution plan mismatch",
    });
    return;
>>>>>>> 0026255de (refactor(security): harden system.run wrapper enforcement)
  }
<<<<<<< HEAD
=======
  return {
    ...parsed,
    argv: hardenedPaths.argv,
    cwd: hardenedPaths.cwd,
    approvals,
    security,
    policy,
    allowlistMatches,
    analysisOk,
    allowlistSatisfied,
    segments,
    plannedAllowlistArgv: plannedAllowlistArgv ?? undefined,
    isWindows,
  };
}
>>>>>>> f789f880c (fix(security): harden approval-bound node exec cwd handling)

  const useMacAppExec = opts.preferMacAppExecHost;
>>>>>>> a1c4bf07c (fix(security): harden exec wrapper allowlist execution parity)
  if (useMacAppExec) {
    const approvalDecision =
      opts.params.approvalDecision === "allow-once" ||
      opts.params.approvalDecision === "allow-always"
        ? opts.params.approvalDecision
        : null;
    const execRequest: ExecHostRequest = {
      command: plannedAllowlistArgv ?? argv,
      // Forward canonical display text so companion approval/prompt surfaces bind to
      // the exact command context already validated on the node-host.
      rawCommand: cmdText || null,
      cwd: opts.params.cwd ?? null,
      env: envOverrides ?? null,
      timeoutMs: opts.params.timeoutMs ?? null,
      needsScreenRecording: opts.params.needsScreenRecording ?? null,
      agentId: agentId ?? null,
      sessionKey: sessionKey ?? null,
      approvalDecision,
    };
    const response = await opts.runViaMacAppExecHost({ approvals, request: execRequest });
    if (!response) {
      if (opts.execHostEnforced || !opts.execHostFallbackAllowed) {
        await sendSystemRunDenied(opts, execution, {
          reason: "companion-unavailable",
          message: "COMPANION_APP_UNAVAILABLE: macOS app exec host unreachable",
        });
        return;
      }
    } else if (!response.ok) {
      await sendSystemRunDenied(opts, execution, {
        reason: normalizeDeniedReason(response.error.reason),
        message: response.error.message,
      });
      return;
    } else {
      const result: ExecHostRunResult = response.payload;
      await opts.sendExecFinishedEvent({ sessionKey, runId, cmdText, result });
      await opts.sendInvokeResult({
        ok: true,
        payloadJSON: JSON.stringify(result),
      });
      return;
    }
  }

<<<<<<< HEAD
  if (security === "deny") {
    await opts.sendNodeEvent(
      opts.client,
      "exec.denied",
      opts.buildExecEventPayload({
        sessionKey,
        runId,
        host: "node",
        command: cmdText,
        reason: "security=deny",
      }),
    );
    await opts.sendInvokeResult({
      ok: false,
      error: { code: "UNAVAILABLE", message: "SYSTEM_RUN_DISABLED: security=deny" },
    });
    return;
  }

  const requiresAsk = requiresExecApproval({
    ask,
    security,
    analysisOk,
    allowlistSatisfied,
  });

  const approvalDecision =
    opts.params.approvalDecision === "allow-once" || opts.params.approvalDecision === "allow-always"
      ? opts.params.approvalDecision
      : null;
  const approvedByAsk = approvalDecision !== null || opts.params.approved === true;
  if (requiresAsk && !approvedByAsk) {
    await opts.sendNodeEvent(
      opts.client,
      "exec.denied",
      opts.buildExecEventPayload({
        sessionKey,
        runId,
        host: "node",
        command: cmdText,
        reason: "approval-required",
      }),
    );
    await opts.sendInvokeResult({
      ok: false,
      error: { code: "UNAVAILABLE", message: "SYSTEM_RUN_DENIED: approval required" },
    });
    return;
  }
  if (approvalDecision === "allow-always" && security === "allowlist") {
    if (analysisOk) {
=======
  if (policy.approvalDecision === "allow-always" && security === "allowlist") {
    if (policy.analysisOk) {
>>>>>>> 3f0b9dbb3 (fix(security): block shell-wrapper line-continuation allowlist bypass)
      const patterns = resolveAllowAlwaysPatterns({
        segments,
        cwd: opts.params.cwd ?? undefined,
        env,
        platform: process.platform,
      });
      for (const pattern of patterns) {
        if (pattern) {
          addAllowlistEntry(approvals.file, agentId, pattern);
        }
      }
    }
  }

  if (security === "allowlist" && (!analysisOk || !allowlistSatisfied) && !approvedByAsk) {
    await opts.sendNodeEvent(
      opts.client,
      "exec.denied",
      opts.buildExecEventPayload({
        sessionKey,
        runId,
        host: "node",
        command: cmdText,
        reason: "allowlist-miss",
      }),
    );
    await opts.sendInvokeResult({
      ok: false,
      error: { code: "UNAVAILABLE", message: "SYSTEM_RUN_DENIED: allowlist miss" },
    });
    return;
  }

  if (allowlistMatches.length > 0) {
    const seen = new Set<string>();
    for (const match of allowlistMatches) {
      if (!match?.pattern || seen.has(match.pattern)) {
        continue;
      }
      seen.add(match.pattern);
      recordAllowlistUse(
        approvals.file,
        agentId,
        match,
        cmdText,
        segments[0]?.resolution?.resolvedPath,
      );
    }
  }

  if (opts.params.needsScreenRecording === true) {
    await sendSystemRunDenied(opts, execution, {
      reason: "permission:screenRecording",
      message: "PERMISSION_MISSING: screenRecording",
    });
    return;
  }

<<<<<<< HEAD
  let execArgv = plannedAllowlistArgv ?? argv;
  if (
    security === "allowlist" &&
    isWindows &&
    !approvedByAsk &&
    shellCommand &&
    analysisOk &&
    allowlistSatisfied &&
    segments.length === 1 &&
    segments[0]?.argv.length > 0
  ) {
    execArgv = segments[0].argv;
  }
=======
  const execArgv = resolveSystemRunExecArgv({
    plannedAllowlistArgv: plannedAllowlistArgv ?? undefined,
    argv,
    security,
    isWindows,
    policy,
    shellCommand,
    segments,
  });
>>>>>>> 0026255de (refactor(security): harden system.run wrapper enforcement)

  const result = await opts.runCommand(
    execArgv,
    opts.params.cwd?.trim() || undefined,
    env,
    opts.params.timeoutMs ?? undefined,
  );
  applyOutputTruncation(result);
  await opts.sendExecFinishedEvent({ sessionKey, runId, cmdText, result });

  await opts.sendInvokeResult({
    ok: true,
    payloadJSON: JSON.stringify({
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error ?? null,
    }),
  });
}
