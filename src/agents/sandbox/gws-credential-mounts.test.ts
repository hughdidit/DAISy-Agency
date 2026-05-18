import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import {
  resolveSandboxGmailPolicyMounts,
  resolveSandboxGwsCredentialProjection,
} from "./gws-credential-mounts.js";

const envSnapshot = { ...process.env };
const tempDirs: string[] = [];

afterEach(() => {
  process.env = { ...envSnapshot };
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { force: true, recursive: true });
  }
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

function toPosixPath(value: string): string {
  return value.replaceAll(path.sep, path.posix.sep);
}

function createGmailPolicyFixture(): {
  root: string;
  configFile: string;
  whitelistFile: string;
  blacklistFile: string;
} {
  const root = mkdtempSync(path.join(tmpdir(), "gws-policy-"));
  tempDirs.push(root);
  const gwsDir = path.join(root, "gws");
  mkdirSync(gwsDir, { recursive: true });
  const configFile = path.join(root, "openclaw.json");
  const whitelistFile = path.join(gwsDir, "gmail-whitelist.json");
  const blacklistFile = path.join(gwsDir, "gmail-blacklist.json");
  writeFileSync(configFile, "{}\n");
  writeFileSync(whitelistFile, '{ "version": 1, "emails": [], "domains": [] }\n');
  writeFileSync(blacklistFile, '{ "version": 1, "emails": [], "domains": [] }\n');
  return {
    root: toPosixPath(root),
    configFile: toPosixPath(configFile),
    whitelistFile: toPosixPath(realpathSync.native(whitelistFile)),
    blacklistFile: toPosixPath(realpathSync.native(blacklistFile)),
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
    const fixture = createGmailPolicyFixture();
    process.env.OPENCLAW_CONFIG_FILE = fixture.configFile;

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
        sourceContainerPath: fixture.whitelistFile,
        targetContainerPath: `${fixture.root}/gws/gmail-whitelist.json`,
        mode: "ro",
      },
      {
        capabilityId: "gws-gmail-policy",
        bindingSubject: "agent:main",
        policyKey: "blacklistFile",
        sourceContainerPath: fixture.blacklistFile,
        targetContainerPath: `${fixture.root}/gws/gmail-blacklist.json`,
        mode: "ro",
      },
    ]);
    expect(mounts.every((mount) => mount.sourceContainerPath !== fixture.root)).toBe(true);
    expect(mounts.every((mount) => mount.targetContainerPath.startsWith(`${fixture.root}/`))).toBe(
      true,
    );
    expect(mounts.every((mount) => mount.containerScopeKey === undefined)).toBe(true);
  });

  it("skips gmail policy mounts that escape the config directory", () => {
    const fixture = createGmailPolicyFixture();
    process.env.OPENCLAW_CONFIG_FILE = fixture.configFile;

    const mounts = resolveSandboxGmailPolicyMounts({
      config: createConfig(
        createBasePluginConfig({
          gmailPolicy: {
            whitelistFile: "../gmail-whitelist.json",
            blacklistFile: `${fixture.root}/gws/gmail-blacklist.json`,
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
        sourceContainerPath: fixture.blacklistFile,
        targetContainerPath: `${fixture.root}/gws/gmail-blacklist.json`,
        mode: "ro",
      },
    ]);
  });

  it("skips gmail policy mounts whose configured file is a symlink", () => {
    const fixture = createGmailPolicyFixture();
    process.env.OPENCLAW_CONFIG_FILE = fixture.configFile;
    const symlinkPath = path.join(fixture.root, "gws", "linked-whitelist.json");
    try {
      symlinkSync(fixture.whitelistFile, symlinkPath);
    } catch {
      return;
    }

    const mounts = resolveSandboxGmailPolicyMounts({
      config: createConfig(
        createBasePluginConfig({
          gmailPolicy: {
            whitelistFile: "./gws/linked-whitelist.json",
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
        policyKey: "blacklistFile",
        sourceContainerPath: fixture.blacklistFile,
        targetContainerPath: `${fixture.root}/gws/gmail-blacklist.json`,
        mode: "ro",
      },
    ]);
  });

  it("skips gmail policy mounts whose real path escapes through a symlinked directory", () => {
    const fixture = createGmailPolicyFixture();
    process.env.OPENCLAW_CONFIG_FILE = fixture.configFile;
    const outsideRoot = mkdtempSync(path.join(tmpdir(), "gws-policy-outside-"));
    tempDirs.push(outsideRoot);
    const outsideWhitelist = path.join(outsideRoot, "gmail-whitelist.json");
    writeFileSync(outsideWhitelist, '{ "version": 1, "emails": [], "domains": [] }\n');
    const symlinkDir = path.join(fixture.root, "linked-gws");
    try {
      symlinkSync(outsideRoot, symlinkDir, "dir");
    } catch {
      return;
    }

    const mounts = resolveSandboxGmailPolicyMounts({
      config: createConfig(
        createBasePluginConfig({
          gmailPolicy: {
            whitelistFile: "./linked-gws/gmail-whitelist.json",
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
        policyKey: "blacklistFile",
        sourceContainerPath: fixture.blacklistFile,
        targetContainerPath: `${fixture.root}/gws/gmail-blacklist.json`,
        mode: "ro",
      },
    ]);
  });
});
