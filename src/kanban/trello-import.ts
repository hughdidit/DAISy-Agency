import { createHash } from "node:crypto";
import type { KanbanActorEnvelope, KanbanLaneId, KanbanPriority } from "./types.js";

export type TrelloImportFormat = "json" | "csv";

export type ParsedTrelloImportCard = {
  sourceCardId: string;
  sourceBoardId?: string;
  sourceListId?: string;
  sourceUrl?: string;
  title: string;
  description?: string;
  lane: KanbanLaneId;
  priority: KanbanPriority;
  assignee?: string;
  labels: string[];
  dueAt?: Date;
  checklist: ParsedTrelloChecklistItem[];
  comments: ParsedTrelloComment[];
  links: string[];
  attachments: ParsedTrelloAttachment[];
  watchers: string[];
  customFields: Record<string, unknown>;
  position?: number;
  warnings: string[];
};

export type ParsedTrelloChecklistItem = {
  sourceId: string;
  text: string;
  checked: boolean;
  position: number;
};

export type ParsedTrelloComment = {
  sourceId: string;
  body: string;
  actor: KanbanActorEnvelope;
  createdAt?: Date;
};

export type ParsedTrelloAttachment = {
  sourceId: string;
  fileName: string;
  url?: string;
  contentType?: string;
  sizeBytes: number;
  createdAt?: Date;
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
  idBoard?: unknown;
  name?: unknown;
  desc?: unknown;
  idList?: unknown;
  idMembers?: unknown;
  closed?: unknown;
  due?: unknown;
  labels?: unknown;
  url?: unknown;
  shortUrl?: unknown;
  pos?: unknown;
  attachments?: unknown;
  customFieldItems?: unknown;
};

type TrelloJsonMember = {
  id?: unknown;
  fullName?: unknown;
  username?: unknown;
  initials?: unknown;
};

type TrelloJsonCheckItem = {
  id?: unknown;
  name?: unknown;
  state?: unknown;
  pos?: unknown;
};

type TrelloJsonChecklist = {
  idCard?: unknown;
  checkItems?: unknown;
};

type TrelloJsonAction = {
  id?: unknown;
  type?: unknown;
  date?: unknown;
  data?: unknown;
  memberCreator?: unknown;
};

type TrelloJsonAttachment = {
  id?: unknown;
  name?: unknown;
  url?: unknown;
  bytes?: unknown;
  mimeType?: unknown;
  date?: unknown;
};

type TrelloJsonCustomField = {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  options?: unknown;
};

type TrelloJsonCustomFieldItem = {
  idCustomField?: unknown;
  idValue?: unknown;
  value?: unknown;
};

type CsvRow = Record<string, string>;
type CardLookup<T> = {
  items: Map<string, T[]>;
  warnings: Map<string, string[]>;
};

const MAX_LABELS = 50;
const MAX_CARDS = 1000;
const MAX_SOURCE_ID_LENGTH = 256;
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_LABEL_LENGTH = 100;
const MAX_LINKS = 20;
const MAX_LINK_LENGTH = 2048;
const MAX_CHECKLIST_ITEMS = 200;
const MAX_COMMENTS = 200;
const MAX_ATTACHMENTS = 100;
const MAX_WATCHERS = 100;
const MAX_CUSTOM_FIELDS = 50;
const MAX_COMMENT_LENGTH = 4000;
const MAX_ATTACHMENT_NAME_LENGTH = 255;
const MAX_WATCHER_LENGTH = 120;

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

function truncateText(
  value: string | undefined,
  maxLength: number,
  warnings: string[],
  fieldName: string,
): string | undefined {
  if (value === undefined || value.length <= maxLength) {
    return value;
  }
  warnings.push(`${fieldName} was truncated to ${String(maxLength)} characters`);
  return value.slice(0, maxLength);
}

function normalizeSourceCardId(
  value: string | undefined,
  fallback: string,
  warnings: string[],
): string {
  if (!value) {
    warnings.push("missing Trello card id; generated stable row id");
    return fallback;
  }
  if (value.length <= MAX_SOURCE_ID_LENGTH) {
    return value;
  }
  warnings.push(`Trello card id was shortened to ${String(MAX_SOURCE_ID_LENGTH)} characters`);
  const suffix = createHash("sha256").update(value).digest("hex").slice(0, 24);
  return `${value.slice(0, MAX_SOURCE_ID_LENGTH - suffix.length - 1)}-${suffix}`;
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
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function hasOwnKey(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim().slice(0, MAX_LABEL_LENGTH);
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

function uniqueStrings(values: string[], maxItems: number, maxLength: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim().slice(0, maxLength);
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= maxItems) {
      break;
    }
  }
  return result;
}

function normalizeLinks(values: Array<string | undefined>, warnings: string[]): string[] {
  const links: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    const link = truncateText(value, MAX_LINK_LENGTH, warnings, "link");
    if (link) {
      links.push(link);
    }
    if (links.length >= MAX_LINKS) {
      break;
    }
  }
  return links;
}

function buildMemberLookup(value: unknown): Map<string, string> {
  const members = new Map<string, string>();
  if (!Array.isArray(value)) {
    return members;
  }
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      continue;
    }
    const member = candidate as TrelloJsonMember;
    const id = normalizeText(member.id);
    const label =
      normalizeText(member.fullName) ??
      normalizeText(member.username) ??
      normalizeText(member.initials) ??
      id;
    if (id && label) {
      members.set(id, label);
    }
  }
  return members;
}

function parseJsonCardWatchers(value: unknown, members: Map<string, string>): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value.flatMap((candidate) => {
      const id = normalizeText(candidate);
      if (!id) {
        return [];
      }
      return [members.get(id) ?? id];
    }),
    MAX_WATCHERS,
    MAX_WATCHER_LENGTH,
  );
}

function parseDelimitedStrings(
  value: unknown,
  maxItems: number,
  maxLength: number,
  delimiter: RegExp | string = /[;\n]/,
): string[] {
  const text = normalizeText(value);
  if (!text) {
    return [];
  }
  return uniqueStrings(text.split(delimiter), maxItems, maxLength);
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

function appendLookupWarnings(warnings: Map<string, string[]>, cardId: string, values: string[]) {
  if (values.length === 0) {
    return;
  }
  const existing = warnings.get(cardId) ?? [];
  warnings.set(cardId, [...existing, ...values]);
}

function buildChecklistLookup(value: unknown): CardLookup<ParsedTrelloChecklistItem> {
  const itemsByCard = new Map<string, ParsedTrelloChecklistItem[]>();
  const warningsByCard = new Map<string, string[]>();
  if (!Array.isArray(value)) {
    return { items: itemsByCard, warnings: warningsByCard };
  }
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      continue;
    }
    const checklist = candidate as TrelloJsonChecklist;
    const cardId = normalizeText(checklist.idCard);
    if (!cardId || !Array.isArray(checklist.checkItems)) {
      continue;
    }
    const items = itemsByCard.get(cardId) ?? [];
    for (const itemCandidate of checklist.checkItems) {
      if (!isRecord(itemCandidate) || items.length >= MAX_CHECKLIST_ITEMS) {
        continue;
      }
      const item = itemCandidate as TrelloJsonCheckItem;
      const itemWarnings: string[] = [];
      const text = truncateText(
        normalizeText(item.name),
        MAX_TITLE_LENGTH,
        itemWarnings,
        "checklist item",
      );
      appendLookupWarnings(warningsByCard, cardId, itemWarnings);
      if (!text) {
        continue;
      }
      const sourceId = normalizeText(item.id) ?? `check-${cardId}-${String(items.length + 1)}`;
      items.push({
        sourceId,
        text,
        checked: normalizeText(item.state)?.toLowerCase() === "complete",
        position: parseOptionalNumber(item.pos) ?? items.length,
      });
    }
    itemsByCard.set(cardId, items);
  }
  return { items: itemsByCard, warnings: warningsByCard };
}

function actorFromTrelloMember(value: unknown): KanbanActorEnvelope {
  if (!isRecord(value)) {
    return { type: "import", id: "trello" };
  }
  const member = value as TrelloJsonMember;
  const id = normalizeText(member.id) ?? normalizeText(member.username) ?? "trello";
  const name = normalizeText(member.fullName) ?? normalizeText(member.username);
  return name ? { type: "import", id, name } : { type: "import", id };
}

function buildCommentLookup(value: unknown): CardLookup<ParsedTrelloComment> {
  const itemsByCard = new Map<string, ParsedTrelloComment[]>();
  const warningsByCard = new Map<string, string[]>();
  if (!Array.isArray(value)) {
    return { items: itemsByCard, warnings: warningsByCard };
  }
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      continue;
    }
    const action = candidate as TrelloJsonAction;
    if (normalizeText(action.type) !== "commentCard" || !isRecord(action.data)) {
      continue;
    }
    const data = action.data as { card?: unknown; text?: unknown };
    if (!isRecord(data.card)) {
      continue;
    }
    const cardId = normalizeText((data.card as { id?: unknown }).id);
    if (!cardId) {
      continue;
    }
    const commentWarnings: string[] = [];
    const body = truncateText(
      normalizeText(data.text),
      MAX_COMMENT_LENGTH,
      commentWarnings,
      "comment",
    );
    appendLookupWarnings(warningsByCard, cardId, commentWarnings);
    if (!cardId || !body) {
      continue;
    }
    const comments = itemsByCard.get(cardId) ?? [];
    if (comments.length >= MAX_COMMENTS) {
      continue;
    }
    const dateWarnings: string[] = [];
    const createdAt = parseDate(action.date, dateWarnings, "comment date");
    appendLookupWarnings(warningsByCard, cardId, dateWarnings);
    comments.push({
      sourceId: normalizeText(action.id) ?? `comment-${cardId}-${String(comments.length + 1)}`,
      body,
      actor: actorFromTrelloMember(action.memberCreator),
      createdAt,
    });
    itemsByCard.set(cardId, comments);
  }
  return { items: itemsByCard, warnings: warningsByCard };
}

function parseJsonAttachments(value: unknown, warnings: string[]): ParsedTrelloAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const attachments: ParsedTrelloAttachment[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate) || attachments.length >= MAX_ATTACHMENTS) {
      continue;
    }
    const attachment = candidate as TrelloJsonAttachment;
    const url = truncateText(
      normalizeText(attachment.url),
      MAX_LINK_LENGTH,
      warnings,
      "attachment url",
    );
    const fileName =
      truncateText(
        normalizeText(attachment.name),
        MAX_ATTACHMENT_NAME_LENGTH,
        warnings,
        "attachment name",
      ) ??
      truncateText(url, MAX_ATTACHMENT_NAME_LENGTH, warnings, "attachment name") ??
      `Trello attachment ${String(attachments.length + 1)}`;
    attachments.push({
      sourceId: normalizeText(attachment.id) ?? `attachment-${String(attachments.length + 1)}`,
      fileName,
      url,
      contentType: normalizeText(attachment.mimeType),
      sizeBytes: Math.max(0, Math.trunc(parseOptionalNumber(attachment.bytes) ?? 0)),
      createdAt: parseDate(attachment.date, warnings, "attachment date"),
    });
  }
  return attachments;
}

function customFieldValue(value: unknown): unknown {
  if (!isRecord(value)) {
    return undefined;
  }
  for (const key of ["text", "number", "date", "checked"]) {
    const field = value[key];
    if (field !== undefined && field !== null) {
      if (typeof field === "string") {
        return normalizeText(field);
      }
      if (typeof field === "number" || typeof field === "boolean") {
        return String(field);
      }
    }
  }
  return undefined;
}

function customFieldOptionValue(
  definition: TrelloJsonCustomField | undefined,
  idValue: unknown,
): unknown {
  const selectedId = normalizeText(idValue);
  if (!selectedId) {
    return undefined;
  }
  if (!Array.isArray(definition?.options)) {
    return selectedId;
  }
  for (const optionCandidate of definition.options) {
    if (!isRecord(optionCandidate)) {
      continue;
    }
    if (normalizeText(optionCandidate.id) !== selectedId) {
      continue;
    }
    return (
      customFieldValue(optionCandidate.value) ??
      normalizeText(optionCandidate.text) ??
      normalizeText(optionCandidate.name) ??
      selectedId
    );
  }
  return selectedId;
}

function buildCustomFieldLookup(value: unknown): Map<string, TrelloJsonCustomField> {
  const fields = new Map<string, TrelloJsonCustomField>();
  if (!Array.isArray(value)) {
    return fields;
  }
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      continue;
    }
    const field = candidate as TrelloJsonCustomField;
    const id = normalizeText(field.id);
    if (id) {
      fields.set(id, field);
    }
  }
  return fields;
}

function parseJsonCustomFields(
  value: unknown,
  fieldLookup: Map<string, TrelloJsonCustomField>,
): Record<string, unknown> {
  if (!Array.isArray(value)) {
    return {};
  }
  const customFields: Record<string, unknown> = {};
  for (const candidate of value) {
    if (!isRecord(candidate) || Object.keys(customFields).length >= MAX_CUSTOM_FIELDS) {
      continue;
    }
    const item = candidate as TrelloJsonCustomFieldItem;
    const fieldId = normalizeText(item.idCustomField);
    if (!fieldId) {
      continue;
    }
    const definition = fieldLookup.get(fieldId);
    const key = normalizeText(definition?.name) ?? fieldId;
    const valueFromPayload =
      customFieldValue(item.value) ?? customFieldOptionValue(definition, item.idValue);
    if (valueFromPayload !== undefined) {
      customFields[key] = valueFromPayload;
    }
  }
  return customFields;
}

function trelloMetadataKey(customFields: Record<string, unknown>): "trello" | "trelloImport" {
  return hasOwnKey(customFields, "trello") ? "trelloImport" : "trello";
}

function buildTrelloCustomFieldMetadata(params: {
  sourceListId?: string;
  listName?: string;
  memberIds: string[];
  attachmentCount: number;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    memberIds: params.memberIds,
    attachmentCount: params.attachmentCount,
  };
  if (params.sourceListId) {
    metadata.listId = params.sourceListId;
  }
  if (params.listName) {
    metadata.listName = params.listName;
  }
  return metadata;
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
  const members = buildMemberLookup(parsed.members);
  const checklists = buildChecklistLookup(parsed.checklists);
  const comments = buildCommentLookup(parsed.actions);
  const customFields = buildCustomFieldLookup(parsed.customFields);
  const sourceBoardId = normalizeText(parsed.id);
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
    if (!title) {
      warnings.push("missing Trello card title; card skipped during run");
    }
    if (sourceCardId) {
      warnings.push(...(checklists.warnings.get(sourceCardId) ?? []));
      warnings.push(...(comments.warnings.get(sourceCardId) ?? []));
    }
    const labels = parseJsonLabels(card.labels);
    const sourceListId = normalizeText(card.idList);
    const listName = sourceListId ? listNames.get(sourceListId) : undefined;
    const sourceUrl = truncateText(
      normalizeText(card.url) ?? normalizeText(card.shortUrl),
      MAX_LINK_LENGTH,
      warnings,
      "source url",
    );
    const attachments = parseJsonAttachments(card.attachments, warnings);
    const links = normalizeLinks(
      [
        normalizeText(card.url),
        normalizeText(card.shortUrl),
        ...attachments.map((item) => item.url),
      ],
      warnings,
    );
    const watchers = parseJsonCardWatchers(card.idMembers, members);
    return {
      sourceBoardId: normalizeText(card.idBoard) ?? sourceBoardId,
      sourceListId,
      sourceCardId: normalizeSourceCardId(
        sourceCardId,
        `json-${hash.slice(0, 12)}-${String(index + 1)}`,
        warnings,
      ),
      sourceUrl,
      title:
        truncateText(title, MAX_TITLE_LENGTH, warnings, "title") ??
        `Untitled Trello card ${String(index + 1)}`,
      description: truncateText(
        normalizeText(card.desc),
        MAX_DESCRIPTION_LENGTH,
        warnings,
        "description",
      ),
      lane: normalizeLane(listName),
      priority: normalizePriority(labels),
      assignee: watchers[0],
      labels,
      dueAt: parseDate(card.due, warnings, "due"),
      checklist: sourceCardId ? (checklists.items.get(sourceCardId) ?? []) : [],
      comments: sourceCardId ? (comments.items.get(sourceCardId) ?? []) : [],
      links,
      attachments,
      watchers,
      customFields: (() => {
        const parsedCustomFields = parseJsonCustomFields(card.customFieldItems, customFields);
        return {
          ...parsedCustomFields,
          [trelloMetadataKey(parsedCustomFields)]: buildTrelloCustomFieldMetadata({
            sourceListId,
            listName,
            memberIds: Array.isArray(card.idMembers)
              ? card.idMembers.flatMap((member) => {
                  const id = normalizeText(member);
                  return id ? [id] : [];
                })
              : [],
            attachmentCount: attachments.length,
          }),
        };
      })(),
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
    if (!title) {
      warnings.push("missing Trello card title; card skipped during run");
    }
    const labels = parseDelimitedLabels(firstCsv(row, ["labels", "label", "tags"]));
    const dueAt = parseDate(firstCsv(row, ["due", "due date", "duedate"]), warnings, "due");
    const watchers = parseDelimitedStrings(
      firstCsv(row, ["watchers", "members", "member", "idmembers"]),
      MAX_WATCHERS,
      MAX_WATCHER_LENGTH,
      /[;,|\n]/,
    );
    const checklist = parseDelimitedStrings(
      firstCsv(row, ["checklist", "check items", "checkitems"]),
      MAX_CHECKLIST_ITEMS,
      MAX_TITLE_LENGTH,
      /[;\n]/,
    ).map((text, itemIndex) => ({
      sourceId: `csv-check-${String(index + 1)}-${String(itemIndex + 1)}`,
      text: text.replace(/^\[[ xX]\]\s*/, ""),
      checked: /^\[[xX]\]/.test(text),
      position: itemIndex,
    }));
    const comments = parseDelimitedStrings(
      firstCsv(row, ["comments", "comment"]),
      MAX_COMMENTS,
      MAX_COMMENT_LENGTH,
      /\n/,
    ).map((body, commentIndex) => ({
      sourceId: `csv-comment-${String(index + 1)}-${String(commentIndex + 1)}`,
      body,
      actor: { type: "import" as const, id: "trello-csv" },
    }));
    const attachmentUrls = parseDelimitedStrings(
      firstCsv(row, ["attachments", "attachment urls", "attachmenturls"]),
      MAX_ATTACHMENTS,
      MAX_LINK_LENGTH,
      /\n/,
    );
    const attachments = attachmentUrls.map((url, attachmentIndex) => ({
      sourceId: `csv-attachment-${String(index + 1)}-${String(attachmentIndex + 1)}`,
      fileName: truncateText(url, MAX_ATTACHMENT_NAME_LENGTH, warnings, "attachment name") ?? url,
      url,
      sizeBytes: 0,
    }));
    const customFieldText = firstCsv(row, ["custom fields", "customfields"]);
    const customFields = customFieldText
      ? {
          trelloCsvCustomFields: customFieldText,
        }
      : {};
    return {
      sourceCardId: normalizeSourceCardId(
        sourceCardId,
        `csv-${hash.slice(0, 12)}-${String(index + 1)}`,
        warnings,
      ),
      sourceUrl: truncateText(
        firstCsv(row, ["url", "link"]),
        MAX_LINK_LENGTH,
        warnings,
        "source url",
      ),
      title:
        truncateText(title, MAX_TITLE_LENGTH, warnings, "title") ??
        `Untitled Trello card ${String(index + 1)}`,
      description: truncateText(
        firstCsv(row, ["description", "desc"]),
        MAX_DESCRIPTION_LENGTH,
        warnings,
        "description",
      ),
      lane: normalizeLane(firstCsv(row, ["lane", "list", "status"])),
      priority: normalizePriority(labels, firstCsv(row, ["priority"])),
      assignee: firstCsv(row, ["assignee", "assigned to"]) ?? watchers[0],
      labels,
      dueAt,
      checklist,
      comments,
      links: normalizeLinks([firstCsv(row, ["url", "link"]), ...attachmentUrls], warnings),
      attachments,
      watchers,
      customFields,
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
