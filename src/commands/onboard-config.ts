import type { OpenClawConfig } from "../config/config.js";
import type { AgentSandboxConfig } from "../config/types.agents-shared.js";
import type { DmScope } from "../config/types.base.js";
import type { ToolProfileId } from "../config/types.tools.js";
import type { SandboxRuntimeProfileId } from "../shared/sandbox-runtime-profiles.js";

export const ONBOARDING_DEFAULT_DM_SCOPE: DmScope = "per-channel-peer";
export const ONBOARDING_DEFAULT_TOOLS_PROFILE: ToolProfileId = "messaging";
export const ONBOARDING_DEFAULT_SANDBOX_MODE: NonNullable<AgentSandboxConfig["mode"]> = "all";
export const ONBOARDING_DEFAULT_SANDBOX_SCOPE: NonNullable<AgentSandboxConfig["scope"]> = "session";
export const ONBOARDING_DEFAULT_SANDBOX_PROFILE: SandboxRuntimeProfileId = "coding-base";
export const ONBOARDING_DEFAULT_SANDBOX_CONFIG: AgentSandboxConfig = {
  mode: ONBOARDING_DEFAULT_SANDBOX_MODE,
  scope: ONBOARDING_DEFAULT_SANDBOX_SCOPE,
  profile: ONBOARDING_DEFAULT_SANDBOX_PROFILE,
  workspaceAccess: "none",
};

export function applyOnboardingLocalWorkspaceConfig(
  baseConfig: OpenClawConfig,
  workspaceDir: string,
): OpenClawConfig {
  const existingDefaults = baseConfig.agents?.defaults;
  const nextDefaults = {
    ...existingDefaults,
    workspace: workspaceDir,
    sandbox: existingDefaults?.sandbox ?? { ...ONBOARDING_DEFAULT_SANDBOX_CONFIG },
  };

  return {
    ...baseConfig,
    agents: {
      ...baseConfig.agents,
      defaults: nextDefaults,
    },
    gateway: {
      ...baseConfig.gateway,
      mode: "local",
    },
    session: {
      ...baseConfig.session,
      dmScope: baseConfig.session?.dmScope ?? ONBOARDING_DEFAULT_DM_SCOPE,
    },
    tools: {
      ...baseConfig.tools,
      profile: baseConfig.tools?.profile ?? ONBOARDING_DEFAULT_TOOLS_PROFILE,
    },
  };
}
