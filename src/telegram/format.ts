import {
  chunkMarkdownIR,
  markdownToIR,
  type MarkdownLinkSpan,
  type MarkdownIR,
} from "../markdown/ir.js";
import { renderMarkdownWithMarkers } from "../markdown/render.js";
import type { MarkdownTableMode } from "../config/types.base.js";

export type TelegramFormattedChunk = {
  html: string;
  text: string;
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtmlAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function buildTelegramLink(link: MarkdownLinkSpan, _text: string) {
  const href = link.href.trim();
  if (!href) return null;
  if (link.start === link.end) return null;
  const safeHref = escapeHtmlAttr(href);
  return {
    start: link.start,
    end: link.end,
    open: `<a href="${safeHref}">`,
    close: "</a>",
  };
}

function renderTelegramHtml(ir: MarkdownIR): string {
  return renderMarkdownWithMarkers(ir, {
    styleMarkers: {
      bold: { open: "<b>", close: "</b>" },
      italic: { open: "<i>", close: "</i>" },
      strikethrough: { open: "<s>", close: "</s>" },
      code: { open: "<code>", close: "</code>" },
      code_block: { open: "<pre><code>", close: "</code></pre>" },
    },
    escapeText: escapeHtml,
    buildLink: buildTelegramLink,
  });
}

export function markdownToTelegramHtml(
  markdown: string,
  options: { tableMode?: MarkdownTableMode } = {},
): string {
  const ir = markdownToIR(markdown ?? "", {
    linkify: true,
    headingStyle: "none",
    blockquotePrefix: "",
    tableMode: options.tableMode,
  });
  return renderTelegramHtml(ir);
}

export function renderTelegramHtmlText(
  text: string,
  options: { textMode?: "markdown" | "html"; tableMode?: MarkdownTableMode } = {},
): string {
  const textMode = options.textMode ?? "markdown";
  if (textMode === "html") return text;
  return markdownToTelegramHtml(text, { tableMode: options.tableMode });
}

function splitTelegramChunkByHtmlLimit(
  chunk: MarkdownIR,
  htmlLimit: number,
  renderedHtmlLength: number,
): MarkdownIR[] {
  const currentTextLength = chunk.text.length;
  if (currentTextLength <= 1) {
    return [chunk];
  }
  const proportionalLimit = Math.floor(
    (currentTextLength * htmlLimit) / Math.max(renderedHtmlLength, 1),
  );
  const candidateLimit = Math.min(currentTextLength - 1, proportionalLimit);
  const splitLimit =
    Number.isFinite(candidateLimit) && candidateLimit > 0
      ? candidateLimit
      : Math.max(1, Math.floor(currentTextLength / 2));
  const split = chunkMarkdownIR(chunk, splitLimit);
  if (split.length > 1) {
    return split;
  }
  return chunkMarkdownIR(chunk, Math.max(1, Math.floor(currentTextLength / 2)));
}

function renderTelegramChunksWithinHtmlLimit(
  ir: MarkdownIR,
  limit: number,
): TelegramFormattedChunk[] {
  const normalizedLimit = Math.max(1, Math.floor(limit));
  const pending = chunkMarkdownIR(ir, normalizedLimit);
  const rendered: TelegramFormattedChunk[] = [];
  while (pending.length > 0) {
    const chunk = pending.shift();
    if (!chunk) {
      continue;
    }
    const html = wrapFileReferencesInHtml(renderTelegramHtml(chunk));
    if (html.length <= normalizedLimit || chunk.text.length <= 1) {
      rendered.push({ html, text: chunk.text });
      continue;
    }
    const split = splitTelegramChunkByHtmlLimit(chunk, normalizedLimit, html.length);
    if (split.length <= 1) {
      // Worst-case safety: avoid retry loops, deliver the chunk as-is.
      rendered.push({ html, text: chunk.text });
      continue;
    }
    pending.unshift(...split);
  }
  return rendered;
}

export function markdownToTelegramChunks(
  markdown: string,
  limit: number,
  options: { tableMode?: MarkdownTableMode } = {},
): TelegramFormattedChunk[] {
  const ir = markdownToIR(markdown ?? "", {
    linkify: true,
    headingStyle: "none",
    blockquotePrefix: "",
    tableMode: options.tableMode,
  });
<<<<<<< HEAD
  const chunks = chunkMarkdownIR(ir, limit);
  return chunks.map((chunk) => ({
    html: renderTelegramHtml(chunk),
    text: chunk.text,
  }));
=======
  return renderTelegramChunksWithinHtmlLimit(ir, limit);
>>>>>>> 69c39368e (fix: enforce telegram shared outbound chunking)
}

export function markdownToTelegramHtmlChunks(markdown: string, limit: number): string[] {
  return markdownToTelegramChunks(markdown, limit).map((chunk) => chunk.html);
}
