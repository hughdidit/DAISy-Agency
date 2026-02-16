import path from "node:path";
<<<<<<< HEAD

import type { MoltbotConfig } from "../config/config.js";
=======
import type { OpenClawConfig } from "../config/config.js";
<<<<<<< HEAD
import type { RequirementConfigCheck, Requirements } from "../shared/requirements.js";
import type { HookEligibilityContext, HookEntry, HookInstallSpec } from "./types.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import {
  buildConfigChecks,
  resolveMissingAnyBins,
  resolveMissingBins,
  resolveMissingEnv,
  resolveMissingOs,
} from "../shared/requirements.js";
>>>>>>> bc0160d0f (refactor(shared): dedupe requirements evaluation)
=======
import { evaluateRequirements } from "../shared/requirements.js";
>>>>>>> 4f61a3f52 (refactor(shared): centralize requirements evaluation)
=======
=======
import { resolveEmojiAndHomepage } from "../shared/entry-metadata.js";
<<<<<<< HEAD
>>>>>>> b838429e2 (refactor(status): share emoji/homepage resolver)
import { evaluateRequirementsFromMetadata } from "../shared/requirements.js";
>>>>>>> 270779b2c (refactor(shared): derive requirements from metadata)
=======
import { evaluateRequirementsFromMetadataWithRemote } from "../shared/requirements.js";
>>>>>>> 34b6c743f (refactor(shared): share requirements eval for remote context)
=======
import { evaluateEntryMetadataRequirements } from "../shared/entry-status.js";
>>>>>>> 137079fc2 (refactor(shared): share entry requirements evaluation)
import { CONFIG_DIR } from "../utils.js";
import { hasBinary, isConfigPathTruthy, resolveConfigPath, resolveHookConfig } from "./config.js";
=======
import { evaluateEntryMetadataRequirements } from "../shared/entry-status.js";
import type { RequirementConfigCheck, Requirements } from "../shared/requirements.js";
import { CONFIG_DIR } from "../utils.js";
import { hasBinary, isConfigPathTruthy, resolveHookConfig } from "./config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import type { HookEligibilityContext, HookEntry, HookInstallSpec } from "./types.js";
import { loadWorkspaceHookEntries } from "./workspace.js";

<<<<<<< HEAD
export type HookStatusConfigCheck = {
  path: string;
  value: unknown;
  satisfied: boolean;
};
=======
export type HookStatusConfigCheck = RequirementConfigCheck;
>>>>>>> 6f2f88d3a (refactor(status): reuse Requirements types)

export type HookInstallOption = {
  id: string;
  kind: HookInstallSpec["kind"];
  label: string;
  bins: string[];
};

export type HookStatusEntry = {
  name: string;
  description: string;
  source: string;
  pluginId?: string;
  filePath: string;
  baseDir: string;
  handlerPath: string;
  hookKey: string;
  emoji?: string;
  homepage?: string;
  events: string[];
  always: boolean;
  disabled: boolean;
  eligible: boolean;
  managedByPlugin: boolean;
  requirements: Requirements;
  missing: Requirements;
  configChecks: HookStatusConfigCheck[];
  install: HookInstallOption[];
};

export type HookStatusReport = {
  workspaceDir: string;
  managedHooksDir: string;
  hooks: HookStatusEntry[];
};

function resolveHookKey(entry: HookEntry): string {
  return entry.metadata?.hookKey ?? entry.hook.name;
}

function normalizeInstallOptions(entry: HookEntry): HookInstallOption[] {
  const install = entry.metadata?.install ?? [];
  if (install.length === 0) {
    return [];
  }

  // For hooks, we just list all install options
  return install.map((spec, index) => {
    const id = (spec.id ?? `${spec.kind}-${index}`).trim();
    const bins = spec.bins ?? [];
    let label = (spec.label ?? "").trim();

    if (!label) {
      if (spec.kind === "bundled") {
        label = "Bundled with Moltbot";
      } else if (spec.kind === "npm" && spec.package) {
        label = `Install ${spec.package} (npm)`;
      } else if (spec.kind === "git" && spec.repository) {
        label = `Install from ${spec.repository}`;
      } else {
        label = "Run installer";
      }
    }

    return { id, kind: spec.kind, label, bins };
  });
}

function buildHookStatus(
  entry: HookEntry,
  config?: MoltbotConfig,
  eligibility?: HookEligibilityContext,
): HookStatusEntry {
  const hookKey = resolveHookKey(entry);
  const hookConfig = resolveHookConfig(config, hookKey);
  const managedByPlugin = entry.hook.source === "moltbot-plugin";
  const disabled = managedByPlugin ? false : hookConfig?.enabled === false;
  const always = entry.metadata?.always === true;
  const events = entry.metadata?.events ?? [];

<<<<<<< HEAD
  const {
    required,
    missing,
    eligible: requirementsSatisfied,
    configChecks,
  } = evaluateRequirementsFromMetadataWithRemote({
    always,
    metadata: entry.metadata,
    hasLocalBin: hasBinary,
    localPlatform: process.platform,
    remote: eligibility?.remote,
    isEnvSatisfied: (envName) => Boolean(process.env[envName] || hookConfig?.env?.[envName]),
    resolveConfigValue: (pathStr) => resolveConfigPath(config, pathStr),
    isConfigSatisfied: (pathStr) => isConfigPathTruthy(config, pathStr),
  });
=======
  const { emoji, homepage, required, missing, requirementsSatisfied, configChecks } =
    evaluateEntryMetadataRequirements({
      always,
      metadata: entry.metadata,
      frontmatter: entry.frontmatter,
      hasLocalBin: hasBinary,
      localPlatform: process.platform,
      remote: eligibility?.remote,
      isEnvSatisfied: (envName) => Boolean(process.env[envName] || hookConfig?.env?.[envName]),
      isConfigSatisfied: (pathStr) => isConfigPathTruthy(config, pathStr),
    });
>>>>>>> 137079fc2 (refactor(shared): share entry requirements evaluation)

  const eligible = !disabled && requirementsSatisfied;

  return {
    name: entry.hook.name,
    description: entry.hook.description,
    source: entry.hook.source,
    pluginId: entry.hook.pluginId,
    filePath: entry.hook.filePath,
    baseDir: entry.hook.baseDir,
    handlerPath: entry.hook.handlerPath,
    hookKey,
    emoji,
    homepage,
    events,
    always,
    disabled,
    eligible,
    managedByPlugin,
    requirements: required,
    missing,
    configChecks,
    install: normalizeInstallOptions(entry),
  };
}

export function buildWorkspaceHookStatus(
  workspaceDir: string,
  opts?: {
    config?: MoltbotConfig;
    managedHooksDir?: string;
    entries?: HookEntry[];
    eligibility?: HookEligibilityContext;
  },
): HookStatusReport {
  const managedHooksDir = opts?.managedHooksDir ?? path.join(CONFIG_DIR, "hooks");
  const hookEntries = opts?.entries ?? loadWorkspaceHookEntries(workspaceDir, opts);

  return {
    workspaceDir,
    managedHooksDir,
    hooks: hookEntries.map((entry) => buildHookStatus(entry, opts?.config, opts?.eligibility)),
  };
}
