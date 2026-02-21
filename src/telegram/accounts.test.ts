<<<<<<< HEAD
import { describe, expect, it } from "vitest";
<<<<<<< HEAD

import type { MoltbotConfig } from "../config/config.js";
=======
import type { OpenClawConfig } from "../config/config.js";
import { withEnv } from "../test-utils/env.js";
>>>>>>> 63488eb98 (refactor(test): dedupe telegram token env handling in tests)
import { resolveTelegramAccount } from "./accounts.js";
=======
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { withEnv } from "../test-utils/env.js";
import { listTelegramAccountIds, resolveTelegramAccount } from "./accounts.js";

const { warnMock } = vi.hoisted(() => ({
  warnMock: vi.fn(),
}));

vi.mock("../logging/subsystem.js", () => ({
  createSubsystemLogger: () => {
    const logger = {
      warn: warnMock,
      child: () => logger,
    };
    return logger;
  },
}));
>>>>>>> 2f46308d5 (refactor(logging): migrate non-agent internal console calls to subsystem logger (#22964))

describe("resolveTelegramAccount", () => {
  afterEach(() => {
    warnMock.mockReset();
  });

  it("falls back to the first configured account when accountId is omitted", () => {
<<<<<<< HEAD
    const prevTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "";
    try {
      const cfg: MoltbotConfig = {
=======
    withEnv({ TELEGRAM_BOT_TOKEN: "" }, () => {
      const cfg: OpenClawConfig = {
>>>>>>> 63488eb98 (refactor(test): dedupe telegram token env handling in tests)
        channels: {
          telegram: { accounts: { work: { botToken: "tok-work" } } },
        },
      };

      const account = resolveTelegramAccount({ cfg });
      expect(account.accountId).toBe("work");
      expect(account.token).toBe("tok-work");
      expect(account.tokenSource).toBe("config");
    });
  });

  it("uses TELEGRAM_BOT_TOKEN when default account config is missing", () => {
<<<<<<< HEAD
    const prevTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "tok-env";
    try {
      const cfg: MoltbotConfig = {
=======
    withEnv({ TELEGRAM_BOT_TOKEN: "tok-env" }, () => {
      const cfg: OpenClawConfig = {
>>>>>>> 63488eb98 (refactor(test): dedupe telegram token env handling in tests)
        channels: {
          telegram: { accounts: { work: { botToken: "tok-work" } } },
        },
      };

      const account = resolveTelegramAccount({ cfg });
      expect(account.accountId).toBe("default");
      expect(account.token).toBe("tok-env");
      expect(account.tokenSource).toBe("env");
    });
  });

  it("prefers default config token over TELEGRAM_BOT_TOKEN", () => {
<<<<<<< HEAD
    const prevTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "tok-env";
    try {
      const cfg: MoltbotConfig = {
=======
    withEnv({ TELEGRAM_BOT_TOKEN: "tok-env" }, () => {
      const cfg: OpenClawConfig = {
>>>>>>> 63488eb98 (refactor(test): dedupe telegram token env handling in tests)
        channels: {
          telegram: { botToken: "tok-config" },
        },
      };

      const account = resolveTelegramAccount({ cfg });
      expect(account.accountId).toBe("default");
      expect(account.token).toBe("tok-config");
      expect(account.tokenSource).toBe("config");
    });
  });

  it("does not fall back when accountId is explicitly provided", () => {
<<<<<<< HEAD
    const prevTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "";
    try {
      const cfg: MoltbotConfig = {
=======
    withEnv({ TELEGRAM_BOT_TOKEN: "" }, () => {
      const cfg: OpenClawConfig = {
>>>>>>> 63488eb98 (refactor(test): dedupe telegram token env handling in tests)
        channels: {
          telegram: { accounts: { work: { botToken: "tok-work" } } },
        },
      };

      const account = resolveTelegramAccount({ cfg, accountId: "default" });
      expect(account.accountId).toBe("default");
      expect(account.tokenSource).toBe("none");
      expect(account.token).toBe("");
    });
  });

  it("formats debug logs with inspect-style output when debug env is enabled", () => {
    withEnv({ TELEGRAM_BOT_TOKEN: "", OPENCLAW_DEBUG_TELEGRAM_ACCOUNTS: "1" }, () => {
      const cfg: OpenClawConfig = {
        channels: {
          telegram: { accounts: { work: { botToken: "tok-work" } } },
        },
      };

      expect(listTelegramAccountIds(cfg)).toEqual(["work"]);
      resolveTelegramAccount({ cfg, accountId: "work" });
    });

    const lines = warnMock.mock.calls.map(([line]) => String(line));
    expect(lines).toContain("listTelegramAccountIds [ 'work' ]");
    expect(lines).toContain("resolve { accountId: 'work', enabled: true, tokenSource: 'config' }");
  });
});
