// extensions/memory-mongodb/document-ingest.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, test } from "vitest";
import {
  buildDocumentMemoryCandidates,
  extractDocumentFile,
  ingestDocumentToMemory,
} from "./document-ingest.js";
import type { MemoryCaptureCandidate } from "./memory-ops-types.js";

async function withTempFile<T>(
  filename: string,
  content: string | Buffer,
  run: (filePath: string) => Promise<T>,
): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-doc-ingest-"));
  try {
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, content);
    return await run(filePath);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

class InMemoryOpsService {
  captureCalls: Array<{ entries: MemoryCaptureCandidate[] }> = [];
  recallCalls: Array<{ query: string }> = [];
  memories: Array<{ id: string; text: string }> = [];

  constructor(
    private readonly options: { recallUnrelated?: boolean; rejectManifest?: boolean } = {},
  ) {}

  async capture(input: { entries: MemoryCaptureCandidate[] }) {
    this.captureCalls.push({ entries: input.entries });
    if (this.options.rejectManifest && this.captureCalls.length === 1) {
      return { outcomes: [{ status: "invalid" as const, reason: "validation_failed" }] };
    }
    const outcomes = input.entries.map((entry) => {
      const id = this.memories.length === 0 ? "manifest-id" : `child-${this.memories.length}`;
      this.memories.push({ id, text: entry.text ?? "" });
      return { status: "created" as const, id };
    });
    return { outcomes };
  }

  async recall(input: { query: string }) {
    this.recallCalls.push(input);
    const memories = this.options.recallUnrelated
      ? [{ id: "pre-existing-id", text: "unrelated memory" }]
      : this.memories.slice(0, 1);
    return { count: memories.length, noResult: memories.length === 0, memories };
  }
}

describe("document ingest extraction", () => {
  test("extracts text files into deterministic chunks", async () => {
    await withTempFile("sample.md", "# Title\n\nAlpha beta gamma.\n\nDelta.", async (filePath) => {
      const result = await extractDocumentFile({
        filePath,
        maxCharsPerChunk: 20,
        maxChunks: 10,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.document.mimeType).toBe("text/markdown");
      expect(result.document.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(result.chunks.map((chunk) => chunk.chunkId)).toEqual(["chunk-0001", "chunk-0002"]);
      expect(result.chunks[0]?.text).toContain("Title");
    });
  });

  test("extracts CSV tables and table chunks", async () => {
    await withTempFile("sample.csv", 'name,score\n"Last, First",1\nbeta,2\n', async (filePath) => {
      const result = await extractDocumentFile({ filePath, enableTables: true });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0]).toMatchObject({
        tableId: "table-0001",
        headers: ["name", "score"],
      });
      expect(result.tables[0]?.text).toContain("Last, First | 1");
    });
  });

  test("resolves XLSX shared strings before chunking", async () => {
    const zip = new JSZip();
    zip.file(
      "xl/sharedStrings.xml",
      "<sst><si><t>Client Name</t></si><si><t>Acme Corp</t></si></sst>",
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      '<worksheet><sheetData><row><c t="s"><v>0</v></c><c t="s"><v>1</v></c></row></sheetData></worksheet>',
    );
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    await withTempFile("sample.xlsx", buffer, async (filePath) => {
      const result = await extractDocumentFile({ filePath, enableTables: true });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.chunks[0]?.text).toContain("Client Name");
      expect(result.chunks[0]?.text).toContain("Acme Corp");
    });
  });

  test("clamps chunk count to the document ingest cap", async () => {
    await withTempFile("sample.txt", "x".repeat(200), async (filePath) => {
      const result = await extractDocumentFile({
        filePath,
        maxCharsPerChunk: 1,
        maxChunks: 1_000,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.chunks).toHaveLength(80);
    });
  });

  test("returns stable errors for unsupported files", async () => {
    await withTempFile("sample.bin", Buffer.from([1, 2, 3]), async (filePath) => {
      const result = await extractDocumentFile({ filePath, mimeType: "application/octet-stream" });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "unsupported_mime_type" },
      });
    });
  });
});

describe("document memory candidate shaping", () => {
  test("creates manifest and child candidates without placeholder-only text", async () => {
    await withTempFile("sample.txt", "A durable document fact for memory.", async (filePath) => {
      const extraction = await extractDocumentFile({ filePath });
      expect(extraction.ok).toBe(true);
      if (!extraction.ok) throw new Error("expected ok");

      const candidates = buildDocumentMemoryCandidates(extraction, {
        mode: "summary_and_chunks",
        tags: ["project-doc"],
      });

      expect(candidates.manifest.text).toContain("Document ingested:");
      expect(candidates.children.length).toBeGreaterThan(0);
      for (const candidate of [candidates.manifest, ...candidates.children]) {
        expect(candidate.text).not.toMatch(/^\[attachment:[^\]]+\]$/);
        expect(candidate.document?.documentSha256).toBe(extraction.document.sha256);
        expect(candidate.tags).toContain("document-ingest");
      }
    });
  });

  test("captures manifest before children and verifies recall", async () => {
    await withTempFile(
      "sample.txt",
      "Recallable concept phrase for document memory.",
      async (filePath) => {
        const opsService = new InMemoryOpsService();

        const result = await ingestDocumentToMemory({
          filePath,
          scopeSubject: "agent:main",
          opsService,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("expected ok");
        expect(opsService.captureCalls).toHaveLength(2);
        expect(opsService.captureCalls[0]?.entries).toHaveLength(1);
        expect(opsService.captureCalls[1]?.entries[0]?.document?.parentMemoryId).toBe(
          "manifest-id",
        );
        expect(opsService.recallCalls.length).toBeGreaterThan(0);
        expect("recallVerification" in result).toBe(true);
        if (!("recallVerification" in result)) throw new Error("expected recall verification");
        expect(result.recallVerification?.pass).toBe(true);
      },
    );
  });

  test("does not pass recall verification on unrelated recall hits", async () => {
    await withTempFile(
      "sample.txt",
      "Distinct phrase for recall verification.",
      async (filePath) => {
        const result = await ingestDocumentToMemory({
          filePath,
          scopeSubject: "agent:main",
          opsService: new InMemoryOpsService({ recallUnrelated: true }),
        });

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("expected ok");
        expect("recallVerification" in result).toBe(true);
        if (!("recallVerification" in result)) throw new Error("expected recall verification");
        expect(result.recallVerification?.pass).toBe(false);
        expect(result.recallVerification?.queries[0]?.matchedCreatedIds).toEqual([]);
      },
    );
  });

  test("does not capture orphaned children when manifest capture lacks an id", async () => {
    await withTempFile("sample.txt", "Manifest capture failure path.", async (filePath) => {
      const opsService = new InMemoryOpsService({ rejectManifest: true });
      const result = await ingestDocumentToMemory({
        filePath,
        scopeSubject: "agent:main",
        opsService,
      });

      expect(result).toMatchObject({
        ok: false,
        error: { code: "memory_capture_failed" },
      });
      expect(opsService.captureCalls).toHaveLength(1);
    });
  });
});
