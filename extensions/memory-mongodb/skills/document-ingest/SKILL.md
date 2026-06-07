---
name: document-ingest
description: Ingest PDFs, Office files, text documents, tables, and scanned documents into DAISy durable memory using memory_ingest_document, deterministic extraction, optional OCR, and recall verification.
---

# Document Ingest

Use this skill when the user asks to ingest, learn, remember, summarize-and-remember, or extract a document into DAISy memory.

Trigger examples:

- "ingest this PDF"
- "read this PDF into memory"
- "commit this document to durable memory"
- "learn this document"
- "summarize this document and remember it"
- "extract this document into DAISy memory"

## Required Flow

1. Prefer `memory_ingest_document` for all supported local document ingestion.
2. Do not store raw PDF, Office, image, or full-document inline payloads as ordinary durable memory.
3. If `memory_ingest_document` is unavailable, follow the `memory-ops` skill and use `memory_capture` / `memory_recallx` only after deterministic extraction has produced real text, summaries, chunks, and provenance.
4. Require recall verification after capture. A successful ingest reports whether the manifest and at least one child concept were recallable.
5. Summarize the outcome concisely for Hugh: filename/title, extraction status, OCR status, chunks/tables created, memory IDs or duplicate outcomes, recall pass/fail, and warnings.

## Tool Examples

PDF dry run:

```json
{
  "filePath": "/path/to/file.pdf",
  "title": "Small Business Management in the 21st Century",
  "mode": "summary_and_chunks",
  "dryRun": true
}
```

Full PDF ingest:

```json
{
  "filePath": "/path/to/file.pdf",
  "title": "Small Business Management in the 21st Century",
  "tags": ["small-business", "training"],
  "enableOcr": true,
  "enableTables": true,
  "dryRun": false
}
```

Scanned PDF with OCR:

```json
{
  "filePath": "/path/to/scanned.pdf",
  "enableOcr": true,
  "dryRun": false
}
```

DOCX ingest:

```json
{
  "filePath": "/path/to/proposal.docx",
  "tags": ["proposal"],
  "dryRun": false
}
```

`ocr_extract` OCR-only diagnostic:

```json
{
  "filePath": "/path/to/page.png",
  "mimeType": "image/png",
  "mode": "auto"
}
```

## Failure Handling

- `missing_file`, `path_is_directory`, and `unsupported_mime_type`: report the exact reason and do not capture memory.
- `pdf_no_extractable_text`: retry only if OCR is enabled and available; otherwise report the no-text condition.
- `ocr_unavailable`: report that OCR is optional and no local engine is configured.
- `memory_capture_failed` or `recall_verification_failed`: do not claim ingest succeeded; report the capture or recall failure and preserve the tool details.

## Policy

General memory policy comes from the `memory-ops` skill:

- scoped memory only
- sparse durable capture
- secret rejection unless explicitly classified
- no raw transcript or full-document dumps
- hygiene only through reviewed `memory_hygiene` plans
