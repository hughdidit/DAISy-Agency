// extensions/memory-mongodb/document-ingest.ts
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { extractOcrFromFile } from "../../src/agents/tools/ocr-extract-tool.js";
import { resolveUserPath } from "../../src/utils.js";
import {
  extractOffice,
  extractPdf,
  normalizeWhitespace,
  parseCsvTable,
} from "./document-ingest-extractors.js";
import {
  DEFAULT_MAX_CHARS_PER_CHUNK,
  DEFAULT_MAX_CHUNKS,
  DEFAULT_MAX_FILE_BYTES,
  MIME_BY_EXT,
  TEXT_MIME_TYPES,
  type DocumentExtractionFailure,
  type DocumentExtractionResult,
  type DocumentExtractionSuccess,
  type DocumentIngestChunk,
  type DocumentIngestMode,
  type OcrStatus,
  type OpsServiceLike,
} from "./document-ingest-types.js";
import type { MemoryCaptureOutcome } from "./memory-ops-types.js";
export type {
  DocumentExtractionFailure,
  DocumentExtractionResult,
  DocumentExtractionSuccess,
  DocumentIngestChunk,
  DocumentIngestMode,
  DocumentIngestTable,
} from "./document-ingest-types.js";
function failure(
  code: string,
  message: string,
  warnings: string[] = [],
): DocumentExtractionFailure {
  return { ok: false, error: { code, message }, warnings };
}
function normalizeMime(filePath: string, mimeType?: string): string {
  return mimeType?.trim().toLowerCase() || MIME_BY_EXT[path.extname(filePath).toLowerCase()] || "";
}
function clampPositiveInteger(value: number | undefined, defaultValue: number, maxValue: number) {
  if (value === undefined || !Number.isFinite(value) || value < 1) {
    return defaultValue;
  }
  return Math.min(Math.floor(value), maxValue);
}
function truncateCodePoints(text: string | undefined, maxLength: number): string | undefined {
  if (!text) {
    return undefined;
  }
  return Array.from(text).slice(0, maxLength).join("");
}
function chunkText(text: string, maxChars: number, maxChunks: number, title: string) {
  const chunks: DocumentIngestChunk[] = [];
  let cursor = 0;
  while (cursor < text.length && chunks.length < maxChunks) {
    const hardEnd = Math.min(cursor + maxChars, text.length);
    const softEnd = hardEnd < text.length ? text.lastIndexOf("\n\n", hardEnd) : hardEnd;
    const end = softEnd > cursor + Math.floor(maxChars * 0.5) ? softEnd : hardEnd;
    const index = chunks.length + 1;
    chunks.push({
      chunkId: `chunk-${String(index).padStart(4, "0")}`,
      index: chunks.length,
      kind: "text",
      title,
      charStart: cursor,
      charEnd: end,
      text: text.slice(cursor, end).trim(),
    });
    cursor = end;
  }
  return chunks.filter((chunk) => chunk.text.length > 0);
}
export async function extractDocumentFile(input: {
  filePath: string;
  filename?: string;
  mimeType?: string;
  title?: string;
  maxCharsPerChunk?: number;
  maxChunks?: number;
  enableOcr?: boolean;
  enableTables?: boolean;
}): Promise<DocumentExtractionResult> {
  const resolved = input.filePath.startsWith("~")
    ? resolveUserPath(input.filePath)
    : path.resolve(input.filePath);
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    return failure("missing_file", `File not found: ${input.filePath}`);
  }
  if (stat.isDirectory()) {
    return failure("path_is_directory", `Path is a directory: ${input.filePath}`);
  }
  if (stat.size > DEFAULT_MAX_FILE_BYTES) {
    return failure("file_too_large", `File exceeds ${DEFAULT_MAX_FILE_BYTES} bytes.`);
  }
  const buffer = await fs.readFile(resolved);
  const mimeType = normalizeMime(resolved, input.mimeType);
  const filename = input.filename || path.basename(resolved);
  const title = input.title || filename;
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const warnings: string[] = [];
  let text = "";
  let pageCount = 0;
  let slideCount = 0;
  let sheetCount = 0;
  let ocrStatus: OcrStatus = "not_needed";
  try {
    if (TEXT_MIME_TYPES.has(mimeType)) {
      text = normalizeWhitespace(buffer.toString("utf8"));
    } else if (mimeType === "application/pdf") {
      const pdf = await extractPdf(buffer);
      text = pdf.text;
      pageCount = pdf.pageCount;
      if (!text && input.enableOcr !== false) {
        const ocr = await extractOcrFromFile({ filePath: resolved, mimeType, mode: "auto" });
        if (ocr.ok) {
          text = ocr.text;
          ocrStatus = "used";
        } else {
          ocrStatus = ocr.error.code === "ocr_unavailable" ? "unavailable" : "failed";
          warnings.push(ocr.error.code);
        }
      }
      if (!text)
        return failure("pdf_no_extractable_text", "PDF has no extractable text.", warnings);
    } else if (mimeType.includes("officedocument")) {
      const office = await extractOffice(buffer, mimeType);
      text = office.text;
      slideCount = office.slideCount;
      sheetCount = office.sheetCount;
    } else {
      return failure("unsupported_mime_type", `Unsupported MIME type: ${mimeType}`);
    }
  } catch (error) {
    const code = mimeType === "application/pdf" ? "pdf_parse_failed" : "office_parse_failed";
    return failure(code, error instanceof Error ? error.message : String(error), warnings);
  }
  const maxChars = clampPositiveInteger(
    input.maxCharsPerChunk,
    DEFAULT_MAX_CHARS_PER_CHUNK,
    DEFAULT_MAX_CHARS_PER_CHUNK,
  );
  const maxChunks = clampPositiveInteger(input.maxChunks, DEFAULT_MAX_CHUNKS, DEFAULT_MAX_CHUNKS);
  const chunks = chunkText(text, maxChars, maxChunks, title);
  const tables = input.enableTables === false || mimeType !== "text/csv" ? [] : parseCsvTable(text);
  return {
    ok: true,
    document: {
      title,
      filename,
      path: resolved,
      mimeType,
      sha256,
      byteLength: stat.size,
      pageCount,
      slideCount,
      sheetCount,
      extractionStatus: "ok",
      ocrStatus,
      tableExtractionStatus: tables.length > 0 ? "ok" : "not_needed",
      extractedCharCount: text.length,
      chunkCount: chunks.length,
    },
    chunks,
    tables,
    warnings,
  };
}
function mimeTag(mimeType: string): string {
  return mimeType
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
function documentMetadata(doc: DocumentExtractionSuccess["document"], chunkId: string) {
  return {
    title: doc.title,
    filename: doc.filename,
    mimeType: doc.mimeType,
    sha256: doc.sha256,
    documentSha256: doc.sha256,
    byteLength: doc.byteLength,
    pageCount: doc.pageCount,
    chunkId,
  };
}
export function buildDocumentMemoryCandidates(
  extraction: DocumentExtractionSuccess,
  options: { mode?: DocumentIngestMode; tags?: string[]; sourceMessageIds?: string[] } = {},
) {
  const tags = [
    "document",
    "document-ingest",
    mimeTag(extraction.document.mimeType),
    ...(options.tags ?? []),
  ];
  const manifest: MemoryCaptureCandidate = {
    text: [
      `Document ingested: ${extraction.document.title}.`,
      `Filename: ${extraction.document.filename}.`,
      `MIME type: ${extraction.document.mimeType}.`,
      `Pages: ${extraction.document.pageCount}.`,
      `SHA-256: ${extraction.document.sha256}.`,
      `Chunks extracted: ${extraction.document.chunkCount}.`,
      `Extraction status: ${extraction.document.extractionStatus}.`,
      `OCR status: ${extraction.document.ocrStatus}.`,
      `Table extraction status: ${extraction.document.tableExtractionStatus}.`,
    ].join("\n"),
    kind: "fact",
    category: "fact",
    importance: 0.8,
    confidence: 0.95,
    tags,
    sourceMessageIds: options.sourceMessageIds,
    document: documentMetadata(extraction.document, "doc-manifest"),
  };
  const mode = options.mode ?? "summary_and_chunks";
  const children: MemoryCaptureCandidate[] = [];
  if (mode === "summary" || mode === "summary_and_chunks") {
    const text = truncateCodePoints(extraction.chunks[0]?.text, 900) ?? extraction.document.title;
    children.push({
      text: `Document summary: ${extraction.document.title}. ${text}`,
      kind: "fact",
      category: "fact",
      importance: 0.85,
      confidence: 0.9,
      tags: ["document", "document-ingest", "document-summary", ...(options.tags ?? [])],
      sourceMessageIds: options.sourceMessageIds,
      document: documentMetadata(extraction.document, "summary-0001"),
    });
  }
  if (mode === "chunks" || mode === "summary_and_chunks") {
    for (const chunk of extraction.chunks) {
      children.push({
        text: `Document chunk: ${extraction.document.title}. Source: ${chunk.chunkId}.\n${chunk.text}`,
        kind: "fact",
        category: "fact",
        importance: 0.65,
        confidence: 0.85,
        tags: ["document", "document-ingest", "document-chunk", ...(options.tags ?? [])],
        sourceMessageIds: options.sourceMessageIds,
        document: {
          ...documentMetadata(extraction.document, chunk.chunkId),
          sourceRange: { chars: [chunk.charStart, chunk.charEnd] },
        },
      });
    }
  }
  if (mode === "chunks" || mode === "summary_and_chunks") {
    for (const table of extraction.tables) {
      children.push({
        text: `Document table summary: ${table.text}`,
        kind: "fact",
        category: "fact",
        importance: 0.7,
        confidence: 0.85,
        tags: ["document", "document-ingest", "table", ...(options.tags ?? [])],
        sourceMessageIds: options.sourceMessageIds,
        document: {
          ...documentMetadata(extraction.document, table.tableId),
          sourceRange: { rows: [table.rowStart ?? 0, table.rowEnd ?? 0] },
        },
      });
    }
  }
  return { manifest, children };
}
function resolveParentId(outcome: MemoryCaptureOutcome | undefined): string | undefined {
  return outcome?.id ?? outcome?.existingId;
}
export async function ingestDocumentToMemory(input: {
  filePath: string;
  filename?: string;
  mimeType?: string;
  title?: string;
  mode?: DocumentIngestMode;
  tags?: string[];
  sourceMessageIds?: string[];
  maxCharsPerChunk?: number;
  maxChunks?: number;
  enableOcr?: boolean;
  enableTables?: boolean;
  dryRun?: boolean;
  scopeSubject: string;
  opsService: OpsServiceLike;
}) {
  const extraction = await extractDocumentFile(input);
  if (!extraction.ok) return extraction;
  const candidates = buildDocumentMemoryCandidates(extraction, input);
  if (input.dryRun) {
    return {
      ...extraction,
      suggestedMemoryCapture: { entries: [candidates.manifest, ...candidates.children] },
    };
  }
  const manifestCapture = await input.opsService.capture({
    scopeSubject: input.scopeSubject,
    source: "memory_ingest_document",
    entries: [candidates.manifest],
  });
  const manifestOutcome = manifestCapture.outcomes[0];
  const parentMemoryId = resolveParentId(manifestOutcome);
  if (!parentMemoryId) {
    return failure(
      "memory_capture_failed",
      `Manifest capture failed with status: ${manifestOutcome?.status ?? "unknown"}.`,
      extraction.warnings,
    );
  }
  const childEntries = candidates.children.map((entry) => ({
    ...entry,
    document: { ...(entry.document ?? {}), parentMemoryId },
  }));
  const childCapture = childEntries.length
    ? await input.opsService.capture({
        scopeSubject: input.scopeSubject,
        source: "memory_ingest_document",
        entries: childEntries,
      })
    : { outcomes: [] };
  const ids = [...manifestCapture.outcomes, ...childCapture.outcomes]
    .map((outcome) => outcome.id ?? outcome.existingId)
    .filter((id): id is string => typeof id === "string");
  const queries = [
    extraction.document.title,
    truncateCodePoints(extraction.document.sha256, 12),
    truncateCodePoints(extraction.chunks[0]?.text, 80),
    truncateCodePoints(extraction.tables[0]?.text, 80),
  ].filter((query): query is string => Boolean(query?.trim()));
  const verificationQueries = [];
  for (const query of queries) {
    const recall = await input.opsService.recall({
      query,
      scopeSubject: input.scopeSubject,
      limit: 5,
      maxLimit: 20,
      minScore: 0,
      filters: { includeMetadata: true },
    });
    const matchedIds = recall.memories
      .map((memory) => memory.id)
      .filter((id): id is string => typeof id === "string");
    verificationQueries.push({
      query,
      hitCount: recall.count,
      matchedIds,
      matchedCreatedIds: matchedIds.filter((id) => ids.includes(id)),
    });
  }
  return {
    ...extraction,
    createdMemoryIds: ids,
    duplicateOutcomes: [...manifestCapture.outcomes, ...childCapture.outcomes].filter(
      (outcome) => outcome.status === "duplicate",
    ),
    recallVerification: {
      pass: verificationQueries.some((query) => query.matchedCreatedIds.length > 0),
      queries: verificationQueries,
    },
  };
}
