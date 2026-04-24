import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import { evaluateEntryRequirementsForCurrentPlatform } from "../../shared/entry-status.js";
import { inferSandboxSkillFamily } from "../../shared/sandbox-runtime-profiles.js";
import type { RequirementRemoteSatisfied } from "../../shared/requirements.js";
import { CONFIG_DIR } from "../../utils.js";
import {
  resolveSandboxRuntimeSkillSupport,
  type ResolvedSandboxRuntimeProfile,
} from "../sandbox/runtime-profile-resolution.js";
import {
  hasBinary,
  isBundledSkillAllowed,
  isConfigPathTruthy,
  loadWorkspaceSkillEntries,
  resolveBundledAllowlist,
  resolveSkillConfig,
  resolveSkillsInstallPreferences,
  type SkillEligibilityContext,
  type SkillEntry,
  type SkillInstallSpec,
  type SkillsInstallPreferences,
} from "../skills.js";
import { resolveBundledSkillsContext } from "../skills/bundled-context.js";
import type {
  CapabilityAvailabilityFacts,
  CollectedSkillCapabilityInput,
  CollectedSkillInstallOption,
} from "./types.js";
import { createCollectedSkillMatchKey } from "./types.js";

function resolveSkillKey(entry: SkillEntry): string {
  return entry.metadata?.skillKey ?? entry.skill.name;
}

function selectPreferredInstallSpec(
  install: SkillInstallSpec[],
  prefs: SkillsInstallPreferences,
): { spec: SkillInstallSpec; index: number } | undefined {
  if (install.length === 0) {
    return undefined;
  }

  const indexed = install.map((spec, index) => ({ spec, index }));
  const findKind = (kind: SkillInstallSpec["kind"]) =>
    indexed.find((item) => item.spec.kind === kind);

  const brewSpec = findKind("brew");
  const nodeSpec = findKind("node");
  const goSpec = findKind("go");
  const uvSpec = findKind("uv");
  const downloadSpec = findKind("download");
  const brewAvailable = hasBinary("brew");

  if (prefs.preferBrew && brewAvailable && brewSpec) {
    return brewSpec;
  }
  if (uvSpec) {
    return uvSpec;
  }
  if (nodeSpec) {
    return nodeSpec;
  }
  if (brewAvailable && brewSpec) {
    return brewSpec;
  }
  if (goSpec) {
    return goSpec;
  }
  if (downloadSpec) {
    return downloadSpec;
  }
  if (brewSpec) {
    return brewSpec;
  }

  return indexed[0];
}

function normalizeInstallOptions(
  entry: SkillEntry,
  prefs: SkillsInstallPreferences,
): CollectedSkillInstallOption[] {
  const requiredOs = entry.metadata?.os ?? [];
  if (requiredOs.length > 0 && !requiredOs.includes(process.platform)) {
    return [];
  }

  const install = entry.metadata?.install ?? [];
  if (install.length === 0) {
    return [];
  }

  const filtered = install.filter((spec) => {
    const osList = spec.os ?? [];
    return osList.length === 0 || osList.includes(process.platform);
  });
  if (filtered.length === 0) {
    return [];
  }

  const toOption = (spec: SkillInstallSpec, index: number): CollectedSkillInstallOption => {
    const id = (spec.id ?? `${spec.kind}-${index}`).trim();
    const bins = spec.bins ?? [];
    let label = (spec.label ?? "").trim();
    if (spec.kind === "node" && spec.package) {
      label = `Install ${spec.package} (${prefs.nodeManager})`;
    }
    if (!label) {
      if (spec.kind === "brew" && spec.formula) {
        label = `Install ${spec.formula} (brew)`;
      } else if (spec.kind === "node" && spec.package) {
        label = `Install ${spec.package} (${prefs.nodeManager})`;
      } else if (spec.kind === "go" && spec.module) {
        label = `Install ${spec.module} (go)`;
      } else if (spec.kind === "uv" && spec.package) {
        label = `Install ${spec.package} (uv)`;
      } else if (spec.kind === "download" && spec.url) {
        const url = spec.url.trim();
        const last = url.split("/").pop();
        label = `Download ${last && last.length > 0 ? last : url}`;
      } else {
        label = "Run installer";
      }
    }
    return { id, kind: spec.kind, label, bins };
  };

  const allDownloads = filtered.every((spec) => spec.kind === "download");
  if (allDownloads) {
    return filtered.map((spec, index) => toOption(spec, index));
  }

  const preferred = selectPreferredInstallSpec(filtered, prefs);
  if (!preferred) {
    return [];
  }
  return [toOption(preferred.spec, preferred.index)];
}

function hasRemoteSatisfaction(remoteSatisfied: RequirementRemoteSatisfied): boolean {
  return (
    remoteSatisfied.os.length > 0 ||
    remoteSatisfied.bins.length > 0 ||
    remoteSatisfied.anyBins.length > 0 ||
    Boolean(remoteSatisfied.note)
  );
}

function buildSkillSortKey(entry: SkillEntry): string {
  return `skill:${entry.skill.name.toLowerCase()}:${entry.skill.filePath.toLowerCase()}`;
}

function createRuntimeAvailabilityForSkill(params: {
  entry: SkillEntry;
  runtimeProfileResolution?: ResolvedSandboxRuntimeProfile;
}): CapabilityAvailabilityFacts | undefined {
  const resolvedProfile = params.runtimeProfileResolution;
  if (!resolvedProfile) {
    return undefined;
  }
  const family = inferSandboxSkillFamily({
    name: params.entry.skill.name,
    source: params.entry.skill.source,
    skillKey: resolveSkillKey(params.entry),
    primaryEnv: params.entry.metadata?.primaryEnv,
    requirements: {
      env: params.entry.metadata?.requires?.env,
      config: params.entry.metadata?.requires?.config,
    },
  });
  const support = resolveSandboxRuntimeSkillSupport({
    resolvedProfile,
    family,
  });
  return {
    runtime: {
      profile: resolvedProfile.declaredProfileId,
      supportStatus: resolvedProfile.supportStatus,
      declaredImage: resolvedProfile.declaredImage,
      matchedImage: resolvedProfile.matchedImage,
      customImage: resolvedProfile.customImage,
      reasonCodes: support.reasonCodes,
      detail: support.detail,
    },
  };
}

export function resolveManagedSkillsDir(managedSkillsDir?: string): string {
  return managedSkillsDir ?? path.join(CONFIG_DIR, "skills");
}

function mergeStringArrays<T extends string>(base?: T[], override?: T[]): T[] | undefined {
  const merged = Array.from(new Set([...(base ?? []), ...(override ?? [])]));
  return merged.length > 0 ? merged : undefined;
}

export function mergeAvailabilityFacts(
  base?: CapabilityAvailabilityFacts,
  override?: CapabilityAvailabilityFacts,
): CapabilityAvailabilityFacts | undefined {
  if (!base && !override) {
    return undefined;
  }
  return {
    runtime:
      base?.runtime || override?.runtime
        ? {
            ...(base?.runtime ?? {}),
            ...(override?.runtime ?? {}),
            ...(mergeStringArrays(base?.runtime?.missingBins, override?.runtime?.missingBins)
              ? {
                  missingBins: mergeStringArrays(
                    base?.runtime?.missingBins,
                    override?.runtime?.missingBins,
                  ),
                }
              : {}),
            ...(mergeStringArrays(
              base?.runtime?.missingAnyBins,
              override?.runtime?.missingAnyBins,
            )
              ? {
                  missingAnyBins: mergeStringArrays(
                    base?.runtime?.missingAnyBins,
                    override?.runtime?.missingAnyBins,
                  ),
                }
              : {}),
            ...(mergeStringArrays(base?.runtime?.missingOs, override?.runtime?.missingOs)
              ? {
                  missingOs: mergeStringArrays(base?.runtime?.missingOs, override?.runtime?.missingOs),
                }
              : {}),
            ...(mergeStringArrays(base?.runtime?.reasonCodes, override?.runtime?.reasonCodes)
              ? {
                  reasonCodes: mergeStringArrays(
                    base?.runtime?.reasonCodes,
                    override?.runtime?.reasonCodes,
                  ),
                }
              : {}),
          }
        : undefined,
    projection:
      base?.projection || override?.projection
        ? {
            ...(base?.projection ?? {}),
            ...(override?.projection ?? {}),
            ...(mergeStringArrays(
              base?.projection?.missingPaths,
              override?.projection?.missingPaths,
            )
              ? {
                  missingPaths: mergeStringArrays(
                    base?.projection?.missingPaths,
                    override?.projection?.missingPaths,
                  ),
                }
              : {}),
            ...(mergeStringArrays(
              base?.projection?.reasonCodes,
              override?.projection?.reasonCodes,
            )
              ? {
                  reasonCodes: mergeStringArrays(
                    base?.projection?.reasonCodes,
                    override?.projection?.reasonCodes,
                  ),
                }
              : {}),
          }
        : undefined,
    provider:
      base?.provider || override?.provider
        ? {
            ...(base?.provider ?? {}),
            ...(override?.provider ?? {}),
            ...(mergeStringArrays(base?.provider?.reasonCodes, override?.provider?.reasonCodes)
              ? {
                  reasonCodes: mergeStringArrays(
                    base?.provider?.reasonCodes,
                    override?.provider?.reasonCodes,
                  ),
                }
              : {}),
          }
        : undefined,
    remote:
      base?.remote || override?.remote
        ? {
            ...(base?.remote ?? {}),
            ...(override?.remote ?? {}),
            ...(mergeStringArrays(base?.remote?.satisfiedBins, override?.remote?.satisfiedBins)
              ? {
                  satisfiedBins: mergeStringArrays(
                    base?.remote?.satisfiedBins,
                    override?.remote?.satisfiedBins,
                  ),
                }
              : {}),
            ...(mergeStringArrays(
              base?.remote?.satisfiedAnyBins,
              override?.remote?.satisfiedAnyBins,
            )
              ? {
                  satisfiedAnyBins: mergeStringArrays(
                    base?.remote?.satisfiedAnyBins,
                    override?.remote?.satisfiedAnyBins,
                  ),
                }
              : {}),
            ...(mergeStringArrays(base?.remote?.satisfiedOs, override?.remote?.satisfiedOs)
              ? {
                  satisfiedOs: mergeStringArrays(base?.remote?.satisfiedOs, override?.remote?.satisfiedOs),
                }
              : {}),
          }
        : undefined,
  };
}

export function collectWorkspaceSkillCapabilityInputs(params: {
  workspaceDir: string;
  runtimeContext: CollectedSkillCapabilityInput["runtimeContext"];
  config?: OpenClawConfig;
  managedSkillsDir?: string;
  entries?: SkillEntry[];
  eligibility?: SkillEligibilityContext;
  overrides?: Record<string, CapabilityAvailabilityFacts | undefined>;
  runtimeProfileResolution?: ResolvedSandboxRuntimeProfile;
}): {
  managedSkillsDir: string;
  skills: CollectedSkillCapabilityInput[];
} {
  const managedSkillsDir = resolveManagedSkillsDir(params.managedSkillsDir);
  const bundledContext = resolveBundledSkillsContext();
  const entries =
    params.entries ??
    loadWorkspaceSkillEntries(params.workspaceDir, {
      config: params.config,
      managedSkillsDir,
      bundledSkillsDir: bundledContext.dir,
    });
  const prefs = resolveSkillsInstallPreferences(params.config);

  const skills = entries
    .map((entry) => {
      const skillKey = resolveSkillKey(entry);
      const skillConfig = resolveSkillConfig(params.config, skillKey);
      const disabled = skillConfig?.enabled === false;
      const blockedByAllowlist = !isBundledSkillAllowed(
        entry,
        resolveBundledAllowlist(params.config),
      );
      const always = entry.metadata?.always === true;
      const isEnvSatisfied = (envName: string) =>
        Boolean(
          process.env[envName] ||
          skillConfig?.env?.[envName] ||
          (skillConfig?.apiKey && entry.metadata?.primaryEnv === envName),
        );
      const isConfigSatisfied = (pathStr: string) => isConfigPathTruthy(params.config, pathStr);
      const bundled =
        bundledContext.names.size > 0
          ? bundledContext.names.has(entry.skill.name)
          : entry.skill.source === "openclaw-bundled";

      const {
        emoji,
        homepage,
        required,
        missing,
        requirementsSatisfied,
        configChecks,
        remoteSatisfied,
      } = evaluateEntryRequirementsForCurrentPlatform({
        always,
        entry,
        hasLocalBin: hasBinary,
        remote: params.eligibility?.remote,
        isEnvSatisfied,
        isConfigSatisfied,
      });

      const eligible = !disabled && !blockedByAllowlist && requirementsSatisfied;
      return {
        matchKey: createCollectedSkillMatchKey({
          name: entry.skill.name,
          source: entry.skill.source,
          filePath: entry.skill.filePath,
          skillKey,
        }),
        sortKey: buildSkillSortKey(entry),
        name: entry.skill.name,
        description: entry.skill.description,
        source: entry.skill.source,
        bundled,
        filePath: entry.skill.filePath,
        baseDir: entry.skill.baseDir,
        skillKey,
        primaryEnv: entry.metadata?.primaryEnv,
        emoji,
        homepage,
        always,
        disabled,
        blockedByAllowlist,
        eligible,
        requirements: required,
        missing,
        configChecks,
        remoteSatisfied: hasRemoteSatisfaction(remoteSatisfied) ? remoteSatisfied : null,
        install: normalizeInstallOptions(entry, prefs),
        runtimeContext: params.runtimeContext,
        availability: mergeAvailabilityFacts(
          createRuntimeAvailabilityForSkill({
            entry,
            runtimeProfileResolution: params.runtimeProfileResolution,
          }),
          params.overrides?.[entry.skill.name],
        ),
      } satisfies CollectedSkillCapabilityInput;
    })
    .toSorted((a, b) => a.sortKey.localeCompare(b.sortKey));

  return {
    managedSkillsDir,
    skills,
  };
}

export function createGatewayProviderAvailability(params: {
  providerId: string;
  providerKind: string;
  transport: string;
}): CapabilityAvailabilityFacts {
  return {
    provider: {
      providerId: params.providerId,
      providerKind: params.providerKind,
      transport: params.transport,
      reasonCodes: [],
    },
  };
}

export function buildMissingProjectionAvailability(
  missingPaths: string[],
  detailPrefix: string,
): CapabilityAvailabilityFacts | undefined {
  if (missingPaths.length === 0) {
    return undefined;
  }
  return {
    projection: {
      missingPaths,
      reasonCodes: ["missing-projection"],
      detail: `${detailPrefix}: ${missingPaths.join(", ")}`,
    },
  };
}
