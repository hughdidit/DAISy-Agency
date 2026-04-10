import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { resolveSandboxGwsCredentialProjection } from "./gws-credential-mounts.js";

function createConfig(
  pluginConfig: Record<string, unknown>,
  enabled = true,
): OpenClawConfig {
  return {
    plugins: {
      entries: {
        "gws-toolkit-phase1": {
          enabled,
          config: pluginConfig,
        },
      },
    },
  } as unknown as OpenClawConfig;
}

function createBasePluginConfig(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    enabledServices: ["drive"],
    enabledWriteServices: [],
    allowWriteOperations: false,
    safeMode: true,
    timeoutMs: 15000,
    maxStdoutBytes: 1048576,
    maxStderrBytes: 262144,
    allowedCredentialModes: ["credentials_file"],
    approvedCredentialDirs: ["/home/node/.openclaw/secrets/gws"],
    allowUnboundAgents: false,
    credentialRoutes: {
      "ops-main": {
        mode: "credentials_file",
        allowedServices: ["drive"],
        allowedTools: ["gws_drive_read"],
        credentialsFile: "/home/node/.openclaw/secrets/gws/credentials.json",
      },
    },
    agentCredentialBindings: {
      "agent:main": "ops-main",
    },
    defaultScopesProfile: "minimal",
    requireHumanApprovalFor: [],
    ...overrides,
  };
}

describe("resolveSandboxGwsCredentialProjection", () => {
  it("returns a projection for a bound agent credentials_file route", () => {
    const projection = resolveSandboxGwsCredentialProjection({
      config: createConfig(createBasePluginConfig()),
      agentId: "main",
      sessionKey: "agent:main:discord:channel:123",
    });

    expect(projection).toEqual({
      bindingSubject: "agent:main",
      routeName: "ops-main",
      credentialsFile: "/home/node/.openclaw/secrets/gws/credentials.json",
      approvedCredentialDir: "/home/node/.openclaw/secrets/gws",
      sourceContainerDir: "/home/node/.openclaw/secrets/gws",
      targetContainerDir: "/home/node/.openclaw/secrets/gws",
    });
  });

  it("does not project credentials for an unbound delegated subagent subject", () => {
    const projection = resolveSandboxGwsCredentialProjection({
      config: createConfig(createBasePluginConfig()),
      agentId: "main",
      sessionKey: "agent:main:subagent:worker-1",
    });

    expect(projection).toBeNull();
  });

  it("does not project credentials when plugin loading is globally disabled or excluded", () => {
    const pluginConfig = createBasePluginConfig();

    expect(
      resolveSandboxGwsCredentialProjection({
        config: {
          plugins: {
            enabled: false,
            entries: {
              "gws-toolkit-phase1": {
                enabled: true,
                config: pluginConfig,
              },
            },
          },
        } as unknown as OpenClawConfig,
        agentId: "main",
        sessionKey: "agent:main:discord:channel:123",
      }),
    ).toBeNull();

    expect(
      resolveSandboxGwsCredentialProjection({
        config: {
          plugins: {
            allow: ["other-plugin"],
            entries: {
              "gws-toolkit-phase1": {
                enabled: true,
                config: pluginConfig,
              },
            },
          },
        } as unknown as OpenClawConfig,
        agentId: "main",
        sessionKey: "agent:main:discord:channel:123",
      }),
    ).toBeNull();

    expect(
      resolveSandboxGwsCredentialProjection({
        config: {
          plugins: {
            deny: ["gws-toolkit-phase1"],
            entries: {
              "gws-toolkit-phase1": {
                enabled: true,
                config: pluginConfig,
              },
            },
          },
        } as unknown as OpenClawConfig,
        agentId: "main",
        sessionKey: "agent:main:discord:channel:123",
      }),
    ).toBeNull();
  });

  it("does not project credentials for non-credentials_file routes", () => {
    const projection = resolveSandboxGwsCredentialProjection({
      config: createConfig(
        createBasePluginConfig({
          allowedCredentialModes: ["token"],
          credentialRoutes: {
            "ops-main": {
              mode: "token",
              allowedServices: ["drive"],
              allowedTools: ["gws_drive_read"],
              tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
            },
          },
        }),
      ),
      agentId: "main",
      sessionKey: "agent:main:discord:channel:123",
    });

    expect(projection).toBeNull();
  });

  it("rejects credentials paths outside approved credential dirs", () => {
    const projection = resolveSandboxGwsCredentialProjection({
      config: createConfig(
        createBasePluginConfig({
          approvedCredentialDirs: ["/home/node/.openclaw/secrets/gws"],
          credentialRoutes: {
            "ops-main": {
              mode: "credentials_file",
              allowedServices: ["drive"],
              allowedTools: ["gws_drive_read"],
              credentialsFile: "/home/node/.openclaw/other/credentials.json",
            },
          },
        }),
      ),
      agentId: "main",
      sessionKey: "agent:main:discord:channel:123",
    });

    expect(projection).toBeNull();
  });

  it("rejects approved paths that are narrower than the mounted credential directory", () => {
    const projection = resolveSandboxGwsCredentialProjection({
      config: createConfig(
        createBasePluginConfig({
          approvedCredentialDirs: ["/home/node/.openclaw/secrets/gws/credentials.json"],
        }),
      ),
      agentId: "main",
      sessionKey: "agent:main:discord:channel:123",
    });

    expect(projection).toBeNull();
  });
});
