# One-Shot End-to-End Code Specification: Memory-Ops Document Ingest Skill + Durable Document Memory Pipeline

You are an expert software engineer. Complete this in one pass.

## 1) Mission

Build: **Memory-Ops Document Ingest Skill + Durable Document Memory Pipeline**

Primary outcome: DAISy agents can ingest user-provided documents, extract usable content, summarize and structure that content, commit it to durable MongoDB-backed memory, and verify later recall.

Success metrics:

- Text-bearing PDFs of at least 500 pages can be ingested without storing placeholder-only memory.
- Scanned/image-only PDFs are detected and handled through OCR fallback when OCR support is available.
- DOCX, PPTX, XLSX, TXT, Markdown, CSV, JSON, HTML, XML, and PDF documents are accepted through one deterministic ingestion interface.
- Ingestion creates durable `memory_capture` entries with real extracted/summarized text, source metadata, tags, file hash, page/chunk provenance, and parent/child linkage.
- Table-heavy documents produce at least basic extracted table summaries where possible.
- Recall verification retrieves:
  - the document manifest memory,
  - at least one summary memory,
  - at least one concept/chunk memory.
- No raw full-document dumps are stored as ordinary durable memory.
- Existing `memory-mongodb` behavior remains compatible.
- Tests cover extraction, chunking, OCR fallback detection, Office document extraction, table extraction, memory entry shaping, and recall-verification planning.

## 2) Context

The target repo is:

```text
hughdidit/DAISy-Agency
branch: daisy/dev
```

The `memory-mongodb` plugin already provides durable memory through MongoDB MCP and Gemini embeddings. It exposes memory tools such as:

- `memory_recall`
- `memory_recallx`
- `memory_store`
- `memory_capture`
- `memory_hygiene`
- `memory_audit`

The plugin already accepts `application/pdf` as a supported document MIME type, but raw inline PDF capture is inadequate because it can produce placeholder-style durable text such as `[attachment:application/pdf]` instead of extracted knowledge. The fix is a real document-ingestion pipeline:

```text
local document
→ deterministic extraction
→ optional OCR fallback
→ optional table extraction
→ document/chapter/page-aware chunking
→ summary planning
→ memory_capture entries
→ recall verification
```

The `memory-mongodb` plugin already supports plugin-shipped skills through its `openclaw.plugin.json` skills declaration. This feature should live under the plugin so it is available when the memory provider is enabled.

## 3) Hard Requirements

### 3.1 Feature shape

Implement the feature as both:

1. A plugin-shipped skill for agent workflow guidance.
2. A first-class plugin tool for deterministic document ingestion.

Add:

```text
extensions/memory-mongodb/skills/document-ingest/SKILL.md
extensions/memory-mongodb/skills/document-ingest/scripts/document-ingest.mjs
```

Add a registered plugin tool:

```text
memory_ingest_document
```

The skill is the user/agent-facing procedure. The tool is the deterministic implementation surface. The helper script is the local extraction engine used by the tool and available for diagnostics.

### 3.2 New tool: `memory_ingest_document`

Register a new tool in the `memory-mongodb` plugin:

```ts
memory_ingest_document({
  filePath: string,
  filename?: string,
  mimeType?: string,
  title?: string,
  mode?: "manifest_only" | "summary" | "chunks" | "summary_and_chunks",
  tags?: string[],
  sourceMessageIds?: string[],
  maxCharsPerChunk?: number,
  maxChunks?: number,
  enableOcr?: boolean,
  enableTables?: boolean,
  dryRun?: boolean
})
```

Defaults:

```json
{
  "mode": "summary_and_chunks",
  "maxCharsPerChunk": 18000,
  "maxChunks": 80,
  "enableOcr": true,
  "enableTables": true,
  "dryRun": false
}
```

Behavior:

- Resolve scope using existing memory-mongodb scope rules.
- Extract document text and metadata.
- Build a document manifest.
- Build page-aware or section-aware chunks.
- Generate durable memory entry candidates.
- If `dryRun: true`, return candidates but do not call capture.
- If `dryRun: false`, store entries using the existing `MemoryOpsService.capture` path.
- Run recall verification after capture.
- Return structured JSON details:
  - extraction result,
  - created memory IDs,
  - duplicate outcomes,
  - recall verification results,
  - warnings.

The tool must not write directly to MongoDB except through existing memory DB/provider abstractions already used by memory-ops. Do not create a separate direct MongoDB client.

### 3.3 Skill requirements

Add:

```text
extensions/memory-mongodb/skills/document-ingest/SKILL.md
```

The skill must:

- Be AgentSkills-compatible.
- Trigger on:
  - “ingest this PDF”
  - “read this PDF into memory”
  - “commit this document to durable memory”
  - “learn this document”
  - “summarize this document and remember it”
  - “extract this document into DAISy memory”
- Instruct the agent to prefer `memory_ingest_document` over ad hoc tool use.
- Explicitly forbid storing raw PDF inline payloads as ordinary durable memory.
- Require recall verification.
- Explain failure handling.
- Include examples for:
  - PDF ingest,
  - scanned PDF with OCR,
  - DOCX ingest,
  - dry run,
  - memory verification.
- Tell the agent to report concise ingestion outcomes to Hugh.

### 3.4 Helper script

Add:

```text
extensions/memory-mongodb/skills/document-ingest/scripts/document-ingest.mjs
```

The helper script must:

- Accept a local file path.
- Accept flags:
  - `--mime <mimeType>`
  - `--title <title>`
  - `--max-chars-per-chunk <number>`
  - `--max-chunks <number>`
  - `--ocr auto|off|always`
  - `--tables auto|off|always`
  - `--json`
- Infer MIME type from extension when `--mime` is omitted.
- Compute SHA-256 content hash.
- Return deterministic JSON.
- Never call external LLM APIs.
- Never mutate source files.
- Never write to memory.
- Never make network calls.
- Never print secrets.

The helper should be usable independently for diagnostics, while `memory_ingest_document` should be the normal runtime tool.

### 3.5 Supported MIME types

Support v1 ingestion for:

PDF:

- `application/pdf`

Text-like:

- `text/plain`
- `text/markdown`
- `text/csv`
- `application/json`
- `application/ld+json`
- `application/x-ndjson`
- `application/xml`
- `text/xml`
- `text/html`
- `application/rtf`
- `text/rtf`
- `application/toml`
- `text/x-toml`
- common code/text formats already supported by the memory payload chunker

Office:

- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `application/vnd.ms-powerpoint`
- `application/vnd.openxmlformats-officedocument.presentationml.presentation`

Apple/Google Workspace MIME variants may be accepted as manifests, but actual extraction can fail clearly unless a local export/extraction path exists.

### 3.6 Extraction engines

Use deterministic local extraction.

Preferred implementations:

PDF:

- Use `pdfjs-dist` or a compatible Node PDF parser for text-layer extraction.
- Preserve page count and page numbers.
- Detect PDFs with no extractable text.

OCR:

- Add optional OCR fallback behind `enableOcr` / `--ocr`.
- Prefer a local, optional OCR dependency.
- Do not require OCR to be installed for normal tests.
- If OCR is requested but unavailable, return a clear `ocr_unavailable` warning or failure depending on mode.
- Do not use OCR repeatedly or unnecessarily.
- Only invoke OCR when:
  - PDF text extraction returns no usable text, or
  - `--ocr always` is provided.

Office documents:

- Use deterministic local libraries where feasible:
  - DOCX: extract document text from the ZIP XML structure or use a lightweight library.
  - XLSX: extract sheet names, cell text, and simple table-like rows.
  - PPTX: extract slide text from XML.
- Preserve document structure where practical:
  - DOCX: paragraphs/headings.
  - XLSX: workbook/sheet/table-ish row ranges.
  - PPTX: slide numbers.

Tables:

- For PDFs: basic table extraction is acceptable as text-flow reconstruction only.
- For XLSX: tables/sheets must be represented more explicitly.
- For CSV: treat as table text and include column/header information.
- For extracted tables, create table summaries or table chunks with tags:
  - `table`
  - `spreadsheet`
  - `csv`
  - sheet name if applicable.

### 3.7 Output contract

The helper and tool should share an internal normalized output model.

Success shape:

```json
{
  "ok": true,
  "document": {
    "title": "string",
    "filename": "string",
    "path": "string",
    "mimeType": "string",
    "sha256": "string",
    "byteLength": 0,
    "pageCount": 0,
    "slideCount": 0,
    "sheetCount": 0,
    "extractionStatus": "ok",
    "ocrStatus": "not_needed",
    "tableExtractionStatus": "not_needed",
    "extractedCharCount": 0,
    "chunkCount": 0
  },
  "chunks": [
    {
      "chunkId": "string",
      "index": 0,
      "kind": "text",
      "title": "string",
      "pageStart": 1,
      "pageEnd": 1,
      "slideStart": 1,
      "slideEnd": 1,
      "sheetName": "string",
      "charStart": 0,
      "charEnd": 0,
      "text": "string"
    }
  ],
  "tables": [
    {
      "tableId": "string",
      "index": 0,
      "source": "string",
      "page": 1,
      "sheetName": "string",
      "rowStart": 1,
      "rowEnd": 20,
      "headers": ["string"],
      "text": "string"
    }
  ],
  "suggestedMemoryCapture": {
    "entries": []
  },
  "warnings": []
}
```

Failure shape:

```json
{
  "ok": false,
  "error": {
    "code": "string",
    "message": "string"
  },
  "warnings": []
}
```

### 3.8 Error codes

Use stable error codes:

- `missing_file`
- `path_is_directory`
- `unsupported_mime_type`
- `file_too_large`
- `pdf_parse_failed`
- `pdf_no_extractable_text`
- `ocr_unavailable`
- `ocr_failed`
- `office_parse_failed`
- `text_decode_failed`
- `table_parse_failed`
- `invalid_argument`
- `memory_capture_failed`
- `recall_verification_failed`
- `internal_error`

### 3.9 Chunking

Rules:

- Default `maxCharsPerChunk`: `18000`.
- Default `maxChunks`: `80`.
- Prefer page-aware chunks for PDFs.
- Prefer slide-aware chunks for PPTX.
- Prefer sheet-aware/table-aware chunks for XLSX and CSV.
- Preserve source ranges.
- Avoid splitting mid-page/mid-slide when possible.
- If a single source unit exceeds chunk size, split at paragraph/row boundaries where possible.
- Use deterministic chunk IDs:
  - `doc-manifest`
  - `page-0001-0008`
  - `slide-0001-0004`
  - `sheet-<safe-name>-rows-0001-0050`
  - `table-0001`

### 3.10 Memory model and parent/child linkage

Use additive metadata inside existing memory shape. Do not require a Mongo schema migration.

Every document-ingest memory entry should include metadata ops fields via `memory_capture` candidate shaping where available.

Add a document-level parent ID model:

- The document manifest is the parent memory.
- Chunk/table/summary memories should reference the parent through metadata:
  - `documentId`
  - `documentSha256`
  - `parentMemoryId` when known after manifest capture
  - `chunkId`
  - `sourceRange`

Because `memory_capture` currently returns outcomes after creation, implement a two-pass capture:

1. Capture manifest first.
2. Resolve manifest memory ID from the outcome.
3. Capture child entries with `parentMemoryId` in metadata if the candidate schema supports it.
4. If candidate schema does not yet support arbitrary metadata, extend `MemoryCaptureCandidate` safely to allow `metadata` or `document` subobject with strict validation.

Required document metadata fields:

```json
{
  "document": {
    "title": "string",
    "filename": "string",
    "mimeType": "string",
    "sha256": "string",
    "byteLength": 0,
    "pageCount": 0,
    "chunkId": "string",
    "parentMemoryId": "string",
    "sourceRange": {
      "pages": [1, 8],
      "slides": [1, 4],
      "sheetName": "string",
      "rows": [1, 50]
    }
  }
}
```

### 3.11 Memory capture behavior

The tool must use structured `memory_capture` entries.

Entry types:

1. Document manifest memory
   - `kind`: `semantic`
   - `category`: `fact`
   - `importance`: `0.8`
   - `confidence`: `0.95`
   - tags:
     - `document`
     - `document-ingest`
     - MIME-derived tag
     - user-provided tags

2. Document summary memory
   - `kind`: `semantic`
   - `category`: `fact`
   - `importance`: `0.85`
   - `confidence`: `0.9`
   - tags:
     - `document`
     - `document-summary`
     - user-provided tags

3. Chunk memories
   - `kind`: `semantic`
   - `category`: `fact`
   - `importance`: `0.65`
   - `confidence`: `0.85`
   - tags:
     - `document`
     - `document-chunk`
     - source type tags

4. Table memories
   - `kind`: `semantic`
   - `category`: `fact`
   - `importance`: `0.7`
   - `confidence`: `0.85`
   - tags:
     - `document`
     - `table`
     - source type tags

The system must not store raw whole-document dumps as a single durable memory.

### 3.12 Summarization responsibility

The helper script does not call LLMs.

The plugin tool may initially create extractive summaries using deterministic truncation and headings. The skill must instruct the agent to improve/condense summaries before memory capture when using the skill directly.

If the agent uses `memory_ingest_document`, the tool should produce safe extractive memory entries by default. Later LLM-generated summaries can be layered on top, but the initial implementation must work without requiring a summarization API inside the helper.

### 3.13 Recall verification

After successful capture, `memory_ingest_document` must run recall verification unless `dryRun: true`.

Verification queries:

1. Document title or filename.
2. SHA-256 short prefix.
3. At least one key phrase extracted from the first meaningful summary/chunk.
4. If tables exist, one table-specific query.

Pass condition:

- At least one recall result references the document manifest or child memory.
- At least one recall result matches a chunk/summary concept.
- Table query passes if table memories were created.

Return:

```json
{
  "recallVerification": {
    "pass": true,
    "queries": [
      {
        "query": "string",
        "hitCount": 1,
        "matchedIds": ["string"]
      }
    ]
  }
}
```

### 3.14 Documentation updates

Update:

```text
docs/plugins/memory-mongodb.md
```

Add or expand:

```text
## Document Ingestion Skill and Tool
```

Document:

- What the feature does.
- Supported formats.
- Text-bearing PDF extraction.
- OCR fallback behavior.
- Office document behavior.
- Table behavior.
- Parent/child memory relationship.
- Dry-run behavior.
- Recall verification.
- Troubleshooting.
- Known limitations.
- Example commands.

### 3.15 Optional UI action

Add a minimal UI-facing affordance only if the existing architecture has a clear low-risk place for it.

Acceptable minimal implementation:

- Expose the skill/tool so future UI can call it.
- Add docs for a future “Ingest to Memory” UI action.

Do not create a new full UI flow unless the repo already has an obvious file-action hook. If no obvious hook exists, document this as:

```text
BLOCKED: No stable file-action UI extension point identified in this pass.
```

## 4) Non-Goals

Out of scope:

- Cloud OCR services.
- Remote URL fetching.
- Google Drive export/fetch.
- Persisting original binary documents in MongoDB.
- Full document management UI.
- Complex layout-preserving PDF reconstruction.
- Perfect table reconstruction from arbitrary PDFs.
- Full semantic chapter outlining using external LLMs inside the helper.
- Changing Atlas vector index definitions.
- Replacing `memory_capture`.
- Direct MongoDB writes outside the existing memory provider path.

## 5) Inputs You Can Assume

Users:

- Hugh as operator.
- DAISy main agent.
- DAISy subagents.
- Codex Desktop implementing this spec.

Environment:

- Local/dev first.
- CI test execution.
- Runtime: Node 22+.
- Package manager: `pnpm`.

Existing repo/project:

- `hughdidit/DAISy-Agency`
- branch: `daisy/dev`
- OpenClaw 2026.3.2 fork
- memory plugin: `extensions/memory-mongodb`

Constraints:

- Memory records must be scoped to the invoking agent/subagent.
- MongoDB access remains MCP/provider mediated.
- Secret detection must remain active.
- No placeholder-only document memory.
- No raw transcript/document dumps as ordinary memory.
- No weakening sandbox or launcher security.

Tech stack:

- TypeScript / Node ESM.
- Vitest.
- AgentSkills-compatible `SKILL.md`.
- Existing plugin SDK.

Interfaces:

- Plugin tool: `memory_ingest_document`
- Skill: `document-ingest`
- CLI helper: `document-ingest.mjs`
- Existing memory tools.

Data/storage:

- Existing `daisy_memory.memories`
- Existing `daisy_memory.memory_events`
- No new required collections.

Security:

- Existing auth and memory scope rules.
- Existing secret handling.
- Local file path validation.
- No network in helper.

Performance targets:

- Small fixture tests complete quickly.
- 500-page text-bearing PDF processes without unbounded memory growth.
- Default `maxChunks` prevents runaway memory writes.
- OCR fallback is opt-controlled and skipped unless needed.

Compatibility:

- macOS.
- Linux.
- Windows/WSL2.
- CI without Poppler.
- CI without mandatory OCR binaries.

External services/APIs:

- None required by helper.
- Existing Gemini/MongoDB services used only by memory plugin runtime where already configured.

## 6) Required Deliverables

Produce all of the following:

1. Architecture summary:
   - skill
   - helper script
   - plugin tool
   - extraction engines
   - memory capture
   - recall verification

2. File tree:
   - new files
   - changed files

3. Complete code for each file:
   - skill file
   - helper script
   - plugin tool changes
   - extraction modules if split out
   - tests
   - fixtures
   - docs

4. Migration/config/env changes:
   - dependency additions
   - no required DB migration
   - optional OCR dependency handling

5. Tests:
   - unit
   - integration-style
   - edge cases
   - no-network assertions where practical

6. Runbook:
   - install
   - run helper
   - run tool manually if available
   - run tests
   - lint
   - build

7. Verification checklist mapped to requirements.

8. Risks, tradeoffs, and follow-up improvements.

## 7) Output Format Strict

Return implementation output in this order:

1. Assumptions
2. Plan
3. Code grouped by file path
4. Test commands and expected output
5. Acceptance criteria pass/fail table

Rules:

- If information is missing, make the most reasonable assumption and proceed.
- Do not leave TODOs unless marked `BLOCKED: <reason>`.
- Prefer production-safe defaults.
- Keep naming deterministic.
- Every generated code file must begin with a comment containing its intended file path.
- Do not weaken existing memory, MCP, sandbox, or secret policies.
- Do not add large binary fixtures.
- Do not introduce direct MongoDB access.
- Keep the PR focused.

## 8) Quality Bar

Implementation must meet this bar:

- Clean architecture.
- Readable code.
- Typed where practical.
- Deterministic output.
- Useful errors.
- Secure defaults.
- Input validation.
- Scope-safe memory writes.
- No placeholder-only document memories.
- Meaningful tests.
- No critical lint/type errors.
- Edge cases covered.
- Runbook is complete.

## 9) Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| AC-1 | Skill exists | `extensions/memory-mongodb/skills/document-ingest/SKILL.md` exists and is AgentSkills-compatible |
| AC-2 | Helper exists | `document-ingest.mjs` exists and runs under Node 22+ |
| AC-3 | Plugin tool exists | `memory_ingest_document` is registered by memory-mongodb |
| AC-4 | Text PDF works | Small text-bearing PDF extracts text, page count, chunks, hash, and returns `ok: true` |
| AC-5 | Scanned PDF handled | No-text PDF triggers OCR path or clear `pdf_no_extractable_text` / `ocr_unavailable` result |
| AC-6 | Text formats work | TXT, Markdown, CSV, JSON, HTML/XML return valid chunks |
| AC-7 | Office formats work | DOCX, XLSX, and PPTX fixtures produce extracted text or clear supported failure |
| AC-8 | Tables handled | CSV/XLSX table-like data creates table chunks or table summaries |
| AC-9 | Unsupported MIME failure | Unsupported files return stable error JSON |
| AC-10 | Missing file failure | Missing paths return stable error JSON |
| AC-11 | Deterministic chunking | Same input and flags produce same chunk IDs and text |
| AC-12 | No placeholder-only memory | No candidate stores only `[attachment:<mime>]` |
| AC-13 | Parent/child linkage | Manifest and child chunk/table entries include document linkage metadata |
| AC-14 | Dry run works | `dryRun: true` returns candidates without memory capture |
| AC-15 | Capture works | `dryRun: false` captures manifest and child entries through memory-ops |
| AC-16 | Recall verification works | Tool returns pass/fail recall verification details |
| AC-17 | Docs updated | `docs/plugins/memory-mongodb.md` documents the new skill/tool |
| AC-18 | No network helper | Helper makes no network/API calls |
| AC-19 | No direct DB writes | Feature uses existing memory provider/capture paths |
| AC-20 | Existing tests pass | Existing memory-mongodb tests still pass |
| AC-21 | CI compatible | Tests pass without Poppler or mandatory OCR binaries |

## 10) Project-Specific Details

### 10.1 Naming

Use:

```text
document-ingest
memory_ingest_document
document-ingest.mjs
```

Suggested files:

```text
extensions/memory-mongodb/skills/document-ingest/SKILL.md
extensions/memory-mongodb/skills/document-ingest/scripts/document-ingest.mjs
extensions/memory-mongodb/document-ingest.ts
extensions/memory-mongodb/document-ingest.test.ts
extensions/memory-mongodb/test-fixtures/document-ingest/
docs/plugins/memory-mongodb.md
```

### 10.2 Skill command examples

PDF:

```bash
node extensions/memory-mongodb/skills/document-ingest/scripts/document-ingest.mjs   "/path/to/file.pdf"   --mime application/pdf   --title "Small Business Management in the 21st Century"   --json
```

Scanned PDF with OCR auto:

```bash
node extensions/memory-mongodb/skills/document-ingest/scripts/document-ingest.mjs   "/path/to/scanned.pdf"   --ocr auto   --json
```

DOCX:

```bash
node extensions/memory-mongodb/skills/document-ingest/scripts/document-ingest.mjs   "./proposal.docx"   --json
```

Dry-run tool call:

```json
{
  "filePath": "/path/to/file.pdf",
  "title": "Small Business Management in the 21st Century",
  "mode": "summary_and_chunks",
  "dryRun": true
}
```

Full tool call:

```json
{
  "filePath": "/path/to/file.pdf",
  "title": "Small Business Management in the 21st Century",
  "mode": "summary_and_chunks",
  "tags": ["small-business", "training"],
  "enableOcr": true,
  "enableTables": true,
  "dryRun": false
}
```

### 10.3 Document memory text examples

Manifest memory:

```text
Document ingested: Small Business Management in the 21st Century.
Filename: 02 - Small Business Management in the 21st Century.pdf.
MIME type: application/pdf.
Pages: 873.
SHA-256: <hash>.
Chunks extracted: <count>.
Extraction status: ok.
OCR status: not_needed.
Table extraction status: partial.
```

Summary memory:

```text
Document summary: Small Business Management in the 21st Century is a practical small-business management text organized around customer value, cash flow, and digital technology/e-business as recurring decision-making themes.
```

Chunk memory:

```text
Document chunk summary: Chapter 1 explains the role of small business in the US economy, including employment, innovation, historical context, definitions of small business, and recurring risks around management, finance, and external conditions. Source: pages 3-55.
```

Table memory:

```text
Document table summary: Table 1.1 lists SBA small-business size standards by NAICS industry, showing that thresholds vary by industry and may be expressed in revenue or employee count. Source: pages 7-8.
```

### 10.4 Tests

Use small fixtures:

```text
sample.txt
sample.md
sample.json
sample.csv
sample.pdf
sample-no-text.pdf
sample.docx
sample.xlsx
sample.pptx
```

Do not add the 873-page PDF.

Tests should assert:

- JSON shape.
- Error shape.
- Determinism.
- No placeholder-only entries.
- Required tags.
- Required document metadata.
- Parent/child linkage.
- Dry run does not capture.
- Capture path can be mocked.
- Recall verification can be mocked.

### 10.5 Security specifics

The implementation must:

- Resolve and validate local paths.
- Reject directories.
- Enforce file size limits.
- Avoid network calls.
- Avoid shell execution except optional OCR wrapper guarded behind explicit availability checks.
- Avoid environment logging.
- Preserve existing secret classification.
- Preserve scope isolation.

### 10.6 Documentation section draft

Add a section like:

```markdown
## Document Ingestion Skill and Tool

The `memory-mongodb` plugin ships a `document-ingest` skill and `memory_ingest_document` tool for converting supported documents into durable structured memory.

The ingestion flow is:

1. Extract text locally.
2. Use OCR only when requested/needed and available.
3. Chunk by page, slide, sheet, row range, or character range.
4. Build document manifest, summary, chunk, and table memory candidates.
5. Store through `memory_capture`.
6. Verify recall with `memory_recallx`.

Do not store raw PDF inline payloads directly as durable memory. Extract first, summarize or structure second, capture third, verify recall last.
```

Include limitations:

- OCR quality varies.
- PDF table extraction is best-effort.
- Office XML extraction is text-oriented, not layout-perfect.
- Large documents are capped by chunk limits.
- Original binary files are not persisted by this feature.

### 10.7 Risks and tradeoffs

Risks:

- PDF extraction quality varies by PDF generator.
- OCR adds complexity and may not be installed in all environments.
- PDF table extraction is inherently unreliable.
- Office documents may contain embedded objects that are not extracted.
- Very large documents may still need operator-selected page ranges later.
- Agent-generated summaries may vary; deterministic extractive entries provide the fallback.

Tradeoffs:

- Local deterministic extraction is safer and CI-friendly compared with cloud extraction.
- Parent/child linkage through metadata avoids schema migration but is less relationally strict.
- Optional OCR improves usability but must not become a hard dependency.
- Tool-first design is more robust than skill-only orchestration.

### 10.8 Future improvements after this PR

After this PR lands, consider:

- UI action: “Ingest to Memory.”
- Page-range selection UI.
- Better OCR packaging for sandbox images.
- Full table extraction for PDFs using a specialized local parser.
- Better Office document structure extraction.
- Document re-ingestion / update detection by SHA-256.
- Memory hygiene strategy for replacing older document ingests with newer versions.
- Document citation support in recall output.
- Per-document deletion command that removes manifest and child memories together.
