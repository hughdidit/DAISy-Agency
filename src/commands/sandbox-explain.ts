import { resolveAgentConfig } from "../agents/agent-scope.js";
import {
  resolveSandboxConfigForAgent,
  resolveSandboxToolPolicyForAgent,
  resolveSandboxTrustPosture,
} from "../agents/sandbox.js";
import { normalizeAnyChannelId } from "../channels/registry.js";
import type { OpenClawConfig } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import {
  loadSessionStore,
  resolveAgentMainSessionKey,
  resolveMainSessionKey,
  resolveStorePath,
} from "../config/sessions.js";
import { temporarilyRouteLogsToStderr } from "../logging/console.js";
import {
  buildAgentMainSessionKey,
  normalizeAgentId,
  normalizeMainKey,
  parseAgentSessionKey,
  resolveAgentIdFromSessionKey,
} from "../routing/session-key.js";
import type { RuntimeEnv } from "../runtime.js";
import { RESOLVED_CAPABILITY_CLASSES } from "../shared/resolved-capability-manifest.js";
import { formatDocsLink } from "../terminal/links.js";
import { colorize, isRich, theme } from "../terminal/theme.js";
import { INTERNAL_MESSAGE_CHANNEL } from "../utils/message-channel.js";
import {
  collectCommandCapabilitySnapshot,
  formatCapabilityClassLabel,
  formatCommandCapabilityFindingFailureMessage,
  pickCapabilityFindings,
} from "./capability-readiness.js";

type SandboxExplainOptions = {
  session?: string;
  agent?: string;
  json: boolean;
  readonlyRuntime?: {
    workspaceDir?: string;
  };
};

const SANDBOX_DOCS_URL = "https://docs.openclaw.ai/sandbox";

function normalizeExplainSessionKey(params: {
  cfg: OpenClawConfig;
  agentId: string;
  session?: string;
}): string {
  const raw = (params.session ?? "").trim();
  if (!raw) {
    return resolveAgentMainSessionKey({
      cfg: params.cfg,
      agentId: params.agentId,
    });
  }
  if (raw.includes(":")) {
    return raw;
  }
  if (raw === "global") {
    return "global";
  }
  return buildAgentMainSessionKey({
    agentId: params.agentId,
    mainKey: normalizeMainKey(raw),
  });
}

function inferProviderFromSessionKey(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
}): string | undefined {
  const parsed = parseAgentSessionKey(params.sessionKey);
  if (!parsed) {
    return undefined;
  }
  const rest = parsed.rest.trim();
  if (!rest) {
    return undefined;
  }
  const parts = rest.split(":").filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const configuredMainKey = normalizeMainKey(params.cfg.session?.mainKey);
  if (parts[0] === configuredMainKey) {
    return undefined;
  }
  const candidate = parts[0]?.trim().toLowerCase();
  if (!candidate) {
    return undefined;
  }
  if (candidate === INTERNAL_MESSAGE_CHANNEL) {
    return INTERNAL_MESSAGE_CHANNEL;
  }
  return normalizeAnyChannelId(candidate) ?? undefined;
}

function resolveActiveChannel(params: {
  cfg: OpenClawConfig;
  agentId: string;
  sessionKey: string;
}): string | undefined {
  const storePath = resolveStorePath(params.cfg.session?.store, {
    agentId: params.agentId,
  });
  const store = loadSessionStore(storePath);
  const entry = store[params.sessionKey] as
    | {
        lastChannel?: string;
        channel?: string;
        // Legacy keys (pre-rename).
        lastProvider?: string;
        provider?: string;
      }
    | undefined;
  const candidate = (
    entry?.lastChannel ??
    entry?.channel ??
    entry?.lastProvider ??
    entry?.provider ??
    ""
  )
    .trim()
    .toLowerCase();
  if (candidate === INTERNAL_MESSAGE_CHANNEL) {
    return INTERNAL_MESSAGE_CHANNEL;
  }
  const normalized = normalizeAnyChannelId(candidate);
  if (normalized) {
    return normalized;
  }
  return inferProviderFromSessionKey({
    cfg: params.cfg,
    sessionKey: params.sessionKey,
  });
}

export async function sandboxExplainCommand(
  opts: SandboxExplainOptions,
  runtime: RuntimeEnv,
): Promise<void> {
  const restoreConsoleRouting = opts.json ? temporarilyRouteLogsToStderr() : null;
  let consoleRoutingRestored = false;
  const restoreConsoleLogs = () => {
    if (consoleRoutingRestored) {
      return;
    }
    consoleRoutingRestored = true;
    restoreConsoleRouting?.();
  };

  try {
    const cfg = loadConfig();

    const defaultAgentId = resolveAgentIdFromSessionKey(resolveMainSessionKey(cfg));
    const resolvedAgentId = normalizeAgentId(
      opts.agent?.trim()
        ? opts.agent
        : opts.session?.trim()
          ? resolveAgentIdFromSessionKey(opts.session)
          : defaultAgentId,
    );

    const sessionKey = normalizeExplainSessionKey({
      cfg,
      agentId: resolvedAgentId,
      session: opts.session,
    });

    const sandboxCfg = resolveSandboxConfigForAgent(cfg, resolvedAgentId);
    const toolPolicy = resolveSandboxToolPolicyForAgent(cfg, resolvedAgentId);
    const mainSessionKey = resolveAgentMainSessionKey({
      cfg,
      agentId: resolvedAgentId,
    });
    const sessionIsSandboxed =
      sandboxCfg.mode === "all"
        ? true
        : sandboxCfg.mode === "off"
          ? false
          : sessionKey.trim() !== mainSessionKey.trim();
    const sandboxTrustPosture = resolveSandboxTrustPosture({
      mode: sandboxCfg.mode,
      sandboxed: sessionIsSandboxed,
    });

    const channel = resolveActiveChannel({
      cfg,
      agentId: resolvedAgentId,
      sessionKey,
    });

    const agentConfig = resolveAgentConfig(cfg, resolvedAgentId);
    const elevatedGlobal = cfg.tools?.elevated;
    const elevatedAgent = agentConfig?.tools?.elevated;
    const elevatedGlobalEnabled = elevatedGlobal?.enabled === true;
    const elevatedAgentEnabled = elevatedAgent?.enabled !== false;
    const elevatedEnabled = elevatedGlobalEnabled && elevatedAgentEnabled;

    const globalAllow = channel ? elevatedGlobal?.allowFrom?.[channel] : undefined;
    const agentAllow = channel ? elevatedAgent?.allowFrom?.[channel] : undefined;

    const allowTokens = (values?: Array<string | number>) =>
      (values ?? []).map((v) => String(v).trim()).filter(Boolean);
    const globalAllowTokens = allowTokens(globalAllow);
    const agentAllowTokens = allowTokens(agentAllow);

    const elevatedAllowedByConfig =
      elevatedEnabled &&
      Boolean(channel) &&
      globalAllowTokens.length > 0 &&
      (elevatedAgent?.allowFrom ? agentAllowTokens.length > 0 : true);

    const elevatedAlwaysAllowedByConfig =
      elevatedAllowedByConfig &&
      globalAllowTokens.includes("*") &&
      (elevatedAgent?.allowFrom ? agentAllowTokens.includes("*") : true);

    const elevatedFailures: Array<{ gate: string; key: string }> = [];
    if (!elevatedGlobalEnabled) {
      elevatedFailures.push({ gate: "enabled", key: "tools.elevated.enabled" });
    }
    if (!elevatedAgentEnabled) {
      elevatedFailures.push({
        gate: "enabled",
        key: "agents.list[].tools.elevated.enabled",
      });
    }
    if (channel && globalAllowTokens.length === 0) {
      elevatedFailures.push({
        gate: "allowFrom",
        key: `tools.elevated.allowFrom.${channel}`,
      });
    }
    if (channel && elevatedAgent?.allowFrom && agentAllowTokens.length === 0) {
      elevatedFailures.push({
        gate: "allowFrom",
        key: `agents.list[].tools.elevated.allowFrom.${channel}`,
      });
    }

    const fixIt: string[] = [];
    fixIt.push("tools.sandbox.tools.allow");
    fixIt.push("tools.sandbox.tools.deny");
    fixIt.push("agents.list[].tools.sandbox.tools.allow");
    fixIt.push("agents.list[].tools.sandbox.tools.deny");
    fixIt.push("tools.elevated.enabled");
    if (channel) {
      fixIt.push(`tools.elevated.allowFrom.${channel}`);
    }
    const capabilities = collectCommandCapabilitySnapshot({
      config: cfg,
      agentId: resolvedAgentId,
      sessionKey,
      mode: opts.readonlyRuntime ? "readonly-sandbox" : "gateway",
      workspaceDir: opts.readonlyRuntime?.workspaceDir,
    });

    const payload = {
      docsUrl: SANDBOX_DOCS_URL,
      agentId: resolvedAgentId,
      sessionKey,
      mainSessionKey,
      sandbox: {
        mode: sandboxCfg.mode,
        scope: sandboxCfg.scope,
        profile: sandboxCfg.profile,
        perSession: sandboxCfg.scope === "session",
        workspaceAccess: sandboxCfg.workspaceAccess,
        workspaceRoot: sandboxCfg.workspaceRoot,
        sessionIsSandboxed,
        docker: {
          image: sandboxCfg.docker.image,
        },
        browser: {
          enabled: sandboxCfg.browser.enabled,
          image: sandboxCfg.browser.image,
        },
        trustPosture: sandboxTrustPosture.trustPosture,
        trustLabel: sandboxTrustPosture.trustLabel,
        trustSummary: sandboxTrustPosture.trustSummary,
        correctiveAction: sandboxTrustPosture.correctiveAction,
        tools: {
          allow: toolPolicy.allow,
          deny: toolPolicy.deny,
          sources: toolPolicy.sources,
        },
      },
      elevated: {
        enabled: elevatedEnabled,
        channel,
        allowedByConfig: elevatedAllowedByConfig,
        alwaysAllowedByConfig: elevatedAlwaysAllowedByConfig,
        allowFrom: {
          global: channel ? globalAllowTokens : undefined,
          agent: elevatedAgent?.allowFrom && channel ? agentAllowTokens : undefined,
        },
        failures: elevatedFailures,
      },
      capabilities,
      fixIt,
    } as const;

    if (opts.json) {
      restoreConsoleLogs();
      runtime.log(`${JSON.stringify(payload, null, 2)}\n`);
      return;
    }

    const rich = isRich();
    const heading = (value: string) => colorize(rich, theme.heading, value);
    const key = (value: string) => colorize(rich, theme.muted, value);
    const value = (val: string) => colorize(rich, theme.info, val);
    const ok = (val: string) => colorize(rich, theme.success, val);
    const warn = (val: string) => colorize(rich, theme.warn, val);
    const err = (val: string) => colorize(rich, theme.error, val);
    const bool = (flag: boolean) => (flag ? ok("true") : err("false"));

    const lines: string[] = [];
    lines.push(heading("Effective sandbox:"));
    lines.push(`  ${key("agentId:")} ${value(payload.agentId)}`);
    lines.push(`  ${key("sessionKey:")} ${value(payload.sessionKey)}`);
    lines.push(`  ${key("mainSessionKey:")} ${value(payload.mainSessionKey)}`);
    lines.push(
      `  ${key("runtime:")} ${
        payload.sandbox.sessionIsSandboxed
          ? ok(payload.sandbox.trustLabel)
          : warn(payload.sandbox.trustLabel)
      }`,
    );
    lines.push(
      `  ${key("trustPosture:")} ${value(payload.sandbox.trustPosture)} ${key(
        "sandboxed:",
      )} ${bool(payload.sandbox.sessionIsSandboxed)}`,
    );
    lines.push(
      `  ${key("mode:")} ${value(payload.sandbox.mode)} ${key("scope:")} ${value(
        payload.sandbox.scope,
      )} ${key("profile:")} ${value(payload.sandbox.profile)} ${key("perSession:")} ${bool(
        payload.sandbox.perSession,
      )}`,
    );
    lines.push(
      `  ${key("workspaceAccess:")} ${value(
        payload.sandbox.workspaceAccess,
      )} ${key("workspaceRoot:")} ${value(payload.sandbox.workspaceRoot)}`,
    );
    lines.push("");
    lines.push(heading("Sandbox tool policy:"));
    lines.push(
      `  ${key(`allow (${payload.sandbox.tools.sources.allow.source}):`)} ${value(
        payload.sandbox.tools.allow.join(", ") || "(empty)",
      )}`,
    );
    lines.push(
      `  ${key(`deny  (${payload.sandbox.tools.sources.deny.source}):`)} ${value(
        payload.sandbox.tools.deny.join(", ") || "(empty)",
      )}`,
    );
    lines.push("");
    lines.push(heading("Elevated:"));
    lines.push(`  ${key("enabled:")} ${bool(payload.elevated.enabled)}`);
    lines.push(`  ${key("channel:")} ${value(payload.elevated.channel ?? "(unknown)")}`);
    lines.push(`  ${key("allowedByConfig:")} ${bool(payload.elevated.allowedByConfig)}`);
    if (payload.elevated.failures.length > 0) {
      lines.push(
        `  ${key("failing gates:")} ${warn(
          payload.elevated.failures.map((f) => `${f.gate} (${f.key})`).join(", "),
        )}`,
      );
    }
    if (payload.sandbox.mode === "non-main" && payload.sandbox.sessionIsSandboxed) {
      lines.push("");
      lines.push(
        `${warn("Hint:")} sandbox mode is non-main; the main session is ${warn(
          "reduced-trust host compatibility",
        )}: ${value(payload.mainSessionKey)}. Prefer ${value(
          'agents.defaults.sandbox.mode="all"',
        )} for sandbox-first operation.`,
      );
    }
    if (!payload.sandbox.sessionIsSandboxed) {
      lines.push("");
      lines.push(`${warn("Reduced trust:")} ${payload.sandbox.trustSummary}`);
      if (payload.sandbox.correctiveAction) {
        lines.push(`${key("Corrective path:")} ${payload.sandbox.correctiveAction}`);
      }
    }
    lines.push("");
    lines.push(heading("Effective capabilities:"));
    for (const capabilityClass of RESOLVED_CAPABILITY_CLASSES) {
      lines.push(
        `  ${key(`${formatCapabilityClassLabel(capabilityClass)}:`)} ${value(
          String(payload.capabilities.counts.byClass[capabilityClass]),
        )}`,
      );
    }
    const capabilityFindings = pickCapabilityFindings(payload.capabilities, {
      capabilityClasses: [
        "configured-but-blocked",
        "unsupported-in-current-runtime",
        "remote-node-assisted",
        "gateway-brokered",
      ],
      limit: 8,
    });
    if (capabilityFindings.length === 0) {
      lines.push(`  ${ok("All resolved capabilities are sandbox-local.")}`);
    } else {
      for (const finding of capabilityFindings) {
        lines.push(
          `  - ${finding.kind} ${finding.label} · ${finding.capabilityClass} · ${finding.primaryReasonCategory}`,
        );
        const normalizedFailure = formatCommandCapabilityFindingFailureMessage(finding);
        if (normalizedFailure) {
          lines.push(`    ${normalizedFailure}`);
        } else {
          lines.push(`    ${finding.summary}${finding.detail ? `: ${finding.detail}` : ""}`);
          if (finding.remediation) {
            lines.push(`    ${key("Fix:")} ${finding.remediation}`);
          }
        }
      }
    }
    lines.push("");
    lines.push(heading("Fix-it:"));
    for (const key of payload.fixIt) {
      lines.push(`  - ${key}`);
    }
    lines.push("");
    lines.push(`${key("Docs:")} ${formatDocsLink("/sandbox", "docs.openclaw.ai/sandbox")}`);

    runtime.log(`${lines.join("\n")}\n`);
  } finally {
    restoreConsoleLogs();
  }
}
