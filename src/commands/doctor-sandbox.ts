import fs from "node:fs";
import path from "node:path";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import {
  DEFAULT_SANDBOX_BROWSER_IMAGE,
  DEFAULT_SANDBOX_COMMON_IMAGE,
  DEFAULT_SANDBOX_IMAGE,
  resolveSandboxConfigForAgent,
  resolveSandboxScope,
} from "../agents/sandbox.js";
import { DEFAULT_SANDBOX_WORKDIR } from "../agents/sandbox/constants.js";
import { resolveOpenClawReadonlyProjection } from "../agents/sandbox/openclaw-readonly-projection.js";
import { resolveSandboxRuntimeProfile } from "../agents/sandbox/runtime-profile-resolution.js";
import { resolveSandboxScopeKey, resolveSandboxWorkspaceDir } from "../agents/sandbox/shared.js";
import type { OpenClawConfig } from "../config/config.js";
import { resolveAgentMainSessionKey } from "../config/sessions.js";
import { runCommandWithTimeout, runExec } from "../process/exec.js";
import type { RuntimeEnv } from "../runtime.js";
import type { ResolvedCapability } from "../shared/resolved-capability-manifest.js";
import { note } from "../terminal/note.js";
import { resolveUserPath } from "../utils.js";
import { collectCommandCapabilitySnapshot } from "./capability-readiness.js";
import type { DoctorPrompter } from "./doctor-prompter.js";

type SandboxScriptInfo = {
  scriptPath: string;
  cwd: string;
};

function resolveSandboxScript(scriptRel: string): SandboxScriptInfo | null {
  const candidates = new Set<string>();
  candidates.add(process.cwd());
  const argv1 = process.argv[1];
  if (argv1) {
    const normalized = path.resolve(argv1);
    candidates.add(path.resolve(path.dirname(normalized), ".."));
    candidates.add(path.resolve(path.dirname(normalized)));
  }

  for (const root of candidates) {
    const scriptPath = path.join(root, scriptRel);
    if (fs.existsSync(scriptPath)) {
      return { scriptPath, cwd: root };
    }
  }

  return null;
}

async function runSandboxScript(scriptRel: string, runtime: RuntimeEnv): Promise<boolean> {
  const script = resolveSandboxScript(scriptRel);
  if (!script) {
    note(`Unable to locate ${scriptRel}. Run it from the repo root.`, "Sandbox");
    return false;
  }

  runtime.log(`Running ${scriptRel}...`);
  const result = await runCommandWithTimeout(["bash", script.scriptPath], {
    timeoutMs: 20 * 60 * 1000,
    cwd: script.cwd,
  });
  if (result.code !== 0) {
    runtime.error(
      `Failed running ${scriptRel}: ${
        result.stderr.trim() || result.stdout.trim() || "unknown error"
      }`,
    );
    return false;
  }

  runtime.log(`Completed ${scriptRel}.`);
  return true;
}

async function isDockerAvailable(): Promise<boolean> {
  try {
    await runExec("docker", ["version", "--format", "{{.Server.Version}}"], {
      timeoutMs: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

async function dockerImageExists(image: string): Promise<boolean> {
  try {
    await runExec("docker", ["image", "inspect", image], { timeoutMs: 5_000 });
    return true;
  } catch (error) {
    const stderr =
      (error as { stderr: string } | undefined)?.stderr ||
      (error as { message: string } | undefined)?.message ||
      "";
    if (String(stderr).includes("No such image")) {
      return false;
    }
    throw error;
  }
}

function uniqueSortedStrings(values: Iterable<string>): string[] {
  return Array.from(
    new Set(
      Array.from(values)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).toSorted((left, right) => left.localeCompare(right));
}

function formatPreviewList(values: readonly string[], limit = 3): string | undefined {
  if (values.length === 0) {
    return undefined;
  }
  if (values.length <= limit) {
    return values.join(", ");
  }
  return `${values.slice(0, limit).join(", ")} (+${values.length - limit} more)`;
}

function formatOfficialImageSet(
  profile: ReturnType<typeof resolveSandboxRuntimeProfile>["profile"],
): string | undefined {
  if (profile.imageRules.length === 0) {
    return undefined;
  }
  return profile.imageRules.map((rule) => `${rule.role}=${rule.image}`).join(", ");
}

function collectMissingProjectionPaths(capabilities: readonly ResolvedCapability[]): string[] {
  const missingPaths = new Set<string>();
  for (const capability of capabilities) {
    for (const targetPath of capability.evidence?.projection?.missingPaths ?? []) {
      const trimmed = targetPath.trim();
      if (trimmed) {
        missingPaths.add(trimmed);
      }
    }
  }
  return uniqueSortedStrings(missingPaths);
}

function collectMissingExpectedRuntimeDependencies(params: {
  capabilities: readonly ResolvedCapability[];
  expectedBinaries: readonly string[];
}): string[] {
  const expectedByLower = new Map(
    params.expectedBinaries.map((bin) => [bin.trim().toLowerCase(), bin.trim()]),
  );
  const missing = new Set<string>();

  for (const capability of params.capabilities) {
    const runtime = capability.evidence?.runtime;
    if (!runtime) {
      continue;
    }
    if (runtime.reasonCodes.includes("missing-runtime-binaries")) {
      for (const bin of runtime.missingBins) {
        const canonical = expectedByLower.get(bin.trim().toLowerCase());
        if (canonical) {
          missing.add(canonical);
        }
      }
    }
    if (runtime.reasonCodes.includes("missing-runtime-any-binaries")) {
      for (const bin of runtime.missingAnyBins) {
        const canonical = expectedByLower.get(bin.trim().toLowerCase());
        if (canonical) {
          missing.add(canonical);
        }
      }
    }
  }

  return uniqueSortedStrings(missing);
}

function resolveReadonlyDoctorProjection(cfg: OpenClawConfig): {
  workspaceDir?: string;
  projection: NonNullable<Parameters<typeof collectCommandCapabilitySnapshot>[0]["projection"]>;
} {
  const agentId = resolveDefaultAgentId(cfg);
  const sandboxCfg = resolveSandboxConfigForAgent(cfg, agentId);
  const agentWorkspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
  const scopeKey = resolveSandboxScopeKey(
    sandboxCfg.scope,
    resolveAgentMainSessionKey({ cfg, agentId }),
  );
  const workspaceRoot = resolveUserPath(sandboxCfg.workspaceRoot);
  const sandboxWorkspaceDir =
    sandboxCfg.scope === "shared"
      ? workspaceRoot
      : resolveSandboxWorkspaceDir(workspaceRoot, scopeKey);
  const workspaceDir =
    sandboxCfg.workspaceAccess === "rw" ? agentWorkspaceDir : sandboxWorkspaceDir;
  const containerWorkdir = sandboxCfg.docker.workdir?.trim() || DEFAULT_SANDBOX_WORKDIR;
  const readonlyProjection = resolveOpenClawReadonlyProjection({
    config: cfg,
    agentId,
    workspaceDir,
    sandboxWorkspaceDir,
    containerWorkdir,
  });
  const hostPathByContainerPath = new Map<string, string>([
    [readonlyProjection.containerConfigPath, readonlyProjection.hostConfigPath],
    [readonlyProjection.containerStateDir, readonlyProjection.hostStateDir],
    [containerWorkdir, workspaceDir],
  ]);
  const containerPathPrefixes = Array.from(hostPathByContainerPath.entries()).toSorted(
    ([leftContainerPath], [rightContainerPath]) =>
      rightContainerPath.length - leftContainerPath.length,
  );

  const resolveHostPath = (targetPath: string) => {
    for (const [containerPath, hostPath] of containerPathPrefixes) {
      const relativePath = path.posix.relative(containerPath, targetPath);
      if (relativePath === "") {
        return hostPath;
      }
      if (!relativePath.startsWith("..") && !path.posix.isAbsolute(relativePath)) {
        return path.join(hostPath, ...relativePath.split("/"));
      }
    }
    return targetPath;
  };

  return {
    workspaceDir,
    projection: {
      configPath: readonlyProjection.containerConfigPath,
      stateDir: readonlyProjection.containerStateDir,
      workspaceDir: containerWorkdir,
      pathExists: (targetPath: string) => fs.existsSync(resolveHostPath(targetPath)),
    },
  };
}

function resolveSandboxDockerImage(cfg: OpenClawConfig): string {
  const image = cfg.agents?.defaults?.sandbox?.docker?.image?.trim();
  return image ? image : DEFAULT_SANDBOX_IMAGE;
}

function resolveSandboxBrowserImage(cfg: OpenClawConfig): string {
  const image = cfg.agents?.defaults?.sandbox?.browser?.image?.trim();
  return image ? image : DEFAULT_SANDBOX_BROWSER_IMAGE;
}

function updateSandboxDockerImage(cfg: OpenClawConfig, image: string): OpenClawConfig {
  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        sandbox: {
          ...cfg.agents?.defaults?.sandbox,
          docker: {
            ...cfg.agents?.defaults?.sandbox?.docker,
            image,
          },
        },
      },
    },
  };
}

function updateSandboxBrowserImage(cfg: OpenClawConfig, image: string): OpenClawConfig {
  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        sandbox: {
          ...cfg.agents?.defaults?.sandbox,
          browser: {
            ...cfg.agents?.defaults?.sandbox?.browser,
            image,
          },
        },
      },
    },
  };
}

type SandboxImageCheck = {
  kind: string;
  image: string;
  buildScript?: string;
  updateConfig: (image: string) => void;
};

async function handleMissingSandboxImage(
  params: SandboxImageCheck,
  runtime: RuntimeEnv,
  prompter: DoctorPrompter,
) {
  const exists = await dockerImageExists(params.image);
  if (exists) {
    return;
  }

  const buildHint = params.buildScript
    ? `Build it with ${params.buildScript}.`
    : "Build or pull it first.";
  note(`Sandbox ${params.kind} image missing: ${params.image}. ${buildHint}`, "Sandbox");

  if (prompter.isDryRun) {
    note(
      `- Would build or provision sandbox ${params.kind} image: ${params.image}.`,
      "Doctor dry-run",
    );
    return;
  }

  let built = false;
  if (params.buildScript) {
    const build = await prompter.confirmSkipInNonInteractive({
      message: `Build ${params.kind} sandbox image now?`,
      initialValue: true,
    });
    if (build) {
      built = await runSandboxScript(params.buildScript, runtime);
    }
  }

  if (built) {
    return;
  }
}

export async function maybeRepairSandboxImages(
  cfg: OpenClawConfig,
  runtime: RuntimeEnv,
  prompter: DoctorPrompter,
): Promise<OpenClawConfig> {
  const resolvedSandbox = resolveSandboxConfigForAgent(cfg);
  const mode = resolvedSandbox.mode;
  if (mode === "off") {
    return cfg;
  }

  const dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    const lines = [
      `Sandbox mode is enabled (mode: "${mode}") but Docker is not available.`,
      "Docker is required for sandbox mode to function.",
      "Isolated sessions (cron jobs, sub-agents) will fail without Docker.",
      "",
      "Options:",
      "- Install Docker and restart the gateway",
      "- Disable sandbox mode: openclaw config set agents.defaults.sandbox.mode off",
    ];
    note(lines.join("\n"), "Sandbox");
    return cfg;
  }

  let next = cfg;
  const changes: string[] = [];

  const dockerImage = resolveSandboxDockerImage(cfg);
  await handleMissingSandboxImage(
    {
      kind: "base",
      image: dockerImage,
      buildScript:
        dockerImage === DEFAULT_SANDBOX_COMMON_IMAGE
          ? "scripts/sandbox-common-setup.sh"
          : dockerImage === DEFAULT_SANDBOX_IMAGE
            ? "scripts/sandbox-setup.sh"
            : undefined,
      updateConfig: (image) => {
        next = updateSandboxDockerImage(next, image);
        changes.push(`Updated agents.defaults.sandbox.docker.image → ${image}`);
      },
    },
    runtime,
    prompter,
  );

  if (resolvedSandbox.browser?.enabled) {
    await handleMissingSandboxImage(
      {
        kind: "browser",
        image: resolveSandboxBrowserImage(cfg),
        buildScript: "scripts/sandbox-browser-setup.sh",
        updateConfig: (image) => {
          next = updateSandboxBrowserImage(next, image);
          changes.push(`Updated agents.defaults.sandbox.browser.image → ${image}`);
        },
      },
      runtime,
      prompter,
    );
  }

  if (changes.length > 0) {
    note(changes.join("\n"), "Doctor changes");
  }

  return next;
}

export async function noteSandboxUsefulnessWarnings(cfg: OpenClawConfig) {
  const resolvedSandbox = resolveSandboxConfigForAgent(cfg);
  if (resolvedSandbox.mode === "off") {
    return;
  }

  const dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    return;
  }

  const resolvedProfile = resolveSandboxRuntimeProfile({
    mode: "gateway",
    sandboxConfig: resolvedSandbox,
  });
  const profile = resolvedProfile.profile;
  const warnings: string[] = [];
  const officialImages = formatOfficialImageSet(profile);

  const browserRequiredButDisabled =
    profile.browserRuntimeRequired === true && !resolvedSandbox.browser.enabled;
  const browserEnabledOutsideDeclaredProfile =
    resolvedSandbox.browser.enabled && profile.browserRuntimeRequired !== true;

  if (resolvedProfile.supportStatus === "image-mismatch" && !browserRequiredButDisabled) {
    const dockerImage = resolvedSandbox.docker.image.trim();
    const browserImage = resolvedSandbox.browser.image.trim();
    const dockerImageExistsForUsefulness = dockerImage
      ? await dockerImageExists(dockerImage)
      : false;
    const browserImageExistsForUsefulness =
      resolvedSandbox.browser.enabled && browserImage
        ? await dockerImageExists(browserImage)
        : false;
    const relevantImagesExist =
      dockerImageExistsForUsefulness ||
      browserImageExistsForUsefulness ||
      profile.imageRules.length === 0;
    if (relevantImagesExist) {
      warnings.push(
        `- Unsupported official profile/image combination: ${resolvedProfile.detail ?? `Declared profile "${profile.id}" does not match the configured official image set.`}`,
      );
      warnings.push(
        `  Fix: use the official image set for "${profile.id}"${officialImages ? ` (${officialImages})` : ""} or change agents.defaults.sandbox.profile.`,
      );
    }
  }

  if (resolvedProfile.supportStatus === "custom-image") {
    const dockerImage = resolvedSandbox.docker.image.trim();
    const browserImage = resolvedSandbox.browser.image.trim();
    const dockerImageExistsForUsefulness = dockerImage
      ? await dockerImageExists(dockerImage)
      : false;
    const browserImageExistsForUsefulness =
      resolvedSandbox.browser.enabled && browserImage
        ? await dockerImageExists(browserImage)
        : false;
    const relevantImagesExist = dockerImageExistsForUsefulness || browserImageExistsForUsefulness;
    if (relevantImagesExist) {
      warnings.push(
        `- Custom image outside declared support: ${resolvedProfile.detail ?? `Declared profile "${profile.id}" uses a custom sandbox image.`}`,
      );
      warnings.push(
        `  Fix: use the official image set for "${profile.id}"${officialImages ? ` (${officialImages})` : ""} or change agents.defaults.sandbox.profile.`,
      );
    }
  }

  if (browserRequiredButDisabled) {
    warnings.push(
      `- Browser profile/runtime mismatch: declared profile "${profile.id}" requires the dedicated sandbox browser runtime, but agents.defaults.sandbox.browser.enabled=false.`,
    );
    warnings.push(
      `  Fix: enable the sandbox browser runtime or switch agents.defaults.sandbox.profile to a non-browser profile.`,
    );
  }

  if (browserEnabledOutsideDeclaredProfile) {
    warnings.push(
      `- Browser profile/runtime mismatch: sandbox browser runtime is enabled, but declared profile "${profile.id}" does not include browser runtime support.`,
    );
    warnings.push(
      `  Fix: switch agents.defaults.sandbox.profile to "browser-automation" or disable agents.defaults.sandbox.browser.enabled.`,
    );
  }

  const gatewaySnapshot = collectCommandCapabilitySnapshot({
    config: cfg,
    mode: "gateway",
  });
  const readonlyProjection = resolveReadonlyDoctorProjection(cfg);
  const readonlySnapshot = collectCommandCapabilitySnapshot({
    config: cfg,
    mode: "readonly-sandbox",
    ...(readonlyProjection.workspaceDir ? { workspaceDir: readonlyProjection.workspaceDir } : {}),
    projection: readonlyProjection.projection,
  });

  const missingProjectionPaths = collectMissingProjectionPaths(
    readonlySnapshot.manifest.capabilities,
  );
  if (missingProjectionPaths.length > 0) {
    warnings.push(
      `- Missing projected assets: ${formatPreviewList(missingProjectionPaths) ?? "readonly projection material is missing"}.`,
    );
    warnings.push(
      "  Fix: repair readonly projection assets so sandbox diagnostics can see the declared config, state, workspace, and plugin manifests.",
    );
  }

  const missingExpectedDependencies = collectMissingExpectedRuntimeDependencies({
    capabilities: gatewaySnapshot.manifest.capabilities,
    expectedBinaries: profile.expectedBinaries,
  });
  if (missingExpectedDependencies.length > 0) {
    warnings.push(
      `- Missing expected runtime dependency: ${formatPreviewList(missingExpectedDependencies) ?? "declared runtime dependencies are missing"}.`,
    );
    warnings.push(
      `  Fix: rebuild or select the official image for "${profile.id}"${officialImages ? ` (${officialImages})` : ""} so the declared runtime baseline is present.`,
    );
  }

  if (warnings.length > 0) {
    note(warnings.join("\n"), "Sandbox usefulness");
  }
}

export function noteSandboxScopeWarnings(cfg: OpenClawConfig) {
  const globalSandbox = cfg.agents?.defaults?.sandbox;
  const agents = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];
  const warnings: string[] = [];

  for (const agent of agents) {
    const agentId = agent.id;
    const agentSandbox = agent.sandbox;
    if (!agentSandbox) {
      continue;
    }

    const scope = resolveSandboxScope({
      scope: agentSandbox.scope ?? globalSandbox?.scope,
      perSession: agentSandbox.perSession ?? globalSandbox?.perSession,
    });

    if (scope !== "shared") {
      continue;
    }

    const overrides: string[] = [];
    if (agentSandbox.docker && Object.keys(agentSandbox.docker).length > 0) {
      overrides.push("docker");
    }
    if (agentSandbox.browser && Object.keys(agentSandbox.browser).length > 0) {
      overrides.push("browser");
    }
    if (agentSandbox.prune && Object.keys(agentSandbox.prune).length > 0) {
      overrides.push("prune");
    }

    if (overrides.length === 0) {
      continue;
    }

    warnings.push(
      [
        `- agents.list (id "${agentId}") sandbox ${overrides.join("/")} overrides ignored.`,
        `  scope resolves to "shared".`,
      ].join("\n"),
    );
  }

  if (warnings.length > 0) {
    note(warnings.join("\n"), "Sandbox");
  }
}
