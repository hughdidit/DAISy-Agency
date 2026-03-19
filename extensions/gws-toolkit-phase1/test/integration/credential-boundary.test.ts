import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

describe("integration: credential boundary", () => {
  it("allows and denies based on approved credential directory policy", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-cred-boundary-"));
    try {
      const allowedDir = path.join(root, "allowed");
      const deniedDir = path.join(root, "denied");
      await fs.mkdir(allowedDir);
      await fs.mkdir(deniedDir);

      const credentialsFile = path.join(allowedDir, "credentials.json");
      await fs.writeFile(credentialsFile, "{}", "utf8");
      if (process.platform !== "win32") {
        await fs.chmod(credentialsFile, 0o600);
      }

      const allowedHarness = createHarness({
        pluginConfig: defaultPluginConfig({
          allowedCredentialModes: ["credentials_file"],
          credentialsFile,
          approvedCredentialDirs: [allowedDir],
        }),
      });
      const allowed = await executeTool(allowedHarness, "gws_drive_read", { action: "list_files" });
      expect(allowed.ok).toBe(true);

      const deniedHarness = createHarness({
        pluginConfig: defaultPluginConfig({
          allowedCredentialModes: ["credentials_file"],
          credentialsFile,
          approvedCredentialDirs: [deniedDir],
        }),
      });
      const denied = await executeTool(deniedHarness, "gws_drive_read", { action: "list_files" });
      expect(denied.ok).toBe(false);
      expect(denied.error).toMatchObject({ code: "AUTH_ERROR" });
      expect(JSON.stringify(denied)).not.toContain(credentialsFile);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("denies over-permissive credential file permissions", async () => {
    if (process.platform === "win32") {
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-perm-it-"));
    try {
      const allowedDir = path.join(root, "allowed");
      await fs.mkdir(allowedDir);

      const credentialsFile = path.join(allowedDir, "credentials.json");
      await fs.writeFile(credentialsFile, "{}", "utf8");
      await fs.chmod(credentialsFile, 0o644);

      const harness = createHarness({
        pluginConfig: defaultPluginConfig({
          allowedCredentialModes: ["credentials_file"],
          credentialsFile,
          approvedCredentialDirs: [allowedDir],
        }),
      });

      const denied = await executeTool(harness, "gws_drive_read", { action: "list_files" });
      expect(denied.ok).toBe(false);
      expect(denied.error).toMatchObject({ code: "AUTH_ERROR" });
      expect(String(denied.error.message)).toContain("permissions are too open");
      expect(JSON.stringify(denied)).not.toContain(credentialsFile);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
