import { describe, expect, test } from "vitest";
import {
  PayloadChunker,
  buildAttachmentManifests,
  multimodalPartsToFallbackText,
  preparePartsForEmbedding,
  payloadChunkerLimits,
} from "./payload-chunker.js";

describe("payload chunker", () => {
  test("chunks media when image/pdf count exceeds Gemini cap", () => {
    const imagePart = {
      inlineData: {
        mimeType: "image/png" as const,
        data: "ZmFrZS1pbWFnZQ==",
      },
    };

    const chunks = PayloadChunker.chunk([
      imagePart,
      imagePart,
      imagePart,
      imagePart,
      imagePart,
      imagePart,
      imagePart,
    ]);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(payloadChunkerLimits.maxImageOrPdfPartsPerChunk);
    expect(chunks[1]).toHaveLength(1);
  });

  test("splits long text using configured text char limit", () => {
    const oversizedText = "x".repeat(payloadChunkerLimits.maxTextCharsPerPart + 11);

    const chunks = PayloadChunker.chunk([{ text: oversizedText }]);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(2);
    expect((chunks[0][0] as { text: string }).text).toHaveLength(
      payloadChunkerLimits.maxTextCharsPerPart,
    );
    expect((chunks[0][1] as { text: string }).text).toHaveLength(11);
  });

  test("rejects unsupported MIME types", () => {
    expect(() =>
      PayloadChunker.chunk([
        {
          inlineData: {
            mimeType: "image/gif" as never,
            data: "R0lGODlh",
          },
        },
      ]),
    ).toThrow("Unsupported mimeType");
  });

  test("rejects parts that contain both text and inlineData", () => {
    expect(() =>
      PayloadChunker.chunk([
        {
          text: "hello",
          inlineData: {
            mimeType: "image/png" as never,
            data: "ZmFrZQ==",
          },
        } as never,
      ]),
    ).toThrow("cannot include both");
  });

  test("builds fallback text from mixed multimodal parts", () => {
    const fallback = multimodalPartsToFallbackText([
      { text: "customer uploaded invoice" },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: "ZmFrZS1wZGY=",
        },
      },
    ]);

    expect(fallback).toContain("customer uploaded invoice");
    expect(fallback).toContain("[attachment:application/pdf]");
  });

  test("accepts extended document MIME types", () => {
    const chunks = PayloadChunker.chunk([
      {
        inlineData: {
          mimeType: "text/markdown" as const,
          data: Buffer.from("# hello markdown", "utf8").toString("base64"),
        },
      },
      {
        inlineData: {
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const,
          data: "ZG9jeA==",
        },
      },
    ]);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(2);
  });

  test("prepares non-embeddable document parts as text fallbacks", () => {
    const parts = preparePartsForEmbedding([
      {
        inlineData: {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const,
          data: "eGxzeA==",
        },
      },
      {
        inlineData: {
          mimeType: "text/markdown" as const,
          data: Buffer.from("## heading", "utf8").toString("base64"),
        },
      },
    ]);

    expect(parts.every((part) => "text" in part)).toBe(true);
    expect((parts[0] as { text: string }).text).toContain("attachment");
    expect((parts[1] as { text: string }).text).toContain("heading");
  });

  test("builds attachment manifests with modality and hash", () => {
    const manifests = buildAttachmentManifests([
      {
        inlineData: {
          mimeType: "audio/wav" as const,
          data: "UklGRiQAAABXQVZF",
        },
      },
    ]);

    expect(manifests).toHaveLength(1);
    expect(manifests[0]?.modality).toBe("audio");
    expect(typeof manifests[0]?.contentHash).toBe("string");
    expect(manifests[0]?.contentHash.length).toBeGreaterThan(10);
  });
});
