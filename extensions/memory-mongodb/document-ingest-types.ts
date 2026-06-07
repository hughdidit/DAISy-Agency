// extensions/memory-mongodb/document-ingest-types.ts
import type { MemoryCaptureCandidate, MemoryCaptureOutcome } from "./memory-ops-types.js";

export type DocumentIngestMode = "manifest_only" | "summary" | "chunks" | "summary_and_chunks";
export type OcrStatus = "not_needed" | "unavailable" | "failed" | "used";
export type TableStatus = "not_needed" | "ok";

export type DocumentIngestChunk = {
  chunkId: string;
  index: number;
  kind: "text" | "table";
  title: string;
  pageStart?: number;
  pageEnd?: number;
  slideStart?: number;
  slideEnd?: number;
  sheetName?: string;
  charStart: number;
  charEnd: number;
  text: string;
};

export type DocumentIngestTable = {
  tableId: string;
  index: number;
  source: string;
  page?: number;
  sheetName?: string;
  rowStart?: number;
  rowEnd?: number;
  headers: string[];
  text: string;
};

export type DocumentExtractionSuccess = {
  ok: true;
  document: {
    title: string;
    filename: string;
    path: string;
    mimeType: string;
    sha256: string;
    byteLength: number;
    pageCount: number;
    slideCount: number;
    sheetCount: number;
    extractionStatus: "ok";
    ocrStatus: OcrStatus;
    tableExtractionStatus: TableStatus;
    extractedCharCount: number;
    chunkCount: number;
  };
  chunks: DocumentIngestChunk[];
  tables: DocumentIngestTable[];
  warnings: string[];
};

export type DocumentExtractionFailure = {
  ok: false;
  error: { code: string; message: string };
  warnings: string[];
};

export type DocumentExtractionResult = DocumentExtractionSuccess | DocumentExtractionFailure;

export type OpsServiceLike = {
  capture(input: {
    scopeSubject: string;
    entries: MemoryCaptureCandidate[];
    source: string;
    dedupeThreshold?: number;
  }): Promise<{ outcomes: MemoryCaptureOutcome[] }>;
  recall(input: {
    query: string;
    scopeSubject: string;
    limit?: number;
    maxLimit?: number;
    minScore?: number;
    filters?: { includeMetadata?: boolean };
  }): Promise<{ count: number; noResult: boolean; memories: Array<Record<string, unknown>> }>;
};

export const DEFAULT_MAX_CHARS_PER_CHUNK = 18_000;
export const DEFAULT_MAX_CHUNKS = 80;
export const DEFAULT_MAX_FILE_BYTES = 50 * 1024 * 1024;

export const MIME_BY_EXT: Record<string, string> = {
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".html": "text/html",
  ".json": "application/json",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xml": "application/xml",
};

export const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/ld+json",
  "application/x-ndjson",
  "application/xml",
  "text/xml",
  "text/html",
  "application/rtf",
  "text/rtf",
  "application/toml",
  "text/x-toml",
]);
