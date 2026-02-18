<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { buildWorkspaceHookStatus } from "../hooks/hooks-status.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { formatCliCommand } from "../cli/command-format.js";
=======
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { formatCliCommand } from "../cli/command-format.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { OpenClawConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { OpenClawConfig } from "../config/config.js";
import { buildWorkspaceHookStatus } from "../hooks/hooks-status.js";
<<<<<<< HEAD
>>>>>>> ed11e93cf (chore(format))
=======
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { formatCliCommand } from "../cli/command-format.js";
import { buildWorkspaceHookStatus } from "../hooks/hooks-status.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)

export async function setupInternalHooks(
  cfg: MoltbotConfig,
  runtime: RuntimeEnv,
  prompter: WizardPrompter,
): Promise<MoltbotConfig> {
  await prompter.note(
    [
      "Hooks let you automate actions when agent commands are issued.",
      "Example: Save session context to memory when you issue /new.",
      "",
<<<<<<< HEAD
      "Learn more: https://docs.molt.bot/hooks",
=======
      "Learn more: https://docs.openclaw.ai/automation/hooks",
>>>>>>> f8ba8f769 (fix(docs): update outdated hooks documentation URLs (#16165))
    ].join("\n"),
    "Hooks",
  );

  // Discover available hooks using the hook discovery system
  const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
  const report = buildWorkspaceHookStatus(workspaceDir, { config: cfg });

  // Show every eligible hook so users can opt in during onboarding.
  const eligibleHooks = report.hooks.filter((h) => h.eligible);

  if (eligibleHooks.length === 0) {
    await prompter.note(
      "No eligible hooks found. You can configure hooks later in your config.",
      "No Hooks Available",
    );
    return cfg;
  }

  const toEnable = await prompter.multiselect({
    message: "Enable hooks?",
    options: [
      { value: "__skip__", label: "Skip for now" },
      ...eligibleHooks.map((hook) => ({
        value: hook.name,
        label: `${hook.emoji ?? "🔗"} ${hook.name}`,
        hint: hook.description,
      })),
    ],
  });

  const selected = toEnable.filter((name) => name !== "__skip__");
  if (selected.length === 0) {
    return cfg;
  }

  // Enable selected hooks using the new entries config format
  const entries = { ...cfg.hooks?.internal?.entries };
  for (const name of selected) {
    entries[name] = { enabled: true };
  }

  const next: MoltbotConfig = {
    ...cfg,
    hooks: {
      ...cfg.hooks,
      internal: {
        enabled: true,
        entries,
      },
    },
  };

  await prompter.note(
    [
      `Enabled ${selected.length} hook${selected.length > 1 ? "s" : ""}: ${selected.join(", ")}`,
      "",
      "You can manage hooks later with:",
      `  ${formatCliCommand("moltbot hooks list")}`,
      `  ${formatCliCommand("moltbot hooks enable <name>")}`,
      `  ${formatCliCommand("moltbot hooks disable <name>")}`,
    ].join("\n"),
    "Hooks Configured",
  );

  return next;
}
