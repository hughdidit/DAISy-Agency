import { listAgentIds, resolveAgentWorkspaceDir } from "../../../agents/agent-scope.js";
import { createDefaultDeps } from "../../../cli/deps.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../../../config/config.js";
=======
>>>>>>> 48e6b4fca (fix: run BOOT.md for each configured agent at startup (#20569))
import { runBootOnce } from "../../../gateway/boot.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

<<<<<<< HEAD
type BootHookContext = {
  cfg?: MoltbotConfig;
  workspaceDir?: string;
  deps?: CliDeps;
};
=======
const log = createSubsystemLogger("hooks/boot-md");
>>>>>>> 48e6b4fca (fix: run BOOT.md for each configured agent at startup (#20569))

const runBootChecklist: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  if (!event.context.cfg) {
    return;
  }

  const cfg = event.context.cfg;
  const deps = event.context.deps ?? createDefaultDeps();
  const agentIds = listAgentIds(cfg);

  for (const agentId of agentIds) {
    const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
    const result = await runBootOnce({ cfg, deps, workspaceDir, agentId });
    if (result.status === "failed") {
      log.warn("boot-md failed for agent startup run", {
        agentId,
        workspaceDir,
        reason: result.reason,
      });
      continue;
    }
    if (result.status === "skipped") {
      log.debug("boot-md skipped for agent startup run", {
        agentId,
        workspaceDir,
        reason: result.reason,
      });
    }
  }
};

export default runBootChecklist;
