import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { withTempHome } from "../../test/helpers/temp-home.js";
import { loadAndMaybeMigrateDoctorConfig } from "./doctor-config-flow.js";

describe("doctor config flow", () => {
  it("preserves invalid config for doctor repairs", async () => {
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".clawdbot");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "moltbot.json"),
        JSON.stringify(
          {
            gateway: { auth: { mode: "token", token: 123 } },
            agents: { list: [{ id: "pi" }] },
          },
          null,
          2,
        ),
        "utf-8",
      );

      const result = await loadAndMaybeMigrateDoctorConfig({
        options: { nonInteractive: true },
        confirm: async () => false,
      });

      expect((result.cfg as Record<string, unknown>).gateway).toEqual({
        auth: { mode: "token", token: 123 },
      });
    });
  });

  it("drops unknown keys on repair", async () => {
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".clawdbot");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "moltbot.json"),
        JSON.stringify(
          {
            bridge: { bind: "auto" },
            gateway: { auth: { mode: "token", token: "ok", extra: true } },
            agents: { list: [{ id: "pi" }] },
          },
          null,
          2,
        ),
        "utf-8",
      );

      const result = await loadAndMaybeMigrateDoctorConfig({
        options: { nonInteractive: true, repair: true },
        confirm: async () => false,
      });

      const cfg = result.cfg as Record<string, unknown>;
      expect(cfg.bridge).toBeUndefined();
      expect((cfg.gateway as Record<string, unknown>)?.auth).toEqual({
        mode: "token",
        token: "ok",
      });
    });
  });
<<<<<<< HEAD
=======

  it("does not restore top-level allowFrom when config is intentionally default-account scoped", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          discord: {
            accounts: {
              default: { token: "discord-default-token", allowFrom: ["123"] },
              work: { token: "discord-work-token" },
            },
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as {
      channels: {
        discord: {
          allowFrom?: string[];
          accounts: Record<string, { allowFrom?: string[] }>;
        };
      };
    };

    expect(cfg.channels.discord.allowFrom).toBeUndefined();
    expect(cfg.channels.discord.accounts.default.allowFrom).toEqual(["123"]);
  });

  it('adds allowFrom ["*"] when dmPolicy="open" and allowFrom is missing on repair', async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          discord: {
            token: "test-token",
            dmPolicy: "open",
            groupPolicy: "open",
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as unknown as {
      channels: { discord: { allowFrom: string[]; dmPolicy: string } };
    };
    expect(cfg.channels.discord.allowFrom).toEqual(["*"]);
    expect(cfg.channels.discord.dmPolicy).toBe("open");
  });

  it("adds * to existing allowFrom array when dmPolicy is open on repair", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          slack: {
            botToken: "xoxb-test",
            appToken: "xapp-test",
            dmPolicy: "open",
            allowFrom: ["U123"],
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as unknown as {
      channels: { slack: { allowFrom: string[] } };
    };
    expect(cfg.channels.slack.allowFrom).toContain("*");
    expect(cfg.channels.slack.allowFrom).toContain("U123");
  });

  it("repairs nested dm.allowFrom when top-level allowFrom is absent on repair", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          discord: {
            token: "test-token",
            dmPolicy: "open",
            dm: { allowFrom: ["123"] },
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as unknown as {
      channels: { discord: { dm: { allowFrom: string[] }; allowFrom?: string[] } };
    };
    // When dmPolicy is set at top level but allowFrom only exists nested in dm,
    // the repair adds "*" to dm.allowFrom
    if (cfg.channels.discord.dm) {
      expect(cfg.channels.discord.dm.allowFrom).toContain("*");
      expect(cfg.channels.discord.dm.allowFrom).toContain("123");
    } else {
      // If doctor flattened the config, allowFrom should be at top level
      expect(cfg.channels.discord.allowFrom).toContain("*");
    }
  });

  it("skips repair when allowFrom already includes *", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          discord: {
            token: "test-token",
            dmPolicy: "open",
            allowFrom: ["*"],
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as unknown as {
      channels: { discord: { allowFrom: string[] } };
    };
    expect(cfg.channels.discord.allowFrom).toEqual(["*"]);
  });

  it("repairs per-account dmPolicy open without allowFrom on repair", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          discord: {
            token: "test-token",
            accounts: {
              work: {
                token: "test-token-2",
                dmPolicy: "open",
              },
            },
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as unknown as {
      channels: {
        discord: { accounts: { work: { allowFrom: string[]; dmPolicy: string } } };
      };
    };
    expect(cfg.channels.discord.accounts.work.allowFrom).toEqual(["*"]);
  });

  it('repairs dmPolicy="allowlist" by restoring allowFrom from pairing store on repair', async () => {
    const result = await withTempHome(async (home) => {
      const configDir = path.join(home, ".openclaw");
      const credentialsDir = path.join(configDir, "credentials");
      await fs.mkdir(credentialsDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "openclaw.json"),
        JSON.stringify(
          {
            channels: {
              telegram: {
                botToken: "fake-token",
                dmPolicy: "allowlist",
              },
            },
          },
          null,
          2,
        ),
        "utf-8",
      );
      await fs.writeFile(
        path.join(credentialsDir, "telegram-allowFrom.json"),
        JSON.stringify({ version: 1, allowFrom: ["12345"] }, null, 2),
        "utf-8",
      );
      return await loadAndMaybeMigrateDoctorConfig({
        options: { nonInteractive: true, repair: true },
        confirm: async () => false,
      });
    });

    const cfg = result.cfg as {
      channels: {
        telegram: {
          dmPolicy: string;
          allowFrom: string[];
        };
      };
    };
    expect(cfg.channels.telegram.dmPolicy).toBe("allowlist");
    expect(cfg.channels.telegram.allowFrom).toEqual(["12345"]);
  });

  it("migrates legacy toolsBySender keys to typed id entries on repair", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          whatsapp: {
            groups: {
              "123@g.us": {
                toolsBySender: {
                  owner: { allow: ["exec"] },
                  alice: { deny: ["exec"] },
                  "id:owner": { deny: ["exec"] },
                  "username:@ops-bot": { allow: ["fs.read"] },
                  "*": { deny: ["exec"] },
                },
              },
            },
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as unknown as {
      channels: {
        whatsapp: {
          groups: {
            "123@g.us": {
              toolsBySender: Record<string, { allow?: string[]; deny?: string[] }>;
            };
          };
        };
      };
    };
    const toolsBySender = cfg.channels.whatsapp.groups["123@g.us"].toolsBySender;
    expect(toolsBySender.owner).toBeUndefined();
    expect(toolsBySender.alice).toBeUndefined();
    expect(toolsBySender["id:owner"]).toEqual({ deny: ["exec"] });
    expect(toolsBySender["id:alice"]).toEqual({ deny: ["exec"] });
    expect(toolsBySender["username:@ops-bot"]).toEqual({ allow: ["fs.read"] });
    expect(toolsBySender["*"]).toEqual({ deny: ["exec"] });
  });

  it("repairs googlechat dm.policy open by setting dm.allowFrom on repair", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          googlechat: {
            dm: {
              policy: "open",
            },
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    expectGoogleChatDmAllowFromRepaired(result.cfg);
  });

  it("repairs googlechat account dm.policy open by setting dm.allowFrom on repair", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          googlechat: {
            accounts: {
              work: {
                dm: {
                  policy: "open",
                },
              },
            },
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as unknown as {
      channels: {
        googlechat: {
          accounts: {
            work: {
              dm: {
                policy: string;
                allowFrom: string[];
              };
              allowFrom?: string[];
            };
          };
        };
      };
    };

    expect(cfg.channels.googlechat.accounts.work.dm.allowFrom).toEqual(["*"]);
    expect(cfg.channels.googlechat.accounts.work.allowFrom).toBeUndefined();
  });

  it("recovers from stale googlechat top-level allowFrom by repairing dm.allowFrom", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          googlechat: {
            allowFrom: ["*"],
            dm: {
              policy: "open",
            },
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    expectGoogleChatDmAllowFromRepaired(result.cfg);
  });
>>>>>>> 1d4320293 (fix: repair Telegram allowlist DM migrations (#27936) (thanks @widingmarcus-cyber))
});
