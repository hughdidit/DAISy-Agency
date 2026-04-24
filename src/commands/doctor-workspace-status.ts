import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { OpenClawConfig } from "../config/config.js";
import { loadOpenClawPlugins } from "../plugins/loader.js";
import { RESOLVED_CAPABILITY_CLASSES } from "../shared/resolved-capability-manifest.js";
import { note } from "../terminal/note.js";
import {
  collectCommandCapabilitySnapshot,
  pickCapabilityFindings,
  type CommandCapabilityFinding,
  type CommandCapabilitySnapshot,
} from "./capability-readiness.js";
import { detectLegacyWorkspaceDirs, formatLegacyWorkspaceWarning } from "./doctor-workspace.js";

export function buildCapabilityReadinessSection(params: {
  snapshot: CommandCapabilitySnapshot;
  capabilityClasses?: CommandCapabilityFinding["capabilityClass"][];
  limit?: number;
}) {
  const defaultCapabilityClasses: CommandCapabilityFinding["capabilityClass"][] = [
    "configured-but-blocked",
    "unsupported-in-current-runtime",
    "remote-node-assisted",
    "gateway-brokered",
  ];
  const capabilityClasses = params.capabilityClasses ?? defaultCapabilityClasses;
  const findings = pickCapabilityFindings(params.snapshot, {
    capabilityClasses,
    limit: params.limit ?? 6,
  });
  const selectedCount = capabilityClasses.reduce(
    (total, capabilityClass) => total + params.snapshot.counts.byClass[capabilityClass],
    0,
  );
  const usingDefaultCapabilityClasses =
    capabilityClasses.length === defaultCapabilityClasses.length &&
    capabilityClasses.every(
      (capabilityClass, index) => capabilityClass === defaultCapabilityClasses[index],
    );
  const lines = RESOLVED_CAPABILITY_CLASSES.map(
    (capabilityClass) => `${capabilityClass}: ${params.snapshot.counts.byClass[capabilityClass]}`,
  );
  if (findings.length > 0) {
    lines.push("");
    for (const finding of findings) {
      lines.push(
        `- ${finding.kind} ${finding.label}: ${finding.capabilityClass} (${finding.primaryReasonCategory})`,
      );
      lines.push(`  ${finding.summary}${finding.detail ? `: ${finding.detail}` : ""}`);
      if (finding.remediation) {
        lines.push(`  Fix: ${finding.remediation}`);
      }
    }
  } else {
    lines.push(
      "",
      selectedCount === 0
        ? usingDefaultCapabilityClasses
          ? "All resolved capabilities are sandbox-local."
          : "No findings in the selected classes."
        : "Findings omitted by the selected limit.",
    );
  }
  return {
    counts: params.snapshot.counts,
    findings,
    lines,
  };
}

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
  const readinessSection = buildCapabilityReadinessSection({
    snapshot: capabilities,
  });
  note(readinessSection.lines.join("\n"), "Capability readiness");

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
