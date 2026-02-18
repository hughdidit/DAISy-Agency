import fs from "node:fs/promises";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import type { MoltbotConfig } from "../../config/config.js";
=======
import type { OpenClawConfig } from "../../config/config.js";
import type { SandboxContext, SandboxWorkspaceInfo } from "./types.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { OpenClawConfig } from "../../config/config.js";
import type { SandboxContext, SandboxWorkspaceInfo } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "../../config/config.js";
import type { SandboxContext, SandboxWorkspaceInfo } from "./types.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { DEFAULT_BROWSER_EVALUATE_ENABLED } from "../../browser/constants.js";
import { ensureBrowserControlAuth, resolveBrowserControlAuth } from "../../browser/control-auth.js";
import type { OpenClawConfig } from "../../config/config.js";
import { loadConfig } from "../../config/config.js";
>>>>>>> 4711a943e (fix(browser): authenticate sandbox browser bridge server)
import { defaultRuntime } from "../../runtime.js";
import { resolveUserPath } from "../../utils.js";
import { DEFAULT_BROWSER_EVALUATE_ENABLED } from "../../browser/constants.js";
import { syncSkillsToWorkspace } from "../skills.js";
import { DEFAULT_AGENT_WORKSPACE_DIR } from "../workspace.js";
import { ensureSandboxBrowser } from "./browser.js";
import { resolveSandboxConfigForAgent } from "./config.js";
import { ensureSandboxContainer } from "./docker.js";
import { maybePruneSandboxes } from "./prune.js";
import { resolveSandboxRuntimeStatus } from "./runtime-status.js";
import { resolveSandboxScopeKey, resolveSandboxWorkspaceDir } from "./shared.js";
import type { SandboxContext, SandboxWorkspaceInfo } from "./types.js";
import { ensureSandboxWorkspace } from "./workspace.js";

async function ensureSandboxWorkspaceLayout(params: {
  cfg: ReturnType<typeof resolveSandboxConfigForAgent>;
  rawSessionKey: string;
  config?: OpenClawConfig;
  workspaceDir?: string;
}): Promise<{
  agentWorkspaceDir: string;
  scopeKey: string;
  sandboxWorkspaceDir: string;
  workspaceDir: string;
}> {
  const { cfg, rawSessionKey } = params;

  const agentWorkspaceDir = resolveUserPath(
    params.workspaceDir?.trim() || DEFAULT_AGENT_WORKSPACE_DIR,
  );
  const workspaceRoot = resolveUserPath(cfg.workspaceRoot);
  const scopeKey = resolveSandboxScopeKey(cfg.scope, rawSessionKey);
  const sandboxWorkspaceDir =
    cfg.scope === "shared" ? workspaceRoot : resolveSandboxWorkspaceDir(workspaceRoot, scopeKey);
  const workspaceDir = cfg.workspaceAccess === "rw" ? agentWorkspaceDir : sandboxWorkspaceDir;

  if (workspaceDir === sandboxWorkspaceDir) {
    await ensureSandboxWorkspace(
      sandboxWorkspaceDir,
      agentWorkspaceDir,
      params.config?.agents?.defaults?.skipBootstrap,
    );
    if (cfg.workspaceAccess !== "rw") {
      try {
        await syncSkillsToWorkspace({
          sourceWorkspaceDir: agentWorkspaceDir,
          targetWorkspaceDir: sandboxWorkspaceDir,
          config: params.config,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        defaultRuntime.error?.(`Sandbox skill sync failed: ${message}`);
      }
    }
  } else {
    await fs.mkdir(workspaceDir, { recursive: true });
  }

  return { agentWorkspaceDir, scopeKey, sandboxWorkspaceDir, workspaceDir };
}

<<<<<<< HEAD
export async function resolveSandboxContext(params: {
  config?: MoltbotConfig;
  sessionKey?: string;
  workspaceDir?: string;
}): Promise<SandboxContext | null> {
=======
function resolveSandboxSession(params: { config?: OpenClawConfig; sessionKey?: string }) {
>>>>>>> d4476c689 (refactor(sandbox): dedupe session resolution)
  const rawSessionKey = params.sessionKey?.trim();
  if (!rawSessionKey) {
    return null;
  }

  const runtime = resolveSandboxRuntimeStatus({
    cfg: params.config,
    sessionKey: rawSessionKey,
  });
  if (!runtime.sandboxed) {
    return null;
  }

  const cfg = resolveSandboxConfigForAgent(params.config, runtime.agentId);
  return { rawSessionKey, runtime, cfg };
}

export async function resolveSandboxContext(params: {
  config?: OpenClawConfig;
  sessionKey?: string;
  workspaceDir?: string;
}): Promise<SandboxContext | null> {
  const resolved = resolveSandboxSession(params);
  if (!resolved) {
    return null;
  }
  const { rawSessionKey, cfg } = resolved;

  await maybePruneSandboxes(cfg);

  const { agentWorkspaceDir, scopeKey, workspaceDir } = await ensureSandboxWorkspaceLayout({
    cfg,
    rawSessionKey,
    config: params.config,
    workspaceDir: params.workspaceDir,
  });

  const containerName = await ensureSandboxContainer({
    sessionKey: rawSessionKey,
    workspaceDir,
    agentWorkspaceDir,
    cfg,
  });

  const evaluateEnabled =
    params.config?.browser?.evaluateEnabled ?? DEFAULT_BROWSER_EVALUATE_ENABLED;

  const bridgeAuth = cfg.browser.enabled
    ? await (async () => {
        // Sandbox browser bridge server runs on a loopback TCP port; always wire up
        // the same auth that loopback browser clients will send (token/password).
        const cfgForAuth = params.config ?? loadConfig();
        let browserAuth = resolveBrowserControlAuth(cfgForAuth);
        try {
          const ensured = await ensureBrowserControlAuth({ cfg: cfgForAuth });
          browserAuth = ensured.auth;
        } catch (error) {
          const message = error instanceof Error ? error.message : JSON.stringify(error);
          defaultRuntime.error?.(`Sandbox browser auth ensure failed: ${message}`);
        }
        return browserAuth;
      })()
    : undefined;
  const browser = await ensureSandboxBrowser({
    scopeKey,
    workspaceDir,
    agentWorkspaceDir,
    cfg,
    evaluateEnabled,
    bridgeAuth,
  });

  return {
    enabled: true,
    sessionKey: rawSessionKey,
    workspaceDir,
    agentWorkspaceDir,
    workspaceAccess: cfg.workspaceAccess,
    containerName,
    containerWorkdir: cfg.docker.workdir,
    docker: cfg.docker,
    tools: cfg.tools,
    browserAllowHostControl: cfg.browser.allowHostControl,
    browser: browser ?? undefined,
  };
}

export async function ensureSandboxWorkspaceForSession(params: {
  config?: MoltbotConfig;
  sessionKey?: string;
  workspaceDir?: string;
}): Promise<SandboxWorkspaceInfo | null> {
  const resolved = resolveSandboxSession(params);
  if (!resolved) {
    return null;
  }
  const { rawSessionKey, cfg } = resolved;

  const { workspaceDir } = await ensureSandboxWorkspaceLayout({
    cfg,
    rawSessionKey,
    config: params.config,
    workspaceDir: params.workspaceDir,
  });

  return {
    workspaceDir,
    containerWorkdir: cfg.docker.workdir,
  };
}
