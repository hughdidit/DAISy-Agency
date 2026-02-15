import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createConfigIO,
  DEFAULT_GATEWAY_PORT,
  resolveConfigPathCandidate,
  resolveGatewayPort,
  resolveIsNixMode,
  resolveStateDir,
} from "./config.js";
import { withTempHome } from "./test-helpers.js";

function envWith(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  // Hermetic env: don't inherit process.env because other tests may mutate it.
  return { ...overrides };
}

function loadConfigForHome(home: string) {
  return createConfigIO({
    env: envWith({ OPENCLAW_HOME: home }),
    homedir: () => home,
  }).loadConfig();
}

describe("Nix integration (U3, U5, U9)", () => {
  describe("U3: isNixMode env var detection", () => {
<<<<<<< HEAD
    it("isNixMode is false when CLAWDBOT_NIX_MODE is not set", async () => {
      await withEnvOverride({ CLAWDBOT_NIX_MODE: undefined }, async () => {
        const { isNixMode } = await import("./config.js");
        expect(isNixMode).toBe(false);
      });
    });

    it("isNixMode is false when CLAWDBOT_NIX_MODE is empty", async () => {
      await withEnvOverride({ CLAWDBOT_NIX_MODE: "" }, async () => {
        const { isNixMode } = await import("./config.js");
        expect(isNixMode).toBe(false);
      });
    });

    it("isNixMode is false when CLAWDBOT_NIX_MODE is not '1'", async () => {
      await withEnvOverride({ CLAWDBOT_NIX_MODE: "true" }, async () => {
        const { isNixMode } = await import("./config.js");
        expect(isNixMode).toBe(false);
      });
    });

    it("isNixMode is true when CLAWDBOT_NIX_MODE=1", async () => {
      await withEnvOverride({ CLAWDBOT_NIX_MODE: "1" }, async () => {
        const { isNixMode } = await import("./config.js");
        expect(isNixMode).toBe(true);
      });
=======
    it("isNixMode is false when OPENCLAW_NIX_MODE is not set", () => {
      expect(resolveIsNixMode(envWith({ OPENCLAW_NIX_MODE: undefined }))).toBe(false);
    });

    it("isNixMode is false when OPENCLAW_NIX_MODE is empty", () => {
      expect(resolveIsNixMode(envWith({ OPENCLAW_NIX_MODE: "" }))).toBe(false);
    });

    it("isNixMode is false when OPENCLAW_NIX_MODE is not '1'", () => {
      expect(resolveIsNixMode(envWith({ OPENCLAW_NIX_MODE: "true" }))).toBe(false);
    });

    it("isNixMode is true when OPENCLAW_NIX_MODE=1", () => {
      expect(resolveIsNixMode(envWith({ OPENCLAW_NIX_MODE: "1" }))).toBe(true);
>>>>>>> de7d94d9e (perf(test): remove resetModules from config/sandbox/message suites)
    });
  });

  describe("U5: CONFIG_PATH and STATE_DIR env var overrides", () => {
<<<<<<< HEAD
<<<<<<< HEAD
    it("STATE_DIR defaults to ~/.clawdbot when env not set", async () => {
=======
    it("STATE_DIR defaults to ~/.openclaw when env not set", async () => {
      await withEnvOverride({ OPENCLAW_STATE_DIR: undefined }, async () => {
        const { STATE_DIR } = await import("./config.js");
        expect(STATE_DIR).toMatch(/\.openclaw$/);
      });
=======
    it("STATE_DIR defaults to ~/.openclaw when env not set", () => {
      expect(resolveStateDir(envWith({ OPENCLAW_STATE_DIR: undefined }))).toMatch(/\.openclaw$/);
>>>>>>> de7d94d9e (perf(test): remove resetModules from config/sandbox/message suites)
    });

    it("STATE_DIR respects OPENCLAW_STATE_DIR override", () => {
      expect(resolveStateDir(envWith({ OPENCLAW_STATE_DIR: "/custom/state/dir" }))).toBe(
        path.resolve("/custom/state/dir"),
      );
    });

    it("STATE_DIR respects OPENCLAW_HOME when state override is unset", () => {
      const customHome = path.join(path.sep, "custom", "home");
      expect(
        resolveStateDir(envWith({ OPENCLAW_HOME: customHome, OPENCLAW_STATE_DIR: undefined })),
      ).toBe(path.join(path.resolve(customHome), ".openclaw"));
    });

    it("CONFIG_PATH defaults to OPENCLAW_HOME/.openclaw/openclaw.json", () => {
      const customHome = path.join(path.sep, "custom", "home");
      expect(
        resolveConfigPathCandidate(
          envWith({
            OPENCLAW_HOME: customHome,
            OPENCLAW_CONFIG_PATH: undefined,
            OPENCLAW_STATE_DIR: undefined,
          }),
        ),
      ).toBe(path.join(path.resolve(customHome), ".openclaw", "openclaw.json"));
    });

<<<<<<< HEAD
    it("CONFIG_PATH defaults to ~/.openclaw/openclaw.json when env not set", async () => {
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
      await withEnvOverride(
        { MOLTBOT_STATE_DIR: undefined, CLAWDBOT_STATE_DIR: undefined },
        async () => {
          const { STATE_DIR } = await import("./config.js");
          expect(STATE_DIR).toMatch(/\.clawdbot$/);
        },
      );
    });

    it("STATE_DIR respects CLAWDBOT_STATE_DIR override", async () => {
      await withEnvOverride(
        { MOLTBOT_STATE_DIR: undefined, CLAWDBOT_STATE_DIR: "/custom/state/dir" },
        async () => {
          const { STATE_DIR } = await import("./config.js");
          expect(STATE_DIR).toBe(path.resolve("/custom/state/dir"));
        },
      );
    });

    it("STATE_DIR prefers MOLTBOT_STATE_DIR over legacy override", async () => {
      await withEnvOverride(
        { MOLTBOT_STATE_DIR: "/custom/new", CLAWDBOT_STATE_DIR: "/custom/legacy" },
        async () => {
          const { STATE_DIR } = await import("./config.js");
          expect(STATE_DIR).toBe(path.resolve("/custom/new"));
        },
      );
    });

    it("CONFIG_PATH defaults to ~/.clawdbot/moltbot.json when env not set", async () => {
      await withEnvOverride(
        {
          MOLTBOT_CONFIG_PATH: undefined,
          MOLTBOT_STATE_DIR: undefined,
          CLAWDBOT_CONFIG_PATH: undefined,
          CLAWDBOT_STATE_DIR: undefined,
        },
        async () => {
          const { CONFIG_PATH } = await import("./config.js");
          expect(CONFIG_PATH).toMatch(/\.clawdbot[\\/]moltbot\.json$/);
        },
      );
    });

    it("CONFIG_PATH respects CLAWDBOT_CONFIG_PATH override", async () => {
      await withEnvOverride(
        { MOLTBOT_CONFIG_PATH: undefined, CLAWDBOT_CONFIG_PATH: "/nix/store/abc/moltbot.json" },
        async () => {
          const { CONFIG_PATH } = await import("./config.js");
          expect(CONFIG_PATH).toBe(path.resolve("/nix/store/abc/moltbot.json"));
        },
      );
    });

    it("CONFIG_PATH prefers MOLTBOT_CONFIG_PATH over legacy override", async () => {
      await withEnvOverride(
        {
          MOLTBOT_CONFIG_PATH: "/nix/store/new/moltbot.json",
          CLAWDBOT_CONFIG_PATH: "/nix/store/legacy/moltbot.json",
        },
        async () => {
          const { CONFIG_PATH } = await import("./config.js");
          expect(CONFIG_PATH).toBe(path.resolve("/nix/store/new/moltbot.json"));
        },
      );
    });

    it("CONFIG_PATH expands ~ in CLAWDBOT_CONFIG_PATH override", async () => {
      await withTempHome(async (home) => {
        await withEnvOverride(
          { MOLTBOT_CONFIG_PATH: undefined, CLAWDBOT_CONFIG_PATH: "~/.clawdbot/custom.json" },
          async () => {
            const { CONFIG_PATH } = await import("./config.js");
            expect(CONFIG_PATH).toBe(path.join(home, ".clawdbot", "custom.json"));
          },
        );
      });
    });

    it("CONFIG_PATH uses STATE_DIR when only state dir is overridden", async () => {
      await withEnvOverride(
        {
          MOLTBOT_CONFIG_PATH: undefined,
          MOLTBOT_STATE_DIR: undefined,
          CLAWDBOT_CONFIG_PATH: undefined,
          CLAWDBOT_STATE_DIR: "/custom/state",
        },
        async () => {
          const { CONFIG_PATH } = await import("./config.js");
          expect(CONFIG_PATH).toBe(path.join(path.resolve("/custom/state"), "moltbot.json"));
        },
=======
    it("CONFIG_PATH defaults to ~/.openclaw/openclaw.json when env not set", () => {
      expect(
        resolveConfigPathCandidate(
          envWith({ OPENCLAW_CONFIG_PATH: undefined, OPENCLAW_STATE_DIR: undefined }),
        ),
      ).toMatch(/\.openclaw[\\/]openclaw\.json$/);
    });

    it("CONFIG_PATH respects OPENCLAW_CONFIG_PATH override", () => {
      expect(
        resolveConfigPathCandidate(
          envWith({ OPENCLAW_CONFIG_PATH: "/nix/store/abc/openclaw.json" }),
        ),
      ).toBe(path.resolve("/nix/store/abc/openclaw.json"));
    });

    it("CONFIG_PATH expands ~ in OPENCLAW_CONFIG_PATH override", async () => {
      await withTempHome(async (home) => {
        expect(
          resolveConfigPathCandidate(
            envWith({ OPENCLAW_HOME: home, OPENCLAW_CONFIG_PATH: "~/.openclaw/custom.json" }),
            () => home,
          ),
        ).toBe(path.join(home, ".openclaw", "custom.json"));
      });
    });

    it("CONFIG_PATH uses STATE_DIR when only state dir is overridden", () => {
      expect(resolveConfigPathCandidate(envWith({ OPENCLAW_STATE_DIR: "/custom/state" }))).toBe(
        path.join(path.resolve("/custom/state"), "openclaw.json"),
>>>>>>> de7d94d9e (perf(test): remove resetModules from config/sandbox/message suites)
      );
    });
  });

  describe("U5b: tilde expansion for config paths", () => {
    it("expands ~ in common path-ish config fields", async () => {
      await withTempHome(async (home) => {
        const configDir = path.join(home, ".clawdbot");
        await fs.mkdir(configDir, { recursive: true });
        const pluginDir = path.join(home, "plugins", "demo-plugin");
        await fs.mkdir(pluginDir, { recursive: true });
        await fs.writeFile(
          path.join(pluginDir, "index.js"),
          'export default { id: "demo-plugin", register() {} };',
          "utf-8",
        );
        await fs.writeFile(
          path.join(pluginDir, "moltbot.plugin.json"),
          JSON.stringify(
            {
              id: "demo-plugin",
              configSchema: { type: "object", additionalProperties: false, properties: {} },
            },
            null,
            2,
          ),
          "utf-8",
        );
        await fs.writeFile(
          path.join(configDir, "moltbot.json"),
          JSON.stringify(
            {
              plugins: {
                load: {
                  paths: ["~/plugins/demo-plugin"],
                },
              },
              agents: {
                defaults: { workspace: "~/ws-default" },
                list: [
                  {
                    id: "main",
                    workspace: "~/ws-agent",
                    agentDir: "~/.clawdbot/agents/main",
                    sandbox: { workspaceRoot: "~/sandbox-root" },
                  },
                ],
              },
              channels: {
                whatsapp: {
                  accounts: {
                    personal: {
                      authDir: "~/.clawdbot/credentials/wa-personal",
                    },
                  },
                },
              },
            },
            null,
            2,
          ),
          "utf-8",
        );

        const cfg = loadConfigForHome(home);

        expect(cfg.plugins?.load?.paths?.[0]).toBe(path.join(home, "plugins", "demo-plugin"));
        expect(cfg.agents?.defaults?.workspace).toBe(path.join(home, "ws-default"));
        expect(cfg.agents?.list?.[0]?.workspace).toBe(path.join(home, "ws-agent"));
        expect(cfg.agents?.list?.[0]?.agentDir).toBe(
          path.join(home, ".clawdbot", "agents", "main"),
        );
        expect(cfg.agents?.list?.[0]?.sandbox?.workspaceRoot).toBe(path.join(home, "sandbox-root"));
        expect(cfg.channels?.whatsapp?.accounts?.personal?.authDir).toBe(
          path.join(home, ".clawdbot", "credentials", "wa-personal"),
        );
      });
    });
  });

  describe("U6: gateway port resolution", () => {
<<<<<<< HEAD
    it("uses default when env and config are unset", async () => {
      await withEnvOverride({ CLAWDBOT_GATEWAY_PORT: undefined }, async () => {
        const { DEFAULT_GATEWAY_PORT, resolveGatewayPort } = await import("./config.js");
        expect(resolveGatewayPort({})).toBe(DEFAULT_GATEWAY_PORT);
      });
    });

    it("prefers CLAWDBOT_GATEWAY_PORT over config", async () => {
      await withEnvOverride({ CLAWDBOT_GATEWAY_PORT: "19001" }, async () => {
        const { resolveGatewayPort } = await import("./config.js");
        expect(resolveGatewayPort({ gateway: { port: 19002 } })).toBe(19001);
      });
    });

    it("falls back to config when env is invalid", async () => {
      await withEnvOverride({ CLAWDBOT_GATEWAY_PORT: "nope" }, async () => {
        const { resolveGatewayPort } = await import("./config.js");
        expect(resolveGatewayPort({ gateway: { port: 19003 } })).toBe(19003);
      });
=======
    it("uses default when env and config are unset", () => {
      expect(resolveGatewayPort({}, envWith({ OPENCLAW_GATEWAY_PORT: undefined }))).toBe(
        DEFAULT_GATEWAY_PORT,
      );
    });

    it("prefers OPENCLAW_GATEWAY_PORT over config", () => {
      expect(
        resolveGatewayPort(
          { gateway: { port: 19002 } },
          envWith({ OPENCLAW_GATEWAY_PORT: "19001" }),
        ),
      ).toBe(19001);
    });

    it("falls back to config when env is invalid", () => {
      expect(
        resolveGatewayPort(
          { gateway: { port: 19003 } },
          envWith({ OPENCLAW_GATEWAY_PORT: "nope" }),
        ),
      ).toBe(19003);
>>>>>>> de7d94d9e (perf(test): remove resetModules from config/sandbox/message suites)
    });
  });

  describe("U9: telegram.tokenFile schema validation", () => {
    it("accepts config with only botToken", async () => {
      await withTempHome(async (home) => {
        const configDir = path.join(home, ".clawdbot");
        await fs.mkdir(configDir, { recursive: true });
        await fs.writeFile(
          path.join(configDir, "moltbot.json"),
          JSON.stringify({
            channels: { telegram: { botToken: "123:ABC" } },
          }),
          "utf-8",
        );

        const cfg = loadConfigForHome(home);
        expect(cfg.channels?.telegram?.botToken).toBe("123:ABC");
        expect(cfg.channels?.telegram?.tokenFile).toBeUndefined();
      });
    });

    it("accepts config with only tokenFile", async () => {
      await withTempHome(async (home) => {
        const configDir = path.join(home, ".clawdbot");
        await fs.mkdir(configDir, { recursive: true });
        await fs.writeFile(
          path.join(configDir, "moltbot.json"),
          JSON.stringify({
            channels: { telegram: { tokenFile: "/run/agenix/telegram-token" } },
          }),
          "utf-8",
        );

        const cfg = loadConfigForHome(home);
        expect(cfg.channels?.telegram?.tokenFile).toBe("/run/agenix/telegram-token");
        expect(cfg.channels?.telegram?.botToken).toBeUndefined();
      });
    });

    it("accepts config with both botToken and tokenFile", async () => {
      await withTempHome(async (home) => {
        const configDir = path.join(home, ".clawdbot");
        await fs.mkdir(configDir, { recursive: true });
        await fs.writeFile(
          path.join(configDir, "moltbot.json"),
          JSON.stringify({
            channels: {
              telegram: {
                botToken: "fallback:token",
                tokenFile: "/run/agenix/telegram-token",
              },
            },
          }),
          "utf-8",
        );

        const cfg = loadConfigForHome(home);
        expect(cfg.channels?.telegram?.botToken).toBe("fallback:token");
        expect(cfg.channels?.telegram?.tokenFile).toBe("/run/agenix/telegram-token");
      });
    });
  });
});
