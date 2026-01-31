<<<<<<< HEAD
import type { MoltbotConfig } from "../../../config/config.js";
=======
>>>>>>> 9c4cbaab7 (chore: Enable eslint/no-unused-vars.)
import { isSubagentSessionKey } from "../../../routing/session-key.js";
import { resolveHookConfig } from "../../config.js";
import { isAgentBootstrapEvent, type HookHandler } from "../../hooks.js";
import { applySoulEvilOverride, resolveSoulEvilConfigFromHook } from "../../soul-evil.js";

const HOOK_KEY = "soul-evil";

const soulEvilHook: HookHandler = async (event) => {
  if (!isAgentBootstrapEvent(event)) {
    return;
  }

  const context = event.context;
<<<<<<< HEAD
  if (context.sessionKey && isSubagentSessionKey(context.sessionKey)) return;
<<<<<<< HEAD
  const cfg = context.cfg as MoltbotConfig | undefined;
=======
=======
  if (context.sessionKey && isSubagentSessionKey(context.sessionKey)) {
    return;
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  const cfg = context.cfg;
>>>>>>> 15792b153 (chore: Enable more lint rules, disable some that trigger a lot. Will clean up later.)
  const hookConfig = resolveHookConfig(cfg, HOOK_KEY);
  if (!hookConfig || hookConfig.enabled === false) {
    return;
  }

  const soulConfig = resolveSoulEvilConfigFromHook(hookConfig as Record<string, unknown>, {
    warn: (message) => console.warn(`[soul-evil] ${message}`),
  });
  if (!soulConfig) {
    return;
  }

  const workspaceDir = context.workspaceDir;
  if (!workspaceDir || !Array.isArray(context.bootstrapFiles)) {
    return;
  }

  const updated = await applySoulEvilOverride({
    files: context.bootstrapFiles,
    workspaceDir,
    config: soulConfig,
    userTimezone: cfg?.agents?.defaults?.userTimezone,
    log: {
      warn: (message) => console.warn(`[soul-evil] ${message}`),
      debug: (message) => console.debug?.(`[soul-evil] ${message}`),
    },
  });

  context.bootstrapFiles = updated;
};

export default soulEvilHook;
