import { describe, expect, it } from "vitest";
<<<<<<< HEAD

import type { MoltbotConfig } from "../config/config.js";
=======
import type { OpenClawConfig } from "../config/config.js";
import { withEnv } from "../test-utils/env.js";
>>>>>>> 63488eb98 (refactor(test): dedupe telegram token env handling in tests)
import { resolveTelegramAccount } from "./accounts.js";

describe("resolveTelegramAccount", () => {
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
});
