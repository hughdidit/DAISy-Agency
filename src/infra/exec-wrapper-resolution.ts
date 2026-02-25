import path from "node:path";

export const MAX_DISPATCH_WRAPPER_DEPTH = 4;

export const POSIX_SHELL_WRAPPERS = new Set(["ash", "bash", "dash", "fish", "ksh", "sh", "zsh"]);
export const WINDOWS_CMD_WRAPPERS = new Set(["cmd.exe", "cmd"]);
export const POWERSHELL_WRAPPERS = new Set(["powershell", "powershell.exe", "pwsh", "pwsh.exe"]);
export const DISPATCH_WRAPPER_EXECUTABLES = new Set([
  "chrt",
  "chrt.exe",
  "doas",
  "doas.exe",
  "env",
  "env.exe",
  "ionice",
  "ionice.exe",
  "nice",
  "nice.exe",
  "nohup",
  "nohup.exe",
  "setsid",
  "setsid.exe",
  "stdbuf",
  "stdbuf.exe",
  "sudo",
  "sudo.exe",
  "taskset",
  "taskset.exe",
  "timeout",
  "timeout.exe",
]);

const POSIX_INLINE_COMMAND_FLAGS = new Set(["-lc", "-c", "--command"]);
const POWERSHELL_INLINE_COMMAND_FLAGS = new Set(["-c", "-command", "--command"]);

const ENV_OPTIONS_WITH_VALUE = new Set([
  "-u",
  "--unset",
  "-c",
  "--chdir",
  "-s",
  "--split-string",
  "--default-signal",
  "--ignore-signal",
  "--block-signal",
]);
const ENV_FLAG_OPTIONS = new Set(["-i", "--ignore-environment", "-0", "--null"]);
const NICE_OPTIONS_WITH_VALUE = new Set(["-n", "--adjustment", "--priority"]);
const STDBUF_OPTIONS_WITH_VALUE = new Set(["-i", "--input", "-o", "--output", "-e", "--error"]);
const TIMEOUT_FLAG_OPTIONS = new Set(["--foreground", "--preserve-status", "-v", "--verbose"]);
const TIMEOUT_OPTIONS_WITH_VALUE = new Set(["-k", "--kill-after", "-s", "--signal"]);
const TRANSPARENT_DISPATCH_WRAPPERS = new Set(["nice", "nohup", "stdbuf", "timeout"]);

type ShellWrapperKind = "posix" | "cmd" | "powershell";

type ShellWrapperSpec = {
  kind: ShellWrapperKind;
  names: ReadonlySet<string>;
};

const SHELL_WRAPPER_SPECS: ReadonlyArray<ShellWrapperSpec> = [
  { kind: "posix", names: POSIX_SHELL_WRAPPERS },
  { kind: "cmd", names: WINDOWS_CMD_WRAPPERS },
  { kind: "powershell", names: POWERSHELL_WRAPPERS },
];

export type ShellWrapperCommand = {
  isWrapper: boolean;
  command: string | null;
};

export function basenameLower(token: string): string {
  const win = path.win32.basename(token);
  const posix = path.posix.basename(token);
  const base = win.length < posix.length ? win : posix;
  return base.trim().toLowerCase();
}

function normalizeRawCommand(rawCommand?: string | null): string | null {
  const trimmed = rawCommand?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function findShellWrapperSpec(baseExecutable: string): ShellWrapperSpec | null {
  for (const spec of SHELL_WRAPPER_SPECS) {
    if (spec.names.has(baseExecutable)) {
      return spec;
    }
  }
  return null;
}

export function isEnvAssignment(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token);
}

export function unwrapEnvInvocation(argv: string[]): string[] | null {
  let idx = 1;
  let expectsOptionValue = false;
  while (idx < argv.length) {
    const token = argv[idx]?.trim() ?? "";
    if (!token) {
      idx += 1;
      continue;
    }
    if (expectsOptionValue) {
      expectsOptionValue = false;
      idx += 1;
      continue;
    }
    if (token === "--" || token === "-") {
      idx += 1;
      break;
    }
    if (isEnvAssignment(token)) {
      idx += 1;
      continue;
    }
    if (token.startsWith("-") && token !== "-") {
      const lower = token.toLowerCase();
      const [flag] = lower.split("=", 2);
      if (ENV_FLAG_OPTIONS.has(flag)) {
        idx += 1;
        continue;
      }
      if (ENV_OPTIONS_WITH_VALUE.has(flag)) {
        if (!lower.includes("=")) {
          expectsOptionValue = true;
        }
        idx += 1;
        continue;
      }
      if (
        lower.startsWith("-u") ||
        lower.startsWith("-c") ||
        lower.startsWith("-s") ||
        lower.startsWith("--unset=") ||
        lower.startsWith("--chdir=") ||
        lower.startsWith("--split-string=") ||
        lower.startsWith("--default-signal=") ||
        lower.startsWith("--ignore-signal=") ||
        lower.startsWith("--block-signal=")
      ) {
        idx += 1;
        continue;
      }
      return null;
    }
    break;
  }
  return idx < argv.length ? argv.slice(idx) : null;
}

function unwrapNiceInvocation(argv: string[]): string[] | null {
  let idx = 1;
  let expectsOptionValue = false;
  while (idx < argv.length) {
    const token = argv[idx]?.trim() ?? "";
    if (!token) {
      idx += 1;
      continue;
    }
    if (expectsOptionValue) {
      expectsOptionValue = false;
      idx += 1;
      continue;
    }
    if (token === "--") {
      idx += 1;
      break;
    }
    if (token.startsWith("-") && token !== "-") {
      const lower = token.toLowerCase();
      const [flag] = lower.split("=", 2);
      if (/^-\d+$/.test(lower)) {
        idx += 1;
        continue;
      }
      if (NICE_OPTIONS_WITH_VALUE.has(flag)) {
        if (!lower.includes("=") && lower === flag) {
          expectsOptionValue = true;
        }
        idx += 1;
        continue;
      }
      if (lower.startsWith("-n") && lower.length > 2) {
        idx += 1;
        continue;
      }
      return null;
    }
    break;
  }
  if (expectsOptionValue) {
    return null;
  }
  return idx < argv.length ? argv.slice(idx) : null;
}

function unwrapNohupInvocation(argv: string[]): string[] | null {
  let idx = 1;
  while (idx < argv.length) {
    const token = argv[idx]?.trim() ?? "";
    if (!token) {
      idx += 1;
      continue;
    }
    if (token === "--") {
      idx += 1;
      break;
    }
    if (token.startsWith("-") && token !== "-") {
      const lower = token.toLowerCase();
      if (lower === "--help" || lower === "--version") {
        idx += 1;
        continue;
      }
      return null;
    }
    break;
  }
  return idx < argv.length ? argv.slice(idx) : null;
}

function unwrapStdbufInvocation(argv: string[]): string[] | null {
  let idx = 1;
  let expectsOptionValue = false;
  while (idx < argv.length) {
    const token = argv[idx]?.trim() ?? "";
    if (!token) {
      idx += 1;
      continue;
    }
    if (expectsOptionValue) {
      expectsOptionValue = false;
      idx += 1;
      continue;
    }
    if (token === "--") {
      idx += 1;
      break;
    }
    if (token.startsWith("-") && token !== "-") {
      const lower = token.toLowerCase();
      const [flag] = lower.split("=", 2);
      if (STDBUF_OPTIONS_WITH_VALUE.has(flag)) {
        if (!lower.includes("=")) {
          expectsOptionValue = true;
        }
        idx += 1;
        continue;
      }
      return null;
    }
    break;
  }
  if (expectsOptionValue) {
    return null;
  }
  return idx < argv.length ? argv.slice(idx) : null;
}

function unwrapTimeoutInvocation(argv: string[]): string[] | null {
  let idx = 1;
  let expectsOptionValue = false;
  while (idx < argv.length) {
    const token = argv[idx]?.trim() ?? "";
    if (!token) {
      idx += 1;
      continue;
    }
    if (expectsOptionValue) {
      expectsOptionValue = false;
      idx += 1;
      continue;
    }
    if (token === "--") {
      idx += 1;
      break;
    }
    if (token.startsWith("-") && token !== "-") {
      const lower = token.toLowerCase();
      const [flag] = lower.split("=", 2);
      if (TIMEOUT_FLAG_OPTIONS.has(flag)) {
        idx += 1;
        continue;
      }
      if (TIMEOUT_OPTIONS_WITH_VALUE.has(flag)) {
        if (!lower.includes("=")) {
          expectsOptionValue = true;
        }
        idx += 1;
        continue;
      }
      return null;
    }
    break;
  }
  if (expectsOptionValue || idx >= argv.length) {
    return null;
  }
  idx += 1; // duration
  return idx < argv.length ? argv.slice(idx) : null;
}

<<<<<<< HEAD
export function unwrapKnownDispatchWrapperInvocation(argv: string[]): string[] | null | undefined {
=======
export type DispatchWrapperUnwrapResult =
  | { kind: "not-wrapper" }
  | { kind: "blocked"; wrapper: string }
  | { kind: "unwrapped"; wrapper: string; argv: string[] };

export type DispatchWrapperExecutionPlan = {
  argv: string[];
  wrappers: string[];
  policyBlocked: boolean;
  blockedWrapper?: string;
};

function blockDispatchWrapper(wrapper: string): DispatchWrapperUnwrapResult {
  return { kind: "blocked", wrapper };
}

function unwrapDispatchWrapper(
  wrapper: string,
  unwrapped: string[] | null,
): DispatchWrapperUnwrapResult {
  return unwrapped
    ? { kind: "unwrapped", wrapper, argv: unwrapped }
    : blockDispatchWrapper(wrapper);
}

export function unwrapKnownDispatchWrapperInvocation(argv: string[]): DispatchWrapperUnwrapResult {
>>>>>>> a1c4bf07c (fix(security): harden exec wrapper allowlist execution parity)
  const token0 = argv[0]?.trim();
  if (!token0) {
    return undefined;
  }
  const base = basenameLower(token0);
  const normalizedBase = base.endsWith(".exe") ? base.slice(0, -4) : base;
  switch (normalizedBase) {
    case "env":
      return unwrapEnvInvocation(argv);
    case "nice":
      return unwrapNiceInvocation(argv);
    case "nohup":
      return unwrapNohupInvocation(argv);
    case "stdbuf":
      return unwrapStdbufInvocation(argv);
    case "timeout":
      return unwrapTimeoutInvocation(argv);
    case "chrt":
    case "doas":
    case "ionice":
    case "setsid":
    case "sudo":
    case "taskset":
      return null;
    default:
      return undefined;
  }
}

export function unwrapDispatchWrappersForResolution(
  argv: string[],
  maxDepth = MAX_DISPATCH_WRAPPER_DEPTH,
): string[] {
  const plan = resolveDispatchWrapperExecutionPlan(argv, maxDepth);
  return plan.argv;
}

function isSemanticDispatchWrapperUsage(wrapper: string, argv: string[]): boolean {
  if (wrapper === "env") {
    return envInvocationUsesModifiers(argv);
  }
  return !TRANSPARENT_DISPATCH_WRAPPERS.has(wrapper);
}

export function resolveDispatchWrapperExecutionPlan(
  argv: string[],
  maxDepth = MAX_DISPATCH_WRAPPER_DEPTH,
): DispatchWrapperExecutionPlan {
  let current = argv;
  const wrappers: string[] = [];
  for (let depth = 0; depth < maxDepth; depth += 1) {
<<<<<<< HEAD
    const unwrapped = unwrapKnownDispatchWrapperInvocation(current);
    if (unwrapped === undefined) {
      break;
    }
    if (!unwrapped || unwrapped.length === 0) {
      break;
    }
    current = unwrapped;
=======
    const unwrap = unwrapKnownDispatchWrapperInvocation(current);
    if (unwrap.kind === "blocked") {
      return {
        argv: current,
        wrappers,
        policyBlocked: true,
        blockedWrapper: unwrap.wrapper,
      };
    }
    if (unwrap.kind !== "unwrapped" || unwrap.argv.length === 0) {
      break;
    }
    wrappers.push(unwrap.wrapper);
    if (isSemanticDispatchWrapperUsage(unwrap.wrapper, current)) {
      return {
        argv: current,
        wrappers,
        policyBlocked: true,
        blockedWrapper: unwrap.wrapper,
      };
    }
    current = unwrap.argv;
>>>>>>> a1c4bf07c (fix(security): harden exec wrapper allowlist execution parity)
  }
  if (wrappers.length >= maxDepth) {
    const overflow = unwrapKnownDispatchWrapperInvocation(current);
    if (overflow.kind === "blocked" || overflow.kind === "unwrapped") {
      return {
        argv: current,
        wrappers,
        policyBlocked: true,
        blockedWrapper: overflow.wrapper,
      };
    }
  }
  return { argv: current, wrappers, policyBlocked: false };
}

function extractPosixShellInlineCommand(argv: string[]): string | null {
  const flag = argv[1]?.trim();
  if (!flag) {
    return null;
  }
  if (!POSIX_INLINE_COMMAND_FLAGS.has(flag.toLowerCase())) {
    return null;
  }
  const cmd = argv[2]?.trim();
  return cmd ? cmd : null;
}

function extractCmdInlineCommand(argv: string[]): string | null {
  const idx = argv.findIndex((item) => item.trim().toLowerCase() === "/c");
  if (idx === -1) {
    return null;
  }
  const tail = argv.slice(idx + 1);
  if (tail.length === 0) {
    return null;
  }
  const cmd = tail.join(" ").trim();
  return cmd.length > 0 ? cmd : null;
}

function extractPowerShellInlineCommand(argv: string[]): string | null {
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i]?.trim();
    if (!token) {
      continue;
    }
    const lower = token.toLowerCase();
    if (lower === "--") {
      break;
    }
    if (POWERSHELL_INLINE_COMMAND_FLAGS.has(lower)) {
      const cmd = argv[i + 1]?.trim();
      return cmd ? cmd : null;
    }
  }
  return null;
}

function extractShellWrapperPayload(argv: string[], spec: ShellWrapperSpec): string | null {
  switch (spec.kind) {
    case "posix":
      return extractPosixShellInlineCommand(argv);
    case "cmd":
      return extractCmdInlineCommand(argv);
    case "powershell":
      return extractPowerShellInlineCommand(argv);
  }
}

function extractShellWrapperCommandInternal(
  argv: string[],
  rawCommand: string | null,
  depth: number,
): ShellWrapperCommand {
  if (depth >= MAX_DISPATCH_WRAPPER_DEPTH) {
    return { isWrapper: false, command: null };
  }

  const token0 = argv[0]?.trim();
  if (!token0) {
    return { isWrapper: false, command: null };
  }

  const base0 = basenameLower(token0);
  if (DISPATCH_WRAPPER_EXECUTABLES.has(base0)) {
    const unwrapped = unwrapKnownDispatchWrapperInvocation(argv);
    if (!unwrapped) {
      return { isWrapper: false, command: null };
    }
    return extractShellWrapperCommandInternal(unwrapped, rawCommand, depth + 1);
  }

  const wrapper = findShellWrapperSpec(base0);
  if (!wrapper) {
    return { isWrapper: false, command: null };
  }

  const payload = extractShellWrapperPayload(argv, wrapper);
  if (!payload) {
    return { isWrapper: false, command: null };
  }

  return { isWrapper: true, command: rawCommand ?? payload };
}

export function extractShellWrapperCommand(
  argv: string[],
  rawCommand?: string | null,
): ShellWrapperCommand {
  return extractShellWrapperCommandInternal(argv, normalizeRawCommand(rawCommand), 0);
}
