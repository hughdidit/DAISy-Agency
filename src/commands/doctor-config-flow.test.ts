import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { withTempHome } from "../../test/helpers/temp-home.js";
import { loadAndMaybeMigrateDoctorConfig } from "./doctor-config-flow.js";
<<<<<<< HEAD

describe("doctor config flow", () => {
  it("preserves invalid config for doctor repairs", async () => {
=======
import { runDoctorConfigWithInput } from "./doctor-config-flow.test-utils.js";

function expectGoogleChatDmAllowFromRepaired(cfg: unknown) {
  const typed = cfg as {
    channels: {
      googlechat: {
        dm: { allowFrom: string[] };
        allowFrom?: string[];
      };
    };
  };
  expect(typed.channels.googlechat.dm.allowFrom).toEqual(["*"]);
  expect(typed.channels.googlechat.allowFrom).toBeUndefined();
}

type DiscordGuildRule = {
  users: string[];
  roles: string[];
  channels: Record<string, { users: string[]; roles: string[] }>;
};

type DiscordAccountRule = {
  allowFrom?: string[];
  dm?: { allowFrom: string[]; groupChannels: string[] };
  execApprovals?: { approvers: string[] };
  guilds?: Record<string, DiscordGuildRule>;
};

type RepairedDiscordPolicy = {
  allowFrom?: string[];
  dm: { allowFrom: string[]; groupChannels: string[] };
  execApprovals: { approvers: string[] };
  guilds: Record<string, DiscordGuildRule>;
  accounts: Record<string, DiscordAccountRule>;
};

describe("doctor config flow", () => {
  it("preserves invalid config for doctor repairs", async () => {
    const result = await runDoctorConfigWithInput({
      config: {
        gateway: { auth: { mode: "token", token: 123 } },
        agents: { list: [{ id: "pi" }] },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    expect((result.cfg as Record<string, unknown>).gateway).toEqual({
      auth: { mode: "token", token: 123 },
    });
  });

  it("does not warn on mutable account allowlists when dangerous name matching is inherited", async () => {
    const noteSpy = vi.spyOn(noteModule, "note").mockImplementation(() => {});
    try {
      await runDoctorConfigWithInput({
        config: {
          channels: {
            slack: {
              dangerouslyAllowNameMatching: true,
              accounts: {
                work: {
                  allowFrom: ["alice"],
                },
              },
            },
          },
        },
        run: loadAndMaybeMigrateDoctorConfig,
      });

      const doctorWarnings = noteSpy.mock.calls
        .filter((call) => call[1] === "Doctor warnings")
        .map((call) => String(call[0]));
      expect(doctorWarnings.some((line) => line.includes("mutable allowlist"))).toBe(false);
    } finally {
      noteSpy.mockRestore();
    }
  });

  it("drops unknown keys on repair", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        bridge: { bind: "auto" },
        gateway: { auth: { mode: "token", token: "ok", extra: true } },
        agents: { list: [{ id: "pi" }] },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as Record<string, unknown>;
    expect(cfg.bridge).toBeUndefined();
    expect((cfg.gateway as Record<string, unknown>)?.auth).toEqual({
      mode: "token",
      token: "ok",
    });
  });

  it("preserves discord streaming intent while stripping unsupported keys on repair", async () => {
    const result = await runDoctorConfigWithInput({
      repair: true,
      config: {
        channels: {
          discord: {
            streaming: true,
            lifecycle: {
              enabled: true,
              reactions: {
                queued: "⏳",
                thinking: "🧠",
                tool: "🔧",
                done: "✅",
                error: "❌",
              },
            },
          },
        },
      },
      run: loadAndMaybeMigrateDoctorConfig,
    });

    const cfg = result.cfg as {
      channels: {
        discord: {
          streamMode?: string;
          streaming?: string;
          lifecycle?: unknown;
        };
      };
    };
    expect(cfg.channels.discord.streaming).toBe("partial");
    expect(cfg.channels.discord.streamMode).toBeUndefined();
    expect(cfg.channels.discord.lifecycle).toBeUndefined();
  });

  it("resolves Telegram @username allowFrom entries to numeric IDs on repair", async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      const u = String(url);
      const chatId = new URL(u).searchParams.get("chat_id") ?? "";
      const id =
        chatId.toLowerCase() === "@testuser"
          ? 111
          : chatId.toLowerCase() === "@groupuser"
            ? 222
            : chatId.toLowerCase() === "@topicuser"
              ? 333
              : chatId.toLowerCase() === "@accountuser"
                ? 444
                : null;
      return {
        ok: id != null,
        json: async () => (id != null ? { ok: true, result: { id } } : { ok: false }),
      } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const result = await runDoctorConfigWithInput({
        repair: true,
        config: {
          channels: {
            telegram: {
              botToken: "123:abc",
              allowFrom: ["@testuser"],
              groupAllowFrom: ["groupUser"],
              groups: {
                "-100123": {
                  allowFrom: ["tg:@topicUser"],
                  topics: { "99": { allowFrom: ["@accountUser"] } },
                },
              },
              accounts: {
                alerts: { botToken: "456:def", allowFrom: ["@accountUser"] },
              },
            },
          },
        },
        run: loadAndMaybeMigrateDoctorConfig,
      });

      const cfg = result.cfg as unknown as {
        channels: {
          telegram: {
            allowFrom?: string[];
            groupAllowFrom?: string[];
            groups: Record<
              string,
              { allowFrom: string[]; topics: Record<string, { allowFrom: string[] }> }
            >;
            accounts: Record<string, { allowFrom?: string[]; groupAllowFrom?: string[] }>;
          };
        };
      };
      expect(cfg.channels.telegram.allowFrom).toBeUndefined();
      expect(cfg.channels.telegram.groupAllowFrom).toBeUndefined();
      expect(cfg.channels.telegram.accounts.default.allowFrom).toEqual(["111"]);
      expect(cfg.channels.telegram.accounts.default.groupAllowFrom).toEqual(["222"]);
      expect(cfg.channels.telegram.groups["-100123"].allowFrom).toEqual(["333"]);
      expect(cfg.channels.telegram.groups["-100123"].topics["99"].allowFrom).toEqual(["444"]);
      expect(cfg.channels.telegram.accounts.alerts.allowFrom).toEqual(["444"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("converts numeric discord ids to strings on repair", async () => {
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".openclaw");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "openclaw.json"),
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
      const configDir = path.join(home, ".openclaw");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "openclaw.json"),
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

<<<<<<< HEAD
      const cfg = result.cfg as Record<string, unknown>;
      expect(cfg.bridge).toBeUndefined();
      expect((cfg.gateway as Record<string, unknown>)?.auth).toEqual({
        mode: "token",
        token: "ok",
      });
=======
      const cfg = result.cfg as unknown as {
        channels: { discord: RepairedDiscordPolicy };
      };

      expect(cfg.channels.discord.allowFrom).toBeUndefined();
      expect(cfg.channels.discord.accounts.default.allowFrom).toEqual(["123"]);
      expect(cfg.channels.discord.dm.allowFrom).toEqual(["456"]);
      expect(cfg.channels.discord.dm.groupChannels).toEqual(["789"]);
      expect(cfg.channels.discord.execApprovals.approvers).toEqual(["321"]);
      expect(cfg.channels.discord.guilds["100"].users).toEqual(["111"]);
      expect(cfg.channels.discord.guilds["100"].roles).toEqual(["222"]);
      expect(cfg.channels.discord.guilds["100"].channels.general.users).toEqual(["333"]);
      expect(cfg.channels.discord.guilds["100"].channels.general.roles).toEqual(["444"]);
      expect(cfg.channels.discord.accounts.work.allowFrom).toEqual(["555"]);
      expect(cfg.channels.discord.accounts.work.dm.allowFrom).toEqual(["666"]);
      expect(cfg.channels.discord.accounts.work.dm.groupChannels).toEqual(["777"]);
      expect(cfg.channels.discord.accounts.work.execApprovals.approvers).toEqual(["888"]);
      expect(cfg.channels.discord.accounts.work.guilds["200"].users).toEqual(["999"]);
      expect(cfg.channels.discord.accounts.work.guilds["200"].roles).toEqual(["1010"]);
      expect(cfg.channels.discord.accounts.work.guilds["200"].channels.help.users).toEqual([
        "1111",
      ]);
      expect(cfg.channels.discord.accounts.work.guilds["200"].channels.help.roles).toEqual([
        "1212",
      ]);
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
    });
  });
});
