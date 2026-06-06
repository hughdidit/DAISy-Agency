// extensions/memory-mongodb/document-ingest.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import {
  buildDocumentMemoryCandidates,
  extractDocumentFile,
  ingestDocumentToMemory,
} from "./document-ingest.js";

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
    await withTempFile("sample.csv", "name,score\nalpha,1\nbeta,2\n", async (filePath) => {
      const result = await extractDocumentFile({ filePath, enableTables: true });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0]).toMatchObject({
        tableId: "table-0001",
        headers: ["name", "score"],
      });
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
        const capture = vi
          .fn()
          .mockResolvedValueOnce({ outcomes: [{ status: "created", id: "manifest-id" }] })
          .mockResolvedValueOnce({ outcomes: [{ status: "created", id: "child-id" }] });
        const recall = vi.fn().mockResolvedValue({
          count: 1,
          noResult: false,
          memories: [{ id: "manifest-id", text: "Document ingested sample" }],
        });

        const result = await ingestDocumentToMemory({
          filePath,
          scopeSubject: "agent:main",
          opsService: { capture, recall },
        });

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("expected ok");
        expect(capture).toHaveBeenCalledTimes(2);
        expect(capture.mock.calls[0]?.[0].entries).toHaveLength(1);
        expect(capture.mock.calls[1]?.[0].entries[0].document.parentMemoryId).toBe(
          "manifest-id",
        );
        expect(recall).toHaveBeenCalled();
        expect(result.recallVerification?.pass).toBe(true);
      },
    );
  });
});
