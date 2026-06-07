// src/agents/tools/ocr-extract-tool.ts
import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@sinclair/typebox";
import { resolveUserPath } from "../../utils.js";
import { jsonResult, readNumberParam, readStringParam, type AnyAgentTool } from "./common.js";

export type OcrExtractMode = "auto" | "off" | "always";

export type OcrExtractSuccess = {
  ok: true;
  text: string;
  pages: Array<{ page?: number; text: string; charCount: number }>;
  charCount: number;
  engine: string;
  status: "ok";
  warnings: string[];
};

export type OcrExtractFailure = {
  ok: false;
  error: {
    code:
      | "missing_file"
      | "path_is_directory"
      | "unsupported_mime_type"
      | "ocr_unavailable"
      | "ocr_failed"
      | "invalid_argument";
    message: string;
  };
  warnings: string[];
};

export type OcrExtractResult = OcrExtractSuccess | OcrExtractFailure;

const OCR_SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
  "image/bmp",
]);

function errorResult(
  code: OcrExtractFailure["error"]["code"],
  message: string,
  warnings: string[] = [],
): OcrExtractFailure {
  return {
    ok: false,
    error: { code, message },
    warnings,
  };
}

function normalizeMode(value: string | undefined): OcrExtractMode {
  if (!value) {
    return "auto";
  }
  if (value === "auto" || value === "off" || value === "always") {
    return value;
  }
  return "auto";
}

function inferMimeType(filePath: string, explicitMimeType?: string): string {
  if (explicitMimeType?.trim()) {
    return explicitMimeType.trim().toLowerCase();
  }
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    return "application/pdf";
  }
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".jpg") {
    return "image/jpeg";
  }
  if (ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  if (ext === ".tif" || ext === ".tiff") {
    return "image/tiff";
  }
  if (ext === ".bmp") {
    return "image/bmp";
  }
  return "application/octet-stream";
}

export async function extractOcrFromFile(input: {
  filePath: string;
  mimeType?: string;
  pages?: number[];
  language?: string;
  mode?: OcrExtractMode;
  maxChars?: number;
}): Promise<OcrExtractResult> {
  const resolvedPath = input.filePath.startsWith("~")
    ? resolveUserPath(input.filePath)
    : path.resolve(input.filePath);
  let stat;
  try {
    stat = await fs.stat(resolvedPath);
  } catch {
    return errorResult("missing_file", `File not found: ${input.filePath}`);
  }
  if (stat.isDirectory()) {
    return errorResult("path_is_directory", `Path is a directory: ${input.filePath}`);
  }

  const mimeType = inferMimeType(resolvedPath, input.mimeType);
  if (!OCR_SUPPORTED_MIME_TYPES.has(mimeType)) {
    return errorResult("unsupported_mime_type", `OCR does not support MIME type: ${mimeType}`);
  }
  if ((input.mode ?? "auto") === "off") {
    return errorResult("ocr_unavailable", "OCR is disabled for this request.", ["ocr_unavailable"]);
  }

  return errorResult(
    "ocr_unavailable",
    "No local OCR engine is configured. Install/configure a local OCR engine before using OCR extraction.",
    ["ocr_unavailable"],
  );
}

export function createOcrExtractTool(): AnyAgentTool {
  return {
    name: "ocr_extract",
    label: "OCR Extract",
    description:
      "Extract text from a local image or PDF using optional local OCR. Returns stable JSON and reports ocr_unavailable when no local OCR engine is configured.",
    parameters: Type.Object(
      {
        filePath: Type.String(),
        mimeType: Type.Optional(Type.String()),
        pages: Type.Optional(Type.Array(Type.Number({ minimum: 1 }))),
        language: Type.Optional(Type.String()),
        mode: Type.Optional(
          Type.Union([Type.Literal("auto"), Type.Literal("off"), Type.Literal("always")]),
        ),
        maxChars: Type.Optional(Type.Number({ minimum: 1 })),
        json: Type.Optional(Type.Boolean()),
      },
      { additionalProperties: false },
    ),
    async execute(_toolCallId, rawParams) {
      const params = rawParams as Record<string, unknown>;
      const filePath = readStringParam(params, "filePath", { required: true });
      const mimeType = readStringParam(params, "mimeType");
      const language = readStringParam(params, "language");
      const mode = normalizeMode(readStringParam(params, "mode"));
      const maxChars = readNumberParam(params, "maxChars", { integer: true });
      const pages = Array.isArray(params.pages)
        ? params.pages.filter((page): page is number => typeof page === "number" && page > 0)
        : undefined;

      return jsonResult(
        await extractOcrFromFile({ filePath, mimeType, pages, language, mode, maxChars }),
      );
    },
  };
}
