import path from "node:path";
<<<<<<< HEAD

import type { MoltbotConfig } from "../config/config.js";
=======
import { promisify } from "node:util";
import type { OpenClawConfig } from "../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { RuntimeEnv } from "../runtime.js";
import type { DoctorOptions, DoctorPrompter } from "./doctor-prompter.js";
>>>>>>> 52b624cca (fix(doctor): audit env-only gateway tokens)
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { RuntimeEnv } from "../runtime.js";
import type { DoctorOptions, DoctorPrompter } from "./doctor-prompter.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveGatewayPort, resolveIsNixMode } from "../config/paths.js";
<<<<<<< HEAD
import { findExtraGatewayServices, renderGatewayServiceCleanupHints } from "../daemon/inspect.js";
import { findLegacyGatewayServices, uninstallLegacyGatewayServices } from "../daemon/legacy.js";
=======
import {
  findExtraGatewayServices,
  renderGatewayServiceCleanupHints,
  type ExtraGatewayService,
} from "../daemon/inspect.js";
>>>>>>> 8a8faf066 (doctor: clean up legacy Linux gateway services (#21188))
import { renderSystemNodeWarning, resolveSystemNodeInfo } from "../daemon/runtime-paths.js";
import { resolveGatewayService } from "../daemon/service.js";
import {
  auditGatewayServiceConfig,
  needsNodeRuntimeMigration,
  SERVICE_AUDIT_CODES,
} from "../daemon/service-audit.js";
<<<<<<< HEAD
import type { RuntimeEnv } from "../runtime.js";
import { note } from "../terminal/note.js";
import { buildGatewayInstallPlan, gatewayInstallErrorHint } from "./daemon-install-helpers.js";
import {
  DEFAULT_GATEWAY_DAEMON_RUNTIME,
  GATEWAY_DAEMON_RUNTIME_OPTIONS,
  type GatewayDaemonRuntime,
} from "./daemon-runtime.js";
import type { DoctorOptions, DoctorPrompter } from "./doctor-prompter.js";
=======
import { resolveGatewayService } from "../daemon/service.js";
import { uninstallLegacySystemdUnits } from "../daemon/systemd.js";
import type { RuntimeEnv } from "../runtime.js";
import { note } from "../terminal/note.js";
import { buildGatewayInstallPlan } from "./daemon-install-helpers.js";
import { DEFAULT_GATEWAY_DAEMON_RUNTIME, type GatewayDaemonRuntime } from "./daemon-runtime.js";
import type { DoctorOptions, DoctorPrompter } from "./doctor-prompter.js";

const execFileAsync = promisify(execFile);
>>>>>>> 90ef2d6bd (chore: Update formatting.)

function detectGatewayRuntime(programArguments: string[] | undefined): GatewayDaemonRuntime {
  const first = programArguments?.[0];
  if (first) {
    const base = path.basename(first).toLowerCase();
    if (base === "bun" || base === "bun.exe") {
      return "bun";
    }
    if (base === "node" || base === "node.exe") {
      return "node";
    }
  }
  return DEFAULT_GATEWAY_DAEMON_RUNTIME;
}

function findGatewayEntrypoint(programArguments?: string[]): string | null {
  if (!programArguments || programArguments.length === 0) {
    return null;
  }
  const gatewayIndex = programArguments.indexOf("gateway");
  if (gatewayIndex <= 0) {
    return null;
  }
  return programArguments[gatewayIndex - 1] ?? null;
}

function normalizeExecutablePath(value: string): string {
  return path.resolve(value);
}

<<<<<<< HEAD
<<<<<<< HEAD
export async function maybeMigrateLegacyGatewayService(
  cfg: MoltbotConfig,
  mode: "local" | "remote",
  runtime: RuntimeEnv,
  prompter: DoctorPrompter,
) {
  const legacyServices = await findLegacyGatewayServices(process.env);
  if (legacyServices.length === 0) return;
=======
=======
function resolveGatewayAuthToken(cfg: OpenClawConfig, env: NodeJS.ProcessEnv): string | undefined {
  const configToken = cfg.gateway?.auth?.token?.trim();
  if (configToken) {
    return configToken;
  }
  const envToken = env.OPENCLAW_GATEWAY_TOKEN ?? env.CLAWDBOT_GATEWAY_TOKEN;
  const trimmedEnvToken = envToken?.trim();
  return trimmedEnvToken || undefined;
}

>>>>>>> 52b624cca (fix(doctor): audit env-only gateway tokens)
function extractDetailPath(detail: string, prefix: string): string | null {
  if (!detail.startsWith(prefix)) {
    return null;
  }
  const value = detail.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
}
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)

  note(
    legacyServices.map((svc) => `- ${svc.label} (${svc.platform}, ${svc.detail})`).join("\n"),
    "Legacy gateway services detected",
  );

  const migrate = await prompter.confirmSkipInNonInteractive({
    message: "Migrate legacy gateway services to Moltbot now?",
    initialValue: true,
  });
  if (!migrate) return;

  try {
    await uninstallLegacyGatewayServices({
      env: process.env,
      stdout: process.stdout,
    });
  } catch (err) {
    runtime.error(`Legacy service cleanup failed: ${String(err)}`);
    return;
  }

  if (resolveIsNixMode(process.env)) {
    note("Nix mode detected; skip installing services.", "Gateway");
    return;
  }

  if (mode === "remote") {
    note("Gateway mode is remote; skipped local service install.", "Gateway");
    return;
  }

  const service = resolveGatewayService();
  const loaded = await service.isLoaded({ env: process.env });
  if (loaded) {
    note(`Moltbot ${service.label} already ${service.loadedText}.`, "Gateway");
    return;
  }

  const install = await prompter.confirmSkipInNonInteractive({
    message: "Install Moltbot gateway service now?",
    initialValue: true,
  });
  if (!install) return;

  const daemonRuntime = await prompter.select<GatewayDaemonRuntime>(
    {
      message: "Gateway service runtime",
      options: GATEWAY_DAEMON_RUNTIME_OPTIONS,
      initialValue: DEFAULT_GATEWAY_DAEMON_RUNTIME,
    },
    DEFAULT_GATEWAY_DAEMON_RUNTIME,
  );
  const port = resolveGatewayPort(cfg, process.env);
  const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
    env: process.env,
    port,
    token: cfg.gateway?.auth?.token ?? process.env.CLAWDBOT_GATEWAY_TOKEN,
    runtime: daemonRuntime,
    warn: (message, title) => note(message, title),
    config: cfg,
  });
  try {
    await service.install({
      env: process.env,
      stdout: process.stdout,
      programArguments,
      workingDirectory,
      environment,
    });
  } catch (err) {
    runtime.error(`Gateway service install failed: ${String(err)}`);
    note(gatewayInstallErrorHint(), "Gateway");
  }
}

function classifyLegacyServices(legacyServices: ExtraGatewayService[]): {
  darwinUserServices: ExtraGatewayService[];
  linuxUserServices: ExtraGatewayService[];
  failed: string[];
} {
  const darwinUserServices: ExtraGatewayService[] = [];
  const linuxUserServices: ExtraGatewayService[] = [];
  const failed: string[] = [];

  for (const svc of legacyServices) {
    if (svc.platform === "darwin") {
      if (svc.scope === "user") {
        darwinUserServices.push(svc);
      } else {
        failed.push(`${svc.label} (${svc.scope})`);
      }
      continue;
    }

    if (svc.platform === "linux") {
      if (svc.scope === "user") {
        linuxUserServices.push(svc);
      } else {
        failed.push(`${svc.label} (${svc.scope})`);
      }
      continue;
    }

    failed.push(`${svc.label} (${svc.platform})`);
  }

  return { darwinUserServices, linuxUserServices, failed };
}

async function cleanupLegacyDarwinServices(
  services: ExtraGatewayService[],
): Promise<{ removed: string[]; failed: string[] }> {
  const removed: string[] = [];
  const failed: string[] = [];

  for (const svc of services) {
    const plistPath = extractDetailPath(svc.detail, "plist:");
    if (!plistPath) {
      failed.push(`${svc.label} (missing plist path)`);
      continue;
    }
    const dest = await cleanupLegacyLaunchdService({
      label: svc.label,
      plistPath,
    });
    removed.push(dest ? `${svc.label} -> ${dest}` : svc.label);
  }

  return { removed, failed };
}

async function cleanupLegacyLinuxUserServices(
  services: ExtraGatewayService[],
  runtime: RuntimeEnv,
): Promise<{ removed: string[]; failed: string[] }> {
  const removed: string[] = [];
  const failed: string[] = [];

  try {
    const removedUnits = await uninstallLegacySystemdUnits({
      env: process.env,
      stdout: process.stdout,
    });
    const removedByLabel: Map<string, (typeof removedUnits)[number]> = new Map(
      removedUnits.map((unit) => [`${unit.name}.service`, unit] as const),
    );
    for (const svc of services) {
      const removedUnit = removedByLabel.get(svc.label);
      if (!removedUnit) {
        failed.push(`${svc.label} (legacy unit name not recognized)`);
        continue;
      }
      removed.push(`${svc.label} -> ${removedUnit.unitPath}`);
    }
  } catch (err) {
    runtime.error(`Legacy Linux gateway cleanup failed: ${String(err)}`);
    for (const svc of services) {
      failed.push(`${svc.label} (linux cleanup failed)`);
    }
  }

  return { removed, failed };
}

export async function maybeRepairGatewayServiceConfig(
  cfg: MoltbotConfig,
  mode: "local" | "remote",
  runtime: RuntimeEnv,
  prompter: DoctorPrompter,
) {
  if (resolveIsNixMode(process.env)) {
    note("Nix mode detected; skip service updates.", "Gateway");
    return;
  }

  if (mode === "remote") {
    note("Gateway mode is remote; skipped local service audit.", "Gateway");
    return;
  }

  const service = resolveGatewayService();
  let command: Awaited<ReturnType<typeof service.readCommand>> | null = null;
  try {
    command = await service.readCommand(process.env);
  } catch {
    command = null;
  }
  if (!command) {
    return;
  }

  const expectedGatewayToken = resolveGatewayAuthToken(cfg, process.env);
  const audit = await auditGatewayServiceConfig({
    env: process.env,
    command,
    expectedGatewayToken,
  });
  const needsNodeRuntime = needsNodeRuntimeMigration(audit.issues);
  const systemNodeInfo = needsNodeRuntime
    ? await resolveSystemNodeInfo({ env: process.env })
    : null;
  const systemNodePath = systemNodeInfo?.supported ? systemNodeInfo.path : null;
  if (needsNodeRuntime && !systemNodePath) {
    const warning = renderSystemNodeWarning(systemNodeInfo);
    if (warning) {
      note(warning, "Gateway runtime");
    }
    note(
      "System Node 22+ not found. Install via Homebrew/apt/choco and rerun doctor to migrate off Bun/version managers.",
      "Gateway runtime",
    );
  }

  const port = resolveGatewayPort(cfg, process.env);
  const runtimeChoice = detectGatewayRuntime(command.programArguments);
  const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
    env: process.env,
    port,
<<<<<<< HEAD
    token: cfg.gateway?.auth?.token ?? process.env.CLAWDBOT_GATEWAY_TOKEN,
=======
    token: expectedGatewayToken,
>>>>>>> 52b624cca (fix(doctor): audit env-only gateway tokens)
    runtime: needsNodeRuntime && systemNodePath ? "node" : runtimeChoice,
    nodePath: systemNodePath ?? undefined,
    warn: (message, title) => note(message, title),
    config: cfg,
  });
  const expectedEntrypoint = findGatewayEntrypoint(programArguments);
  const currentEntrypoint = findGatewayEntrypoint(command.programArguments);
  if (
    expectedEntrypoint &&
    currentEntrypoint &&
    normalizeExecutablePath(expectedEntrypoint) !== normalizeExecutablePath(currentEntrypoint)
  ) {
    audit.issues.push({
      code: SERVICE_AUDIT_CODES.gatewayEntrypointMismatch,
      message: "Gateway service entrypoint does not match the current install.",
      detail: `${currentEntrypoint} -> ${expectedEntrypoint}`,
      level: "recommended",
    });
  }

  if (audit.issues.length === 0) {
    return;
  }

  note(
    audit.issues
      .map((issue) =>
        issue.detail ? `- ${issue.message} (${issue.detail})` : `- ${issue.message}`,
      )
      .join("\n"),
    "Gateway service config",
  );

  const aggressiveIssues = audit.issues.filter((issue) => issue.level === "aggressive");
  const needsAggressive = aggressiveIssues.length > 0;

  if (needsAggressive && !prompter.shouldForce) {
    note(
      "Custom or unexpected service edits detected. Rerun with --force to overwrite.",
      "Gateway service config",
    );
  }

  const repair = needsAggressive
    ? await prompter.confirmAggressive({
        message: "Overwrite gateway service config with current defaults now?",
        initialValue: Boolean(prompter.shouldForce),
      })
    : await prompter.confirmRepair({
        message: "Update gateway service config to the recommended defaults now?",
        initialValue: true,
      });
  if (!repair) {
    return;
  }
  try {
    await service.install({
      env: process.env,
      stdout: process.stdout,
      programArguments,
      workingDirectory,
      environment,
    });
  } catch (err) {
    runtime.error(`Gateway service update failed: ${String(err)}`);
  }
}

export async function maybeScanExtraGatewayServices(options: DoctorOptions) {
  const extraServices = await findExtraGatewayServices(process.env, {
    deep: options.deep,
  });
  if (extraServices.length === 0) {
    return;
  }

  note(
    extraServices.map((svc) => `- ${svc.label} (${svc.scope}, ${svc.detail})`).join("\n"),
    "Other gateway-like services detected",
  );

<<<<<<< HEAD
=======
  const legacyServices = extraServices.filter((svc) => svc.legacy === true);
  if (legacyServices.length > 0) {
    const shouldRemove = await prompter.confirmSkipInNonInteractive({
      message: "Remove legacy gateway services (clawdbot/moltbot) now?",
      initialValue: true,
    });
    if (shouldRemove) {
      const removed: string[] = [];
      const { darwinUserServices, linuxUserServices, failed } =
        classifyLegacyServices(legacyServices);

      if (darwinUserServices.length > 0) {
        const result = await cleanupLegacyDarwinServices(darwinUserServices);
        removed.push(...result.removed);
        failed.push(...result.failed);
      }

      if (linuxUserServices.length > 0) {
        const result = await cleanupLegacyLinuxUserServices(linuxUserServices, runtime);
        removed.push(...result.removed);
        failed.push(...result.failed);
      }

      if (removed.length > 0) {
        note(removed.map((line) => `- ${line}`).join("\n"), "Legacy gateway removed");
      }
      if (failed.length > 0) {
        note(failed.map((line) => `- ${line}`).join("\n"), "Legacy gateway cleanup skipped");
      }
      if (removed.length > 0) {
        runtime.log("Legacy gateway services removed. Installing OpenClaw gateway next.");
      }
    }
  }

>>>>>>> 8a8faf066 (doctor: clean up legacy Linux gateway services (#21188))
  const cleanupHints = renderGatewayServiceCleanupHints();
  if (cleanupHints.length > 0) {
    note(cleanupHints.map((hint) => `- ${hint}`).join("\n"), "Cleanup hints");
  }

  note(
    [
      "Recommendation: run a single gateway per machine for most setups.",
      "One gateway supports multiple agents.",
      "If you need multiple gateways (e.g., a rescue bot on the same host), isolate ports + config/state (see docs: /gateway#multiple-gateways-same-host).",
    ].join("\n"),
    "Gateway recommendation",
  );
}
