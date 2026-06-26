import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateSpendBudget,
  loadMonthlyBudgetLedger,
  recordMonthlyBudgetUsage,
  reserveMonthlyBudgetUsage,
  resolveBudgetStage,
  resolveSpendBudgetConfig,
  summarizeMonthlyBudgetLedger,
} from "./spend-budget.js";

const enabledBudget = {
  enabled: true,
  currency: "USD" as const,
  monthlyLimitUsd: 300,
  timezone: "UTC" as const,
  warnAtUsd: 240,
  degradeAtUsd: 270,
  hardStopAtUsd: 295,
  ownerEmergencyReserveUsd: 5,
  blockMessage: "Monthly model budget exhausted. Try again after the budget resets.",
};

const miniCost = {
  input: 0.75,
  output: 4.5,
  cacheRead: 0.075,
  cacheWrite: 0,
};

describe("spend budget", () => {
  it("resolves budget stages from month-to-date spend", () => {
    const config = resolveSpendBudgetConfig({
      agents: { defaults: { spendBudget: enabledBudget } },
    });

    expect(resolveBudgetStage(config, 12).stage).toBe("allow");
    expect(resolveBudgetStage(config, 240).stage).toBe("warn");
    expect(resolveBudgetStage(config, 270).stage).toBe("degrade");
    expect(resolveBudgetStage(config, 295).stage).toBe("hard_stop");
  });

  it("blocks paid calls with missing model cost while enforcement is enabled", () => {
    const config = resolveSpendBudgetConfig({
      agents: { defaults: { spendBudget: enabledBudget } },
    });

    const decision = evaluateSpendBudget({
      budget: config,
      monthToDateUsd: 0,
      promptTokens: 1_000,
      maxOutputTokens: 1_000,
      senderIsOwner: false,
      provider: "openai",
      model: "gpt-5.4-mini",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("missing_cost");
  });

  it("blocks paid calls when only cache pricing is configured", () => {
    const config = resolveSpendBudgetConfig({
      agents: { defaults: { spendBudget: enabledBudget } },
    });

    const decision = evaluateSpendBudget({
      budget: config,
      cost: { input: 0, output: 0, cacheRead: 0.01, cacheWrite: 0.01 },
      monthToDateUsd: 0,
      promptTokens: 1_000,
      maxOutputTokens: 1_000,
      senderIsOwner: false,
      provider: "openai",
      model: "gpt-5.4-mini",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("missing_cost");
  });

  it("allows local model calls without cost because they do not spend provider API budget", () => {
    const config = resolveSpendBudgetConfig({
      agents: { defaults: { spendBudget: enabledBudget } },
    });

    const decision = evaluateSpendBudget({
      budget: config,
      requiresCost: false,
      monthToDateUsd: 0,
      promptTokens: 1_000,
      maxOutputTokens: 1_000,
      senderIsOwner: false,
      provider: "ollama",
      model: "qwen3-32b",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.projectedCostUsd).toBe(0);
  });

  it("blocks calls that would spend the non-owner hard-stop reserve", () => {
    const config = resolveSpendBudgetConfig({
      agents: { defaults: { spendBudget: enabledBudget } },
    });

    const decision = evaluateSpendBudget({
      budget: config,
      cost: miniCost,
      monthToDateUsd: 294.99,
      promptTokens: 40_000,
      maxOutputTokens: 4_000,
      senderIsOwner: false,
      provider: "openai",
      model: "gpt-5.4-mini",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("hard_stop");
  });

  it("blocks fallback attempts when the projected run cost would exceed the cap", () => {
    const config = resolveSpendBudgetConfig({
      agents: {
        defaults: {
          spendBudget: {
            ...enabledBudget,
            maxProjectedCostPerAttemptUsd: 1,
            maxProjectedCostPerRunUsd: 0.1,
          },
        },
      },
    });

    const decision = evaluateSpendBudget({
      budget: config,
      cost: { input: 1_000, output: 0, cacheRead: 0, cacheWrite: 0 },
      monthToDateUsd: 10,
      promptTokens: 20,
      maxOutputTokens: 0,
      runProjectedCostUsd: 0.09,
      senderIsOwner: false,
      provider: "openai",
      model: "gpt-5.4-mini",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("projected_run_exceeds_cap");
  });

  it("allows owner emergency calls within the configured reserve", () => {
    const config = resolveSpendBudgetConfig({
      agents: { defaults: { spendBudget: enabledBudget } },
    });

    const decision = evaluateSpendBudget({
      budget: config,
      cost: miniCost,
      monthToDateUsd: 295,
      promptTokens: 1_000,
      maxOutputTokens: 1_000,
      senderIsOwner: true,
      provider: "openai",
      model: "gpt-5.4-mini",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.stage).toBe("hard_stop");
    expect(decision.projectedMonthToDateUsd).toBeLessThanOrEqual(300);
  });

  it("rolls ledger totals by UTC month", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-budget-"));
    const ledgerPath = path.join(root, "usage", "monthly-budget.json");
    try {
      await recordMonthlyBudgetUsage({
        ledgerPath,
        entry: {
          id: "jan-call",
          timestamp: "2026-01-31T23:59:59.000Z",
          month: "2026-01",
          provider: "openai",
          model: "gpt-5.4-mini",
          agentId: "kody",
          sessionKey: "main",
          estimatedCostUsd: 1.25,
        },
      });
      await recordMonthlyBudgetUsage({
        ledgerPath,
        entry: {
          id: "feb-call",
          timestamp: "2026-02-01T00:00:00.000Z",
          month: "2026-02",
          provider: "openai",
          model: "gpt-5.4-mini",
          agentId: "finn",
          sessionKey: "main",
          actualCostUsd: 2.5,
        },
      });

      const ledger = await loadMonthlyBudgetLedger(ledgerPath);
      expect(summarizeMonthlyBudgetLedger(ledger, "2026-01").monthToDateUsd).toBe(1.25);
      expect(summarizeMonthlyBudgetLedger(ledger, "2026-02").monthToDateUsd).toBe(2.5);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("preserves concurrent ledger updates in one gateway process", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-budget-"));
    const ledgerPath = path.join(root, "usage", "monthly-budget.json");
    try {
      await Promise.all([
        recordMonthlyBudgetUsage({
          ledgerPath,
          entry: {
            id: "call-a",
            timestamp: "2026-02-10T00:00:00.000Z",
            month: "2026-02",
            provider: "openai",
            model: "gpt-5.4-mini",
            agentId: "kody",
            estimatedCostUsd: 1,
          },
        }),
        recordMonthlyBudgetUsage({
          ledgerPath,
          entry: {
            id: "call-b",
            timestamp: "2026-02-10T00:00:01.000Z",
            month: "2026-02",
            provider: "openai",
            model: "gpt-5.4-nano",
            agentId: "finn",
            estimatedCostUsd: 2,
          },
        }),
      ]);

      const ledger = await loadMonthlyBudgetLedger(ledgerPath);
      expect(ledger.entries.map((entry) => entry.id).toSorted()).toEqual(["call-a", "call-b"]);
      expect(summarizeMonthlyBudgetLedger(ledger, "2026-02").monthToDateUsd).toBe(3);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("serializes concurrent reservations so projected spend is counted before provider traffic", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-budget-"));
    const ledgerPath = path.join(root, "usage", "monthly-budget.json");
    const config = resolveSpendBudgetConfig({
      agents: { defaults: { spendBudget: enabledBudget } },
    });
    try {
      await recordMonthlyBudgetUsage({
        ledgerPath,
        entry: {
          id: "existing",
          timestamp: "2026-02-10T00:00:00.000Z",
          month: "2026-02",
          provider: "openai",
          model: "gpt-5.4-mini",
          estimatedCostUsd: 294.99,
        },
      });

      const makeReservation = (id: string) =>
        reserveMonthlyBudgetUsage({
          ledgerPath,
          budget: config,
          cost: miniCost,
          month: "2026-02",
          entry: {
            id,
            timestamp: "2026-02-10T00:00:01.000Z",
            month: "2026-02",
            provider: "openai",
            model: "gpt-5.4-mini",
          },
          promptTokens: 1_000,
          maxOutputTokens: 1_000,
          senderIsOwner: false,
        });

      const results = await Promise.all([
        makeReservation("reservation-a"),
        makeReservation("reservation-b"),
      ]);
      expect(results.filter((result) => result.decision.allowed)).toHaveLength(1);
      expect(results.filter((result) => !result.decision.allowed)).toHaveLength(1);

      const ledger = await loadMonthlyBudgetLedger(ledgerPath);
      expect(ledger.entries.filter((entry) => entry.id.startsWith("reservation-"))).toHaveLength(1);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
