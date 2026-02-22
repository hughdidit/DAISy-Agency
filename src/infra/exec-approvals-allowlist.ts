import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_SAFE_BINS,
  analyzeShellCommand,
  isWindowsPlatform,
  matchAllowlist,
  resolveAllowlistCandidatePath,
  splitCommandChain,
  type ExecCommandAnalysis,
  type CommandResolution,
  type ExecCommandSegment,
} from "./exec-approvals-analysis.js";
import type { ExecAllowlistEntry } from "./exec-approvals.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> 0e85380e5 (style: format files and fix safe-bins e2e typing)
=======
import {
  SAFE_BIN_PROFILES,
  type SafeBinProfile,
  validateSafeBinArgv,
} from "./exec-safe-bin-policy.js";
>>>>>>> 47c3f742b (fix(exec): require explicit safe-bin profiles)
import { isTrustedSafeBinPath } from "./exec-safe-bin-trust.js";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 4d3403b7a (chore: fix CI errors)
=======
import {
  extractShellWrapperInlineCommand,
  isDispatchWrapperExecutable,
  isShellWrapperExecutable,
  unwrapKnownDispatchWrapperInvocation,
} from "./exec-wrapper-resolution.js";
>>>>>>> cd919ebd2 (refactor(exec): unify wrapper resolution and split approvals tests)

function isPathLikeToken(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed === "-") {
    return false;
  }
  if (trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith("~")) {
    return true;
  }
  if (trimmed.startsWith("/")) {
    return true;
  }
  return /^[A-Za-z]:[\\/]/.test(trimmed);
}

function defaultFileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

=======
>>>>>>> 3317b49d3 (feat(memory): allow QMD searches via mcporter keep-alive (openclaw#19617) thanks @vignesh07)
export function normalizeSafeBins(entries?: string[]): Set<string> {
  if (!Array.isArray(entries)) {
    return new Set();
  }
  const normalized = entries
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  return new Set(normalized);
}

export function resolveSafeBins(entries?: string[] | null): Set<string> {
  if (entries === undefined) {
    return normalizeSafeBins(DEFAULT_SAFE_BINS);
  }
  return normalizeSafeBins(entries ?? []);
}

export function isSafeBinUsage(params: {
  argv: string[];
  resolution: CommandResolution | null;
  safeBins: Set<string>;
<<<<<<< HEAD
  cwd?: string;
  fileExists?: (filePath: string) => boolean;
=======
  platform?: string | null;
  trustedSafeBinDirs?: ReadonlySet<string>;
  safeBinProfiles?: Readonly<Record<string, SafeBinProfile>>;
  isTrustedSafeBinPathFn?: typeof isTrustedSafeBinPath;
>>>>>>> 47c3f742b (fix(exec): require explicit safe-bin profiles)
}): boolean {
  if (params.safeBins.size === 0) {
    return false;
  }
  const resolution = params.resolution;
  const execName = resolution?.executableName?.toLowerCase();
  if (!execName) {
    return false;
  }
  const matchesSafeBin =
    params.safeBins.has(execName) ||
    (process.platform === "win32" && params.safeBins.has(path.parse(execName).name));
  if (!matchesSafeBin) {
    return false;
  }
  if (!resolution?.resolvedPath) {
    return false;
  }
  const cwd = params.cwd ?? process.cwd();
  const exists = params.fileExists ?? defaultFileExists;
  const argv = params.argv.slice(1);
<<<<<<< HEAD
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) {
      continue;
    }
    if (token === "-") {
      continue;
    }
    if (token.startsWith("-")) {
      const eqIndex = token.indexOf("=");
      if (eqIndex > 0) {
        const value = token.slice(eqIndex + 1);
        if (value && (isPathLikeToken(value) || exists(path.resolve(cwd, value)))) {
          return false;
        }
      }
      continue;
    }
    if (isPathLikeToken(token)) {
      return false;
    }
    if (exists(path.resolve(cwd, token))) {
      return false;
    }
  }
  return true;
=======
  const safeBinProfiles = params.safeBinProfiles ?? SAFE_BIN_PROFILES;
  const profile = safeBinProfiles[execName];
  if (!profile) {
    return false;
  }
  return validateSafeBinArgv(argv, profile);
>>>>>>> 47c3f742b (fix(exec): require explicit safe-bin profiles)
}

export type ExecAllowlistEvaluation = {
  allowlistSatisfied: boolean;
  allowlistMatches: ExecAllowlistEntry[];
};

function evaluateSegments(
  segments: ExecCommandSegment[],
  params: {
    allowlist: ExecAllowlistEntry[];
    safeBins: Set<string>;
    safeBinProfiles?: Readonly<Record<string, SafeBinProfile>>;
    cwd?: string;
    trustedSafeBinDirs?: ReadonlySet<string>;
    skillBins?: Set<string>;
    autoAllowSkills?: boolean;
  },
): { satisfied: boolean; matches: ExecAllowlistEntry[] } {
  const matches: ExecAllowlistEntry[] = [];
  const allowSkills = params.autoAllowSkills === true && (params.skillBins?.size ?? 0) > 0;

  const satisfied = segments.every((segment) => {
    const candidatePath = resolveAllowlistCandidatePath(segment.resolution, params.cwd);
    const candidateResolution =
      candidatePath && segment.resolution
        ? { ...segment.resolution, resolvedPath: candidatePath }
        : segment.resolution;
    const match = matchAllowlist(params.allowlist, candidateResolution);
    if (match) {
      matches.push(match);
    }
    const safe = isSafeBinUsage({
      argv: segment.argv,
      resolution: segment.resolution,
      safeBins: params.safeBins,
<<<<<<< HEAD
      cwd: params.cwd,
=======
      safeBinProfiles: params.safeBinProfiles,
      platform: params.platform,
>>>>>>> 47c3f742b (fix(exec): require explicit safe-bin profiles)
      trustedSafeBinDirs: params.trustedSafeBinDirs,
    });
    const skillAllow =
      allowSkills && segment.resolution?.executableName
        ? params.skillBins?.has(segment.resolution.executableName)
        : false;
    return Boolean(match || safe || skillAllow);
  });

  return { satisfied, matches };
}

export function evaluateExecAllowlist(params: {
  analysis: ExecCommandAnalysis;
  allowlist: ExecAllowlistEntry[];
  safeBins: Set<string>;
  safeBinProfiles?: Readonly<Record<string, SafeBinProfile>>;
  cwd?: string;
  trustedSafeBinDirs?: ReadonlySet<string>;
  skillBins?: Set<string>;
  autoAllowSkills?: boolean;
}): ExecAllowlistEvaluation {
  const allowlistMatches: ExecAllowlistEntry[] = [];
  if (!params.analysis.ok || params.analysis.segments.length === 0) {
    return { allowlistSatisfied: false, allowlistMatches };
  }

  // If the analysis contains chains, evaluate each chain part separately
  if (params.analysis.chains) {
    for (const chainSegments of params.analysis.chains) {
      const result = evaluateSegments(chainSegments, {
        allowlist: params.allowlist,
        safeBins: params.safeBins,
        safeBinProfiles: params.safeBinProfiles,
        cwd: params.cwd,
        trustedSafeBinDirs: params.trustedSafeBinDirs,
        skillBins: params.skillBins,
        autoAllowSkills: params.autoAllowSkills,
      });
      if (!result.satisfied) {
        return { allowlistSatisfied: false, allowlistMatches: [] };
      }
      allowlistMatches.push(...result.matches);
    }
    return { allowlistSatisfied: true, allowlistMatches };
  }

  // No chains, evaluate all segments together
  const result = evaluateSegments(params.analysis.segments, {
    allowlist: params.allowlist,
    safeBins: params.safeBins,
    safeBinProfiles: params.safeBinProfiles,
    cwd: params.cwd,
    trustedSafeBinDirs: params.trustedSafeBinDirs,
    skillBins: params.skillBins,
    autoAllowSkills: params.autoAllowSkills,
  });
  return { allowlistSatisfied: result.satisfied, allowlistMatches: result.matches };
}

export type ExecAllowlistAnalysis = {
  analysisOk: boolean;
  allowlistSatisfied: boolean;
  allowlistMatches: ExecAllowlistEntry[];
  segments: ExecCommandSegment[];
};

<<<<<<< HEAD
=======
function hasSegmentExecutableMatch(
  segment: ExecCommandSegment,
  predicate: (token: string) => boolean,
): boolean {
  const candidates = [
    segment.resolution?.executableName,
    segment.resolution?.rawExecutable,
    segment.argv[0],
  ];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) {
      continue;
    }
    if (predicate(trimmed)) {
      return true;
    }
  }
  return false;
}

function isShellWrapperSegment(segment: ExecCommandSegment): boolean {
  return hasSegmentExecutableMatch(segment, isShellWrapperExecutable);
}

function isDispatchWrapperSegment(segment: ExecCommandSegment): boolean {
  return hasSegmentExecutableMatch(segment, isDispatchWrapperExecutable);
}

function collectAllowAlwaysPatterns(params: {
  segment: ExecCommandSegment;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
  depth: number;
  out: Set<string>;
}) {
  if (params.depth >= 3) {
    return;
  }

  if (isDispatchWrapperSegment(params.segment)) {
    const dispatchUnwrap = unwrapKnownDispatchWrapperInvocation(params.segment.argv);
    if (dispatchUnwrap.kind !== "unwrapped" || dispatchUnwrap.argv.length === 0) {
      return;
    }
    collectAllowAlwaysPatterns({
      segment: {
        raw: dispatchUnwrap.argv.join(" "),
        argv: dispatchUnwrap.argv,
        resolution: resolveCommandResolutionFromArgv(dispatchUnwrap.argv, params.cwd, params.env),
      },
      cwd: params.cwd,
      env: params.env,
      platform: params.platform,
      depth: params.depth + 1,
      out: params.out,
    });
    return;
  }

  const candidatePath = resolveAllowlistCandidatePath(params.segment.resolution, params.cwd);
  if (!candidatePath) {
    return;
  }
  if (!isShellWrapperSegment(params.segment)) {
    params.out.add(candidatePath);
    return;
  }
  const inlineCommand = extractShellWrapperInlineCommand(params.segment.argv);
  if (!inlineCommand) {
    return;
  }
  const nested = analyzeShellCommand({
    command: inlineCommand,
    cwd: params.cwd,
    env: params.env,
    platform: params.platform,
  });
  if (!nested.ok) {
    return;
  }
  for (const nestedSegment of nested.segments) {
    collectAllowAlwaysPatterns({
      segment: nestedSegment,
      cwd: params.cwd,
      env: params.env,
      platform: params.platform,
      depth: params.depth + 1,
      out: params.out,
    });
  }
}

/**
 * Derive persisted allowlist patterns for an "allow always" decision.
 * When a command is wrapped in a shell (for example `zsh -lc "<cmd>"`),
 * persist the inner executable(s) rather than the shell binary.
 */
export function resolveAllowAlwaysPatterns(params: {
  segments: ExecCommandSegment[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
}): string[] {
  const patterns = new Set<string>();
  for (const segment of params.segments) {
    collectAllowAlwaysPatterns({
      segment,
      cwd: params.cwd,
      env: params.env,
      platform: params.platform,
      depth: 0,
      out: patterns,
    });
  }
  return Array.from(patterns);
}

>>>>>>> cd919ebd2 (refactor(exec): unify wrapper resolution and split approvals tests)
/**
 * Evaluates allowlist for shell commands (including &&, ||, ;) and returns analysis metadata.
 */
export function evaluateShellAllowlist(params: {
  command: string;
  allowlist: ExecAllowlistEntry[];
  safeBins: Set<string>;
  safeBinProfiles?: Readonly<Record<string, SafeBinProfile>>;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  trustedSafeBinDirs?: ReadonlySet<string>;
  skillBins?: Set<string>;
  autoAllowSkills?: boolean;
  platform?: string | null;
}): ExecAllowlistAnalysis {
  const analysisFailure = (): ExecAllowlistAnalysis => ({
    analysisOk: false,
    allowlistSatisfied: false,
    allowlistMatches: [],
    segments: [],
    segmentSatisfiedBy: [],
  });

  const chainParts = isWindowsPlatform(params.platform) ? null : splitCommandChain(params.command);
  if (!chainParts) {
    const analysis = analyzeShellCommand({
      command: params.command,
      cwd: params.cwd,
      env: params.env,
      platform: params.platform,
    });
    if (!analysis.ok) {
<<<<<<< HEAD
      return {
        analysisOk: false,
        allowlistSatisfied: false,
        allowlistMatches: [],
        segments: [],
      };
=======
      return analysisFailure();
>>>>>>> e7f65b4aa (refactor(infra): dedupe exec allowlist analysis failure)
    }
    const evaluation = evaluateExecAllowlist({
      analysis,
      allowlist: params.allowlist,
      safeBins: params.safeBins,
      safeBinProfiles: params.safeBinProfiles,
      cwd: params.cwd,
      trustedSafeBinDirs: params.trustedSafeBinDirs,
      skillBins: params.skillBins,
      autoAllowSkills: params.autoAllowSkills,
    });
    return {
      analysisOk: true,
      allowlistSatisfied: evaluation.allowlistSatisfied,
      allowlistMatches: evaluation.allowlistMatches,
      segments: analysis.segments,
    };
  }

  const allowlistMatches: ExecAllowlistEntry[] = [];
  const segments: ExecCommandSegment[] = [];

  for (const part of chainParts) {
    const analysis = analyzeShellCommand({
      command: part,
      cwd: params.cwd,
      env: params.env,
      platform: params.platform,
    });
    if (!analysis.ok) {
<<<<<<< HEAD
      return {
        analysisOk: false,
        allowlistSatisfied: false,
        allowlistMatches: [],
        segments: [],
      };
=======
      return analysisFailure();
>>>>>>> e7f65b4aa (refactor(infra): dedupe exec allowlist analysis failure)
    }

    segments.push(...analysis.segments);
    const evaluation = evaluateExecAllowlist({
      analysis,
      allowlist: params.allowlist,
      safeBins: params.safeBins,
      safeBinProfiles: params.safeBinProfiles,
      cwd: params.cwd,
      trustedSafeBinDirs: params.trustedSafeBinDirs,
      skillBins: params.skillBins,
      autoAllowSkills: params.autoAllowSkills,
    });
    allowlistMatches.push(...evaluation.allowlistMatches);
    if (!evaluation.allowlistSatisfied) {
      return {
        analysisOk: true,
        allowlistSatisfied: false,
        allowlistMatches,
        segments,
      };
    }
  }

  return {
    analysisOk: true,
    allowlistSatisfied: true,
    allowlistMatches,
    segments,
  };
}
