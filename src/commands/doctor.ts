import fs from "node:fs";
import { intro as clackIntro, outro as clackOutro } from "@clack/prompts";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../agents/defaults.js";
import { loadModelCatalog } from "../agents/model-catalog.js";
import {
  getModelRefStatus,
  resolveConfiguredModelRef,
  resolveHooksGmailModel,
} from "../agents/model-selection.js";
import { formatCliCommand } from "../cli/command-format.js";
import { resolveCommandSecretRefsViaGateway } from "../cli/command-secret-gateway.js";
import { getDoctorCommandSecretTargetIds } from "../cli/command-secret-targets.js";
import type { OpenClawConfig } from "../config/config.js";
import { CONFIG_PATH, readConfigFileSnapshot, writeConfigFile } from "../config/config.js";
import { logConfigUpdated } from "../config/logging.js";
import { resolveGatewayService } from "../daemon/service.js";
import { resolveGatewayAuth } from "../gateway/auth.js";
import { buildGatewayConnectionDetails } from "../gateway/call.js";
import { resolveOpenClawPackageRoot } from "../infra/openclaw-root.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { note } from "../terminal/note.js";
import { stylePromptTitle } from "../terminal/prompt-style.js";
import { shortenHomePath } from "../utils.js";
import {
  maybeRemoveDeprecatedCliAuthProfiles,
  maybeRepairAnthropicOAuthProfileId,
  noteAuthProfileHealth,
} from "./doctor-auth.js";
import { doctorShellCompletion } from "./doctor-completion.js";
import { loadAndMaybeMigrateDoctorConfig } from "./doctor-config-flow.js";
import { maybeRepairGatewayDaemon } from "./doctor-gateway-daemon-flow.js";
import { checkGatewayHealth, probeGatewayMemoryStatus } from "./doctor-gateway-health.js";
import {
  maybeRepairGatewayServiceConfig,
  maybeScanExtraGatewayServices,
} from "./doctor-gateway-services.js";
import { noteSourceInstallIssues } from "./doctor-install.js";
import { noteMemorySearchHealth } from "./doctor-memory-search.js";
import {
  noteMacLaunchAgentOverrides,
  noteMacLaunchctlGatewayEnvOverrides,
  noteDeprecatedLegacyEnvVars,
  noteStartupOptimizationHints,
} from "./doctor-platform-notes.js";
import {
  createDoctorPrompter,
  resolveDoctorExecutionMode,
  type DoctorOptions,
} from "./doctor-prompter.js";
import {
  maybeRepairSandboxImages,
  noteSandboxScopeWarnings,
  noteSandboxUsefulnessWarnings,
} from "./doctor-sandbox.js";
import { noteSecurityWarnings } from "./doctor-security.js";
import { noteSessionLockHealth } from "./doctor-session-locks.js";
import { noteStateIntegrity, noteWorkspaceBackupTip } from "./doctor-state-integrity.js";
import {
  detectLegacyStateMigrations,
  runLegacyStateMigrations,
} from "./doctor-state-migrations.js";
import { maybeRepairUiProtocolFreshness } from "./doctor-ui.js";
import { maybeOfferUpdateBeforeDoctor } from "./doctor-update.js";
import { noteWorkspaceStatus } from "./doctor-workspace-status.js";
import { MEMORY_SYSTEM_PROMPT, shouldSuggestMemorySystem } from "./doctor-workspace.js";
import { noteOpenAIOAuthTlsPrerequisites } from "./oauth-tls-preflight.js";
import { applyWizardMetadata, printWizardHeader, randomToken } from "./onboard-helpers.js";
import { ensureSystemdUserLingerInteractive } from "./systemd-linger.js";

const intro = (message: string) => clackIntro(stylePromptTitle(message) ?? message);
const outro = (message: string) => clackOutro(stylePromptTitle(message) ?? message);

function resolveMode(cfg: OpenClawConfig): "local" | "remote" {
  return cfg.gateway?.mode === "remote" ? "remote" : "local";
}

function validateDoctorOptions(options: DoctorOptions) {
  if (!options.dryRun) {
    return;
  }
  const conflicts = [
    options.repair === true ? "--repair/--fix" : null,
    options.yes === true ? "--yes" : null,
    options.force === true ? "--force" : null,
    options.generateGatewayToken === true ? "--generate-gateway-token" : null,
  ].filter((value): value is string => Boolean(value));
  if (conflicts.length === 0) {
    return;
  }
  throw new Error(`--dry-run cannot be combined with ${conflicts.join(", ")}.`);
}

async function resolveDoctorDiagnosticConfig(cfg: OpenClawConfig): Promise<OpenClawConfig> {
  try {
    const { resolvedConfig } = await resolveCommandSecretRefsViaGateway({
      config: cfg,
      commandName: "doctor",
      targetIds: getDoctorCommandSecretTargetIds(),
    });
    return resolvedConfig;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    note(
      `SecretRef resolution skipped for doctor diagnostics: ${message}\n` +
        "Doctor will continue with raw config; some auth-dependent warnings may be less precise.",
      "Doctor warnings",
    );
    return cfg;
  }
}

export async function doctorCommand(
  runtime: RuntimeEnv = defaultRuntime,
  options: DoctorOptions = {},
) {
  validateDoctorOptions(options);
  const prompter = createDoctorPrompter({ runtime, options });
  const executionMode = resolveDoctorExecutionMode(options);
  printWizardHeader(runtime);
  intro(executionMode === "dry-run" ? "OpenClaw doctor (dry-run)" : "OpenClaw doctor");
  if (executionMode === "dry-run") {
    note(
      [
        "- Target mode: dry-run",
        "- Preview only. Doctor will not write config/state, repair permissions, restart services, or build images/assets.",
        '- If you want to apply repairs later, rerun "openclaw doctor --repair --yes" in an approved environment.',
      ].join("\n"),
      "Doctor mode",
    );
  }

  const root = await resolveOpenClawPackageRoot({
    moduleUrl: import.meta.url,
    argv1: process.argv[1],
    cwd: process.cwd(),
  });

  if (executionMode !== "dry-run") {
    const updateResult = await maybeOfferUpdateBeforeDoctor({
      runtime,
      options,
      root,
      confirm: (p) => prompter.confirm(p),
      outro,
    });
    if (updateResult.handled) {
      return;
    }
  }

  await maybeRepairUiProtocolFreshness(runtime, prompter);
  noteSourceInstallIssues(root);
  noteDeprecatedLegacyEnvVars();
  noteStartupOptimizationHints();

  const configResult = await loadAndMaybeMigrateDoctorConfig({
    options,
    confirm: (p) => prompter.confirm(p),
  });
  let cfg: OpenClawConfig = configResult.cfg;
  const cfgForPersistence = structuredClone(cfg);
  const sourceConfigValid = configResult.sourceConfigValid ?? true;

  const configPath = configResult.path ?? CONFIG_PATH;
  if (!cfg.gateway?.mode) {
    const lines = [
      "gateway.mode is unset; gateway start will be blocked.",
      `Fix: run ${formatCliCommand("openclaw configure")} and set Gateway mode (local/remote).`,
      `Or set directly: ${formatCliCommand("openclaw config set gateway.mode local")}`,
    ];
    if (!fs.existsSync(configPath)) {
      lines.push(`Missing config: run ${formatCliCommand("openclaw setup")} first.`);
    }
    note(lines.join("\n"), "Gateway");
  }

  cfg = await maybeRepairAnthropicOAuthProfileId(cfg, prompter);
  cfg = await maybeRemoveDeprecatedCliAuthProfiles(cfg, prompter);
  let diagnosticCfg = await resolveDoctorDiagnosticConfig(cfg);
  await noteAuthProfileHealth({
    cfg: diagnosticCfg,
    prompter,
    allowKeychainPrompt: options.nonInteractive !== true && Boolean(process.stdin.isTTY),
  });
  const gatewayDetails = buildGatewayConnectionDetails({ config: cfg });
  if (gatewayDetails.remoteFallbackNote) {
    note(gatewayDetails.remoteFallbackNote, "Gateway");
  }
  if (resolveMode(cfg) === "local" && sourceConfigValid) {
    const auth = resolveGatewayAuth({
      authConfig: diagnosticCfg.gateway?.auth,
      tailscaleMode: diagnosticCfg.gateway?.tailscale?.mode ?? "off",
    });
    const needsToken =
      auth.mode !== "password" &&
      auth.mode !== "trusted-proxy" &&
      (auth.mode !== "token" || !auth.token);
    if (needsToken) {
      note(
        "Gateway auth is off or missing a token. Token auth is now the recommended default (including loopback).",
        "Gateway auth",
      );
      if (prompter.isDryRun) {
        note("- Would generate and configure a gateway token.", "Doctor dry-run");
      }
      const shouldSetToken =
        options.generateGatewayToken === true
          ? true
          : options.nonInteractive === true
            ? false
            : await prompter.confirmRepair({
                message: "Generate and configure a gateway token now?",
                initialValue: true,
              });
      if (shouldSetToken) {
        const nextToken = randomToken();
        cfg = {
          ...cfg,
          gateway: {
            ...cfg.gateway,
            auth: {
              ...cfg.gateway?.auth,
              mode: "token",
              token: nextToken,
            },
          },
        };
        diagnosticCfg = await resolveDoctorDiagnosticConfig(cfg);
        note("Gateway token configured.", "Gateway auth");
      }
    }
  }

  const legacyState = await detectLegacyStateMigrations({ cfg });
  if (legacyState.preview.length > 0) {
    note(legacyState.preview.join("\n"), "Legacy state detected");
    if (prompter.isDryRun) {
      note(
        ["- Would migrate legacy state on apply mode.", ...legacyState.preview].join("\n"),
        "Doctor dry-run",
      );
    }
    const migrate = prompter.isDryRun
      ? false
      : options.nonInteractive === true
        ? true
        : await prompter.confirm({
            message: "Migrate legacy state (sessions/agent/WhatsApp auth) now?",
            initialValue: true,
          });
    if (migrate) {
      const migrated = await runLegacyStateMigrations({
        detected: legacyState,
      });
      if (migrated.changes.length > 0) {
        note(migrated.changes.join("\n"), "Doctor changes");
      }
      if (migrated.warnings.length > 0) {
        note(migrated.warnings.join("\n"), "Doctor warnings");
      }
    }
  }

  await noteStateIntegrity(cfg, prompter, configResult.path ?? CONFIG_PATH);
  await noteSessionLockHealth({
    shouldRepair: prompter.shouldRepair,
    dryRun: prompter.isDryRun,
  });

  cfg = await maybeRepairSandboxImages(cfg, runtime, prompter);
  noteSandboxScopeWarnings(cfg);
  await noteSandboxUsefulnessWarnings(cfg);

  await maybeScanExtraGatewayServices(options, runtime, prompter);
  await maybeRepairGatewayServiceConfig(cfg, resolveMode(cfg), runtime, prompter);
  await noteMacLaunchAgentOverrides();
  await noteMacLaunchctlGatewayEnvOverrides(cfg);

  await noteSecurityWarnings(diagnosticCfg);
  await noteOpenAIOAuthTlsPrerequisites({
    cfg,
    deep: options.deep === true,
  });

  if (cfg.hooks?.gmail?.model?.trim()) {
    const hooksModelRef = resolveHooksGmailModel({
      cfg,
      defaultProvider: DEFAULT_PROVIDER,
    });
    if (!hooksModelRef) {
      note(`- hooks.gmail.model "${cfg.hooks.gmail.model}" could not be resolved`, "Hooks");
    } else {
      const { provider: defaultProvider, model: defaultModel } = resolveConfiguredModelRef({
        cfg,
        defaultProvider: DEFAULT_PROVIDER,
        defaultModel: DEFAULT_MODEL,
      });
      const catalog = await loadModelCatalog({ config: cfg });
      const status = getModelRefStatus({
        cfg,
        catalog,
        ref: hooksModelRef,
        defaultProvider,
        defaultModel,
      });
      const warnings: string[] = [];
      if (!status.allowed) {
        warnings.push(
          `- hooks.gmail.model "${status.key}" not in agents.defaults.models allowlist (will use primary instead)`,
        );
      }
      if (!status.inCatalog) {
        warnings.push(
          `- hooks.gmail.model "${status.key}" not in the model catalog (may fail at runtime)`,
        );
      }
      if (warnings.length > 0) {
        note(warnings.join("\n"), "Hooks");
      }
    }
  }

  if (
    options.nonInteractive !== true &&
    process.platform === "linux" &&
    resolveMode(cfg) === "local"
  ) {
    const service = resolveGatewayService();
    let loaded = false;
    try {
      loaded = await service.isLoaded({ env: process.env });
    } catch {
      loaded = false;
    }
    if (loaded) {
      if (prompter.isDryRun) {
        note(
          "- Would check systemd lingering and offer to enable it for the current user if disabled.",
          "Doctor dry-run",
        );
      } else {
        await ensureSystemdUserLingerInteractive({
          runtime,
          prompter: {
            confirm: async (p) => prompter.confirm(p),
            note,
          },
          reason:
            "Gateway runs as a systemd user service. Without lingering, systemd stops the user session on logout/idle and kills the Gateway.",
          requireConfirm: true,
        });
      }
    }
  }

  noteWorkspaceStatus(cfg);

  if (prompter.isDryRun) {
    note(
      "- Would audit shell completion and regenerate/install the cache if needed.",
      "Doctor dry-run",
    );
  } else {
    await doctorShellCompletion(runtime, prompter, {
      nonInteractive: options.nonInteractive,
    });
  }

  const { healthOk } = await checkGatewayHealth({
    runtime,
    cfg: diagnosticCfg,
    timeoutMs: options.nonInteractive === true ? 3000 : 10_000,
  });
  const gatewayMemoryProbe = healthOk
    ? await probeGatewayMemoryStatus({
        cfg: diagnosticCfg,
        timeoutMs: options.nonInteractive === true ? 3000 : 10_000,
      })
    : { checked: false, ready: false };
  await noteMemorySearchHealth(diagnosticCfg, { gatewayMemoryProbe });
  await maybeRepairGatewayDaemon({
    cfg,
    runtime,
    prompter,
    options,
    gatewayDetailsMessage: gatewayDetails.message,
    healthOk,
  });

  const shouldWriteConfig =
    configResult.shouldWriteConfig || JSON.stringify(cfg) !== JSON.stringify(cfgForPersistence);
  if (shouldWriteConfig && !prompter.isDryRun) {
    cfg = applyWizardMetadata(cfg, { command: "doctor", mode: resolveMode(cfg) });
    await writeConfigFile(cfg);
    logConfigUpdated(runtime);
    const backupPath = `${CONFIG_PATH}.bak`;
    if (fs.existsSync(backupPath)) {
      runtime.log(`Backup: ${shortenHomePath(backupPath)}`);
    }
  } else if (shouldWriteConfig && prompter.isDryRun) {
    note("- Config changes were previewed only; no config file was written.", "Doctor dry-run");
  } else if (!prompter.shouldRepair && !prompter.isDryRun) {
    runtime.log(`Run "${formatCliCommand("openclaw doctor --fix")}" to apply changes.`);
  }

  if (options.workspaceSuggestions !== false) {
    const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
    noteWorkspaceBackupTip(workspaceDir);
    if (await shouldSuggestMemorySystem(workspaceDir)) {
      note(MEMORY_SYSTEM_PROMPT, "Workspace");
    }
  }

  const finalSnapshot = await readConfigFileSnapshot();
  if (finalSnapshot.exists && !finalSnapshot.valid) {
    runtime.error("Invalid config:");
    for (const issue of finalSnapshot.issues) {
      const path = issue.path || "<root>";
      runtime.error(`- ${path}: ${issue.message}`);
    }
  }

  outro(prompter.isDryRun ? "Doctor dry-run complete." : "Doctor complete.");
}
