import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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
    allowedCredentialModes: ["oauth", "credentials_file", "token"],
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
}
