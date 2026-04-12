import fs from "node:fs/promises";
import path from "node:path";
import {
  resolveAgentDir,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
} from "../agents/agent-scope.js";
import { ensureAuthProfileStore } from "../agents/auth-profiles.js";
import { resolveAuthStorePath } from "../agents/auth-profiles/paths.js";
import { buildDelegatePreset, isDelegateTier } from "../agents/delegate-config.js";
import { DEFAULT_AGENTS_FILENAME, DEFAULT_IDENTITY_FILENAME } from "../agents/workspace.js";
import { writeConfigFile } from "../config/config.js";
import { logConfigUpdated } from "../config/logging.js";
import { DEFAULT_AGENT_ID, normalizeAgentId } from "../routing/session-key.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { resolveUserPath, shortenHomePath } from "../utils.js";
import { createClackPrompter } from "../wizard/clack-prompter.js";
import { WizardCancelledError } from "../wizard/prompts.js";
import {
  applyAgentBindings,
  buildChannelBindings,
  describeBinding,
  parseBindingSpecs,
} from "./agents.bindings.js";
import { createQuietRuntime, requireValidConfig } from "./agents.command-shared.js";
import { applyAgentConfig, findAgentEntryIndex, listAgentEntries } from "./agents.config.js";
import { applyAgentGwsBindings } from "./agents.gws-bindings.js";
import { promptAuthChoiceGrouped } from "./auth-choice-prompt.js";
import { applyAuthChoice, warnIfModelConfigLooksOff } from "./auth-choice.js";
import { setupChannels } from "./onboard-channels.js";
import { ensureWorkspaceAndSessions } from "./onboard-helpers.js";
import type { ChannelChoice } from "./onboard-types.js";

type AgentsAddOptions = {
  name?: string;
  workspace?: string;
  model?: string;
  agentDir?: string;
  preset?: string;
  delegateTier?: string;
  bind?: string[];
  gwsRoute?: string;
  subagentGwsRoute?: string;
  nonInteractive?: boolean;
  json?: boolean;
};

async function fileExists(pathname: string): Promise<boolean> {
  try {
    await fs.stat(pathname);
    return true;
  } catch {
    return false;
  }
}

function resolveDelegatePreset(params: {
  preset?: string;
  delegateTier?: string;
  runtime: RuntimeEnv;
}): { enabled: boolean; tier: "tier1" | "tier2" | "tier3" } | null {
  const preset = params.preset?.trim().toLowerCase();
  const delegateTier = params.delegateTier?.trim().toLowerCase();
  if (preset && preset !== "delegate") {
    params.runtime.error(`Unsupported preset "${params.preset}". Supported presets: delegate.`);
    params.runtime.exit(1);
    return null;
  }
  if (delegateTier && preset !== "delegate") {
    params.runtime.error("--delegate-tier requires --preset delegate.");
    params.runtime.exit(1);
    return null;
  }
  if (!preset) {
    return { enabled: false, tier: "tier1" };
  }
  if (delegateTier && !isDelegateTier(delegateTier)) {
    params.runtime.error(
      `Unsupported delegate tier "${params.delegateTier}". Use tier1, tier2, or tier3.`,
    );
    params.runtime.exit(1);
    return null;
  }
  return {
    enabled: true,
    tier: delegateTier && isDelegateTier(delegateTier) ? delegateTier : "tier1",
  };
}

function buildDelegateIdentityContent(params: {
  agentName: string;
  agentId: string;
  tier: "tier1" | "tier2" | "tier3";
}) {
  return [
    "# IDENTITY.md - Agent Identity",
    "",
    `- Name: ${params.agentName}`,
    "- Creature: Delegate agent",
    "- Vibe: Careful, scoped, least-privilege assistant",
    "- Theme: delegate",
    "",
    "## Role",
    "",
    `${params.agentName} is a delegate agent operating under ${params.tier} constraints.`,
    `Keep work scoped to delegated tasks and preserve isolation from other agent state (${params.agentId}).`,
    "",
  ].join("\n");
}

function buildDelegateAgentsContent(params: {
  agentName: string;
  agentId: string;
  tier: "tier1" | "tier2" | "tier3";
}) {
  const tierLine =
    params.tier === "tier1"
      ? "Prefer read-only actions and drafting. Do not send or mutate external state unless explicitly permitted."
      : params.tier === "tier2"
        ? "Operate within explicit send-on-behalf permissions only. Keep write actions narrow and reviewable."
        : "Operate proactively only through isolated cron/session paths and explicit route bindings.";
  return [
    "# AGENTS.md - Delegate Workspace",
    "",
    `This workspace belongs to the delegate agent "${params.agentName}" (${params.agentId}).`,
    "",
    "## Standing Orders",
    "",
    "- Keep main-agent state, auth, and workspace separate unless an explicit route or tool binding allows otherwise.",
    "- Stay inside the delegated scope configured for this agent.",
    `- ${tierLine}`,
    "- Prefer local notes, drafts, and artifacts in this workspace.",
    "- Escalate when a task would exceed the configured route, tool, or sandbox posture.",
    "",
  ].join("\n");
}

async function scaffoldDelegateWorkspace(params: {
  workspaceDir: string;
  agentName: string;
  agentId: string;
  tier: "tier1" | "tier2" | "tier3";
  missingAgentsFile: boolean;
  missingIdentityFile: boolean;
}) {
  const writes: Promise<unknown>[] = [];
  if (params.missingAgentsFile) {
    writes.push(
      fs.writeFile(
        path.join(params.workspaceDir, DEFAULT_AGENTS_FILENAME),
        buildDelegateAgentsContent(params),
        "utf8",
      ),
    );
  }
  if (params.missingIdentityFile) {
    writes.push(
      fs.writeFile(
        path.join(params.workspaceDir, DEFAULT_IDENTITY_FILENAME),
        buildDelegateIdentityContent(params),
        "utf8",
      ),
    );
  }
  await Promise.all(writes);
}

export async function agentsAddCommand(
  opts: AgentsAddOptions,
  runtime: RuntimeEnv = defaultRuntime,
  params?: { hasFlags?: boolean },
) {
  const cfg = await requireValidConfig(runtime);
  if (!cfg) {
    return;
  }

  const workspaceFlag = opts.workspace?.trim();
  const nameInput = opts.name?.trim();
  const hasFlags = params?.hasFlags === true;
  const nonInteractive = Boolean(opts.nonInteractive || hasFlags);
  const delegatePreset = resolveDelegatePreset({
    preset: opts.preset,
    delegateTier: opts.delegateTier,
    runtime,
  });
  if (!delegatePreset) {
    return;
  }

  if (nonInteractive && !workspaceFlag) {
    runtime.error(
      "Non-interactive mode requires --workspace. Re-run without flags to use the wizard.",
    );
    runtime.exit(1);
    return;
  }

  if (nonInteractive) {
    if (!nameInput) {
      runtime.error("Agent name is required in non-interactive mode.");
      runtime.exit(1);
      return;
    }
    if (!workspaceFlag) {
      runtime.error(
        "Non-interactive mode requires --workspace. Re-run without flags to use the wizard.",
      );
      runtime.exit(1);
      return;
    }
    const agentId = normalizeAgentId(nameInput);
    if (agentId === DEFAULT_AGENT_ID) {
      runtime.error(`"${DEFAULT_AGENT_ID}" is reserved. Choose another name.`);
      runtime.exit(1);
      return;
    }
    if (agentId !== nameInput) {
      runtime.log(`Normalized agent id to "${agentId}".`);
    }
    if (findAgentEntryIndex(listAgentEntries(cfg), agentId) >= 0) {
      runtime.error(`Agent "${agentId}" already exists.`);
      runtime.exit(1);
      return;
    }

    const workspaceDir = resolveUserPath(workspaceFlag);
    const agentDir = opts.agentDir?.trim()
      ? resolveUserPath(opts.agentDir.trim())
      : resolveAgentDir(cfg, agentId);
    const model = opts.model?.trim();
    let nextConfig = applyAgentConfig(cfg, {
      agentId,
      name: nameInput,
      workspace: workspaceDir,
      agentDir,
      ...(model ? { model } : {}),
      ...(delegatePreset.enabled
        ? {
            identity: {
              name: nameInput,
              theme: "delegate",
            },
            ...buildDelegatePreset(agentId, delegatePreset.tier),
          }
        : {}),
    });

    const bindingParse = parseBindingSpecs({
      agentId,
      specs: opts.bind,
      config: nextConfig,
    });
    if (bindingParse.errors.length > 0) {
      runtime.error(bindingParse.errors.join("\n"));
      runtime.exit(1);
      return;
    }
    const bindingResult =
      bindingParse.bindings.length > 0
        ? applyAgentBindings(nextConfig, bindingParse.bindings)
        : { config: nextConfig, added: [], updated: [], skipped: [], conflicts: [] };
    const gwsRoute = opts.gwsRoute?.trim();
    const subagentGwsRoute = opts.subagentGwsRoute?.trim();
    if (subagentGwsRoute && !gwsRoute) {
      runtime.error("--subagent-gws-route requires --gws-route.");
      runtime.exit(1);
      return;
    }
    const gwsBindingResult = (() => {
      if (!gwsRoute) {
        return {
          ok: true as const,
          config: bindingResult.config,
          added: [],
          updated: [],
          skipped: [],
        };
      }
      const gwsBindingOptions: Parameters<typeof applyAgentGwsBindings>[1] = {
        agentId,
        routeName: gwsRoute,
      };
      if (subagentGwsRoute) {
        gwsBindingOptions.subagentRouteName = subagentGwsRoute;
      }
      return applyAgentGwsBindings(bindingResult.config, gwsBindingOptions);
    })();
    if (!gwsBindingResult.ok) {
      runtime.error(gwsBindingResult.errors.join("\n"));
      runtime.exit(1);
      return;
    }

    await writeConfigFile(gwsBindingResult.config);
    if (!opts.json) {
      logConfigUpdated(runtime);
    }
    const quietRuntime = opts.json ? createQuietRuntime(runtime) : runtime;
    await ensureWorkspaceAndSessions(workspaceDir, quietRuntime, {
      skipBootstrap: Boolean(gwsBindingResult.config.agents?.defaults?.skipBootstrap),
      agentId,
    });
    if (delegatePreset.enabled) {
      const missingDelegateAgentsFile = !(await fileExists(
        path.join(workspaceDir, DEFAULT_AGENTS_FILENAME),
      ));
      const missingDelegateIdentityFile = !(await fileExists(
        path.join(workspaceDir, DEFAULT_IDENTITY_FILENAME),
      ));
      await scaffoldDelegateWorkspace({
        workspaceDir,
        agentName: nameInput,
        agentId,
        tier: delegatePreset.tier,
        missingAgentsFile: missingDelegateAgentsFile,
        missingIdentityFile: missingDelegateIdentityFile,
      });
    }

    const payload = {
      agentId,
      name: nameInput,
      workspace: workspaceDir,
      agentDir,
      model,
      preset: delegatePreset.enabled ? "delegate" : undefined,
      delegateTier: delegatePreset.enabled ? delegatePreset.tier : undefined,
      bindings: {
        added: bindingResult.added.map(describeBinding),
        updated: bindingResult.updated.map(describeBinding),
        skipped: bindingResult.skipped.map(describeBinding),
        conflicts: bindingResult.conflicts.map(
          (conflict) => `${describeBinding(conflict.binding)} (agent=${conflict.existingAgentId})`,
        ),
      },
      gwsBindings: {
        added: gwsBindingResult.added,
        updated: gwsBindingResult.updated,
        skipped: gwsBindingResult.skipped,
      },
    };
    if (opts.json) {
      runtime.log(JSON.stringify(payload, null, 2));
    } else {
      runtime.log(`Agent: ${agentId}`);
      runtime.log(`Workspace: ${shortenHomePath(workspaceDir)}`);
      runtime.log(`Agent dir: ${shortenHomePath(agentDir)}`);
      if (delegatePreset.enabled) {
        runtime.log(`Preset: delegate (${delegatePreset.tier})`);
      }
      if (model) {
        runtime.log(`Model: ${model}`);
      }
      if (gwsBindingResult.added.length > 0 || gwsBindingResult.updated.length > 0) {
        runtime.log("GWS bindings:");
        for (const binding of [...gwsBindingResult.added, ...gwsBindingResult.updated]) {
          runtime.log(`- ${binding.subject} -> ${binding.routeName}`);
        }
      }
      if (bindingResult.conflicts.length > 0) {
        runtime.error(
          [
            "Skipped bindings already claimed by another agent:",
            ...bindingResult.conflicts.map(
              (conflict) =>
                `- ${describeBinding(conflict.binding)} (agent=${conflict.existingAgentId})`,
            ),
          ].join("\n"),
        );
      }
    }
    return;
  }

  const prompter = createClackPrompter();
  try {
    await prompter.intro("Add OpenClaw agent");
    const name =
      nameInput ??
      (await prompter.text({
        message: "Agent name",
        validate: (value) => {
          if (!value?.trim()) {
            return "Required";
          }
          const normalized = normalizeAgentId(value);
          if (normalized === DEFAULT_AGENT_ID) {
            return `"${DEFAULT_AGENT_ID}" is reserved. Choose another name.`;
          }
          return undefined;
        },
      }));

    const agentName = String(name ?? "").trim();
    const agentId = normalizeAgentId(agentName);
    if (agentName !== agentId) {
      await prompter.note(`Normalized id to "${agentId}".`, "Agent id");
    }

    const existingAgent = listAgentEntries(cfg).find(
      (agent) => normalizeAgentId(agent.id) === agentId,
    );
    if (existingAgent) {
      const shouldUpdate = await prompter.confirm({
        message: `Agent "${agentId}" already exists. Update it?`,
        initialValue: false,
      });
      if (!shouldUpdate) {
        await prompter.outro("No changes made.");
        return;
      }
    }

    const workspaceDefault = resolveAgentWorkspaceDir(cfg, agentId);
    const workspaceInput = await prompter.text({
      message: "Workspace directory",
      initialValue: workspaceDefault,
      validate: (value) => (value?.trim() ? undefined : "Required"),
    });
    const workspaceDir = resolveUserPath(String(workspaceInput ?? "").trim() || workspaceDefault);
    const agentDir = resolveAgentDir(cfg, agentId);

    let nextConfig = applyAgentConfig(cfg, {
      agentId,
      name: agentName,
      workspace: workspaceDir,
      agentDir,
      ...(delegatePreset.enabled
        ? {
            identity: {
              name: agentName,
              theme: "delegate",
            },
            ...buildDelegatePreset(agentId, delegatePreset.tier),
          }
        : {}),
    });

    const defaultAgentId = resolveDefaultAgentId(cfg);
    if (!delegatePreset.enabled && defaultAgentId !== agentId) {
      const sourceAuthPath = resolveAuthStorePath(resolveAgentDir(cfg, defaultAgentId));
      const destAuthPath = resolveAuthStorePath(agentDir);
      const sameAuthPath =
        path.resolve(sourceAuthPath).toLowerCase() === path.resolve(destAuthPath).toLowerCase();
      if (
        !sameAuthPath &&
        (await fileExists(sourceAuthPath)) &&
        !(await fileExists(destAuthPath))
      ) {
        const shouldCopy = await prompter.confirm({
          message: `Copy auth profiles from "${defaultAgentId}"?`,
          initialValue: false,
        });
        if (shouldCopy) {
          await fs.mkdir(path.dirname(destAuthPath), { recursive: true });
          await fs.copyFile(sourceAuthPath, destAuthPath);
          await prompter.note(`Copied auth profiles from "${defaultAgentId}".`, "Auth profiles");
        }
      }
    }

    if (delegatePreset.enabled) {
      await prompter.note(
        "Delegate preset uses strict per-agent auth isolation. Create the agent first, then configure auth directly in that delegate's agentDir.",
        "Delegate auth",
      );
    } else {
      const wantsAuth = await prompter.confirm({
        message: "Configure model/auth for this agent now?",
        initialValue: false,
      });
      if (wantsAuth) {
        const authStore = ensureAuthProfileStore(agentDir, {
          allowKeychainPrompt: false,
        });
        const authChoice = await promptAuthChoiceGrouped({
          prompter,
          store: authStore,
          includeSkip: true,
        });

        const authResult = await applyAuthChoice({
          authChoice,
          config: nextConfig,
          prompter,
          runtime,
          agentDir,
          setDefaultModel: false,
          agentId,
        });
        nextConfig = authResult.config;
        if (authResult.agentModelOverride) {
          nextConfig = applyAgentConfig(nextConfig, {
            agentId,
            model: authResult.agentModelOverride,
          });
        }
      }
    }

    await warnIfModelConfigLooksOff(nextConfig, prompter, {
      agentId,
      agentDir,
    });

    let selection: ChannelChoice[] = [];
    const channelAccountIds: Partial<Record<ChannelChoice, string>> = {};
    nextConfig = await setupChannels(nextConfig, runtime, prompter, {
      allowSignalInstall: true,
      onSelection: (value) => {
        selection = value;
      },
      promptAccountIds: true,
      onAccountId: (channel, accountId) => {
        channelAccountIds[channel] = accountId;
      },
    });

    if (selection.length > 0) {
      const wantsBindings = await prompter.confirm({
        message: "Route selected channels to this agent now? (bindings)",
        initialValue: false,
      });
      if (wantsBindings) {
        const desiredBindings = buildChannelBindings({
          agentId,
          selection,
          config: nextConfig,
          accountIds: channelAccountIds,
        });
        const result = applyAgentBindings(nextConfig, desiredBindings);
        nextConfig = result.config;
        if (result.conflicts.length > 0) {
          await prompter.note(
            [
              "Skipped bindings already claimed by another agent:",
              ...result.conflicts.map(
                (conflict) =>
                  `- ${describeBinding(conflict.binding)} (agent=${conflict.existingAgentId})`,
              ),
            ].join("\n"),
            "Routing bindings",
          );
        }
      } else {
        await prompter.note(
          [
            "Routing unchanged. Add bindings when you're ready.",
            "Docs: https://docs.openclaw.ai/concepts/multi-agent",
          ].join("\n"),
          "Routing",
        );
      }
    }

    await writeConfigFile(nextConfig);
    logConfigUpdated(runtime);
    await ensureWorkspaceAndSessions(workspaceDir, runtime, {
      skipBootstrap: Boolean(nextConfig.agents?.defaults?.skipBootstrap),
      agentId,
    });
    if (delegatePreset.enabled) {
      const missingDelegateAgentsFile = !(await fileExists(
        path.join(workspaceDir, DEFAULT_AGENTS_FILENAME),
      ));
      const missingDelegateIdentityFile = !(await fileExists(
        path.join(workspaceDir, DEFAULT_IDENTITY_FILENAME),
      ));
      await scaffoldDelegateWorkspace({
        workspaceDir,
        agentName,
        agentId,
        tier: delegatePreset.tier,
        missingAgentsFile: missingDelegateAgentsFile,
        missingIdentityFile: missingDelegateIdentityFile,
      });
    }

    const payload = {
      agentId,
      name: agentName,
      workspace: workspaceDir,
      agentDir,
      preset: delegatePreset.enabled ? "delegate" : undefined,
      delegateTier: delegatePreset.enabled ? delegatePreset.tier : undefined,
    };
    if (opts.json) {
      runtime.log(JSON.stringify(payload, null, 2));
    }
    await prompter.outro(`Agent "${agentId}" ready.`);
  } catch (err) {
    if (err instanceof WizardCancelledError) {
      runtime.exit(1);
      return;
    }
    throw err;
  }
}
