import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

describe("integration: OPENCLAW_CONFIG_FILE posture", () => {
  it("reports config source posture for present and missing plugin config", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gws-config-source-"));
    try {
      const configPath = path.join(dir, "openclaw.config.json");
      await fs.writeFile(configPath, JSON.stringify({ plugins: { entries: {} } }), "utf8");
      process.env.OPENCLAW_CONFIG_FILE = configPath;

      const okHarness = createHarness({
        pluginConfig: defaultPluginConfig(),
      });
      const ok = await executeTool(okHarness, "gws_status", {});
      expect(ok.ok).toBe(true);
      expect(ok.data).toMatchObject({
        config: {
          posture: {
            sourcePathPresent: true,
            pluginConfigProvided: true,
          },
        },
      });

      const missingHarness = createHarness({
        pluginConfig: undefined,
      });
      const missing = await executeTool(missingHarness, "gws_status", {});
      expect(missing.ok).toBe(false);
      expect(missing.error).toMatchObject({ code: "CONFIG_ERROR" });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("honors gws_status include flags", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const status = await executeTool(harness, "gws_status", {
      includeVersion: false,
      includeAuthStatus: false,
    });

    expect(status.ok).toBe(true);
    expect(status.data.binary).not.toHaveProperty("version");
    expect(status.data).not.toHaveProperty("auth");
  });
});
