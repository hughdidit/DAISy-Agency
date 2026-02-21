import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createConfigIO } from "./io.js";

async function withTempHome(run: (home: string) => Promise<void>): Promise<void> {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-config-"));
  try {
    await run(home);
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
}

async function writeConfig(
  home: string,
  dirname: ".moltbot" | ".clawdbot",
  port: number,
  filename: "moltbot.json" | "clawdbot.json" = "moltbot.json",
) {
  const dir = path.join(home, dirname);
  await fs.mkdir(dir, { recursive: true });
  const configPath = path.join(dir, filename);
  await fs.writeFile(configPath, JSON.stringify({ gateway: { port } }, null, 2));
  return configPath;
}

<<<<<<< HEAD
describe("config io compat (new + legacy folders)", () => {
  it("prefers ~/.moltbot/moltbot.json when both configs exist", async () => {
    await withTempHome(async (home) => {
      const newConfigPath = await writeConfig(home, ".moltbot", 19001);
      await writeConfig(home, ".clawdbot", 18789);

      const io = createConfigIO({
        env: {} as NodeJS.ProcessEnv,
        homedir: () => home,
      });
      expect(io.configPath).toBe(newConfigPath);
=======
function createIoForHome(home: string, env: NodeJS.ProcessEnv = {} as NodeJS.ProcessEnv) {
  return createConfigIO({
    env,
    homedir: () => home,
  });
}

describe("config io paths", () => {
  it("uses ~/.openclaw/openclaw.json when config exists", async () => {
    await withTempHome(async (home) => {
      const configPath = await writeConfig(home, ".openclaw", 19001);
      const io = createIoForHome(home);
      expect(io.configPath).toBe(configPath);
>>>>>>> 1794f42ac (test(config): dedupe io fixture wiring and cover legacy config-path override)
      expect(io.loadConfig().gateway?.port).toBe(19001);
    });
  });

  it("falls back to ~/.clawdbot/moltbot.json when only legacy exists", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const legacyConfigPath = await writeConfig(home, ".clawdbot", 20001);

      const io = createConfigIO({
        env: {} as NodeJS.ProcessEnv,
        homedir: () => home,
      });

      expect(io.configPath).toBe(legacyConfigPath);
      expect(io.loadConfig().gateway?.port).toBe(20001);
=======
      const io = createIoForHome(home);
      expect(io.configPath).toBe(path.join(home, ".openclaw", "openclaw.json"));
>>>>>>> 1794f42ac (test(config): dedupe io fixture wiring and cover legacy config-path override)
    });
  });

<<<<<<< HEAD
  it("falls back to ~/.clawdbot/clawdbot.json when only legacy filename exists", async () => {
=======
  it("uses OPENCLAW_HOME for default config path", async () => {
    await withTempHome(async (home) => {
      const io = createConfigIO({
        env: { OPENCLAW_HOME: path.join(home, "svc-home") } as NodeJS.ProcessEnv,
        homedir: () => path.join(home, "ignored-home"),
      });
      expect(io.configPath).toBe(path.join(home, "svc-home", ".openclaw", "openclaw.json"));
    });
  });

  it("honors explicit OPENCLAW_CONFIG_PATH override", async () => {
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const legacyConfigPath = await writeConfig(home, ".clawdbot", 20002, "clawdbot.json");

      const io = createConfigIO({
        env: {} as NodeJS.ProcessEnv,
        homedir: () => home,
      });

      expect(io.configPath).toBe(legacyConfigPath);
      expect(io.loadConfig().gateway?.port).toBe(20002);
    });
  });

  it("prefers moltbot.json over legacy filename in the same dir", async () => {
    await withTempHome(async (home) => {
      const preferred = await writeConfig(home, ".clawdbot", 20003, "moltbot.json");
      await writeConfig(home, ".clawdbot", 20004, "clawdbot.json");

      const io = createConfigIO({
        env: {} as NodeJS.ProcessEnv,
        homedir: () => home,
      });

      expect(io.configPath).toBe(preferred);
      expect(io.loadConfig().gateway?.port).toBe(20003);
    });
  });

  it("honors explicit legacy config path env override", async () => {
    await withTempHome(async (home) => {
      const newConfigPath = await writeConfig(home, ".moltbot", 19002);
      const legacyConfigPath = await writeConfig(home, ".clawdbot", 20002);

      const io = createConfigIO({
        env: { CLAWDBOT_CONFIG_PATH: legacyConfigPath } as NodeJS.ProcessEnv,
        homedir: () => home,
      });

      expect(io.configPath).not.toBe(newConfigPath);
      expect(io.configPath).toBe(legacyConfigPath);
=======
      const customPath = await writeConfig(home, ".openclaw", 20002, "custom.json");
      const io = createIoForHome(home, { OPENCLAW_CONFIG_PATH: customPath } as NodeJS.ProcessEnv);
      expect(io.configPath).toBe(customPath);
>>>>>>> 1794f42ac (test(config): dedupe io fixture wiring and cover legacy config-path override)
      expect(io.loadConfig().gateway?.port).toBe(20002);
    });
  });

  it("honors legacy CLAWDBOT_CONFIG_PATH override", async () => {
    await withTempHome(async (home) => {
      const customPath = await writeConfig(home, ".openclaw", 20003, "legacy-custom.json");
      const io = createIoForHome(home, { CLAWDBOT_CONFIG_PATH: customPath } as NodeJS.ProcessEnv);
      expect(io.configPath).toBe(customPath);
      expect(io.loadConfig().gateway?.port).toBe(20003);
    });
  });
});
