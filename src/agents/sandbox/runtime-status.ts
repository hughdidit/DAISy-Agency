import { formatCliCommand } from "../../cli/command-format.js";
import type { OpenClawConfig } from "../../config/config.js";
import { canonicalizeMainSessionAlias, resolveAgentMainSessionKey } from "../../config/sessions.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { resolveSessionAgentId } from "../agent-scope.js";
import { resolveSandboxConfigForAgent } from "./config.js";
import { formatSandboxFailureMessage } from "./failure-messaging.js";
import {
  resolveSandboxToolPolicyDecision,
  resolveSandboxToolPolicyForAgent,
} from "./tool-policy.js";
import type { SandboxConfig, SandboxToolPolicyResolved } from "./types.js";

function shouldSandboxSession(cfg: SandboxConfig, sessionKey: string, mainSessionKey: string) {
  if (cfg.mode === "off") {
    return false;
  }
  if (cfg.mode === "all") {
    return true;
  }
  return sessionKey.trim() !== mainSessionKey.trim();
}

function resolveMainSessionKeyForSandbox(params: {
  cfg?: OpenClawConfig;
  agentId: string;
}): string {
  if (params.cfg?.session?.scope === "global") {
    return "global";
  }
  return resolveAgentMainSessionKey({
    cfg: params.cfg,
    agentId: params.agentId,
  });
}

function resolveComparableSessionKeyForSandbox(params: {
  cfg?: OpenClawConfig;
  agentId: string;
  sessionKey: string;
}): string {
  return canonicalizeMainSessionAlias({
    cfg: params.cfg,
    agentId: params.agentId,
    sessionKey: params.sessionKey,
  });
}

export function resolveSandboxRuntimeStatus(params: {
  cfg?: OpenClawConfig;
  sessionKey?: string;
  agentId?: string;
}): {
  agentId: string;
  sessionKey: string;
  mainSessionKey: string;
  mode: SandboxConfig["mode"];
  sandboxed: boolean;
  toolPolicy: SandboxToolPolicyResolved;
} {
  const sessionKey = params.sessionKey?.trim() ?? "";
  const explicitAgentId = params.agentId?.trim() ? normalizeAgentId(params.agentId) : undefined;
  const agentId =
    explicitAgentId ??
    resolveSessionAgentId({
      sessionKey,
      config: params.cfg,
    });
  const cfg = params.cfg;
  const sandboxCfg = resolveSandboxConfigForAgent(cfg, agentId);
  const mainSessionKey = resolveMainSessionKeyForSandbox({ cfg, agentId });
  let comparableSessionKey = sessionKey;
  if (sessionKey && sandboxCfg.mode === "non-main") {
    comparableSessionKey = resolveComparableSessionKeyForSandbox({ cfg, agentId, sessionKey });
  }
  const sandboxed = comparableSessionKey
    ? shouldSandboxSession(sandboxCfg, comparableSessionKey, mainSessionKey)
    : false;
  return {
    agentId,
    sessionKey,
    mainSessionKey,
    mode: sandboxCfg.mode,
    sandboxed,
    toolPolicy: resolveSandboxToolPolicyForAgent(cfg, agentId),
  };
}

export function formatSandboxToolPolicyBlockedMessage(params: {
  cfg?: OpenClawConfig;
  sessionKey?: string;
  toolName: string;
}): string | undefined {
  const tool = params.toolName.trim().toLowerCase();
  if (!tool) {
    return undefined;
  }

  const runtime = resolveSandboxRuntimeStatus({
    cfg: params.cfg,
    sessionKey: params.sessionKey,
  });
  if (!runtime.sandboxed) {
    return undefined;
  }

  const decision = resolveSandboxToolPolicyDecision(runtime.toolPolicy, tool);
  if (decision.allowed) {
    return undefined;
  }

  const reasons: string[] = [];
  const fixes: string[] = [];
  if (decision.blockedByDeny) {
    reasons.push("deny list");
    fixes.push(`Remove "${tool}" from ${runtime.toolPolicy.sources.deny.key}.`);
  }
  if (decision.blockedByAllow) {
    reasons.push("allow list");
    fixes.push(
      `Add "${tool}" to ${runtime.toolPolicy.sources.allow.key} (or set it to [] to allow all).`,
    );
  }

  const remediation: string[] = [...fixes];
  if (runtime.mode === "non-main") {
    remediation.push(`Use main session key (direct): ${runtime.mainSessionKey}.`);
  }

  return formatSandboxFailureMessage({
    failureClass: "policy-block",
    operation: "tool invocation",
    subject: `tool "${tool}"`,
    detail: `Blocked by sandbox tool policy (mode=${runtime.mode}; session=${
      runtime.sessionKey || "(unknown)"
    }; reason=${reasons.join(" + ")}).`,
    remediation: remediation.join(" "),
    hint: formatCliCommand(
      runtime.sessionKey.trim()
        ? `openclaw sandbox explain --session ${runtime.sessionKey}`
        : "openclaw sandbox explain",
    ),
  });
}
