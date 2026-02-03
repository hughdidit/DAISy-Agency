import fs from "node:fs";
import path from "node:path";
<<<<<<< HEAD

import { runCommandWithTimeout } from "../process/exec.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";
=======
import { fileURLToPath } from "node:url";
import { runCommandWithTimeout } from "../process/exec.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";
import { resolveOpenClawPackageRoot, resolveOpenClawPackageRootSync } from "./openclaw-root.js";
>>>>>>> 5935c4d23 (fix(ui): fix web UI after tsdown migration and typing changes)

export function resolveControlUiRepoRoot(
  argv1: string | undefined = process.argv[1],
): string | null {
  if (!argv1) {
    return null;
  }
  const normalized = path.resolve(argv1);
  const parts = normalized.split(path.sep);
  const srcIndex = parts.lastIndexOf("src");
  if (srcIndex !== -1) {
    const root = parts.slice(0, srcIndex).join(path.sep);
    if (fs.existsSync(path.join(root, "ui", "vite.config.ts"))) {
      return root;
    }
  }

  let dir = path.dirname(normalized);
  for (let i = 0; i < 8; i++) {
    if (
      fs.existsSync(path.join(dir, "package.json")) &&
      fs.existsSync(path.join(dir, "ui", "vite.config.ts"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return null;
}

export function resolveControlUiDistIndexPath(
  argv1: string | undefined = process.argv[1],
<<<<<<< HEAD
): string | null {
  if (!argv1) return null;
=======
): Promise<string | null> {
  if (!argv1) {
    return null;
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  const normalized = path.resolve(argv1);

  // Case 1: entrypoint is directly inside dist/ (e.g., dist/entry.js)
  const distDir = path.dirname(normalized);
  if (path.basename(distDir) === "dist") {
    return path.join(distDir, "control-ui", "index.html");
  }

<<<<<<< HEAD
  // Case 2: npm global install - entrypoint is at package root (e.g., openclaw.mjs)
  // or in node_modules/.bin/. Walk up to find package.json with dist/control-ui/
  const parts = normalized.split(path.sep);

  // Handle .bin symlink: node_modules/.bin/openclaw -> node_modules/openclaw/...
  const binIndex = parts.lastIndexOf(".bin");
  if (binIndex > 0 && parts[binIndex - 1] === "node_modules") {
    const binName = path.basename(normalized);
    const nodeModulesDir = parts.slice(0, binIndex).join(path.sep);
    const pkgPath = path.join(nodeModulesDir, binName, "dist", "control-ui", "index.html");
    if (fs.existsSync(pkgPath)) return pkgPath;
  }

  // Walk up from entrypoint looking for package with dist/control-ui/
  let dir = path.dirname(normalized);
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, "dist", "control-ui", "index.html");
    if (fs.existsSync(path.join(dir, "package.json")) && fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
=======
  const packageRoot = await resolveOpenClawPackageRoot({ argv1: normalized });
  if (!packageRoot) {
    return null;
  }
  return path.join(packageRoot, "dist", "control-ui", "index.html");
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
}

export type ControlUiRootResolveOptions = {
  argv1?: string;
  moduleUrl?: string;
  cwd?: string;
  execPath?: string;
};

function addCandidate(candidates: Set<string>, value: string | null) {
  if (!value) {
    return;
  }
  candidates.add(path.resolve(value));
}

export function resolveControlUiRootOverrideSync(rootOverride: string): string | null {
  const resolved = path.resolve(rootOverride);
  try {
    const stats = fs.statSync(resolved);
    if (stats.isFile()) {
      return path.basename(resolved) === "index.html" ? path.dirname(resolved) : null;
    }
    if (stats.isDirectory()) {
      const indexPath = path.join(resolved, "index.html");
      return fs.existsSync(indexPath) ? resolved : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveControlUiRootSync(opts: ControlUiRootResolveOptions = {}): string | null {
  const candidates = new Set<string>();
  const argv1 = opts.argv1 ?? process.argv[1];
  const cwd = opts.cwd ?? process.cwd();
  const moduleDir = opts.moduleUrl ? path.dirname(fileURLToPath(opts.moduleUrl)) : null;
  const argv1Dir = argv1 ? path.dirname(path.resolve(argv1)) : null;
  const execDir = (() => {
    try {
      const execPath = opts.execPath ?? process.execPath;
      return path.dirname(fs.realpathSync(execPath));
    } catch {
      return null;
    }
  })();
  const packageRoot = resolveOpenClawPackageRootSync({
    argv1,
    moduleUrl: opts.moduleUrl,
    cwd,
  });

  // Packaged app: control-ui lives alongside the executable.
  addCandidate(candidates, execDir ? path.join(execDir, "control-ui") : null);
  if (moduleDir) {
    // dist/<bundle>.js -> dist/control-ui
    addCandidate(candidates, path.join(moduleDir, "control-ui"));
    // dist/gateway/control-ui.js -> dist/control-ui
    addCandidate(candidates, path.join(moduleDir, "../control-ui"));
    // src/gateway/control-ui.ts -> dist/control-ui
    addCandidate(candidates, path.join(moduleDir, "../../dist/control-ui"));
  }
  if (argv1Dir) {
    // openclaw.mjs or dist/<bundle>.js
    addCandidate(candidates, path.join(argv1Dir, "dist", "control-ui"));
    addCandidate(candidates, path.join(argv1Dir, "control-ui"));
  }
  if (packageRoot) {
    addCandidate(candidates, path.join(packageRoot, "dist", "control-ui"));
  }
  addCandidate(candidates, path.join(cwd, "dist", "control-ui"));

  for (const dir of candidates) {
    const indexPath = path.join(dir, "index.html");
    if (fs.existsSync(indexPath)) {
      return dir;
    }
  }
  return null;
}

export type EnsureControlUiAssetsResult = {
  ok: boolean;
  built: boolean;
  message?: string;
};

function summarizeCommandOutput(text: string): string | undefined {
  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    return undefined;
  }
  const last = lines.at(-1);
  if (!last) {
    return undefined;
  }
  return last.length > 240 ? `${last.slice(0, 239)}…` : last;
}

export async function ensureControlUiAssetsBuilt(
  runtime: RuntimeEnv = defaultRuntime,
  opts?: { timeoutMs?: number },
): Promise<EnsureControlUiAssetsResult> {
  const indexFromDist = resolveControlUiDistIndexPath(process.argv[1]);
  if (indexFromDist && fs.existsSync(indexFromDist)) {
    return { ok: true, built: false };
  }

  const repoRoot = resolveControlUiRepoRoot(process.argv[1]);
  if (!repoRoot) {
    const hint = indexFromDist
      ? `Missing Control UI assets at ${indexFromDist}`
      : "Missing Control UI assets";
    return {
      ok: false,
      built: false,
      message: `${hint}. Build them with \`pnpm ui:build\` (auto-installs UI deps).`,
    };
  }

  const indexPath = path.join(repoRoot, "dist", "control-ui", "index.html");
  if (fs.existsSync(indexPath)) {
    return { ok: true, built: false };
  }

  const uiScript = path.join(repoRoot, "scripts", "ui.js");
  if (!fs.existsSync(uiScript)) {
    return {
      ok: false,
      built: false,
      message: `Control UI assets missing but ${uiScript} is unavailable.`,
    };
  }

  runtime.log("Control UI assets missing; building (ui:build, auto-installs UI deps)…");

  const build = await runCommandWithTimeout([process.execPath, uiScript, "build"], {
    cwd: repoRoot,
    timeoutMs: opts?.timeoutMs ?? 10 * 60_000,
  });
  if (build.code !== 0) {
    return {
      ok: false,
      built: false,
      message: `Control UI build failed: ${summarizeCommandOutput(build.stderr) ?? `exit ${build.code}`}`,
    };
  }

  if (!fs.existsSync(indexPath)) {
    return {
      ok: false,
      built: true,
      message: `Control UI build completed but ${indexPath} is still missing.`,
    };
  }

  return { ok: true, built: true };
}
