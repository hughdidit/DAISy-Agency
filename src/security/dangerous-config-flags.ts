import type { OpenClawConfig } from "../config/config.js";

export const SANDBOX_DANGEROUS_OVERRIDE_KEYS = [
  "dangerouslyAllowReservedContainerTargets",
  "dangerouslyAllowExternalBindSources",
  "dangerouslyAllowContainerNamespaceJoin",
] as const;

export function collectEnabledInsecureOrDangerousFlags(cfg: OpenClawConfig): string[] {
  const enabledFlags: string[] = [];
  if (cfg.gateway?.controlUi?.allowInsecureAuth === true) {
    enabledFlags.push("gateway.controlUi.allowInsecureAuth=true");
  }
  if (cfg.gateway?.controlUi?.dangerouslyAllowHostHeaderOriginFallback === true) {
    enabledFlags.push("gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true");
  }
  if (cfg.gateway?.controlUi?.dangerouslyDisableDeviceAuth === true) {
    enabledFlags.push("gateway.controlUi.dangerouslyDisableDeviceAuth=true");
  }
  if (cfg.hooks?.gmail?.allowUnsafeExternalContent === true) {
    enabledFlags.push("hooks.gmail.allowUnsafeExternalContent=true");
  }
  if (Array.isArray(cfg.hooks?.mappings)) {
    for (const [index, mapping] of cfg.hooks.mappings.entries()) {
      if (mapping?.allowUnsafeExternalContent === true) {
        enabledFlags.push(`hooks.mappings[${index}].allowUnsafeExternalContent=true`);
      }
    }
  }
  if (cfg.tools?.exec?.applyPatch?.workspaceOnly === false) {
    enabledFlags.push("tools.exec.applyPatch.workspaceOnly=false");
  }
  const agents = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];
  const sandboxDockerConfigs: Array<{ source: string; docker: Record<string, unknown> }> = [];
  const defaultDocker = cfg.agents?.defaults?.sandbox?.docker;
  if (defaultDocker && typeof defaultDocker === "object") {
    sandboxDockerConfigs.push({
      source: "agents.defaults.sandbox.docker",
      docker: defaultDocker as Record<string, unknown>,
    });
  }
  for (const [index, agent] of agents.entries()) {
    const docker = agent?.sandbox?.docker;
    if (docker && typeof docker === "object") {
      const agentSource =
        typeof agent.id === "string" && agent.id.trim()
          ? `agents.list.${agent.id.trim()}`
          : `agents.list[${index}]`;
      sandboxDockerConfigs.push({
        source: `${agentSource}.sandbox.docker`,
        docker: docker as Record<string, unknown>,
      });
    }
  }
  for (const { source, docker } of sandboxDockerConfigs) {
    for (const key of SANDBOX_DANGEROUS_OVERRIDE_KEYS) {
      if (docker[key] === true) {
        enabledFlags.push(`${source}.${key}=true`);
      }
    }
  }
  return enabledFlags;
}
