import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PluginError } from "../../src/errors.js";
import { getAuthSourceStatus, resolveAuth } from "../../src/auth.js";
import { resolveConfig } from "../../src/config.js";
import type { GwsToolkitConfig } from "../../src/types.js";

const snapshot = { ...process.env };

afterEach(() => {
  process.env = { ...snapshot };
});

function baseConfig(overrides: Partial<GwsToolkitConfig> = {}): GwsToolkitConfig {
  return {
    enabledServices: ["drive", "gmail", "calendar"],
    enabledWriteServices: [],
    approvedCredentialDirs: [],
    tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
    timeoutMs: 1000,
    maxStdoutBytes: 1024,
    maxStderrBytes: 1024,
    safeMode: true,
    allowedCredentialModes: ["credentials_file", "token"],
    allowWriteOperations: false,
    allowUnboundAgents: false,
    defaultCredentialRoute: null,
    credentialRoutes: {
      default: {
        mode: "token",
        allowedServices: ["drive"],
        allowedTools: ["gws_drive_read"],
        tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
      },
    },
    agentCredentialBindings: {
      "agent:main": "default",
    },
    defaultScopesProfile: "minimal",
    requireHumanApprovalFor: [],
    warnings: [],
    ...overrides,
  };
}

describe("auth resolution", () => {
  it("resolves token auth via bound agent route", () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    const resolved = resolveAuth(baseConfig(), {
      agentId: "main",
      sessionKey: "agent:main:main",
    });
    expect(resolved.mode).toBe("token");
    expect(resolved.route.name).toBe("default");
    expect(resolved.bindingSubject).toBe("agent:main");
  });

  it("requires explicit subagent binding and does not inherit parent agent route", () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    expect(() =>
      resolveAuth(baseConfig(), {
        agentId: "main",
        sessionKey: "agent:main:subagent:worker",
      }),
    ).toThrow(/subagent:main/);
  });

  it("enforces credential directory boundary per route", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-"));
    const allowedDir = path.join(root, "allowed");
    const deniedDir = path.join(root, "denied");
    await fs.mkdir(allowedDir);
    await fs.mkdir(deniedDir);
    const allowedFile = path.join(allowedDir, "cred.json");
    const deniedFile = path.join(deniedDir, "cred.json");
    await fs.writeFile(allowedFile, "{}", "utf8");
    await fs.writeFile(deniedFile, "{}", "utf8");
    if (process.platform !== "win32") {
      await fs.chmod(allowedFile, 0o600);
      await fs.chmod(deniedFile, 0o600);
    }

    const ok = resolveAuth(
      baseConfig({
        allowedCredentialModes: ["credentials_file"],
        approvedCredentialDirs: [allowedDir],
        credentialRoutes: {
          default: {
            mode: "credentials_file",
            allowedServices: ["drive"],
            allowedTools: ["gws_drive_read"],
            credentialsFile: allowedFile,
          },
        },
      }),
      { agentId: "main", sessionKey: "agent:main:main" },
    );
    expect(ok.mode).toBe("credentials_file");
    expect(ok.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE).toBe(await fs.realpath(allowedFile));

    expect(() =>
      resolveAuth(
        baseConfig({
          allowedCredentialModes: ["credentials_file"],
          approvedCredentialDirs: [allowedDir],
          credentialRoutes: {
            default: {
              mode: "credentials_file",
              allowedServices: ["drive"],
              allowedTools: ["gws_drive_read"],
              credentialsFile: deniedFile,
            },
          },
        }),
        { agentId: "main", sessionKey: "agent:main:main" },
      ),
    ).toThrow(/outside approvedCredentialDirs/);
  });

  it("synthesizes a legacy compatibility route when route config is absent", () => {
    const resolved = resolveConfig({
      enabledServices: ["drive"],
      allowedCredentialModes: ["token"],
      tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
      approvedCredentialDirs: [],
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      return;
    }
    expect(resolved.value.config.credentialRoutes["legacy-default"]).toBeDefined();
    expect(resolved.value.config.defaultCredentialRoute).toBe("legacy-default");
    expect(resolved.value.config.allowUnboundAgents).toBe(true);
    expect(resolved.value.config.warnings.join("\n")).toContain("legacy single-credential");
  });

  it("rejects oauth in allowedCredentialModes with a migration error", () => {
    const resolved = resolveConfig({
      enabledServices: ["drive"],
      allowedCredentialModes: ["oauth", "token"],
      tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
      approvedCredentialDirs: [],
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) {
      return;
    }
    expect(resolved.error.error.message).toContain("unsupported mode oauth");
  });

  it("rejects invalid allowedCredentialModes values", () => {
    const resolved = resolveConfig({
      enabledServices: ["drive"],
      allowedCredentialModes: ["token", "tokn"],
      tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
      approvedCredentialDirs: [],
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) {
      return;
    }
    expect(resolved.error.error.message).toContain("invalid mode(s): tokn");
  });

  it("does not let explicit routes inherit the legacy credentials file path", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-route-"));
    const allowedFile = path.join(root, "cred.json");
    await fs.writeFile(allowedFile, "{}", "utf8");
    if (process.platform !== "win32") {
      await fs.chmod(allowedFile, 0o600);
    }

    expect(() =>
      resolveAuth(
        baseConfig({
          allowedCredentialModes: ["credentials_file"],
          approvedCredentialDirs: [root],
          credentialsFile: allowedFile,
          credentialRoutes: {
            isolated: {
              mode: "credentials_file",
              allowedServices: ["drive"],
              allowedTools: ["gws_drive_read"],
            },
          },
          agentCredentialBindings: {
            "agent:main": "isolated",
          },
        }),
        { agentId: "main", sessionKey: "agent:main:main" },
      ),
    ).toThrow(/requires credentialsFile/);
  });

  it("reports route-level auth posture", () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "abc";
    const status = getAuthSourceStatus(baseConfig());
    expect(status.tokenPresent).toBe(true);
    expect(status.routes[0]).toMatchObject({
      routeName: "default",
      mode: "token",
      available: true,
    });
  });

  it("marks routes unavailable when their auth mode is globally disabled", () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "abc";
    const status = getAuthSourceStatus(
      baseConfig({
        allowedCredentialModes: ["credentials_file"],
      }),
    );
    expect(status.routes[0]).toMatchObject({
      routeName: "default",
      mode: "token",
      available: false,
      details: {
        modeAllowed: false,
        tokenPresent: true,
      },
    });
  });

  it("prefers token over credentials_file for synthesized legacy route precedence", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-legacy-"));
    const allowedFile = path.join(root, "cred.json");
    await fs.writeFile(allowedFile, "{}", "utf8");
    if (process.platform !== "win32") {
      await fs.chmod(allowedFile, 0o600);
    }
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    const resolved = resolveConfig({
      enabledServices: ["drive"],
      allowedCredentialModes: ["credentials_file", "token"],
      tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
      credentialsFile: allowedFile,
      approvedCredentialDirs: [root],
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      return;
    }
    expect(resolved.value.config.credentialRoutes["legacy-default"]?.mode).toBe("token");
  });

  it("propagates literal impersonated user for credentials_file routes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-impersonate-"));
    const allowedFile = path.join(root, "cred.json");
    await fs.writeFile(allowedFile, "{}", "utf8");
    if (process.platform !== "win32") {
      await fs.chmod(allowedFile, 0o600);
    }

    const resolved = resolveAuth(
      baseConfig({
        allowedCredentialModes: ["credentials_file"],
        approvedCredentialDirs: [root],
        credentialRoutes: {
          default: {
            mode: "credentials_file",
            allowedServices: ["drive"],
            allowedTools: ["gws_drive_read"],
            credentialsFile: allowedFile,
            impersonatedUser: "delegate@example.com",
          },
        },
      }),
      { agentId: "main", sessionKey: "agent:main:main" },
    );
    expect(resolved.env.GOOGLE_WORKSPACE_CLI_IMPERSONATED_USER).toBe("delegate@example.com");
  });

  it("resolves env-var impersonated user and fails if missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-impersonate-env-"));
    const allowedFile = path.join(root, "cred.json");
    await fs.writeFile(allowedFile, "{}", "utf8");
    if (process.platform !== "win32") {
      await fs.chmod(allowedFile, 0o600);
    }
    const config = baseConfig({
      allowedCredentialModes: ["credentials_file"],
      approvedCredentialDirs: [root],
      credentialRoutes: {
        default: {
          mode: "credentials_file",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          credentialsFile: allowedFile,
          impersonatedUserEnvVar: "ORG_DELEGATE_USER",
        },
      },
    });

    delete process.env.ORG_DELEGATE_USER;
    expect(() =>
      resolveAuth(config, {
        agentId: "main",
        sessionKey: "agent:main:main",
      }),
    ).toThrow(/no impersonated user value is available/i);

    process.env.ORG_DELEGATE_USER = "delegate2@example.com";
    const resolved = resolveAuth(config, {
      agentId: "main",
      sessionKey: "agent:main:main",
    });
    expect(resolved.env.GOOGLE_WORKSPACE_CLI_IMPERSONATED_USER).toBe("delegate2@example.com");
  });

  it("rejects oauth credential route mode during config resolution", () => {
    const resolved = resolveConfig({
      enabledServices: ["drive"],
      approvedCredentialDirs: [],
      credentialRoutes: {
        "ops-main": {
          mode: "oauth",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
        },
      },
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) {
      return;
    }
    expect(resolved.error.error.message).toContain("unsupported mode oauth");
  });

  it("rejects routes that set both impersonation sources", () => {
    const resolved = resolveConfig({
      enabledServices: ["drive"],
      approvedCredentialDirs: [],
      credentialRoutes: {
        "ops-main": {
          mode: "credentials_file",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          credentialsFile: "/tmp/cred.json",
          impersonatedUser: "delegate@example.com",
          impersonatedUserEnvVar: "ORG_DELEGATE_USER",
        },
      },
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) {
      return;
    }
    expect(resolved.error.error.message).toContain("only one impersonation source");
  });

  it("rejects impersonation fields on token routes", () => {
    const resolved = resolveConfig({
      enabledServices: ["drive"],
      approvedCredentialDirs: [],
      credentialRoutes: {
        "ops-main": {
          mode: "token",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          impersonatedUserEnvVar: "ORG_DELEGATE_USER",
        },
      },
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) {
      return;
    }
    expect(resolved.error.error.message).toContain(
      "can only configure impersonation for credentials_file mode",
    );
  });

  it("fails closed in enforced environments when impersonated route uses authorized_user credentials", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-enforced-authorized-user-"));
    const credentialsFile = path.join(root, "authorized-user.json");
    await fs.writeFile(
      credentialsFile,
      JSON.stringify({
        type: "authorized_user",
        client_id: "client-id",
        client_secret: "client-secret",
        refresh_token: "refresh-token",
      }),
      "utf8",
    );
    if (process.platform !== "win32") {
      await fs.chmod(credentialsFile, 0o600);
    }
    process.env.DAISY_ENVIRONMENT = "staging";

    const config = baseConfig({
      allowedCredentialModes: ["credentials_file"],
      approvedCredentialDirs: [root],
      credentialRoutes: {
        default: {
          mode: "credentials_file",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          credentialsFile,
          impersonatedUser: "delegate@example.com",
        },
      },
    });

    try {
      resolveAuth(config, {
        agentId: "main",
        sessionKey: "agent:main:main",
      });
      expect.unreachable("resolveAuth should fail for authorized_user in enforced impersonated route");
    } catch (error) {
      expect(error).toBeInstanceOf(PluginError);
      const pluginError = error as PluginError;
      expect(pluginError.code).toBe("AUTH_ERROR");
      expect(pluginError.details).toMatchObject({
        credentialSourceType: "authorized_user",
        runtimeEnvironment: "staging",
        failureCategory: "CREDENTIAL_POLICY",
      });
    }
  });

  it("fails closed in enforced environments when impersonated route uses headless export credentials", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-enforced-headless-"));
    const credentialsFile = path.join(root, "headless.json");
    await fs.writeFile(
      credentialsFile,
      JSON.stringify({
        client_id: "client-id",
        client_secret: "client-secret",
        refresh_token: "refresh-token",
      }),
      "utf8",
    );
    if (process.platform !== "win32") {
      await fs.chmod(credentialsFile, 0o600);
    }
    process.env.DAISY_ENVIRONMENT = "staging";

    const config = baseConfig({
      allowedCredentialModes: ["credentials_file"],
      approvedCredentialDirs: [root],
      credentialRoutes: {
        default: {
          mode: "credentials_file",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          credentialsFile,
          impersonatedUser: "delegate@example.com",
        },
      },
    });

    try {
      resolveAuth(config, {
        agentId: "main",
        sessionKey: "agent:main:main",
      });
      expect.unreachable("resolveAuth should fail for headless export in enforced impersonated route");
    } catch (error) {
      expect(error).toBeInstanceOf(PluginError);
      const pluginError = error as PluginError;
      expect(pluginError.code).toBe("AUTH_ERROR");
      expect(pluginError.details).toMatchObject({
        credentialSourceType: "headless_oauth_export",
        runtimeEnvironment: "staging",
        failureCategory: "CREDENTIAL_POLICY",
      });
    }
  });

  it("allows non-impersonated authorized_user credentials in enforced environments", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-enforced-no-impersonation-"));
    const credentialsFile = path.join(root, "authorized-user.json");
    await fs.writeFile(
      credentialsFile,
      JSON.stringify({
        type: "authorized_user",
        client_id: "client-id",
        client_secret: "client-secret",
        refresh_token: "refresh-token",
      }),
      "utf8",
    );
    if (process.platform !== "win32") {
      await fs.chmod(credentialsFile, 0o600);
    }
    process.env.DAISY_ENVIRONMENT = "staging";

    const config = baseConfig({
      allowedCredentialModes: ["credentials_file"],
      approvedCredentialDirs: [root],
      credentialRoutes: {
        default: {
          mode: "credentials_file",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          credentialsFile,
        },
      },
    });

    const resolved = resolveAuth(config, {
      agentId: "main",
      sessionKey: "agent:main:main",
    });
    expect(resolved.mode).toBe("credentials_file");
    expect(resolved.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE).toBe(await fs.realpath(credentialsFile));
    expect(resolved.env.GOOGLE_WORKSPACE_CLI_IMPERSONATED_USER).toBeUndefined();
  });
});
