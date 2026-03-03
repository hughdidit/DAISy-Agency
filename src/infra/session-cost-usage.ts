import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import type { NormalizedUsage, UsageLike } from "../agents/usage.js";
import { normalizeUsage } from "../agents/usage.js";
import type { MoltbotConfig } from "../config/config.js";
import type { SessionEntry } from "../config/sessions/types.js";
import {
  resolveSessionFilePath,
  resolveSessionTranscriptsDirForAgent,
} from "../config/sessions/paths.js";
import type { SessionEntry } from "../config/sessions/types.js";
import { stripEnvelope, stripMessageIdHints } from "../shared/chat-envelope.js";
import { countToolResults, extractToolCallNames } from "../utils/transcript-tools.js";
import { estimateUsageCost, resolveModelCostConfig } from "../utils/usage-format.js";

type ParsedUsageEntry = {
  usage: NormalizedUsage;
  costTotal?: number;
  provider?: string;
  model?: string;
  timestamp?: Date;
};

export type CostUsageTotals = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
  missingCostEntries: number;
};

export type CostUsageDailyEntry = CostUsageTotals & {
  date: string;
};

export type CostUsageSummary = {
  updatedAt: number;
  days: number;
  daily: CostUsageDailyEntry[];
  totals: CostUsageTotals;
};

export type SessionCostSummary = CostUsageTotals & {
  sessionId?: string;
  sessionFile?: string;
  lastActivity?: number;
};

const emptyTotals = (): CostUsageTotals => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  totalCost: 0,
  missingCostEntries: 0,
});

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
};

const extractCostTotal = (usageRaw?: UsageLike | null): number | undefined => {
  if (!usageRaw || typeof usageRaw !== "object") return undefined;
  const record = usageRaw as Record<string, unknown>;
  const cost = record.cost as Record<string, unknown> | undefined;
  const total = toFiniteNumber(cost?.total);
  if (total === undefined) return undefined;
  if (total < 0) return undefined;
  return total;
};

const parseTimestamp = (entry: Record<string, unknown>): Date | undefined => {
  const raw = entry.timestamp;
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.valueOf())) return parsed;
  }
  const message = entry.message as Record<string, unknown> | undefined;
  const messageTimestamp = toFiniteNumber(message?.timestamp);
  if (messageTimestamp !== undefined) {
    const parsed = new Date(messageTimestamp);
    if (!Number.isNaN(parsed.valueOf())) return parsed;
  }
  return undefined;
};

const parseUsageEntry = (entry: Record<string, unknown>): ParsedUsageEntry | null => {
  const message = entry.message as Record<string, unknown> | undefined;
  const role = message?.role;
  if (role !== "assistant") return null;

  const usageRaw =
    (message?.usage as UsageLike | undefined) ?? (entry.usage as UsageLike | undefined);
  const usage = normalizeUsage(usageRaw);
  if (!usage) return null;

  const provider =
    (typeof message?.provider === "string" ? message?.provider : undefined) ??
    (typeof entry.provider === "string" ? entry.provider : undefined);
  const model =
    (typeof message?.model === "string" ? message?.model : undefined) ??
    (typeof entry.model === "string" ? entry.model : undefined);

  return {
    usage,
    costTotal: extractCostTotal(usageRaw),
    provider,
    model,
    timestamp: parseTimestamp(entry),
  };
};

const formatDayKey = (date: Date): string =>
  date.toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });

const applyUsageTotals = (totals: CostUsageTotals, usage: NormalizedUsage) => {
  totals.input += usage.input ?? 0;
  totals.output += usage.output ?? 0;
  totals.cacheRead += usage.cacheRead ?? 0;
  totals.cacheWrite += usage.cacheWrite ?? 0;
  const totalTokens =
    usage.total ??
    (usage.input ?? 0) + (usage.output ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0);
  totals.totalTokens += totalTokens;
};

const applyCostTotal = (totals: CostUsageTotals, costTotal: number | undefined) => {
  if (costTotal === undefined) {
    totals.missingCostEntries += 1;
    return;
  }
  totals.totalCost += costTotal;
};

async function scanUsageFile(params: {
  filePath: string;
  config?: MoltbotConfig;
  onEntry: (entry: ParsedUsageEntry) => void;
}): Promise<void> {
  const fileStream = fs.createReadStream(params.filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const entry = parseUsageEntry(parsed);
      if (!entry) continue;

      if (entry.costTotal === undefined) {
        const cost = resolveModelCostConfig({
          provider: entry.provider,
          model: entry.model,
          config: params.config,
        });
        entry.costTotal = estimateUsageCost({ usage: entry.usage, cost });
      }

      params.onEntry(entry);
    } catch {
      // Ignore malformed lines
    }
  }
}

export async function loadCostUsageSummary(params?: {
  days?: number;
  config?: MoltbotConfig;
  agentId?: string;
}): Promise<CostUsageSummary> {
  const days = Math.max(1, Math.floor(params?.days ?? 30));
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - (days - 1));
  const sinceTime = since.getTime();

  const dailyMap = new Map<string, CostUsageTotals>();
  const totals = emptyTotals();

  const sessionsDir = resolveSessionTranscriptsDirForAgent(params?.agentId);
  const entries = await fs.promises.readdir(sessionsDir, { withFileTypes: true }).catch(() => []);
  const files = (
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
        .map(async (entry) => {
          const filePath = path.join(sessionsDir, entry.name);
          const stats = await fs.promises.stat(filePath).catch(() => null);
          if (!stats) return null;
          if (stats.mtimeMs < sinceTime) return null;
          return filePath;
        }),
    )
  ).filter((filePath): filePath is string => Boolean(filePath));

  for (const filePath of files) {
    await scanUsageFile({
      filePath,
      config: params?.config,
      onEntry: (entry) => {
        const ts = entry.timestamp?.getTime();
        if (!ts || ts < sinceTime) return;
        const dayKey = formatDayKey(entry.timestamp ?? now);
        const bucket = dailyMap.get(dayKey) ?? emptyTotals();
        applyUsageTotals(bucket, entry.usage);
        applyCostTotal(bucket, entry.costTotal);
        dailyMap.set(dayKey, bucket);

        applyUsageTotals(totals, entry.usage);
        applyCostTotal(totals, entry.costTotal);
      },
    });
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, bucket]) => ({ date, ...bucket }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    updatedAt: Date.now(),
    days,
    daily,
    totals,
  };
}

export async function loadSessionCostSummary(params: {
  sessionId?: string;
  sessionEntry?: SessionEntry;
  sessionFile?: string;
  config?: MoltbotConfig;
}): Promise<SessionCostSummary | null> {
  const sessionFile =
    params.sessionFile ??
    (params.sessionId ? resolveSessionFilePath(params.sessionId, params.sessionEntry) : undefined);
  if (!sessionFile || !fs.existsSync(sessionFile)) return null;

  const totals = emptyTotals();
  let lastActivity: number | undefined;
  const activityDatesSet = new Set<string>();
  const dailyMap = new Map<string, { tokens: number; cost: number }>();
  const dailyMessageMap = new Map<string, SessionDailyMessageCounts>();
  const dailyLatencyMap = new Map<string, number[]>();
  const dailyModelUsageMap = new Map<string, SessionDailyModelUsage>();
  const messageCounts: SessionMessageCounts = {
    total: 0,
    user: 0,
    assistant: 0,
    toolCalls: 0,
    toolResults: 0,
    errors: 0,
  };
  const toolUsageMap = new Map<string, number>();
  const modelUsageMap = new Map<string, SessionModelUsage>();
  const errorStopReasons = new Set(["error", "aborted", "timeout"]);
  const latencyValues: number[] = [];
  let lastUserTimestamp: number | undefined;
  const MAX_LATENCY_MS = 12 * 60 * 60 * 1000;

  await scanTranscriptFile({
    filePath: sessionFile,
    config: params.config,
    onEntry: (entry) => {
      const ts = entry.timestamp?.getTime();

      // Filter by date range if specified
      if (params.startMs !== undefined && ts !== undefined && ts < params.startMs) {
        return;
      }
      if (params.endMs !== undefined && ts !== undefined && ts > params.endMs) {
        return;
      }

      if (ts !== undefined) {
        if (!firstActivity || ts < firstActivity) {
          firstActivity = ts;
        }
        if (!lastActivity || ts > lastActivity) {
          lastActivity = ts;
        }
      }

      if (entry.role === "user") {
        messageCounts.user += 1;
        messageCounts.total += 1;
        if (entry.timestamp) {
          lastUserTimestamp = entry.timestamp.getTime();
        }
      }
      if (entry.role === "assistant") {
        messageCounts.assistant += 1;
        messageCounts.total += 1;
        const ts = entry.timestamp?.getTime();
        if (ts !== undefined) {
          const latencyMs =
            entry.durationMs ??
            (lastUserTimestamp !== undefined ? Math.max(0, ts - lastUserTimestamp) : undefined);
          if (
            latencyMs !== undefined &&
            Number.isFinite(latencyMs) &&
            latencyMs <= MAX_LATENCY_MS
          ) {
            latencyValues.push(latencyMs);
            const dayKey = formatDayKey(entry.timestamp ?? new Date(ts));
            const dailyLatencies = dailyLatencyMap.get(dayKey) ?? [];
            dailyLatencies.push(latencyMs);
            dailyLatencyMap.set(dayKey, dailyLatencies);
          }
        }
      }

      if (entry.toolNames.length > 0) {
        messageCounts.toolCalls += entry.toolNames.length;
        for (const name of entry.toolNames) {
          toolUsageMap.set(name, (toolUsageMap.get(name) ?? 0) + 1);
        }
      }

      if (entry.toolResultCounts.total > 0) {
        messageCounts.toolResults += entry.toolResultCounts.total;
        messageCounts.errors += entry.toolResultCounts.errors;
      }

      if (entry.stopReason && errorStopReasons.has(entry.stopReason)) {
        messageCounts.errors += 1;
      }

      if (entry.timestamp) {
        const dayKey = formatDayKey(entry.timestamp);
        activityDatesSet.add(dayKey);
        const daily = dailyMessageMap.get(dayKey) ?? {
          date: dayKey,
          total: 0,
          user: 0,
          assistant: 0,
          toolCalls: 0,
          toolResults: 0,
          errors: 0,
        };
        daily.total += entry.role === "user" || entry.role === "assistant" ? 1 : 0;
        if (entry.role === "user") {
          daily.user += 1;
        } else if (entry.role === "assistant") {
          daily.assistant += 1;
        }
        daily.toolCalls += entry.toolNames.length;
        daily.toolResults += entry.toolResultCounts.total;
        daily.errors += entry.toolResultCounts.errors;
        if (entry.stopReason && errorStopReasons.has(entry.stopReason)) {
          daily.errors += 1;
        }
        dailyMessageMap.set(dayKey, daily);
      }

      if (!entry.usage) {
        return;
      }

      applyUsageTotals(totals, entry.usage);
      if (entry.costBreakdown?.total !== undefined) {
        applyCostBreakdown(totals, entry.costBreakdown);
      } else {
        applyCostTotal(totals, entry.costTotal);
      }

      if (entry.timestamp) {
        const dayKey = formatDayKey(entry.timestamp);
        const entryTokens =
          (entry.usage.input ?? 0) +
          (entry.usage.output ?? 0) +
          (entry.usage.cacheRead ?? 0) +
          (entry.usage.cacheWrite ?? 0);
        const entryCost =
          entry.costBreakdown?.total ??
          (entry.costBreakdown
            ? (entry.costBreakdown.input ?? 0) +
              (entry.costBreakdown.output ?? 0) +
              (entry.costBreakdown.cacheRead ?? 0) +
              (entry.costBreakdown.cacheWrite ?? 0)
            : (entry.costTotal ?? 0));

        const existing = dailyMap.get(dayKey) ?? { tokens: 0, cost: 0 };
        dailyMap.set(dayKey, {
          tokens: existing.tokens + entryTokens,
          cost: existing.cost + entryCost,
        });

        if (entry.provider || entry.model) {
          const modelKey = `${dayKey}::${entry.provider ?? "unknown"}::${entry.model ?? "unknown"}`;
          const dailyModel =
            dailyModelUsageMap.get(modelKey) ??
            ({
              date: dayKey,
              provider: entry.provider,
              model: entry.model,
              tokens: 0,
              cost: 0,
              count: 0,
            } as SessionDailyModelUsage);
          dailyModel.tokens += entryTokens;
          dailyModel.cost += entryCost;
          dailyModel.count += 1;
          dailyModelUsageMap.set(modelKey, dailyModel);
        }
      }

      if (entry.provider || entry.model) {
        const key = `${entry.provider ?? "unknown"}::${entry.model ?? "unknown"}`;
        const existing =
          modelUsageMap.get(key) ??
          ({
            provider: entry.provider,
            model: entry.model,
            count: 0,
            totals: emptyTotals(),
          } as SessionModelUsage);
        existing.count += 1;
        applyUsageTotals(existing.totals, entry.usage);
        if (entry.costBreakdown?.total !== undefined) {
          applyCostBreakdown(existing.totals, entry.costBreakdown);
        } else {
          applyCostTotal(existing.totals, entry.costTotal);
        }
        modelUsageMap.set(key, existing);
      }
    },
  });

  // Convert daily map to sorted array
  const dailyBreakdown: SessionDailyUsage[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, tokens: data.tokens, cost: data.cost }))
    .toSorted((a, b) => a.date.localeCompare(b.date));

  const dailyMessageCounts: SessionDailyMessageCounts[] = Array.from(
    dailyMessageMap.values(),
  ).toSorted((a, b) => a.date.localeCompare(b.date));

  const dailyLatency: SessionDailyLatency[] = Array.from(dailyLatencyMap.entries())
    .map(([date, values]) => {
      const stats = computeLatencyStats(values);
      if (!stats) {
        return null;
      }
      return { date, ...stats };
    })
    .filter((entry): entry is SessionDailyLatency => Boolean(entry))
    .toSorted((a, b) => a.date.localeCompare(b.date));

  const dailyModelUsage: SessionDailyModelUsage[] = Array.from(
    dailyModelUsageMap.values(),
  ).toSorted((a, b) => a.date.localeCompare(b.date) || b.cost - a.cost);

  const toolUsage: SessionToolUsage | undefined = toolUsageMap.size
    ? {
        totalCalls: Array.from(toolUsageMap.values()).reduce((sum, count) => sum + count, 0),
        uniqueTools: toolUsageMap.size,
        tools: Array.from(toolUsageMap.entries())
          .map(([name, count]) => ({ name, count }))
          .toSorted((a, b) => b.count - a.count),
      }
    : undefined;

  const modelUsage = modelUsageMap.size
    ? Array.from(modelUsageMap.values()).toSorted((a, b) => {
        const costDiff = b.totals.totalCost - a.totals.totalCost;
        if (costDiff !== 0) {
          return costDiff;
        }
        return b.totals.totalTokens - a.totals.totalTokens;
      })
    : undefined;

  return {
    sessionId: params.sessionId,
    sessionFile,
    firstActivity,
    lastActivity,
    durationMs:
      firstActivity !== undefined && lastActivity !== undefined
        ? Math.max(0, lastActivity - firstActivity)
        : undefined,
    activityDates: Array.from(activityDatesSet).toSorted(),
    dailyBreakdown,
    dailyMessageCounts,
    dailyLatency: dailyLatency.length ? dailyLatency : undefined,
    dailyModelUsage: dailyModelUsage.length ? dailyModelUsage : undefined,
    messageCounts,
    toolUsage,
    modelUsage,
    latency: computeLatencyStats(latencyValues),
    ...totals,
  };
}

export type SessionUsageTimePoint = {
  timestamp: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: number;
  cumulativeTokens: number;
  cumulativeCost: number;
};

export type SessionUsageTimeSeries = {
  sessionId?: string;
  points: SessionUsageTimePoint[];
};

export async function loadSessionUsageTimeSeries(params: {
  sessionId?: string;
  sessionEntry?: SessionEntry;
  sessionFile?: string;
  config?: OpenClawConfig;
  agentId?: string;
  maxPoints?: number;
}): Promise<SessionUsageTimeSeries | null> {
  const sessionFile =
    params.sessionFile ??
    (params.sessionId
      ? resolveSessionFilePath(params.sessionId, params.sessionEntry, {
          agentId: params.agentId,
        })
      : undefined);
  if (!sessionFile || !fs.existsSync(sessionFile)) {
    return null;
  }

  const points: SessionUsageTimePoint[] = [];
  let cumulativeTokens = 0;
  let cumulativeCost = 0;

  await scanUsageFile({
    filePath: sessionFile,
    config: params.config,
    onEntry: (entry) => {
      applyUsageTotals(totals, entry.usage);
      applyCostTotal(totals, entry.costTotal);
      const ts = entry.timestamp?.getTime();
      if (ts && (!lastActivity || ts > lastActivity)) {
        lastActivity = ts;
      }
    },
  });

  return {
    sessionId: params.sessionId,
    sessionFile,
    lastActivity,
    ...totals,
  };
}
