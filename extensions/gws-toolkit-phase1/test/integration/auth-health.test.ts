import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAuditLogger } from "../../src/audit.js";
import { executeAuthHealth, executeAuthPosture } from "../../src/commands/status.js";
import { resolveConfig } from "../../src/config.js";
import type { ConfigPosture, GwsToolkitConfig, InvocationContext } from "../../src/types.js";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
  delete process.env.MOCK_GWS_MODE;
});

function createConfigResolution(raw: Record<string, unknown>): {
  ok: true;
  config: GwsToolkitConfig;
  posture: ConfigPosture;
} {
  const resolved = resolveConfig(raw);
  if (!resolved.ok) {
    throw new Error(resolved.error.error.message);
  }
  return {
    ok: true,
    config: resolved.value.config,
    posture: resolved.value.posture,
  };
}

const fixtureBinary = path.resolve("extensions/gws-toolkit-phase1/test/fixtures/mock-gws.js");

const ctx: InvocationContext = {
  agentId: "main",
  sessionId: "test-session",
  sessionKey: "agent:main:main",
};

const audit = createAuditLogger({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
});

describe("integration: auth health and posture", () => {
  it("returns healthy token route auth-health output", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    const configResolution = createConfigResolution({
      enabledServices: ["drive"],
      binaryPath: fixtureBinary,
      tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
      allowedCredentialModes: ["token"],
      approvedCredentialDirs: [path.dirname(fixtureBinary)],
      credentialRoutes: {
        main: {
          mode: "token",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
        },
      },
      agentCredentialBindings: {
        "agent:main": "main",
      },
    });

    const health = await executeAuthHealth({
      ctx,
      audit,
      configResolution,
    });
    expect(health.ok).toBe(true);
    if (!health.ok) {
      return;
    }
    expect(health.meta.action).toBe("auth-health");
    expect(health.data.authHealth).toMatchObject({
      credentialSourceType: "pre_obtained_token",
      tokenValid: true,
    });
  });

  it("reports unhealthy auth status with actionable error", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    process.env.MOCK_GWS_MODE = "auth_unhealthy";
    const configResolution = createConfigResolution({
      enabledServices: ["drive"],
      binaryPath: fixtureBinary,
      tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
      allowedCredentialModes: ["token"],
      approvedCredentialDirs: [path.dirname(fixtureBinary)],
      credentialRoutes: {
        main: {
          mode: "token",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
        },
      },
      agentCredentialBindings: {
        "agent:main": "main",
      },
    });

    const health = await executeAuthHealth({
      ctx,
      audit,
      configResolution,
    });
    expect(health.ok).toBe(false);
    if (health.ok) {
      return;
    }
    expect(health.error.code).toBe("AUTH_ERROR");
    expect(health.error.message).toContain("Route auth health is unhealthy");
  });

  it("classifies service-account credential files and reports impersonation posture", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-health-"));
    const credentialsFile = path.join(root, "service-account.json");
    await fs.writeFile(
      credentialsFile,
      JSON.stringify({
        type: "service_account",
        project_id: "project",
        private_key_id: "abc",
        private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
        client_email: "svc@example.iam.gserviceaccount.com",
        client_id: "123",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
      }),
      "utf8",
    );
    if (process.platform !== "win32") {
      await fs.chmod(credentialsFile, 0o600);
    }

    const configResolution = createConfigResolution({
      enabledServices: ["drive"],
      binaryPath: fixtureBinary,
      tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
      allowedCredentialModes: ["credentials_file"],
      approvedCredentialDirs: [root],
      credentialRoutes: {
        main: {
          mode: "credentials_file",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          credentialsFile,
          impersonatedUser: "delegate@example.com",
        },
      },
      agentCredentialBindings: {
        "agent:main": "main",
      },
    });

    const posture = await executeAuthPosture({
      ctx: { ...ctx, googleWorkspaceEmail: "delegate@example.com" },
      audit,
      configResolution,
    });
    expect(posture.ok).toBe(true);
    if (!posture.ok) {
      return;
    }
    expect(posture.data.currentRoute).toMatchObject({
      mode: "credentials_file",
      details: {
        impersonatedUser: "delegate@example.com",
      },
    });

    const health = await executeAuthHealth({
      ctx: { ...ctx, googleWorkspaceEmail: "delegate@example.com" },
      audit,
      configResolution,
      directAuthHealthExecutor: async () => ({
        service: "drive",
        tokenValid: true,
        tokenError: null,
        payload: { ok: true },
      }),
    });
    expect(health.ok).toBe(true);
    if (!health.ok) {
      return;
    }
    expect(health.data.authHealth).toMatchObject({
      credentialSourceType: "service_account_json",
      tokenValid: true,
      delegatedAuthValidated: true,
    });
    expect(health.data.impersonation).toMatchObject({
      impersonatedUser: "delegate@example.com",
    });
  });

  it("includes deprecation payload when auth-status alias is used", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    const configResolution = createConfigResolution({
      enabledServices: ["drive"],
      binaryPath: fixtureBinary,
      tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
      allowedCredentialModes: ["token"],
      approvedCredentialDirs: [path.dirname(fixtureBinary)],
      credentialRoutes: {
        main: {
          mode: "token",
          allowedServices: ["drive"],
          allowedTools: ["gws_drive_read"],
          tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
        },
      },
      agentCredentialBindings: {
        "agent:main": "main",
      },
    });

    const health = await executeAuthHealth({
      ctx,
      audit,
      configResolution,
      deprecatedAliasUsed: true,
    });
    expect(health.ok).toBe(true);
    if (!health.ok) {
      return;
    }
    expect(health.data.deprecation).toBeDefined();
  });
});
