import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  applyOnboardingLocalWorkspaceConfig,
  ONBOARDING_DEFAULT_DM_SCOPE,
  ONBOARDING_DEFAULT_SANDBOX_CONFIG,
  ONBOARDING_DEFAULT_SANDBOX_MODE,
  ONBOARDING_DEFAULT_SANDBOX_PROFILE,
  ONBOARDING_DEFAULT_SANDBOX_SCOPE,
  ONBOARDING_DEFAULT_TOOLS_PROFILE,
} from "./onboard-config.js";

describe("applyOnboardingLocalWorkspaceConfig", () => {
  it("sets secure dmScope default when unset", () => {
    const baseConfig: OpenClawConfig = {};
    const result = applyOnboardingLocalWorkspaceConfig(baseConfig, "/tmp/workspace");

    expect(result.session?.dmScope).toBe(ONBOARDING_DEFAULT_DM_SCOPE);
    expect(result.gateway?.mode).toBe("local");
    expect(result.agents?.defaults?.workspace).toBe("/tmp/workspace");
    expect(result.agents?.defaults?.sandbox).toEqual(ONBOARDING_DEFAULT_SANDBOX_CONFIG);
    expect(result.agents?.defaults?.sandbox?.mode).toBe(ONBOARDING_DEFAULT_SANDBOX_MODE);
    expect(result.agents?.defaults?.sandbox?.scope).toBe(ONBOARDING_DEFAULT_SANDBOX_SCOPE);
    expect(result.agents?.defaults?.sandbox?.profile).toBe(ONBOARDING_DEFAULT_SANDBOX_PROFILE);
    expect(result.tools?.profile).toBe(ONBOARDING_DEFAULT_TOOLS_PROFILE);
  });

  it("preserves existing dmScope when already configured", () => {
    const baseConfig: OpenClawConfig = {
      session: {
        dmScope: "main",
      },
    };
    const result = applyOnboardingLocalWorkspaceConfig(baseConfig, "/tmp/workspace");

    expect(result.session?.dmScope).toBe("main");
  });

  it("preserves explicit non-main dmScope values", () => {
    const baseConfig: OpenClawConfig = {
      session: {
        dmScope: "per-account-channel-peer",
      },
    };
    const result = applyOnboardingLocalWorkspaceConfig(baseConfig, "/tmp/workspace");

    expect(result.session?.dmScope).toBe("per-account-channel-peer");
  });

  it("preserves an explicit tools.profile when already configured", () => {
    const baseConfig: OpenClawConfig = {
      tools: {
        profile: "full",
      },
    };
    const result = applyOnboardingLocalWorkspaceConfig(baseConfig, "/tmp/workspace");

    expect(result.tools?.profile).toBe("full");
  });

  it("preserves explicit sandbox-first settings when already configured", () => {
    const baseConfig: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "agent",
            profile: "coding-extended",
            workspaceAccess: "ro",
          },
        },
      },
    };
    const result = applyOnboardingLocalWorkspaceConfig(baseConfig, "/tmp/workspace");

    expect(result.agents?.defaults?.sandbox).toEqual({
      mode: "all",
      scope: "agent",
      profile: "coding-extended",
      workspaceAccess: "ro",
    });
  });

  it("preserves explicit host compatibility sandbox settings", () => {
    const baseConfig: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "off",
            scope: "shared",
          },
        },
      },
    };
    const result = applyOnboardingLocalWorkspaceConfig(baseConfig, "/tmp/workspace");

    expect(result.agents?.defaults?.sandbox).toEqual({
      mode: "off",
      scope: "shared",
    });
  });
});
