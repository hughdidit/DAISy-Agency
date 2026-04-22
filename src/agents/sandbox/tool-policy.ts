import type { OpenClawConfig } from "../../config/config.js";
import { resolveAgentConfig } from "../agent-scope.js";
import { compileGlobPatterns, matchesAnyGlobPattern } from "../glob-pattern.js";
import { expandToolGroups } from "../tool-policy.js";
import { DEFAULT_TOOL_ALLOW, DEFAULT_TOOL_DENY } from "./constants.js";
import type {
  SandboxToolPolicy,
  SandboxToolPolicyResolved,
  SandboxToolPolicySource,
} from "./types.js";

export type SandboxToolPolicyDecision = {
  allowed: boolean;
  blockedByDeny: boolean;
  blockedByAllow: boolean;
  sources: SandboxToolPolicyResolved["sources"];
};

function normalizeGlob(value: string) {
  return value.trim().toLowerCase();
}

export function isToolAllowed(policy: SandboxToolPolicy, name: string) {
  const normalized = normalizeGlob(name);
  const deny = compileGlobPatterns({
    raw: expandToolGroups(policy.deny ?? []),
    normalize: normalizeGlob,
  });
  if (matchesAnyGlobPattern(normalized, deny)) {
    return false;
  }
  const allow = compileGlobPatterns({
    raw: expandToolGroups(policy.allow ?? []),
    normalize: normalizeGlob,
  });
  if (allow.length === 0) {
    return true;
  }
  return matchesAnyGlobPattern(normalized, allow);
}

export function resolveSandboxToolPolicyDecision(
  policy: SandboxToolPolicyResolved,
  name: string,
): SandboxToolPolicyDecision {
  const normalized = normalizeGlob(name);
  const deny = compileGlobPatterns({
    raw: policy.deny,
    normalize: normalizeGlob,
  });
  const blockedByDeny = matchesAnyGlobPattern(normalized, deny);
  const allow = compileGlobPatterns({
    raw: policy.allow,
    normalize: normalizeGlob,
  });
  const blockedByAllow = allow.length > 0 ? !matchesAnyGlobPattern(normalized, allow) : false;
  return {
    allowed: !blockedByDeny && !blockedByAllow,
    blockedByDeny,
    blockedByAllow,
    sources: policy.sources,
  };
}

export function resolveSandboxToolPolicyForAgent(
  cfg?: OpenClawConfig,
  agentId?: string,
): SandboxToolPolicyResolved {
  const agentConfig = cfg && agentId ? resolveAgentConfig(cfg, agentId) : undefined;
  const agentAllow = agentConfig?.tools?.sandbox?.tools?.allow;
  const agentDeny = agentConfig?.tools?.sandbox?.tools?.deny;
  const globalAllow = cfg?.tools?.sandbox?.tools?.allow;
  const globalDeny = cfg?.tools?.sandbox?.tools?.deny;

  const allowSource = Array.isArray(agentAllow)
    ? ({
        source: "agent",
        key: "agents.list[].tools.sandbox.tools.allow",
      } satisfies SandboxToolPolicySource)
    : Array.isArray(globalAllow)
      ? ({
          source: "global",
          key: "tools.sandbox.tools.allow",
        } satisfies SandboxToolPolicySource)
      : ({
          source: "default",
          key: "tools.sandbox.tools.allow",
        } satisfies SandboxToolPolicySource);

  const denySource = Array.isArray(agentDeny)
    ? ({
        source: "agent",
        key: "agents.list[].tools.sandbox.tools.deny",
      } satisfies SandboxToolPolicySource)
    : Array.isArray(globalDeny)
      ? ({
          source: "global",
          key: "tools.sandbox.tools.deny",
        } satisfies SandboxToolPolicySource)
      : ({
          source: "default",
          key: "tools.sandbox.tools.deny",
        } satisfies SandboxToolPolicySource);

  const deny = Array.isArray(agentDeny)
    ? agentDeny
    : Array.isArray(globalDeny)
      ? globalDeny
      : [...DEFAULT_TOOL_DENY];
  const allow = Array.isArray(agentAllow)
    ? agentAllow
    : Array.isArray(globalAllow)
      ? globalAllow
      : [...DEFAULT_TOOL_ALLOW];

  const expandedDeny = expandToolGroups(deny);
  let expandedAllow = expandToolGroups(allow);

  // `image` is essential for multimodal workflows; always include it in sandboxed
  // sessions unless explicitly denied.
  if (
    // Empty allowlist means "allow all" for `isToolAllowed`, so don't inject a
    // single tool that would accidentally turn it into an explicit allowlist.
    expandedAllow.length > 0 &&
    !expandedDeny.map((v) => v.toLowerCase()).includes("image") &&
    !expandedAllow.map((v) => v.toLowerCase()).includes("image")
  ) {
    expandedAllow = [...expandedAllow, "image"];
  }

  return {
    allow: expandedAllow,
    deny: expandedDeny,
    sources: {
      allow: allowSource,
      deny: denySource,
    },
  };
}
