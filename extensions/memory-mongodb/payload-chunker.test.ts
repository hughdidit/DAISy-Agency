import { describe, expect, test } from "vitest";
import {
  PayloadChunker,
  multimodalPartsToFallbackText,
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
});