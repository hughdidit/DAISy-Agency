import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { OpenClawConfig } from "../config/config.js";
import { loadOpenClawPlugins } from "../plugins/loader.js";
import { RESOLVED_CAPABILITY_CLASSES } from "../shared/resolved-capability-manifest.js";
import { note } from "../terminal/note.js";
import {
  collectCommandCapabilitySnapshot,
  pickCapabilityFindings,
} from "./capability-readiness.js";
import { detectLegacyWorkspaceDirs, formatLegacyWorkspaceWarning } from "./doctor-workspace.js";

export function noteWorkspaceStatus(cfg: OpenClawConfig) {
  const agentId = resolveDefaultAgentId(cfg);
  const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
  const legacyWorkspace = detectLegacyWorkspaceDirs({ workspaceDir });
  if (legacyWorkspace.legacyDirs.length > 0) {
    note(formatLegacyWorkspaceWarning(legacyWorkspace), "Extra workspace");
  }

  const capabilities = collectCommandCapabilitySnapshot({
    config: cfg,
    agentId,
  });
  const readinessLines = RESOLVED_CAPABILITY_CLASSES.map(
    (capabilityClass) =>
      `${capabilityClass}: ${capabilities.counts.byClass[capabilityClass]}`,
  );
  const findings = pickCapabilityFindings(capabilities, {
    capabilityClasses: [
      "configured-but-blocked",
      "unsupported-in-current-runtime",
      "remote-node-assisted",
      "gateway-brokered",
    ],
    limit: 6,
  });
  note(
    [
      ...readinessLines,
      ...(findings.length > 0
        ? [
            "",
            ...findings.flatMap((finding) => [
              `- ${finding.kind} ${finding.label}: ${finding.capabilityClass} (${finding.primaryReasonCategory})`,
              `  ${finding.summary}${finding.detail ? `: ${finding.detail}` : ""}`,
              ...(finding.remediation ? [`  Fix: ${finding.remediation}`] : []),
            ]),
          ]
        : ["", "All resolved capabilities are sandbox-local."]),
    ].join("\n"),
    "Capability readiness",
  );

  const pluginRegistry = loadOpenClawPlugins({
    config: cfg,
    workspaceDir,
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
  });
  if (pluginRegistry.plugins.length > 0) {
    const loaded = pluginRegistry.plugins.filter((p) => p.status === "loaded");
    const disabled = pluginRegistry.plugins.filter((p) => p.status === "disabled");
    const errored = pluginRegistry.plugins.filter((p) => p.status === "error");

    const lines = [
      `Loaded: ${loaded.length}`,
      `Disabled: ${disabled.length}`,
      `Errors: ${errored.length}`,
      errored.length > 0
        ? `- ${errored
            .slice(0, 10)
            .map((p) => p.id)
            .join("\n- ")}${errored.length > 10 ? "\n- ..." : ""}`
        : null,
    ].filter((line): line is string => Boolean(line));

    note(lines.join("\n"), "Plugins");
  }
  if (pluginRegistry.diagnostics.length > 0) {
    const lines = pluginRegistry.diagnostics.map((diag) => {
      const prefix = diag.level.toUpperCase();
      const plugin = diag.pluginId ? ` ${diag.pluginId}` : "";
      const source = diag.source ? ` (${diag.source})` : "";
      return `- ${prefix}${plugin}: ${diag.message}${source}`;
    });
    note(lines.join("\n"), "Plugin diagnostics");
  }

  return { workspaceDir };
}
