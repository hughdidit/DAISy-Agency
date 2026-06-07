// src/agents/tools/ocr-extract-tool.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import "./../test-helpers/fast-core-tools.js";
import { createOpenClawTools } from "../openclaw-tools.js";
import { createOcrExtractTool, extractOcrFromFile } from "./ocr-extract-tool.js";

async function withTempFile<T>(
  filename: string,
  content: Buffer | string,
  run: (filePath: string) => Promise<T>,
): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-ocr-"));
  try {
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, content);
    return await run(filePath);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("ocr_extract tool", () => {
  it("returns a stable missing_file result", async () => {
    const result = await extractOcrFromFile({
      filePath: path.join(os.tmpdir(), "missing-ocr-input.png"),
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "missing_file" },
      warnings: [],
    });
  });

  it("rejects directories without reading them", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-ocr-dir-"));
    try {
      const result = await extractOcrFromFile({ filePath: dir });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "path_is_directory" },
      });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("returns ocr_unavailable for image input when no local OCR engine is configured", async () => {
    await withTempFile("sample.png", Buffer.from([0x89, 0x50, 0x4e, 0x47]), async (filePath) => {
      const result = await extractOcrFromFile({ filePath, mimeType: "image/png" });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "ocr_unavailable" },
        warnings: ["ocr_unavailable"],
      });
    });
  });

  it("distinguishes disabled OCR from unavailable OCR", async () => {
    await withTempFile("sample.png", Buffer.from([0x89, 0x50, 0x4e, 0x47]), async (filePath) => {
      const result = await extractOcrFromFile({ filePath, mimeType: "image/png", mode: "off" });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "ocr_disabled" },
        warnings: [],
      });
    });
  });

  it("recognizes GIF and SVG as OCR-capable image MIME types", async () => {
    await withTempFile("sample.gif", Buffer.from("GIF89a"), async (filePath) => {
      const result = await extractOcrFromFile({ filePath });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "ocr_unavailable" },
      });
    });
    await withTempFile("sample.svg", "<svg></svg>", async (filePath) => {
      const result = await extractOcrFromFile({ filePath });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "ocr_unavailable" },
      });
    });
  });

  it("exposes stable JSON through the agent tool", async () => {
    const tool = createOcrExtractTool();
    expect(tool.name).toBe("ocr_extract");

    await withTempFile("sample.png", Buffer.from([0x89, 0x50, 0x4e, 0x47]), async (filePath) => {
      const result = await tool.execute("ocr-1", { filePath, mimeType: "image/png" });
      expect(result.details).toMatchObject({
        ok: false,
        error: { code: "ocr_unavailable" },
      });
      expect(result.content[0]?.type).toBe("text");
    });
  });

  it("registers as a core OpenClaw tool", () => {
    const tools = createOpenClawTools();
    expect(tools.some((tool) => tool.name === "ocr_extract")).toBe(true);
  });
});
