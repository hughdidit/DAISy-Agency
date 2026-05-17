import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import {
  resolveSandboxGmailPolicyMounts,
  resolveSandboxGwsCredentialProjection,
} from "./gws-credential-mounts.js";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

function createConfig(pluginConfig: Record<string, unknown>, enabled = true): OpenClawConfig {
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

function createBasePluginConfig(overrides?: Record<string, unknown>): Record<string, unknown> {
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
      sourceContainerPath: "/home/node/.openclaw/secrets/gws/credentials.json",
      targetContainerPath: "/home/node/.openclaw/secrets/gws/credentials.json",
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

  it("returns a projection for a route-bound delegated subagent subject", () => {
    const projection = resolveSandboxGwsCredentialProjection({
      config: createConfig(
        createBasePluginConfig({
          agentCredentialBindings: {
            "subagent:main": "ops-main",
          },
        }),
      ),
      agentId: "main",
      sessionKey: "agent:main:subagent:worker-1",
    });

    expect(projection).toEqual({
      bindingSubject: "subagent:main",
      routeName: "ops-main",
      credentialsFile: "/home/node/.openclaw/secrets/gws/credentials.json",
      approvedCredentialDir: "/home/node/.openclaw/secrets/gws",
      sourceContainerPath: "/home/node/.openclaw/secrets/gws/credentials.json",
      targetContainerPath: "/home/node/.openclaw/secrets/gws/credentials.json",
    });
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

  it("allows exact-file approved credential paths for exact-file mounts", () => {
    const projection = resolveSandboxGwsCredentialProjection({
      config: createConfig(
        createBasePluginConfig({
          approvedCredentialDirs: ["/home/node/.openclaw/secrets/gws/credentials.json"],
        }),
      ),
      agentId: "main",
      sessionKey: "agent:main:discord:channel:123",
    });

    expect(projection).toEqual({
      bindingSubject: "agent:main",
      routeName: "ops-main",
      credentialsFile: "/home/node/.openclaw/secrets/gws/credentials.json",
      approvedCredentialDir: "/home/node/.openclaw/secrets/gws/credentials.json",
      sourceContainerPath: "/home/node/.openclaw/secrets/gws/credentials.json",
      targetContainerPath: "/home/node/.openclaw/secrets/gws/credentials.json",
    });
  });

  it("projects configured gmail policy files as individual read-only mounts", () => {
    process.env.OPENCLAW_CONFIG_FILE = "/home/node/.openclaw/openclaw.json";

    const mounts = resolveSandboxGmailPolicyMounts({
      config: createConfig(
        createBasePluginConfig({
          gmailPolicy: {
            whitelistFile: "./gws/gmail-whitelist.json",
            blacklistFile: "./gws/gmail-blacklist.json",
          },
        }),
      ),
      agentId: "main",
      sessionKey: "agent:main:discord:channel:123",
    });

    expect(mounts).toEqual([
      {
        capabilityId: "gws-gmail-policy",
        bindingSubject: "agent:main",
        policyKey: "whitelistFile",
        sourceContainerPath: "/home/node/.openclaw/gws/gmail-whitelist.json",
        targetContainerPath: "/home/node/.openclaw/gws/gmail-whitelist.json",
        mode: "ro",
      },
      {
        capabilityId: "gws-gmail-policy",
        bindingSubject: "agent:main",
        policyKey: "blacklistFile",
        sourceContainerPath: "/home/node/.openclaw/gws/gmail-blacklist.json",
        targetContainerPath: "/home/node/.openclaw/gws/gmail-blacklist.json",
        mode: "ro",
      },
    ]);
    expect(mounts.map((mount) => mount.sourceContainerPath)).not.toContain("/home/node/.openclaw");
    expect(mounts.every((mount) => mount.containerScopeKey === undefined)).toBe(true);
  });

  it("skips gmail policy mounts that escape the config directory", () => {
    process.env.OPENCLAW_CONFIG_FILE = "/home/node/.openclaw/openclaw.json";

    const mounts = resolveSandboxGmailPolicyMounts({
      config: createConfig(
        createBasePluginConfig({
          gmailPolicy: {
            whitelistFile: "../gmail-whitelist.json",
            blacklistFile: "/home/node/.openclaw/gws/gmail-blacklist.json",
          },
        }),
      ),
      agentId: "main",
      sessionKey: "agent:main:discord:channel:123",
    });

    expect(mounts).toEqual([
      {
        capabilityId: "gws-gmail-policy",
        bindingSubject: "agent:main",
        policyKey: "blacklistFile",
        sourceContainerPath: "/home/node/.openclaw/gws/gmail-blacklist.json",
        targetContainerPath: "/home/node/.openclaw/gws/gmail-blacklist.json",
        mode: "ro",
      },
    ]);
  });
});
