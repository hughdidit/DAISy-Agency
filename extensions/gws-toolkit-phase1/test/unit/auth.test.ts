import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getAuthSourceStatus, resolveAuth } from "../../src/auth.js";
import type { GwsToolkitConfig } from "../../src/types.js";

const snapshot = { ...process.env };

afterEach(() => {
  process.env = { ...snapshot };
});

function baseConfig(overrides: Partial<GwsToolkitConfig> = {}): GwsToolkitConfig {
  return {
    enabledServices: ["drive", "gmail", "calendar"],
    approvedCredentialDirs: [],
    tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
    timeoutMs: 1000,
    maxStdoutBytes: 1024,
    maxStderrBytes: 1024,
    safeMode: true,
    allowedCredentialModes: ["oauth", "credentials_file", "token"],
    defaultScopesProfile: "minimal",
    ...overrides,
  };
}

describe("auth resolution", () => {
  it("prefers token mode when token exists", () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    const resolved = resolveAuth(baseConfig());
    expect(resolved.mode).toBe("token");
  });

  it("enforces credential directory boundary", async () => {
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
        credentialsFile: allowedFile,
      }),
    );
    expect(ok.mode).toBe("credentials_file");

    expect(() =>
      resolveAuth(
        baseConfig({
          allowedCredentialModes: ["credentials_file"],
          approvedCredentialDirs: [allowedDir],
          credentialsFile: deniedFile,
        }),
      ),
    ).toThrow(/outside approvedCredentialDirs/);
  });

  it("denies non-regular credential files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-"));
    const allowedDir = path.join(root, "allowed");
    await fs.mkdir(allowedDir);

    expect(() =>
      resolveAuth(
        baseConfig({
          allowedCredentialModes: ["credentials_file"],
          approvedCredentialDirs: [allowedDir],
          credentialsFile: allowedDir,
        }),
      ),
    ).toThrow(/regular file/);
  });

  it("denies symlink credential files", async () => {
    if (process.platform === "win32") {
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-"));
    const allowedDir = path.join(root, "allowed");
    await fs.mkdir(allowedDir);

    const targetFile = path.join(root, "target.json");
    await fs.writeFile(targetFile, "{}", "utf8");
    await fs.chmod(targetFile, 0o600);

    const symlinkFile = path.join(allowedDir, "cred-link.json");
    await fs.symlink(targetFile, symlinkFile);

    expect(() =>
      resolveAuth(
        baseConfig({
          allowedCredentialModes: ["credentials_file"],
          approvedCredentialDirs: [allowedDir],
          credentialsFile: symlinkFile,
        }),
      ),
    ).toThrow(/symbolic link/);
  });

  it("denies over-permissive file permissions on posix", async () => {
    if (process.platform === "win32") {
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-"));
    const allowedDir = path.join(root, "allowed");
    await fs.mkdir(allowedDir);

    const credentialsFile = path.join(allowedDir, "cred.json");
    await fs.writeFile(credentialsFile, "{}", "utf8");
    await fs.chmod(credentialsFile, 0o644);

    expect(() =>
      resolveAuth(
        baseConfig({
          allowedCredentialModes: ["credentials_file"],
          approvedCredentialDirs: [allowedDir],
          credentialsFile,
        }),
      ),
    ).toThrow(/permissions are too open/);

    await fs.chmod(credentialsFile, 0o600);
    const allowed = resolveAuth(
      baseConfig({
        allowedCredentialModes: ["credentials_file"],
        approvedCredentialDirs: [allowedDir],
        credentialsFile,
      }),
    );
    expect(allowed.mode).toBe("credentials_file");
  });

  it("reports auth source posture", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "abc";

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-auth-"));
    const allowedDir = path.join(root, "allowed");
    const deniedDir = path.join(root, "denied");
    await fs.mkdir(allowedDir);
    await fs.mkdir(deniedDir);

    const credentialsFile = path.join(deniedDir, "cred.json");
    await fs.writeFile(credentialsFile, "{}", "utf8");
    if (process.platform !== "win32") {
      await fs.chmod(credentialsFile, 0o600);
    }

    const status = getAuthSourceStatus(
      baseConfig({
        credentialsFile,
        approvedCredentialDirs: [allowedDir],
      }),
    );
    expect(status.tokenPresent).toBe(true);
    expect(status.credentialsFileConfigured).toBe(true);
    expect(status.credentialsFileExists).toBe(true);
    expect(status.credentialsFileAllowed).toBe(false);
    expect(status.oauthAllowed).toBe(true);
  });
});
