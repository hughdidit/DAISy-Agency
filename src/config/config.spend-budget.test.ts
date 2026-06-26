import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

const budget = {
  enabled: true,
  currency: "USD" as const,
  monthlyLimitUsd: 300,
  timezone: "UTC",
  warnAtUsd: 240,
  degradeAtUsd: 270,
  hardStopAtUsd: 295,
  ownerEmergencyReserveUsd: 5,
  blockMessage: "Monthly model budget exhausted. Try again after the budget resets.",
};

describe("spend budget config validation", () => {
  it("accepts enabled spendBudget when reachable OpenAI models have nonzero cost", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          spendBudget: budget,
          model: {
            primary: "openai/gpt-5.4-nano",
            fallbacks: ["openai/gpt-5.4-mini"],
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [
              {
                id: "gpt-5.4-nano",
                name: "GPT-5.4 Nano",
                cost: { input: 0.2, cacheRead: 0.02, output: 1.25, cacheWrite: 0 },
              },
              {
                id: "gpt-5.4-mini",
                name: "GPT-5.4 Mini",
                cost: { input: 0.75, cacheRead: 0.075, output: 4.5, cacheWrite: 0 },
              },
            ],
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("rejects enabled spendBudget when reachable OpenAI model cost is missing", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          spendBudget: budget,
          model: { primary: "openai/gpt-5.4-mini" },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5.4-mini", name: "GPT-5.4 Mini" }],
          },
        },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(
        res.issues.some((issue) => issue.path === "models.providers.openai.models.0.cost"),
      ).toBe(true);
    }
  });

  it("rejects enabled spendBudget when reachable model only has cache pricing", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          spendBudget: budget,
          model: { primary: "openai/gpt-5.4-mini" },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [
              {
                id: "gpt-5.4-mini",
                name: "GPT-5.4 Mini",
                cost: { input: 0, output: 0, cacheRead: 0.1, cacheWrite: 0.1 },
              },
            ],
          },
        },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(
        res.issues.some((issue) => issue.path === "models.providers.openai.models.0.cost"),
      ).toBe(true);
    }
  });

  it("accepts tiny monthly budgets without false default-threshold failures", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          spendBudget: {
            enabled: true,
            currency: "USD",
            monthlyLimitUsd: 1,
            timezone: "UTC",
          },
          model: { primary: "local/qwen3-32b" },
        },
      },
      models: {
        providers: {
          local: {
            baseUrl: "http://127.0.0.1:11434/v1",
            api: "ollama",
            models: [{ id: "qwen3-32b", name: "Qwen3 32B" }],
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("rejects enabled spendBudget when a reachable nonlocal model cost is missing", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          spendBudget: budget,
          model: { primary: "anthropic/claude-sonnet" },
        },
      },
      models: {
        providers: {
          anthropic: {
            baseUrl: "https://api.anthropic.com",
            api: "anthropic-messages",
            models: [{ id: "claude-sonnet", name: "Claude Sonnet" }],
          },
        },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(
        res.issues.some((issue) => issue.path === "models.providers.anthropic.models.0.cost"),
      ).toBe(true);
    }
  });
});
