import { createHash } from "node:crypto";
import type { KanbanLaneId, KanbanPriority } from "./types.js";

export type TrelloImportFormat = "json" | "csv";

export type ParsedTrelloImportCard = {
  sourceCardId: string;
  title: string;
  description?: string;
  lane: KanbanLaneId;
  priority: KanbanPriority;
  labels: string[];
  dueAt?: Date;
  links: string[];
  position?: number;
  warnings: string[];
};

export type ParsedTrelloImport = {
  sourceHash: string;
  cards: ParsedTrelloImportCard[];
  warnings: string[];
};

type TrelloJsonList = {
  id?: unknown;
  name?: unknown;
};

type TrelloJsonLabel = {
  name?: unknown;
  color?: unknown;
};

type TrelloJsonCard = {
  id?: unknown;
  shortLink?: unknown;
  name?: unknown;
  desc?: unknown;
  idList?: unknown;
  closed?: unknown;
  due?: unknown;
  labels?: unknown;
  url?: unknown;
  shortUrl?: unknown;
  pos?: unknown;
};

type CsvRow = Record<string, string>;

const MAX_LABELS = 50;
const MAX_CARDS = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sourceHash(format: TrelloImportFormat, content: string): string {
  return createHash("sha256").update(format).update("\0").update(content).digest("hex");
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeLane(value: unknown): KanbanLaneId {
  const normalized = normalizeText(value)?.toLowerCase() ?? "";
  if (/\b(done|complete|completed|shipped|closed)\b/.test(normalized)) {
    return "done";
  }
  if (/\b(review|qa|verify|validation)\b/.test(normalized)) {
    return "review";
  }
  if (/\b(progress|doing|active|started|working)\b/.test(normalized)) {
    return "in_progress";
  }
  return "todo";
}

function normalizePriority(labels: string[], explicit?: unknown): KanbanPriority {
  const candidate = normalizeText(explicit)?.toLowerCase();
  if (
    candidate === "urgent" ||
    candidate === "high" ||
    candidate === "normal" ||
    candidate === "low"
  ) {
    return candidate;
  }
  const text = labels.join(" ").toLowerCase();
  if (/\burgent\b|\bcritical\b|\bp0\b/.test(text)) {
    return "urgent";
  }
  if (/\bhigh\b|\bp1\b/.test(text)) {
    return "high";
  }
  if (/\blow\b|\bp3\b/.test(text)) {
    return "low";
  }
  return "normal";
}

function parseDate(value: unknown, warnings: string[], fieldName: string): Date | undefined {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    warnings.push(`${fieldName} is not a valid date-time`);
    return undefined;
  }
  return date;
}

function parseOptionalNumber(value: unknown): number | undefined {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= MAX_LABELS) {
      break;
    }
  }
  return result;
}

function parseJsonLabels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueLabels(
    value.flatMap((label: TrelloJsonLabel) => {
      const name = normalizeText(label?.name);
      const color = normalizeText(label?.color);
      return name ? [name] : color ? [color] : [];
    }),
  );
}

function parseDelimitedLabels(value: unknown): string[] {
  const text = normalizeText(value);
  if (!text) {
    return [];
  }
  return uniqueLabels(text.split(/[;,|]/));
}

function parseJsonImport(content: string, hash: string): ParsedTrelloImportCard[] {
  const parsed = JSON.parse(content) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Trello JSON import content must be an object");
  }
  if (!Array.isArray(parsed.cards)) {
    throw new Error("Trello JSON import content must include a cards array");
  }
  const listNames = new Map<string, string>();
  if (Array.isArray(parsed.lists)) {
    for (const candidate of parsed.lists) {
      if (!isRecord(candidate)) {
        continue;
      }
      const list = candidate as TrelloJsonList;
      const id = normalizeText(list.id);
      const name = normalizeText(list.name);
      if (id && name) {
        listNames.set(id, name);
      }
    }
  }
  return parsed.cards.map((candidate, index) => {
    const card = isRecord(candidate) ? (candidate as TrelloJsonCard) : {};
    const warnings: string[] = [];
    const sourceCardId = normalizeText(card.id) ?? normalizeText(card.shortLink);
    const title = normalizeText(card.name);
    if (!isRecord(candidate)) {
      warnings.push("invalid Trello card entry; card skipped during run");
    }
    if (card.closed === true) {
      warnings.push("archived Trello card; card skipped during run");
    }
    if (!sourceCardId) {
      warnings.push("missing Trello card id; generated stable row id");
    }
    if (!title) {
      warnings.push("missing Trello card title; card skipped during run");
    }
    const labels = parseJsonLabels(card.labels);
    const listName = typeof card.idList === "string" ? listNames.get(card.idList) : undefined;
    const links = [normalizeText(card.url), normalizeText(card.shortUrl)].filter(
      (value): value is string => value !== undefined,
    );
    return {
      sourceCardId: sourceCardId ?? `json-${hash.slice(0, 12)}-${String(index + 1)}`,
      title: title ?? `Untitled Trello card ${String(index + 1)}`,
      description: normalizeText(card.desc),
      lane: normalizeLane(listName),
      priority: normalizePriority(labels),
      labels,
      dueAt: parseDate(card.due, warnings, "due"),
      links,
      position: typeof card.pos === "number" && Number.isFinite(card.pos) ? card.pos : undefined,
      warnings,
    };
  });
}

function parseCsvRows(content: string): CsvRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);
  const [headers, ...dataRows] = rows.filter((columns) => columns.some((column) => column.trim()));
  if (!headers) {
    return [];
  }
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  return dataRows.map((columns) => {
    const record: CsvRow = {};
    for (const [index, header] of normalizedHeaders.entries()) {
      record[header] = columns[index]?.trim() ?? "";
    }
    return record;
  });
}

function firstCsv(row: CsvRow, names: string[]): string | undefined {
  for (const name of names) {
    const value = normalizeText(row[name]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function parseCsvImport(content: string, hash: string): ParsedTrelloImportCard[] {
  return parseCsvRows(content).map((row, index) => {
    const warnings: string[] = [];
    const sourceCardId = firstCsv(row, ["sourcecardid", "source card id", "trello id", "id"]);
    const title = firstCsv(row, ["title", "name", "card name"]);
    if (!sourceCardId) {
      warnings.push("missing Trello card id; generated stable row id");
    }
    if (!title) {
      warnings.push("missing Trello card title; card skipped during run");
    }
    const labels = parseDelimitedLabels(firstCsv(row, ["labels", "label", "tags"]));
    const dueAt = parseDate(firstCsv(row, ["due", "due date", "duedate"]), warnings, "due");
    return {
      sourceCardId: sourceCardId ?? `csv-${hash.slice(0, 12)}-${String(index + 1)}`,
      title: title ?? `Untitled Trello card ${String(index + 1)}`,
      description: firstCsv(row, ["description", "desc"]),
      lane: normalizeLane(firstCsv(row, ["lane", "list", "status"])),
      priority: normalizePriority(labels, firstCsv(row, ["priority"])),
      labels,
      dueAt,
      links: [firstCsv(row, ["url", "link"])].filter(
        (value): value is string => value !== undefined,
      ),
      position: parseOptionalNumber(firstCsv(row, ["position", "pos"])),
      warnings,
    };
  });
}

export function parseTrelloImport(params: {
  format: TrelloImportFormat;
  content: string;
}): ParsedTrelloImport {
  const content = params.content.trim();
  if (!content) {
    throw new Error("Trello import content must not be blank");
  }
  const hash = sourceHash(params.format, content);
  const cards =
    params.format === "json" ? parseJsonImport(content, hash) : parseCsvImport(content, hash);
  const warnings: string[] = [];
  if (cards.length > MAX_CARDS) {
    warnings.push(`import preview is limited to ${String(MAX_CARDS)} cards`);
  }
  const limitedCards = cards.slice(0, MAX_CARDS);
  if (!limitedCards.length) {
    warnings.push("import content did not contain any cards");
  }
  return {
    sourceHash: hash,
    cards: limitedCards,
    warnings,
  };
}
