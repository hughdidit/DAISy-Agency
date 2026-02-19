import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { ensureSandboxWorkspaceForSession } from "../../agents/sandbox.js";
import type { MoltbotConfig } from "../../config/config.js";
=======
import { assertSandboxPath } from "../../agents/sandbox-paths.js";
import { ensureSandboxWorkspaceForSession } from "../../agents/sandbox.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { OpenClawConfig } from "../../config/config.js";
import type { MsgContext, TemplateContext } from "../templating.js";
import { assertSandboxPath } from "../../agents/sandbox-paths.js";
import { ensureSandboxWorkspaceForSession } from "../../agents/sandbox.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { assertSandboxPath } from "../../agents/sandbox-paths.js";
import { ensureSandboxWorkspaceForSession } from "../../agents/sandbox.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "../../config/config.js";
import type { MsgContext, TemplateContext } from "../templating.js";
import { assertSandboxPath } from "../../agents/sandbox-paths.js";
import { ensureSandboxWorkspaceForSession } from "../../agents/sandbox.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { assertSandboxPath } from "../../agents/sandbox-paths.js";
import { ensureSandboxWorkspaceForSession } from "../../agents/sandbox.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
=======
import { assertSandboxPath } from "../../agents/sandbox-paths.js";
import { ensureSandboxWorkspaceForSession } from "../../agents/sandbox.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> 771af4091 (chore(ci): fix main check blockers and stabilize tests)
=======
import { assertSandboxPath } from "../../agents/sandbox-paths.js";
import { ensureSandboxWorkspaceForSession } from "../../agents/sandbox.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> 0e85380e5 (style: format files and fix safe-bins e2e typing)
import { logVerbose } from "../../globals.js";
import { CONFIG_DIR } from "../../utils.js";
import type { MsgContext, TemplateContext } from "../templating.js";

export async function stageSandboxMedia(params: {
  ctx: MsgContext;
  sessionCtx: TemplateContext;
  cfg: MoltbotConfig;
  sessionKey?: string;
  workspaceDir: string;
}) {
  const { ctx, sessionCtx, cfg, sessionKey, workspaceDir } = params;
  const hasPathsArray = Array.isArray(ctx.MediaPaths) && ctx.MediaPaths.length > 0;
  const pathsFromArray = Array.isArray(ctx.MediaPaths) ? ctx.MediaPaths : undefined;
  const rawPaths =
    pathsFromArray && pathsFromArray.length > 0
      ? pathsFromArray
      : ctx.MediaPath?.trim()
        ? [ctx.MediaPath.trim()]
        : [];
  if (rawPaths.length === 0 || !sessionKey) {
    return;
  }

  const sandbox = await ensureSandboxWorkspaceForSession({
    config: cfg,
    sessionKey,
    workspaceDir,
  });

  // For remote attachments without sandbox, use ~/.clawdbot/media (not agent workspace for privacy)
  const remoteMediaCacheDir = ctx.MediaRemoteHost
    ? path.join(CONFIG_DIR, "media", "remote-cache", sessionKey)
    : null;
  const effectiveWorkspaceDir = sandbox?.workspaceDir ?? remoteMediaCacheDir;
  if (!effectiveWorkspaceDir) {
    return;
  }

  const resolveAbsolutePath = (value: string): string | null => {
    let resolved = value.trim();
    if (!resolved) {
      return null;
    }
    if (resolved.startsWith("file://")) {
      try {
        resolved = fileURLToPath(resolved);
      } catch {
        return null;
      }
    }
    if (!path.isAbsolute(resolved)) {
      return null;
    }
    return resolved;
  };

  try {
    // For sandbox: <workspace>/media/inbound, for remote cache: use dir directly
    const destDir = sandbox
      ? path.join(effectiveWorkspaceDir, "media", "inbound")
      : effectiveWorkspaceDir;
    await fs.mkdir(destDir, { recursive: true });

    const usedNames = new Set<string>();
    const staged = new Map<string, string>(); // absolute source -> relative sandbox path

    for (const raw of rawPaths) {
      const source = resolveAbsolutePath(raw);
      if (!source) {
        continue;
      }
      if (staged.has(source)) {
        continue;
      }

      const baseName = path.basename(source);
      if (!baseName) {
        continue;
      }
      const parsed = path.parse(baseName);
      let fileName = baseName;
      let suffix = 1;
      while (usedNames.has(fileName)) {
        fileName = `${parsed.name}-${suffix}${parsed.ext}`;
        suffix += 1;
      }
      usedNames.add(fileName);

      const dest = path.join(destDir, fileName);
      if (ctx.MediaRemoteHost) {
        // Always use SCP when remote host is configured - local paths refer to remote machine
        await scpFile(ctx.MediaRemoteHost, source, dest);
      } else {
        await fs.copyFile(source, dest);
      }
      // For sandbox use relative path, for remote cache use absolute path
      const stagedPath = sandbox ? path.posix.join("media", "inbound", fileName) : dest;
      staged.set(source, stagedPath);
    }

    const rewriteIfStaged = (value: string | undefined): string | undefined => {
      const raw = value?.trim();
      if (!raw) {
        return value;
      }
      const abs = resolveAbsolutePath(raw);
      if (!abs) {
        return value;
      }
      const mapped = staged.get(abs);
      return mapped ?? value;
    };

    const nextMediaPaths = hasPathsArray ? rawPaths.map((p) => rewriteIfStaged(p) ?? p) : undefined;
    if (nextMediaPaths) {
      ctx.MediaPaths = nextMediaPaths;
      sessionCtx.MediaPaths = nextMediaPaths;
      ctx.MediaPath = nextMediaPaths[0];
      sessionCtx.MediaPath = nextMediaPaths[0];
    } else {
      const rewritten = rewriteIfStaged(ctx.MediaPath);
      if (rewritten && rewritten !== ctx.MediaPath) {
        ctx.MediaPath = rewritten;
        sessionCtx.MediaPath = rewritten;
      }
    }

    if (Array.isArray(ctx.MediaUrls) && ctx.MediaUrls.length > 0) {
      const nextUrls = ctx.MediaUrls.map((u) => rewriteIfStaged(u) ?? u);
      ctx.MediaUrls = nextUrls;
      sessionCtx.MediaUrls = nextUrls;
    }
    const rewrittenUrl = rewriteIfStaged(ctx.MediaUrl);
    if (rewrittenUrl && rewrittenUrl !== ctx.MediaUrl) {
      ctx.MediaUrl = rewrittenUrl;
      sessionCtx.MediaUrl = rewrittenUrl;
    }
  } catch (err) {
    logVerbose(`Failed to stage inbound media for sandbox: ${String(err)}`);
  }
}

async function scpFile(remoteHost: string, remotePath: string, localPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "/usr/bin/scp",
      [
        "-o",
        "BatchMode=yes",
        "-o",
        "StrictHostKeyChecking=accept-new",
        `${remoteHost}:${remotePath}`,
        localPath,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    let stderr = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`scp failed (${code}): ${stderr.trim()}`));
      }
    });
  });
}
