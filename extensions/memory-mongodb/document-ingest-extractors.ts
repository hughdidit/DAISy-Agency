// extensions/memory-mongodb/document-ingest-extractors.ts
import JSZip from "jszip";
import type { DocumentIngestTable } from "./document-ingest-types.js";

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeXmlText(xml: string): string {
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

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function parseCsvTable(text: string): DocumentIngestTable[] {
  const rows = text
    .split(/\r?\n/)
    .map(splitCsvLine)
    .filter((row) => row.some(Boolean));
  if (rows.length < 2) {
    return [];
  }
  const headers = rows[0] ?? [];
  return [
    {
      tableId: "table-0001",
      index: 0,
      source: "csv",
      rowStart: 1,
      rowEnd: rows.length,
      headers,
      text: rows.map((row) => row.join(" | ")).join("\n"),
    },
  ];
}

function extractSharedStrings(xml: string): string[] {
  return Array.from(xml.matchAll(/<si\b[\s\S]*?<\/si>/g), (match) => safeXmlText(match[0]));
}

function extractWorksheetText(xml: string, sharedStrings: string[]) {
  const values: string[] = [];
  for (const match of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const rawValue = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]?.trim();
    let value = "";
    if (/\bt=["']s["']/.test(attrs) && rawValue) {
      value = sharedStrings[Number.parseInt(rawValue, 10)] ?? "";
    } else if (/\bt=["']inlineStr["']/.test(attrs)) {
      value = safeXmlText(body);
    } else {
      value = safeXmlText(rawValue ?? body);
    }
    if (value) {
      values.push(value);
    }
  }
  return values.join(" ");
}

export async function extractOffice(buffer: Buffer, mimeType: string) {
  const zip = await JSZip.loadAsync(buffer);
  if (mimeType.includes("wordprocessingml")) {
    const xml = await zip.file("word/document.xml")?.async("string");
    return { text: normalizeWhitespace(safeXmlText(xml ?? "")), slideCount: 0, sheetCount: 0 };
  }
  if (mimeType.includes("presentationml")) {
    const slideFiles = Object.keys(zip.files).filter((name) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(name),
    );
    const slides = await Promise.all(
      slideFiles.sort().map(async (name, index) => {
        const text = safeXmlText((await zip.file(name)?.async("string")) ?? "");
        return text ? `Slide ${index + 1}: ${text}` : "";
      }),
    );
    return {
      text: normalizeWhitespace(slides.filter(Boolean).join("\n\n")),
      slideCount: slideFiles.length,
      sheetCount: 0,
    };
  }
  const sheetFiles = Object.keys(zip.files).filter((name) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(name),
  );
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  const sharedStrings = sharedStringsXml ? extractSharedStrings(sharedStringsXml) : [];
  const sheets = await Promise.all(
    sheetFiles.sort().map(async (name, index) => {
      const xml = (await zip.file(name)?.async("string")) ?? "";
      const text = extractWorksheetText(xml, sharedStrings);
      return text ? `Sheet ${index + 1}: ${text}` : "";
    }),
  );
  return {
    text: normalizeWhitespace(sheets.filter(Boolean).join("\n\n")),
    slideCount: 0,
    sheetCount: sheetFiles.length,
  };
}

export async function extractPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    disableWorker: true,
  });
  const pdf = await loadingTask.promise;
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: unknown) =>
          typeof (item as { str?: unknown }).str === "string" ? (item as { str: string }).str : "",
        )
        .filter(Boolean)
        .join(" ");
      if (text.trim()) {
        pages.push(`Page ${pageNumber}: ${text}`);
      }
    }
    return { text: normalizeWhitespace(pages.join("\n\n")), pageCount: pdf.numPages };
  } finally {
    await pdf.destroy();
  }
}
