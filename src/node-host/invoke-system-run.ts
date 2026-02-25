import crypto from "node:crypto";
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
  type ExecAllowlistEntry,
  type ExecAsk,
  type ExecCommandSegment,
  type ExecSecurity,
} from "../infra/exec-approvals.js";
import type { ExecHostRequest, ExecHostResponse, ExecHostRunResult } from "../infra/exec-host.js";
<<<<<<< HEAD
import { resolveSafeBinProfiles } from "../infra/exec-safe-bin-policy.js";
import { getTrustedSafeBinDirs } from "../infra/exec-safe-bin-trust.js";
=======
import { resolveExecSafeBinRuntimePolicy } from "../infra/exec-safe-bin-runtime-policy.js";
import { sanitizeSystemRunEnvOverrides } from "../infra/host-env-security.js";
>>>>>>> 0d0f4c699 (refactor(exec): centralize safe-bin policy checks)
import { resolveSystemRunCommand } from "../infra/system-run-command.js";
import type {
  ExecEventPayload,
  RunResult,
  SkillBinsProvider,
  SystemRunParams,
} from "./invoke-types.js";

type SystemRunInvokeResult = {
  ok: boolean;
  payloadJSON?: string | null;
  error?: { code?: string; message?: string } | null;
};

<<<<<<< HEAD
export function formatSystemRunAllowlistMissMessage(params?: {
  windowsShellWrapperBlocked?: boolean;
}): string {
  if (params?.windowsShellWrapperBlocked) {
    return (
      "SYSTEM_RUN_DENIED: allowlist miss " +
      "(Windows shell wrappers like cmd.exe /c require approval; " +
      "approve once/always or run with --ask on-miss|always)"
    );
=======
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

type ResolvedExecApprovals = ReturnType<typeof resolveExecApprovals>;

type SystemRunParsePhase = {
  argv: string[];
  shellCommand: string | null;
  cmdText: string;
  agentId: string | undefined;
  sessionKey: string;
  runId: string;
  execution: SystemRunExecutionContext;
  approvalDecision: ReturnType<typeof resolveExecApprovalDecision>;
  envOverrides: Record<string, string> | undefined;
  env: Record<string, string> | undefined;
  cwd: string | undefined;
  timeoutMs: number | undefined;
  needsScreenRecording: boolean;
  approved: boolean;
};

type SystemRunPolicyPhase = SystemRunParsePhase & {
  approvals: ResolvedExecApprovals;
  security: ExecSecurity;
  policy: ReturnType<typeof evaluateSystemRunPolicy>;
  allowlistMatches: ExecAllowlistEntry[];
  analysisOk: boolean;
  allowlistSatisfied: boolean;
  segments: ExecCommandSegment[];
  plannedAllowlistArgv: string[] | undefined;
  isWindows: boolean;
};

const safeBinTrustedDirWarningCache = new Set<string>();

function warnWritableTrustedDirOnce(message: string): void {
  if (safeBinTrustedDirWarningCache.has(message)) {
    return;
  }
  safeBinTrustedDirWarningCache.add(message);
  console.warn(message);
}

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
>>>>>>> 4355e0826 (refactor: harden safe-bin trusted dir diagnostics)
  }
  return "SYSTEM_RUN_DENIED: allowlist miss";
}

export async function handleSystemRunInvoke(opts: {
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
  preferMacAppExecHost: boolean;
<<<<<<< HEAD
}): Promise<void> {
=======
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

async function parseSystemRunPhase(
  opts: HandleSystemRunInvokeOptions,
): Promise<SystemRunParsePhase | null> {
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
  const command = resolveSystemRunCommand({
    command: opts.params.command,
    rawCommand: opts.params.rawCommand,
  });
  if (!command.ok) {
    await opts.sendInvokeResult({
      ok: false,
      error: { code: "INVALID_REQUEST", message: command.message },
    });
    return null;
  }
  if (command.argv.length === 0) {
    await opts.sendInvokeResult({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "command required" },
    });
    return null;
  }

<<<<<<< HEAD
  const argv = command.argv;
  const rawCommand = command.rawCommand ?? "";
=======
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
  const shellCommand = command.shellCommand;
  const cmdText = command.cmdText;
  const agentId = opts.params.agentId?.trim() || undefined;
  const sessionKey = opts.params.sessionKey?.trim() || "node";
  const runId = opts.params.runId?.trim() || crypto.randomUUID();
  const envOverrides = sanitizeSystemRunEnvOverrides({
    overrides: opts.params.env ?? undefined,
    shellWrapper: shellCommand !== null,
  });
  return {
    argv: command.argv,
    shellCommand,
    cmdText,
    agentId,
    sessionKey,
    runId,
    execution: { sessionKey, runId, cmdText },
    approvalDecision: resolveExecApprovalDecision(opts.params.approvalDecision),
    envOverrides,
    env: opts.sanitizeEnv(envOverrides),
    cwd: opts.params.cwd?.trim() || undefined,
    timeoutMs: opts.params.timeoutMs ?? undefined,
    needsScreenRecording: opts.params.needsScreenRecording === true,
    approved: opts.params.approved === true,
  };
}

async function evaluateSystemRunPolicyPhase(
  opts: HandleSystemRunInvokeOptions,
  parsed: SystemRunParsePhase,
): Promise<SystemRunPolicyPhase | null> {
  const cfg = loadConfig();
  const agentExec = parsed.agentId
    ? resolveAgentConfig(cfg, parsed.agentId)?.tools?.exec
    : undefined;
  const configuredSecurity = opts.resolveExecSecurity(
    agentExec?.security ?? cfg.tools?.exec?.security,
  );
  const configuredAsk = opts.resolveExecAsk(agentExec?.ask ?? cfg.tools?.exec?.ask);
  const approvals = resolveExecApprovals(parsed.agentId, {
    security: configuredSecurity,
    ask: configuredAsk,
  });
  const security = approvals.agent.security;
  const ask = approvals.agent.ask;
  const autoAllowSkills = approvals.agent.autoAllowSkills;
<<<<<<< HEAD
  const sessionKey = opts.params.sessionKey?.trim() || "node";
  const runId = opts.params.runId?.trim() || crypto.randomUUID();
<<<<<<< HEAD
  const env = opts.sanitizeEnv(opts.params.env ?? undefined);
  const safeBins = resolveSafeBins(agentExec?.safeBins ?? cfg.tools?.exec?.safeBins);
  const safeBinProfiles = resolveSafeBinProfiles({
    ...cfg.tools?.exec?.safeBinProfiles,
    ...agentExec?.safeBinProfiles,
=======
  const envOverrides = sanitizeSystemRunEnvOverrides({
    overrides: opts.params.env ?? undefined,
    shellWrapper: shellCommand !== null,
  });
  const env = opts.sanitizeEnv(envOverrides);
=======
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
  const { safeBins, safeBinProfiles, trustedSafeBinDirs } = resolveExecSafeBinRuntimePolicy({
    global: cfg.tools?.exec,
    local: agentExec,
<<<<<<< HEAD
>>>>>>> 0d0f4c699 (refactor(exec): centralize safe-bin policy checks)
=======
    onWarning: warnWritableTrustedDirOnce,
>>>>>>> 4355e0826 (refactor: harden safe-bin trusted dir diagnostics)
  });
<<<<<<< HEAD
  const bins = autoAllowSkills ? await opts.skillBins.current() : new Set<string>();
  let analysisOk = false;
  let allowlistMatches: ExecAllowlistEntry[] = [];
  let allowlistSatisfied = false;
  let segments: ExecCommandSegment[] = [];
  if (shellCommand) {
    const allowlistEval = evaluateShellAllowlist({
      command: shellCommand,
      allowlist: approvals.allowlist,
      safeBins,
      safeBinProfiles,
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
      safeBinProfiles,
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
  const bins = autoAllowSkills ? await opts.skillBins.current() : [];
  let { analysisOk, allowlistMatches, allowlistSatisfied, segments } = evaluateSystemRunAllowlist({
    shellCommand: parsed.shellCommand,
    argv: parsed.argv,
    approvals,
    security,
    safeBins,
    safeBinProfiles,
    trustedSafeBinDirs,
    cwd: parsed.cwd,
    env: parsed.env,
    skillBins: bins,
    autoAllowSkills,
  });
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
  const isWindows = process.platform === "win32";
  const cmdInvocation = parsed.shellCommand
    ? opts.isCmdExeInvocation(segments[0]?.argv ?? [])
<<<<<<< HEAD
    : opts.isCmdExeInvocation(argv);
  const windowsShellWrapperBlocked = security === "allowlist" && isWindows && cmdInvocation;
  if (windowsShellWrapperBlocked) {
    analysisOk = false;
    allowlistSatisfied = false;
=======
    : opts.isCmdExeInvocation(parsed.argv);
  const policy = evaluateSystemRunPolicy({
    security,
    ask,
    analysisOk,
    allowlistSatisfied,
    approvalDecision: parsed.approvalDecision,
    approved: parsed.approved,
    isWindows,
    cmdInvocation,
    shellWrapperInvocation: parsed.shellCommand !== null,
  });
  analysisOk = policy.analysisOk;
  allowlistSatisfied = policy.allowlistSatisfied;
  if (!policy.allowed) {
    await sendSystemRunDenied(opts, parsed.execution, {
      reason: policy.eventReason,
      message: policy.errorMessage,
    });
    return null;
  }

  // Fail closed if policy/runtime drift re-allows unapproved shell wrappers.
  if (security === "allowlist" && parsed.shellCommand && !policy.approvedByAsk) {
    await sendSystemRunDenied(opts, parsed.execution, {
      reason: "approval-required",
      message: "SYSTEM_RUN_DENIED: approval required",
    });
    return null;
  }

  const plannedAllowlistArgv = resolvePlannedAllowlistArgv({
    security,
    shellCommand: parsed.shellCommand,
    policy,
    segments,
  });
  if (plannedAllowlistArgv === null) {
    await sendSystemRunDenied(opts, parsed.execution, {
      reason: "execution-plan-miss",
      message: "SYSTEM_RUN_DENIED: execution plan mismatch",
    });
    return null;
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
  }
  return {
    ...parsed,
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

async function executeSystemRunPhase(
  opts: HandleSystemRunInvokeOptions,
  phase: SystemRunPolicyPhase,
): Promise<void> {
  const useMacAppExec = opts.preferMacAppExecHost;
  if (useMacAppExec) {
    const approvalDecision =
      opts.params.approvalDecision === "allow-once" ||
      opts.params.approvalDecision === "allow-always"
        ? opts.params.approvalDecision
        : null;
    const execRequest: ExecHostRequest = {
<<<<<<< HEAD
      command: argv,
      rawCommand: rawCommand || shellCommand || null,
      cwd: opts.params.cwd ?? null,
      env: opts.params.env ?? null,
      timeoutMs: opts.params.timeoutMs ?? null,
      needsScreenRecording: opts.params.needsScreenRecording ?? null,
      agentId: agentId ?? null,
      sessionKey: sessionKey ?? null,
      approvalDecision,
=======
      command: phase.plannedAllowlistArgv ?? phase.argv,
      // Forward canonical display text so companion approval/prompt surfaces bind to
      // the exact command context already validated on the node-host.
      rawCommand: phase.cmdText || null,
      cwd: phase.cwd ?? null,
      env: phase.envOverrides ?? null,
      timeoutMs: phase.timeoutMs ?? null,
      needsScreenRecording: phase.needsScreenRecording,
      agentId: phase.agentId ?? null,
      sessionKey: phase.sessionKey ?? null,
      approvalDecision: phase.approvalDecision,
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
    };
    const response = await opts.runViaMacAppExecHost({
      approvals: phase.approvals,
      request: execRequest,
    });
    if (!response) {
      if (opts.execHostEnforced || !opts.execHostFallbackAllowed) {
<<<<<<< HEAD
        await opts.sendNodeEvent(
          opts.client,
          "exec.denied",
          opts.buildExecEventPayload({
            sessionKey,
            runId,
            host: "node",
            command: cmdText,
            reason: "companion-unavailable",
          }),
        );
        await opts.sendInvokeResult({
          ok: false,
          error: {
            code: "UNAVAILABLE",
            message: "COMPANION_APP_UNAVAILABLE: macOS app exec host unreachable",
          },
=======
        await sendSystemRunDenied(opts, phase.execution, {
          reason: "companion-unavailable",
          message: "COMPANION_APP_UNAVAILABLE: macOS app exec host unreachable",
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
        });
        return;
      }
    } else if (!response.ok) {
<<<<<<< HEAD
      const reason = response.error.reason ?? "approval-required";
      await opts.sendNodeEvent(
        opts.client,
        "exec.denied",
        opts.buildExecEventPayload({
          sessionKey,
          runId,
          host: "node",
          command: cmdText,
          reason,
        }),
      );
      await opts.sendInvokeResult({
        ok: false,
        error: { code: "UNAVAILABLE", message: response.error.message },
=======
      await sendSystemRunDenied(opts, phase.execution, {
        reason: normalizeDeniedReason(response.error.reason),
        message: response.error.message,
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
      });
      return;
    } else {
      const result: ExecHostRunResult = response.payload;
      await opts.sendExecFinishedEvent({
        sessionKey: phase.sessionKey,
        runId: phase.runId,
        cmdText: phase.cmdText,
        result,
      });
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
  if (phase.policy.approvalDecision === "allow-always" && phase.security === "allowlist") {
    if (phase.policy.analysisOk) {
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
      const patterns = resolveAllowAlwaysPatterns({
        segments: phase.segments,
        cwd: phase.cwd,
        env: phase.env,
        platform: process.platform,
      });
      for (const pattern of patterns) {
        if (pattern) {
          addAllowlistEntry(phase.approvals.file, phase.agentId, pattern);
        }
      }
    }
  }

<<<<<<< HEAD
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
      error: {
        code: "UNAVAILABLE",
        message: formatSystemRunAllowlistMissMessage({ windowsShellWrapperBlocked }),
      },
    });
    return;
  }

  if (allowlistMatches.length > 0) {
=======
  if (phase.allowlistMatches.length > 0) {
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
    const seen = new Set<string>();
    for (const match of phase.allowlistMatches) {
      if (!match?.pattern || seen.has(match.pattern)) {
        continue;
      }
      seen.add(match.pattern);
      recordAllowlistUse(
        phase.approvals.file,
        phase.agentId,
        match,
        phase.cmdText,
        phase.segments[0]?.resolution?.resolvedPath,
      );
    }
  }

<<<<<<< HEAD
  if (opts.params.needsScreenRecording === true) {
    await opts.sendNodeEvent(
      opts.client,
      "exec.denied",
      opts.buildExecEventPayload({
        sessionKey,
        runId,
        host: "node",
        command: cmdText,
        reason: "permission:screenRecording",
      }),
    );
    await opts.sendInvokeResult({
      ok: false,
      error: { code: "UNAVAILABLE", message: "PERMISSION_MISSING: screenRecording" },
=======
  if (phase.needsScreenRecording) {
    await sendSystemRunDenied(opts, phase.execution, {
      reason: "permission:screenRecording",
      message: "PERMISSION_MISSING: screenRecording",
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)
    });
    return;
  }

<<<<<<< HEAD
  let execArgv = argv;
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

  const result = await opts.runCommand(
    execArgv,
    opts.params.cwd?.trim() || undefined,
    env,
    opts.params.timeoutMs ?? undefined,
  );
  if (result.truncated) {
    const suffix = "... (truncated)";
    if (result.stderr.trim().length > 0) {
      result.stderr = `${result.stderr}\n${suffix}`;
    } else {
      result.stdout = `${result.stdout}\n${suffix}`;
    }
  }
  await opts.sendExecFinishedEvent({ sessionKey, runId, cmdText, result });
=======
  const execArgv = resolveSystemRunExecArgv({
    plannedAllowlistArgv: phase.plannedAllowlistArgv,
    argv: phase.argv,
    security: phase.security,
    isWindows: phase.isWindows,
    policy: phase.policy,
    shellCommand: phase.shellCommand,
    segments: phase.segments,
  });

  const result = await opts.runCommand(execArgv, phase.cwd, phase.env, phase.timeoutMs);
  applyOutputTruncation(result);
  await opts.sendExecFinishedEvent({
    sessionKey: phase.sessionKey,
    runId: phase.runId,
    cmdText: phase.cmdText,
    result,
  });
>>>>>>> 3c95f8966 (refactor(exec): split system.run phases and align ts/swift validator contracts)

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

export async function handleSystemRunInvoke(opts: HandleSystemRunInvokeOptions): Promise<void> {
  const parsed = await parseSystemRunPhase(opts);
  if (!parsed) {
    return;
  }
  const policyPhase = await evaluateSystemRunPolicyPhase(opts, parsed);
  if (!policyPhase) {
    return;
  }
  await executeSystemRunPhase(opts, policyPhase);
}
