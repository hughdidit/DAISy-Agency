import { lookupContextTokens } from "../agents/context.js";
import { DEFAULT_CONTEXT_TOKENS } from "../agents/defaults.js";
import { loadConfig } from "../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
import { loadSessionStore, resolveStorePath, type SessionEntry } from "../config/sessions.js";
=======
import {
  loadSessionStore,
  resolveFreshSessionTotalTokens,
  resolveStorePath,
  type SessionEntry,
} from "../config/sessions.js";
<<<<<<< HEAD
import { classifySessionKey } from "../gateway/session-utils.js";
>>>>>>> 94eb50658 (refactor(sessions): reuse session key classifier)
=======
import { classifySessionKey, resolveSessionModelRef } from "../gateway/session-utils.js";
>>>>>>> 5c69e625f (fix(cli): display correct model for sub-agents in sessions list (#18660))
=======
import { loadSessionStore, resolveFreshSessionTotalTokens } from "../config/sessions.js";
import { classifySessionKey } from "../gateway/session-utils.js";
>>>>>>> eff3c5c70 (Session/Cron maintenance hardening and cleanup UX (#24753))
import { info } from "../globals.js";
import { parseAgentSessionKey } from "../routing/session-key.js";
import type { RuntimeEnv } from "../runtime.js";
import { isRich, theme } from "../terminal/theme.js";
import { resolveSessionStoreTargets } from "./session-store-targets.js";
import {
  formatSessionAgeCell,
  formatSessionFlagsCell,
  formatSessionKeyCell,
  formatSessionModelCell,
  resolveSessionDisplayDefaults,
  resolveSessionDisplayModel,
  SESSION_AGE_PAD,
  SESSION_KEY_PAD,
  SESSION_MODEL_PAD,
  type SessionDisplayRow,
  toSessionDisplayRows,
} from "./sessions-table.js";

type SessionRow = SessionDisplayRow & {
  agentId: string;
  kind: "direct" | "group" | "global" | "unknown";
<<<<<<< HEAD
  updatedAt: number | null;
  ageMs: number | null;
  sessionId?: string;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  thinkingLevel?: string;
  verboseLevel?: string;
  reasoningLevel?: string;
  elevatedLevel?: string;
  responseUsage?: string;
  groupActivation?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  modelProvider?: string;
  providerOverride?: string;
  modelOverride?: string;
  contextTokens?: number;
=======
>>>>>>> eff3c5c70 (Session/Cron maintenance hardening and cleanup UX (#24753))
};

const AGENT_PAD = 10;
const KIND_PAD = 6;
const TOKENS_PAD = 20;

const formatKTokens = (value: number) => `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;

const colorByPct = (label: string, pct: number | null, rich: boolean) => {
  if (!rich || pct === null) {
    return label;
  }
  if (pct >= 95) {
    return theme.error(label);
  }
  if (pct >= 80) {
    return theme.warn(label);
  }
  if (pct >= 60) {
    return theme.success(label);
  }
  return theme.muted(label);
};

const formatTokensCell = (total: number, contextTokens: number | null, rich: boolean) => {
  if (!total) {
    return "-".padEnd(TOKENS_PAD);
  }
  const totalLabel = formatKTokens(total);
  const ctxLabel = contextTokens ? formatKTokens(contextTokens) : "?";
  const pct = contextTokens ? Math.min(999, Math.round((total / contextTokens) * 100)) : null;
  const label = `${totalLabel}/${ctxLabel} (${pct ?? "?"}%)`;
  const padded = label.padEnd(TOKENS_PAD);
  return colorByPct(padded, pct, rich);
};

const formatKindCell = (kind: SessionRow["kind"], rich: boolean) => {
  const label = kind.padEnd(KIND_PAD);
  if (!rich) {
    return label;
  }
  if (kind === "group") {
    return theme.accentBright(label);
  }
  if (kind === "global") {
    return theme.warn(label);
  }
  if (kind === "direct") {
    return theme.accent(label);
  }
  return theme.muted(label);
};

<<<<<<< HEAD
const formatAgeCell = (updatedAt: number | null | undefined, rich: boolean) => {
  const ageLabel = updatedAt ? formatTimeAgo(Date.now() - updatedAt) : "unknown";
  const padded = ageLabel.padEnd(AGE_PAD);
  return rich ? theme.muted(padded) : padded;
};

const formatModelCell = (model: string | null | undefined, rich: boolean) => {
  const label = (model ?? "unknown").padEnd(MODEL_PAD);
  return rich ? theme.info(label) : label;
};

const formatFlagsCell = (row: SessionRow, rich: boolean) => {
  const flags = [
    row.thinkingLevel ? `think:${row.thinkingLevel}` : null,
    row.verboseLevel ? `verbose:${row.verboseLevel}` : null,
    row.reasoningLevel ? `reasoning:${row.reasoningLevel}` : null,
    row.elevatedLevel ? `elev:${row.elevatedLevel}` : null,
    row.responseUsage ? `usage:${row.responseUsage}` : null,
    row.groupActivation ? `activation:${row.groupActivation}` : null,
    row.systemSent ? "system" : null,
    row.abortedLastRun ? "aborted" : null,
    row.sessionId ? `id:${row.sessionId}` : null,
  ].filter(Boolean);
  const label = flags.join(" ");
  return label.length === 0 ? "" : rich ? theme.muted(label) : label;
};

function toRows(store: Record<string, SessionEntry>): SessionRow[] {
  return Object.entries(store)
    .map(([key, entry]) => {
      const updatedAt = entry?.updatedAt ?? null;
      return {
        key,
        kind: classifySessionKey(key, entry),
        updatedAt,
        ageMs: updatedAt ? Date.now() - updatedAt : null,
        sessionId: entry?.sessionId,
        systemSent: entry?.systemSent,
        abortedLastRun: entry?.abortedLastRun,
        thinkingLevel: entry?.thinkingLevel,
        verboseLevel: entry?.verboseLevel,
        reasoningLevel: entry?.reasoningLevel,
        elevatedLevel: entry?.elevatedLevel,
        responseUsage: entry?.responseUsage,
        groupActivation: entry?.groupActivation,
        inputTokens: entry?.inputTokens,
        outputTokens: entry?.outputTokens,
        totalTokens: entry?.totalTokens,
        model: entry?.model,
        modelProvider: entry?.modelProvider,
        providerOverride: entry?.providerOverride,
        modelOverride: entry?.modelOverride,
        contextTokens: entry?.contextTokens,
      } satisfies SessionRow;
    })
    .toSorted((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

=======
>>>>>>> eff3c5c70 (Session/Cron maintenance hardening and cleanup UX (#24753))
export async function sessionsCommand(
  opts: { json?: boolean; store?: string; active?: string; agent?: string; allAgents?: boolean },
  runtime: RuntimeEnv,
) {
  const aggregateAgents = opts.allAgents === true;
  const cfg = loadConfig();
  const displayDefaults = resolveSessionDisplayDefaults(cfg);
  const configContextTokens =
    cfg.agents?.defaults?.contextTokens ??
    lookupContextTokens(displayDefaults.model) ??
    DEFAULT_CONTEXT_TOKENS;
  let targets: ReturnType<typeof resolveSessionStoreTargets>;
  try {
    targets = resolveSessionStoreTargets(cfg, {
      store: opts.store,
      agent: opts.agent,
      allAgents: opts.allAgents,
    });
  } catch (error) {
    runtime.error(error instanceof Error ? error.message : String(error));
    runtime.exit(1);
    return;
  }

  let activeMinutes: number | undefined;
  if (opts.active !== undefined) {
    const parsed = Number.parseInt(String(opts.active), 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      runtime.error("--active must be a positive integer (minutes)");
      runtime.exit(1);
      return;
    }
    activeMinutes = parsed;
  }

  const rows = targets
    .flatMap((target) => {
      const store = loadSessionStore(target.storePath);
      return toSessionDisplayRows(store).map((row) => ({
        ...row,
        agentId: parseAgentSessionKey(row.key)?.agentId ?? target.agentId,
        kind: classifySessionKey(row.key, store[row.key]),
      }));
    })
    .filter((row) => {
      if (activeMinutes === undefined) {
        return true;
      }
      if (!row.updatedAt) {
        return false;
      }
      return Date.now() - row.updatedAt <= activeMinutes * 60_000;
    })
    .toSorted((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  if (opts.json) {
    const multi = targets.length > 1;
    const aggregate = aggregateAgents || multi;
    runtime.log(
      JSON.stringify(
        {
          path: aggregate ? null : (targets[0]?.storePath ?? null),
          stores: aggregate
            ? targets.map((target) => ({
                agentId: target.agentId,
                path: target.storePath,
              }))
            : undefined,
          allAgents: aggregateAgents ? true : undefined,
          count: rows.length,
          activeMinutes: activeMinutes ?? null,
<<<<<<< HEAD
          sessions: rows.map((r) => ({
            ...r,
            contextTokens:
              r.contextTokens ?? lookupContextTokens(r.model) ?? configContextTokens ?? null,
            model: r.model ?? configModel ?? null,
          })),
=======
          sessions: rows.map((r) => {
            const model = resolveSessionDisplayModel(cfg, r, displayDefaults);
            return {
              ...r,
              totalTokens: resolveFreshSessionTotalTokens(r) ?? null,
              totalTokensFresh:
                typeof r.totalTokens === "number" ? r.totalTokensFresh !== false : false,
              contextTokens:
                r.contextTokens ?? lookupContextTokens(model) ?? configContextTokens ?? null,
              model,
            };
          }),
>>>>>>> 5c69e625f (fix(cli): display correct model for sub-agents in sessions list (#18660))
        },
        null,
        2,
      ),
    );
    return;
  }

  if (targets.length === 1 && !aggregateAgents) {
    runtime.log(info(`Session store: ${targets[0]?.storePath}`));
  } else {
    runtime.log(
      info(`Session stores: ${targets.length} (${targets.map((t) => t.agentId).join(", ")})`),
    );
  }
  runtime.log(info(`Sessions listed: ${rows.length}`));
  if (activeMinutes) {
    runtime.log(info(`Filtered to last ${activeMinutes} minute(s)`));
  }
  if (rows.length === 0) {
    runtime.log("No sessions found.");
    return;
  }

  const rich = isRich();
  const showAgentColumn = aggregateAgents || targets.length > 1;
  const header = [
    ...(showAgentColumn ? ["Agent".padEnd(AGENT_PAD)] : []),
    "Kind".padEnd(KIND_PAD),
    "Key".padEnd(SESSION_KEY_PAD),
    "Age".padEnd(SESSION_AGE_PAD),
    "Model".padEnd(SESSION_MODEL_PAD),
    "Tokens (ctx %)".padEnd(TOKENS_PAD),
    "Flags",
  ].join(" ");

  runtime.log(rich ? theme.heading(header) : header);

  for (const row of rows) {
    const model = resolveSessionDisplayModel(cfg, row, displayDefaults);
    const contextTokens = row.contextTokens ?? lookupContextTokens(model) ?? configContextTokens;
    const input = row.inputTokens ?? 0;
    const output = row.outputTokens ?? 0;
    const total = row.totalTokens ?? input + output;

    const line = [
      ...(showAgentColumn
        ? [rich ? theme.accentBright(row.agentId.padEnd(AGENT_PAD)) : row.agentId.padEnd(AGENT_PAD)]
        : []),
      formatKindCell(row.kind, rich),
      formatSessionKeyCell(row.key, rich),
      formatSessionAgeCell(row.updatedAt, rich),
      formatSessionModelCell(model, rich),
      formatTokensCell(total, contextTokens ?? null, rich),
      formatSessionFlagsCell(row, rich),
    ].join(" ");

    runtime.log(line.trimEnd());
  }
}
