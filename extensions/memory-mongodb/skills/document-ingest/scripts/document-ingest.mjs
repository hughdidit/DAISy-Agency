// extensions/memory-mongodb/skills/document-ingest/scripts/document-ingest.mjs
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const MIME_BY_EXT = {
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

const TEXT_MIME_TYPES = new Set([
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

function parseArgs(argv) {
  const args = {
    filePath: "",
    maxCharsPerChunk: 18000,
    maxChunks: 80,
    ocr: "auto",
    tables: "auto",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!args.filePath && !arg.startsWith("--")) {
      args.filePath = arg;
    } else if (arg === "--mime") {
      args.mimeType = argv[++i];
    } else if (arg === "--title") {
      args.title = argv[++i];
    } else if (arg === "--max-chars-per-chunk") {
      args.maxCharsPerChunk = Number.parseInt(argv[++i] ?? "", 10);
    } else if (arg === "--max-chunks") {
      args.maxChunks = Number.parseInt(argv[++i] ?? "", 10);
    } else if (arg === "--ocr") {
      args.ocr = argv[++i] ?? "auto";
    } else if (arg === "--tables") {
      args.tables = argv[++i] ?? "auto";
    } else if (arg === "--json") {
      args.json = true;
    }
  }
  return args;
}

function failure(code, message, warnings = []) {
  return { ok: false, error: { code, message }, warnings };
}

function normalizeWhitespace(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function safeXmlText(xml) {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text, maxChars, maxChunks, title) {
  const chunks = [];
  for (let cursor = 0; cursor < text.length && chunks.length < maxChunks; cursor += maxChars) {
    const end = Math.min(cursor + maxChars, text.length);
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
  }
  return chunks.filter((chunk) => chunk.text);
}

async function extractOffice(buffer, mimeType) {
  const zip = await JSZip.loadAsync(buffer);
  if (mimeType.includes("wordprocessingml")) {
    return normalizeWhitespace(safeXmlText((await zip.file("word/document.xml")?.async("string")) ?? ""));
  }
  const prefix = mimeType.includes("presentationml") ? "ppt/slides/" : "xl/worksheets/";
  const files = Object.keys(zip.files).filter((name) => name.startsWith(prefix) && name.endsWith(".xml"));
  const parts = await Promise.all(files.sort().map(async (name) => safeXmlText((await zip.file(name)?.async("string")) ?? "")));
  return normalizeWhitespace(parts.filter(Boolean).join("\n\n"));
}

async function extractPdf(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    disableWorker: true,
  });
  const pdf = await loadingTask.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => (typeof item.str === "string" ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pages.push(`Page ${pageNumber}: ${text}`);
  }
  return { text: normalizeWhitespace(pages.join("\n\n")), pageCount: pdf.numPages };
}

function parseCsvTables(text) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
  if (rows.length < 2) return [];
  return [{
    tableId: "table-0001",
    index: 0,
    source: "csv",
    rowStart: 1,
    rowEnd: rows.length,
    headers: rows[0] ?? [],
    text: rows.map((row) => row.join(" | ")).join("\n"),
  }];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.filePath) return failure("invalid_argument", "file path required");
  const resolved = path.resolve(args.filePath);
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    return failure("missing_file", `File not found: ${args.filePath}`);
  }
  if (stat.isDirectory()) return failure("path_is_directory", `Path is a directory: ${args.filePath}`);
  const buffer = await fs.readFile(resolved);
  const mimeType = args.mimeType || MIME_BY_EXT[path.extname(resolved).toLowerCase()] || "";
  const filename = path.basename(resolved);
  const title = args.title || filename;
  let text = "";
  let pageCount = 0;
  if (TEXT_MIME_TYPES.has(mimeType)) {
    text = normalizeWhitespace(buffer.toString("utf8"));
  } else if (mimeType.includes("officedocument")) {
    text = await extractOffice(buffer, mimeType);
  } else if (mimeType === "application/pdf") {
    const pdf = await extractPdf(buffer);
    text = pdf.text;
    pageCount = pdf.pageCount;
    if (!text) {
      return failure("pdf_no_extractable_text", "PDF has no extractable text.", [
        "ocr_unavailable",
      ]);
    }
  } else {
    return failure("unsupported_mime_type", `Unsupported MIME type: ${mimeType}`);
  }
  const chunks = chunkText(text, args.maxCharsPerChunk, args.maxChunks, title);
  const tables = args.tables === "off" || mimeType !== "text/csv" ? [] : parseCsvTables(text);
  return {
    ok: true,
    document: {
      title,
      filename,
      path: resolved,
      mimeType,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      byteLength: stat.size,
      pageCount,
      slideCount: 0,
      sheetCount: 0,
      extractionStatus: "ok",
      ocrStatus: args.ocr === "off" ? "not_needed" : "unavailable",
      tableExtractionStatus: tables.length > 0 ? "ok" : "not_needed",
      extractedCharCount: text.length,
      chunkCount: chunks.length,
    },
    chunks,
    tables,
    warnings: args.ocr === "off" ? [] : ["ocr_unavailable"],
  };
}

const result = await main();
console.log(JSON.stringify(result, null, 2));
