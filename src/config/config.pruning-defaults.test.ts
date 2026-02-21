import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withEnvAsync } from "../test-utils/env.js";
import { loadConfig } from "./config.js";
import { withTempHome } from "./test-helpers.js";

async function writeConfigForTest(home: string, config: unknown): Promise<void> {
  const configDir = path.join(home, ".openclaw");
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(
    path.join(configDir, "openclaw.json"),
    JSON.stringify(config, null, 2),
    "utf-8",
  );
}

describe("config pruning defaults", () => {
  it("does not enable contextPruning by default", async () => {
<<<<<<< HEAD
    const prevApiKey = process.env.ANTHROPIC_API_KEY;
    const prevOauthToken = process.env.ANTHROPIC_OAUTH_TOKEN;
    process.env.ANTHROPIC_API_KEY = "";
    process.env.ANTHROPIC_OAUTH_TOKEN = "";
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const configDir = path.join(home, ".clawdbot");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "moltbot.json"),
        JSON.stringify({ agents: { defaults: {} } }, null, 2),
        "utf-8",
      );
=======
      await writeConfigForTest(home, { agents: { defaults: {} } });
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
=======
    await withEnvAsync({ ANTHROPIC_API_KEY: "", ANTHROPIC_OAUTH_TOKEN: "" }, async () => {
      await withTempHome(async (home) => {
        await writeConfigForTest(home, { agents: { defaults: {} } });
>>>>>>> 194ebd9e3 (refactor(test): dedupe env setup in envelope and config tests)

        const cfg = loadConfig();

        expect(cfg.agents?.defaults?.contextPruning?.mode).toBeUndefined();
      });
    });
  });

  it("enables cache-ttl pruning + 1h heartbeat for Anthropic OAuth", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const configDir = path.join(home, ".clawdbot");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "moltbot.json"),
        JSON.stringify(
          {
            auth: {
              profiles: {
                "anthropic:me": { provider: "anthropic", mode: "oauth", email: "me@example.com" },
              },
            },
            agents: { defaults: {} },
=======
      await writeConfigForTest(home, {
        auth: {
          profiles: {
            "anthropic:me": { provider: "anthropic", mode: "oauth", email: "me@example.com" },
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
          },
        },
        agents: { defaults: {} },
      });

      const cfg = loadConfig();

      expect(cfg.agents?.defaults?.contextPruning?.mode).toBe("cache-ttl");
      expect(cfg.agents?.defaults?.contextPruning?.ttl).toBe("1h");
      expect(cfg.agents?.defaults?.heartbeat?.every).toBe("1h");
    });
  });

  it("enables cache-ttl pruning + 1h cache TTL for Anthropic API keys", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const configDir = path.join(home, ".clawdbot");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "moltbot.json"),
        JSON.stringify(
          {
            auth: {
              profiles: {
                "anthropic:api": { provider: "anthropic", mode: "api_key" },
              },
            },
            agents: {
              defaults: {
                model: { primary: "anthropic/claude-opus-4-5" },
              },
            },
=======
      await writeConfigForTest(home, {
        auth: {
          profiles: {
            "anthropic:api": { provider: "anthropic", mode: "api_key" },
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
          },
        },
        agents: {
          defaults: {
            model: { primary: "anthropic/claude-opus-4-5" },
          },
        },
      });

      const cfg = loadConfig();

      expect(cfg.agents?.defaults?.contextPruning?.mode).toBe("cache-ttl");
      expect(cfg.agents?.defaults?.contextPruning?.ttl).toBe("1h");
      expect(cfg.agents?.defaults?.heartbeat?.every).toBe("30m");
      expect(
        cfg.agents?.defaults?.models?.["anthropic/claude-opus-4-5"]?.params?.cacheControlTtl,
      ).toBe("1h");
    });
  });

  it("does not override explicit contextPruning mode", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const configDir = path.join(home, ".clawdbot");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "moltbot.json"),
        JSON.stringify({ agents: { defaults: { contextPruning: { mode: "off" } } } }, null, 2),
        "utf-8",
      );
=======
      await writeConfigForTest(home, { agents: { defaults: { contextPruning: { mode: "off" } } } });
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)

      const cfg = loadConfig();

      expect(cfg.agents?.defaults?.contextPruning?.mode).toBe("off");
    });
  });
});
