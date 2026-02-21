import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
<<<<<<< HEAD
=======
import { loadDotEnv } from "../infra/dotenv.js";
import { resolveConfigEnvVars } from "./env-substitution.js";
import { applyConfigEnvVars, collectConfigEnvVars } from "./env-vars.js";
>>>>>>> 2cdbadee1 (fix(security): block startup-file env injection across host execution paths)
import { withEnvOverride, withTempHome } from "./test-helpers.js";

describe("config env vars", () => {
  it("applies env vars from env block when missing", async () => {
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".openclaw");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "openclaw.json"),
        JSON.stringify(
          {
            env: { vars: { OPENROUTER_API_KEY: "config-key" } },
          },
          null,
          2,
        ),
        "utf-8",
      );

      await withEnvOverride({ OPENROUTER_API_KEY: undefined }, async () => {
        const { loadConfig } = await import("./config.js");
        loadConfig();
        expect(process.env.OPENROUTER_API_KEY).toBe("config-key");
      });
    });
  });

  it("does not override existing env vars", async () => {
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".openclaw");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "openclaw.json"),
        JSON.stringify(
          {
            env: { vars: { OPENROUTER_API_KEY: "config-key" } },
          },
          null,
          2,
        ),
        "utf-8",
      );

      await withEnvOverride({ OPENROUTER_API_KEY: "existing-key" }, async () => {
        const { loadConfig } = await import("./config.js");
        loadConfig();
        expect(process.env.OPENROUTER_API_KEY).toBe("existing-key");
      });
    });
  });

  it("applies env vars from env.vars when missing", async () => {
<<<<<<< HEAD
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".openclaw");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "openclaw.json"),
        JSON.stringify(
          {
            env: { vars: { GROQ_API_KEY: "gsk-config" } },
=======
    await withEnvOverride({ GROQ_API_KEY: undefined }, async () => {
      applyConfigEnvVars({ env: { vars: { GROQ_API_KEY: "gsk-config" } } } as OpenClawConfig);
      expect(process.env.GROQ_API_KEY).toBe("gsk-config");
    });
  });

  it("blocks dangerous startup env vars from config env", async () => {
    await withEnvOverride({ BASH_ENV: undefined, OPENROUTER_API_KEY: undefined }, async () => {
      const config = {
        env: { vars: { BASH_ENV: "/tmp/pwn.sh", OPENROUTER_API_KEY: "config-key" } },
      };
      const entries = collectConfigEnvVars(config as OpenClawConfig);
      expect(entries.BASH_ENV).toBeUndefined();
      expect(entries.OPENROUTER_API_KEY).toBe("config-key");

      applyConfigEnvVars(config as OpenClawConfig);
      expect(process.env.BASH_ENV).toBeUndefined();
      expect(process.env.OPENROUTER_API_KEY).toBe("config-key");
    });
  });

  it("loads ${VAR} substitutions from ~/.openclaw/.env on repeated runtime loads", async () => {
    await withTempHome(async (_home) => {
      await withEnvOverride({ BRAVE_API_KEY: undefined }, async () => {
        const stateDir = process.env.OPENCLAW_STATE_DIR?.trim();
        if (!stateDir) {
          throw new Error("Expected OPENCLAW_STATE_DIR to be set by withTempHome");
        }
        await fs.mkdir(stateDir, { recursive: true });
        await fs.writeFile(path.join(stateDir, ".env"), "BRAVE_API_KEY=from-dotenv\n", "utf-8");

        const config: OpenClawConfig = {
          tools: {
            web: {
              search: {
                apiKey: "${BRAVE_API_KEY}",
              },
            },
>>>>>>> 2cdbadee1 (fix(security): block startup-file env injection across host execution paths)
          },
          null,
          2,
        ),
        "utf-8",
      );

      await withEnvOverride({ GROQ_API_KEY: undefined }, async () => {
        const { loadConfig } = await import("./config.js");
        loadConfig();
        expect(process.env.GROQ_API_KEY).toBe("gsk-config");
      });
    });
  });
});
