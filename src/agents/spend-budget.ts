import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";
import type { OpenClawConfig } from "../config/types.js";
import { estimateUsageCost, formatUsd, type ModelCostConfig } from "../utils/usage-format.js";

export type BudgetStage = "disabled" | "allow" | "warn" | "degrade" | "hard_stop";

export type ResolvedSpendBudgetConfig = {
  enabled: boolean;
  currency: "USD";
  monthlyLimitUsd: number;
  timezone: "UTC";
  warnAtUsd: number;
  degradeAtUsd: number;
  hardStopAtUsd: number;
  ownerEmergencyReserveUsd: number;
  maxProjectedCostPerAttemptUsd: number;
  maxProjectedCostPerRunUsd: number;
  blockMessage: string;
};

export type BudgetDecisionReason =
  | "disabled"
  | "allowed"
  | "missing_cost"
  | "projected_attempt_exceeds_cap"
  | "projected_run_exceeds_cap"
  | "hard_stop"
  | "monthly_limit";

export type BudgetDecision = {
  allowed: boolean;
  stage: BudgetStage;
  reason: BudgetDecisionReason;
  monthToDateUsd: number;
  projectedCostUsd: number;
  projectedRunCostUsd: number;
  projectedMonthToDateUsd: number;
  message: string;
};

export type MonthlyBudgetLedgerEntry = {
  id: string;
  timestamp: string;
  month: string;
  provider: string;
  model: string;
  agentId?: string;
  sessionKey?: string;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  promptTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

export type MonthlyBudgetLedger = {
  version: 1;
  entries: MonthlyBudgetLedgerEntry[];
};

export type MonthlyBudgetSummary = {
  month: string;
  monthToDateUsd: number;
  estimatedUsd: number;
  actualUsd: number;
  topAgents: Array<{ key: string; costUsd: number }>;
  topModels: Array<{ key: string; costUsd: number }>;
};

export type MonthlyBudgetReservation = {
  decision: BudgetDecision;
  ledger: MonthlyBudgetLedger;
};

const DEFAULT_BLOCK_MESSAGE = "Monthly model budget exhausted. Try again after the budget resets.";
const ledgerWriteQueues = new Map<string, Promise<void>>();

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const positiveOr = (value: unknown, fallback: number): number => {
  const resolved = finiteOr(value, fallback);
  return resolved > 0 ? resolved : fallback;
};

export function resolveSpendBudgetConfig(config?: OpenClawConfig): ResolvedSpendBudgetConfig {
  const raw = config?.agents?.defaults?.spendBudget;
  const monthlyLimitUsd = positiveOr(raw?.monthlyLimitUsd, 300);
  const ownerEmergencyReserveUsd = Math.min(
    monthlyLimitUsd,
    Math.max(0, finiteOr(raw?.ownerEmergencyReserveUsd, 5)),
  );
  const hardStopFallback = Math.max(0, monthlyLimitUsd - ownerEmergencyReserveUsd);
  const hardStopAtUsd = Math.min(
    monthlyLimitUsd,
    Math.max(0, finiteOr(raw?.hardStopAtUsd, hardStopFallback)),
  );
  const degradeAtUsd = Math.min(
    hardStopAtUsd,
    Math.max(0, finiteOr(raw?.degradeAtUsd, Math.min(monthlyLimitUsd * 0.9, hardStopAtUsd))),
  );
  const warnAtUsd = Math.min(
    degradeAtUsd,
    Math.max(0, finiteOr(raw?.warnAtUsd, Math.min(monthlyLimitUsd * 0.8, degradeAtUsd))),
  );
  return {
    enabled: raw?.enabled === true,
    currency: "USD",
    monthlyLimitUsd,
    timezone: "UTC",
    warnAtUsd,
    degradeAtUsd,
    hardStopAtUsd,
    ownerEmergencyReserveUsd,
    maxProjectedCostPerAttemptUsd: positiveOr(raw?.maxProjectedCostPerAttemptUsd, 1),
    maxProjectedCostPerRunUsd: positiveOr(raw?.maxProjectedCostPerRunUsd, 3),
    blockMessage: raw?.blockMessage?.trim() || DEFAULT_BLOCK_MESSAGE,
  };
}

export function resolveBudgetStage(
  budget: ResolvedSpendBudgetConfig,
  monthToDateUsd: number,
): { stage: BudgetStage } {
  if (!budget.enabled) {
    return { stage: "disabled" };
  }
  if (monthToDateUsd >= budget.hardStopAtUsd) {
    return { stage: "hard_stop" };
  }
  if (monthToDateUsd >= budget.degradeAtUsd) {
    return { stage: "degrade" };
  }
  if (monthToDateUsd >= budget.warnAtUsd) {
    return { stage: "warn" };
  }
  return { stage: "allow" };
}

export function hasUsableModelCost(cost?: ModelCostConfig): cost is ModelCostConfig {
  if (!cost) {
    return false;
  }
  return [cost.input, cost.output].some(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
}

export function isSpendBudgetCostRequired(params: {
  provider: string;
  config?: OpenClawConfig;
}): boolean {
  const providerId = params.provider.trim();
  const normalizedProviderId = providerId.toLowerCase();
  if (normalizedProviderId === "local" || normalizedProviderId === "ollama") {
    return false;
  }
  const provider = params.config?.models?.providers?.[providerId];
  return provider?.api !== "ollama";
}

export function evaluateSpendBudget(params: {
  budget: ResolvedSpendBudgetConfig;
  cost?: ModelCostConfig;
  requiresCost?: boolean;
  monthToDateUsd: number;
  promptTokens: number;
  maxOutputTokens: number;
  runProjectedCostUsd?: number;
  senderIsOwner?: boolean;
  provider: string;
  model: string;
}): BudgetDecision {
  const { budget } = params;
  const monthToDateUsd = Math.max(0, finiteOr(params.monthToDateUsd, 0));
  const stage = resolveBudgetStage(budget, monthToDateUsd).stage;
  if (!budget.enabled) {
    return {
      allowed: true,
      stage,
      reason: "disabled",
      monthToDateUsd,
      projectedCostUsd: 0,
      projectedRunCostUsd: 0,
      projectedMonthToDateUsd: monthToDateUsd,
      message: "Spend budget enforcement is disabled.",
    };
  }

  const requiresCost = params.requiresCost ?? true;
  const hasCost = hasUsableModelCost(params.cost);
  if (requiresCost && !hasCost) {
    return buildBlockedDecision({
      budget,
      stage,
      reason: "missing_cost",
      monthToDateUsd,
      projectedCostUsd: 0,
      projectedRunCostUsd: params.runProjectedCostUsd ?? 0,
      message: `Model ${params.provider}/${params.model} is missing nonzero cost configuration.`,
    });
  }

  const promptTokens = Math.max(0, Math.floor(finiteOr(params.promptTokens, 0)));
  const maxOutputTokens = Math.max(0, Math.floor(finiteOr(params.maxOutputTokens, 0)));
  const projectedCostUsd = hasCost
    ? (estimateUsageCost({
        usage: {
          input: promptTokens,
          output: maxOutputTokens,
          total: promptTokens + maxOutputTokens,
        },
        cost: params.cost,
      }) ?? 0)
    : 0;
  const projectedRunCostUsd = Math.max(
    0,
    finiteOr(params.runProjectedCostUsd, 0) + projectedCostUsd,
  );
  const projectedMonthToDateUsd = monthToDateUsd + projectedCostUsd;

  if (projectedCostUsd > budget.maxProjectedCostPerAttemptUsd) {
    return buildBlockedDecision({
      budget,
      stage,
      reason: "projected_attempt_exceeds_cap",
      monthToDateUsd,
      projectedCostUsd,
      projectedRunCostUsd,
      message: `Projected model call cost ${formatUsd(projectedCostUsd)} exceeds per-attempt cap ${formatUsd(budget.maxProjectedCostPerAttemptUsd)}.`,
    });
  }
  if (projectedRunCostUsd > budget.maxProjectedCostPerRunUsd) {
    return buildBlockedDecision({
      budget,
      stage,
      reason: "projected_run_exceeds_cap",
      monthToDateUsd,
      projectedCostUsd,
      projectedRunCostUsd,
      message: `Projected run cost ${formatUsd(projectedRunCostUsd)} exceeds per-run cap ${formatUsd(budget.maxProjectedCostPerRunUsd)}.`,
    });
  }

  if (params.senderIsOwner) {
    if (projectedMonthToDateUsd > budget.monthlyLimitUsd) {
      return buildBlockedDecision({
        budget,
        stage,
        reason: "monthly_limit",
        monthToDateUsd,
        projectedCostUsd,
        projectedRunCostUsd,
        message: `Projected monthly spend ${formatUsd(projectedMonthToDateUsd)} exceeds ${formatUsd(budget.monthlyLimitUsd)}.`,
      });
    }
  } else if (projectedMonthToDateUsd > budget.hardStopAtUsd) {
    return buildBlockedDecision({
      budget,
      stage,
      reason: "hard_stop",
      monthToDateUsd,
      projectedCostUsd,
      projectedRunCostUsd,
      message: `Projected monthly spend ${formatUsd(projectedMonthToDateUsd)} would enter owner emergency reserve.`,
    });
  }

  return {
    allowed: true,
    stage,
    reason: "allowed",
    monthToDateUsd,
    projectedCostUsd,
    projectedRunCostUsd,
    projectedMonthToDateUsd,
    message: "Budget check allowed provider request.",
  };
}

function buildBlockedDecision(params: {
  budget: ResolvedSpendBudgetConfig;
  stage: BudgetStage;
  reason: BudgetDecisionReason;
  monthToDateUsd: number;
  projectedCostUsd: number;
  projectedRunCostUsd: number;
  message: string;
}): BudgetDecision {
  return {
    allowed: false,
    stage: params.stage,
    reason: params.reason,
    monthToDateUsd: params.monthToDateUsd,
    projectedCostUsd: params.projectedCostUsd,
    projectedRunCostUsd: params.projectedRunCostUsd,
    projectedMonthToDateUsd: params.monthToDateUsd + params.projectedCostUsd,
    message: `${params.budget.blockMessage} ${params.message}`,
  };
}

export class SpendBudgetError extends Error {
  readonly decision: BudgetDecision;

  constructor(decision: BudgetDecision) {
    super(decision.message);
    this.name = "SpendBudgetError";
    this.decision = decision;
  }
}

export function isSpendBudgetError(error: unknown): error is SpendBudgetError {
  return (
    error instanceof SpendBudgetError ||
    (error as { name?: string } | null)?.name === "SpendBudgetError"
  );
}

export function currentBudgetMonth(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function resolveMonthlyBudgetLedgerPath(stateDir = resolveStateDir()): string {
  return path.join(stateDir, "usage", "monthly-budget.json");
}

export async function loadMonthlyBudgetLedger(
  ledgerPath = resolveMonthlyBudgetLedgerPath(),
): Promise<MonthlyBudgetLedger> {
  try {
    const raw = await fs.readFile(ledgerPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<MonthlyBudgetLedger>;
    return {
      version: 1,
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.filter(isMonthlyBudgetLedgerEntry)
        : [],
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, entries: [] };
    }
    throw err;
  }
}

export async function recordMonthlyBudgetUsage(params: {
  ledgerPath?: string;
  entry: MonthlyBudgetLedgerEntry;
}): Promise<MonthlyBudgetLedger> {
  const ledgerPath = params.ledgerPath ?? resolveMonthlyBudgetLedgerPath();
  return updateMonthlyBudgetLedger(ledgerPath, (ledger) => {
    const nextEntries = ledger.entries.filter((entry) => entry.id !== params.entry.id);
    nextEntries.push(params.entry);
    const next = { version: 1 as const, entries: nextEntries };
    return { ledger: next, result: next };
  });
}

export async function reserveMonthlyBudgetUsage(params: {
  ledgerPath?: string;
  budget: ResolvedSpendBudgetConfig;
  cost?: ModelCostConfig;
  requiresCost?: boolean;
  month: string;
  entry: Omit<MonthlyBudgetLedgerEntry, "estimatedCostUsd">;
  promptTokens: number;
  maxOutputTokens: number;
  runProjectedCostUsd?: number;
  senderIsOwner?: boolean;
}): Promise<MonthlyBudgetReservation> {
  const ledgerPath = params.ledgerPath ?? resolveMonthlyBudgetLedgerPath();
  return updateMonthlyBudgetLedger(ledgerPath, (ledger) => {
    const summary = summarizeMonthlyBudgetLedger(ledger, params.month);
    const decision = evaluateSpendBudget({
      budget: params.budget,
      cost: params.cost,
      requiresCost: params.requiresCost,
      monthToDateUsd: summary.monthToDateUsd,
      promptTokens: params.promptTokens,
      maxOutputTokens: params.maxOutputTokens,
      runProjectedCostUsd: params.runProjectedCostUsd,
      senderIsOwner: params.senderIsOwner,
      provider: params.entry.provider,
      model: params.entry.model,
    });
    if (!decision.allowed) {
      return { ledger, result: { decision, ledger } };
    }
    const nextEntries = ledger.entries.filter((entry) => entry.id !== params.entry.id);
    nextEntries.push({
      ...params.entry,
      estimatedCostUsd: decision.projectedCostUsd,
    });
    const next = { version: 1 as const, entries: nextEntries };
    return { ledger: next, result: { decision, ledger: next } };
  });
}

async function updateMonthlyBudgetLedger<T>(
  ledgerPath: string,
  update: (ledger: MonthlyBudgetLedger) => { ledger: MonthlyBudgetLedger; result: T },
): Promise<T> {
  const queueKey = path.resolve(ledgerPath);
  const previous = ledgerWriteQueues.get(queueKey) ?? Promise.resolve();
  const operation = previous
    .catch(() => undefined)
    .then(async () => {
      return withMonthlyBudgetLedgerLock(ledgerPath, async () => {
        const ledger = await loadMonthlyBudgetLedger(ledgerPath);
        const updated = update(ledger);
        await writeMonthlyBudgetLedgerAtomic(ledgerPath, updated.ledger);
        return updated.result;
      });
    });
  ledgerWriteQueues.set(
    queueKey,
    operation.then(
      () => undefined,
      () => undefined,
    ),
  );
  return operation;
}

async function withMonthlyBudgetLedgerLock<T>(
  ledgerPath: string,
  fn: () => Promise<T>,
): Promise<T> {
  const lockDir = `${ledgerPath}.lock`;
  const deadline = Date.now() + 10_000;
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
  while (true) {
    try {
      await fs.mkdir(lockDir, { recursive: false });
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST" || Date.now() > deadline) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  try {
    return await fn();
  } finally {
    await fs.rm(lockDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function writeMonthlyBudgetLedgerAtomic(
  ledgerPath: string,
  ledger: MonthlyBudgetLedger,
): Promise<void> {
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
  const tmpPath = `${ledgerPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmpPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
    await fs.rename(tmpPath, ledgerPath);
  } catch (err) {
    await fs.rm(tmpPath, { force: true }).catch(() => undefined);
    throw err;
  }
}

export function summarizeMonthlyBudgetLedger(
  ledger: MonthlyBudgetLedger,
  month = currentBudgetMonth(),
): MonthlyBudgetSummary {
  const matching = ledger.entries.filter((entry) => entry.month === month);
  const topAgents = new Map<string, number>();
  const topModels = new Map<string, number>();
  let estimatedUsd = 0;
  let actualUsd = 0;
  let monthToDateUsd = 0;

  for (const entry of matching) {
    const estimated = cleanCost(entry.estimatedCostUsd);
    const actual = cleanCost(entry.actualCostUsd);
    const effective = actual ?? estimated ?? 0;
    estimatedUsd += estimated ?? 0;
    actualUsd += actual ?? 0;
    monthToDateUsd += effective;
    const agentKey = entry.agentId?.trim() || "(unknown)";
    topAgents.set(agentKey, (topAgents.get(agentKey) ?? 0) + effective);
    const modelKey = `${entry.provider}/${entry.model}`;
    topModels.set(modelKey, (topModels.get(modelKey) ?? 0) + effective);
  }

  return {
    month,
    monthToDateUsd,
    estimatedUsd,
    actualUsd,
    topAgents: topList(topAgents),
    topModels: topList(topModels),
  };
}

function cleanCost(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function topList(values: Map<string, number>): Array<{ key: string; costUsd: number }> {
  return [...values.entries()]
    .map(([key, costUsd]) => ({ key, costUsd }))
    .toSorted((a, b) => b.costUsd - a.costUsd || a.key.localeCompare(b.key))
    .slice(0, 5);
}

function isMonthlyBudgetLedgerEntry(value: unknown): value is MonthlyBudgetLedgerEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Partial<MonthlyBudgetLedgerEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.timestamp === "string" &&
    typeof entry.month === "string" &&
    typeof entry.provider === "string" &&
    typeof entry.model === "string"
  );
}

export function formatBudgetEventLog(
  event: "budget_allow" | "budget_warn" | "budget_degrade" | "budget_block",
  params: {
    decision: BudgetDecision;
    provider: string;
    model: string;
    agentId?: string;
    sessionKey?: string;
  },
): string {
  return JSON.stringify({
    event,
    stage: params.decision.stage,
    reason: params.decision.reason,
    provider: params.provider,
    model: params.model,
    agentId: params.agentId,
    sessionKey: params.sessionKey,
    monthToDateUsd: Number(params.decision.monthToDateUsd.toFixed(6)),
    projectedCostUsd: Number(params.decision.projectedCostUsd.toFixed(6)),
    projectedMonthToDateUsd: Number(params.decision.projectedMonthToDateUsd.toFixed(6)),
  });
}
