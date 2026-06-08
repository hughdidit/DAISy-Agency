# Memory Plugin - MongoDB MCP + Gemini

Persistent long-term memory for DAISy using MongoDB Atlas through the official MongoDB MCP server and Gemini Embedding 2 for multimodal embeddings.

## Architecture Summary

### Components

- `memory-mongodb` plugin: registers memory tools, CLI commands, and lifecycle hooks.
- `McpClientService`: MCP client wrapper for MongoDB tool calls (`connect`, `insert-many`, `aggregate`, `delete-many` with exact `_id` filters for single-memory deletes).
- `PayloadChunker`: validates multimodal parts, enforces supported MIME types, shards oversized payloads into Gemini-safe request chunks.
- `GeminiService`: native `fetch`-based embedding client using `gemini-embedding-2-preview` with output dimensionality fixed to `1536` and manual L2 normalization.
- `MongoMemoryDB`: memory store/search manager built on MCP + Gemini services.
- `MemoryAutonomyService`: self-administered ordinary memory scoring, per-agent precedence, dedupe, compaction, and score backfill.
- `memory_events` collection: append-only lifecycle history for capture, forget,
  hygiene, promotion, commitment updates, audit probes, usefulness scoring,
  dedupe, and compaction.

MongoDB access for this plugin is MCP-only. The plugin does not use a direct MongoDB driver path for runtime reads or writes.

### Data Flow

Store path:

1. Input memory is provided as multimodal `parts` (`text` and/or `inlineData` base64 media).
2. PayloadChunker validates and chunks the parts:
   - max 6 image/PDF parts per API request
   - large text parts split at ~28,000 chars per part
3. Gemini embedding vectors are generated per chunk and L2-normalized.
4. If multiple chunks are required, vectors are mean-pooled and normalized again.
5. Memory document is written via MCP `insert-many` with top-level routing fields
   copied from `metadata.ops` for Atlas filter pushdown.

Recall path:

1. Query text is embedded via Gemini.
2. MCP `aggregate` runs `$vectorSearch` against `vector_index_v2` with routing
   filters for tenant, workspace, scope, visibility, kind, status, sensitivity,
   and modality.
3. Results are projected and validated as memory candidates.
4. During additive rollout, legacy `vector_index` is searched as a compatibility
   fallback when scoped v2 search returns fewer than the requested results.
5. Top memories are returned to tools/hooks for context construction.
6. Phase 2 recall ranking combines vector similarity with global usefulness
   precedence and requesting-agent precedence from `metadata.ops`.

## Memory Autonomy

Phase 2 does not create a new memory record kind for usefulness. It adds optional
metadata to existing memory records:

- `metadata.ops.usefulness`
- `metadata.ops.agentUsefulness`
- `metadata.ops.dedupe`
- `metadata.ops.compaction`

Autonomy defaults allow ordinary non-secret memories to be captured, scored,
deduped, compacted, and promoted in recall precedence without per-memory human
approval. Secret-like content is not auto-captured as ordinary memory.

All autonomous changes are mirrored into append-only `memory_events` operations:

- `memory_usefulness_backfilled`
- `memory_usefulness_scored`
- `memory_agent_usefulness_scored`
- `memory_recall_feedback`
- `memory_precedence_promoted`
- `memory_precedence_demoted`
- `memory_dedupe_applied`
- `memory_compaction_applied`

Operator commands:

```bash
openclaw memory autonomy status
openclaw memory autonomy backfill-scores --dry-run --scope agent:daisy --limit 100
openclaw memory autonomy score --scope agent:daisy --agent daisy --dry-run
openclaw memory autonomy explain --memory-id <memory-id> --agent daisy
openclaw memory autonomy dedupe --scope agent:daisy --dry-run
openclaw memory autonomy compact --scope agent:daisy --dry-run
```

Backfill is idempotent by `metadata.ops.usefulness.backfillVersion`. Hard
deletion remains disabled by default; compaction demotes source records and
preserves source IDs for auditability.

## Configuration

The plugin must be enabled, slotted as the active memory provider, and the
built-in memory search system must be disabled. All three settings are required
for a clean deployment.

For `stdio` deployments, the MongoDB MCP child runs behind a least-privilege
launcher boundary: only approved child env keys are accepted, and custom
launchers are treated as privileged escape hatches instead of normal config.

When the gateway runs with a read-only container root, the plugin provisions a
plugin-scoped writable MCP runtime directory under the OpenClaw state dir and
passes that path to the child as its `HOME`/`TMPDIR`. If an enabled
`memory-mongodb` plugin cannot prepare that runtime directory or complete its
startup readiness query, gateway startup now fails fast instead of leaving the
memory tools partially registered but disconnected.

```jsonc
{
  // Disable the built-in memory search system (MemoryIndexManager).
  // Without this, the built-in system still tries to stat/read MEMORY.md
  // and memory/ from the workspace directory, producing sandbox boundary
  // errors and ENOENT warnings. plugins.slots.memory alone does NOT
  // disable the built-in — it only controls which plugin registers tools.
  "agents": {
    "defaults": {
      "memorySearch": {
        "enabled": false,
      },
    },
  },
  "plugins": {
    // Select memory-mongodb as the exclusive memory plugin.
    // This disables the default memory-core plugin.
    "slots": {
      "memory": "memory-mongodb",
    },
    "entries": {
      "memory-mongodb": {
        "enabled": true,
        "config": {
          "mcp": {
            "transport": "stdio",
            "stdio": {
              "env": {
                "MDB_MCP_CONNECTION_STRING": "${MONGODB_URI}",
              },
            },
          },
          "gemini": {
            "apiKey": "${GEMINI_API_KEY}",
            "embeddingModel": "gemini-embedding-2-preview",
          },
          "database": {
            "name": "daisy_memory",
            "collection": "memories",
            "indexName": "vector_index",
          },
          "retrieval": {
            "minScore": 0.1,
            "vectorLimit": 8,
            "numCandidatesMultiplier": 10,
          },
          "autoCapture": true,
          "autoRecall": true,
        },
      },
    },
  },
}
```

### Why three settings are needed

| Setting                                        | What it controls                                | What happens if omitted                                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins.slots.memory: "memory-mongodb"`       | Which plugin occupies the exclusive memory slot | Default `memory-core` plugin registers `memory_search`/`memory_get` tools instead                                                                   |
| `plugins.entries.memory-mongodb.enabled: true` | Whether the plugin is loaded                    | Plugin is not loaded; memory slot falls back to `memory-core`                                                                                       |
| `agents.defaults.memorySearch.enabled: false`  | Whether the built-in `MemoryIndexManager` runs  | Built-in system tries to index `MEMORY.md` and `memory/` from the workspace directory, producing sandbox/ENOENT errors in containerized deployments |

Sandboxed agents allow `group:memory` by default. When `memory-mongodb` is the
active memory slot, that group includes the MongoDB memory operations such as
`memory_recallx`, `memory_capture`, and `memory_ingest_document`. If an
operator replaces `tools.sandbox.tools.allow` or
`agents.list[].tools.sandbox.tools.allow`, the replacement must include either
`group:memory` or the specific memory tools the sandboxed agent should use.

> **Note:** The `memory-lancedb` extension has the same requirement — any
> third-party memory plugin that replaces the built-in system must also set
> `agents.defaults.memorySearch.enabled: false` to fully suppress it.

### Config Fields

| Field                                     | Required    | Default                      | Description                                                      |
| ----------------------------------------- | ----------- | ---------------------------- | ---------------------------------------------------------------- |
| `mcp.transport`                           | No          | `stdio`                      | `stdio` for managed local MCP process, `sse` for remote endpoint |
| `mcp.stdio.allowCustomLauncher`           | No          | `false`                      | Unsafe opt-in required before any custom MCP launcher override   |
| `mcp.stdio.command`                       | No          | bundled Node launcher        | Privileged override for the MongoDB MCP executable               |
| `mcp.stdio.args`                          | No          | resolved bundled entrypoint  | Privileged override for the MongoDB MCP entrypoint args          |
| `mcp.stdio.env.MDB_MCP_CONNECTION_STRING` | Yes (stdio) | -                            | MongoDB Atlas URI passed to MCP server                           |
| `mcp.url`                                 | Yes (sse)   | -                            | Remote MCP SSE URL                                               |
| `gemini.apiKey`                           | Yes         | -                            | Gemini API key                                                   |
| `gemini.embeddingModel`                   | No          | `gemini-embedding-2-preview` | Gemini embedding model                                           |
| `database.name`                           | No          | `daisy_memory`               | MongoDB database name                                            |
| `database.collection`                     | No          | `memories`                   | MongoDB collection name                                          |
| `database.eventCollection`                | No          | `memory_events`              | Append-only lifecycle event collection                           |
| `database.indexName`                      | No          | `vector_index`               | Atlas vector index name                                          |
| `database.indexNameV2`                    | No          | `vector_index_v2`            | Atlas vector index with scoped routing filters                   |
| `routing.tenantId`                        | No          | `default`                    | Tenant routing field written to new memory/event records         |
| `routing.workspaceId`                     | No          | `default`                    | Workspace routing field written to new memory/event records      |
| `routing.defaultVisibility`               | No          | `private`                    | Default record visibility; `private` preserves agent-local scope |
| `routing.legacyFallback`                  | No          | `true`                       | Query legacy index while additive backfill is incomplete         |
| `retrieval.minScore`                      | No          | `0.1`                        | Minimum vector similarity score                                  |
| `retrieval.vectorLimit`                   | No          | `8`                          | Max candidates returned from vector search                       |
| `retrieval.numCandidatesMultiplier`       | No          | `10`                         | `numCandidates = vectorLimit * multiplier`                       |
| `captureTriggers`                         | No          | built-in defaults            | Regex patterns that trigger auto-capture                         |
| `autoCapture`                             | No          | `true`                       | Auto-store significant memories from conversation                |
| `autoRecall`                              | No          | `true`                       | Auto-inject relevant memories before agent execution             |

`ops` block (all optional, safe defaults):

- `ops.enabled` (default `true`)
- `ops.preferenceMinObservations` (default `2`)
- `ops.preferenceMinStabilityScore` (default `0.8`)
- `ops.captureMinConfidence` (default `0.7`)
- `ops.hygieneMaxCandidates` (default `25`)
- `ops.auditCleanup` (default `true`)
- `ops.supportedDocumentMimeTypes` (document MIME allowlist)
- `ops.maxInlineDocumentBytesByMime` (per-MIME inline byte caps)
- `ops.schemaMode` (`additive` default; also `migrate-in-place` / `strict-validator`)

`mcp.stdio.env` is validated, not passed through wholesale. The only supported
child-process env keys are `MDB_MCP_CONNECTION_STRING` and approved TLS/cert
settings such as `NODE_EXTRA_CA_CERTS`, `NODE_USE_SYSTEM_CA`, `SSL_CERT_FILE`,
and `SSL_CERT_DIR`.

If you must use a non-bundled launcher, set `mcp.stdio.allowCustomLauncher`
explicitly and point `mcp.stdio.command` to an absolute executable path. Shell
and package-manager wrappers such as `bash`, `cmd`, `powershell`, `npm`, `pnpm`,
and `npx` are rejected, as is `corepack`.

## Atlas Setup

1. Create Atlas cluster and collection (`daisy_memory.memories` by default).
2. Create Atlas Vector Search indexes in the collection.
3. Set `numDimensions` to `1536` for Gemini Embedding 2 output.

Default index (`1536` dimensions):

```json
{
  "name": "vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "vector",
        "numDimensions": 1536,
        "similarity": "cosine"
      },
      {
        "type": "filter",
        "path": "category"
      },
      {
        "type": "filter",
        "path": "importance"
      },
      {
        "type": "filter",
        "path": "createdAt"
      }
    ]
  }
}
```

Scoped index (`1536` dimensions):

```json
{
  "name": "vector_index_v2",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "vector",
        "numDimensions": 1536,
        "similarity": "cosine"
      },
      { "type": "filter", "path": "tenantId" },
      { "type": "filter", "path": "workspaceId" },
      { "type": "filter", "path": "scopeSubject" },
      { "type": "filter", "path": "subjectType" },
      { "type": "filter", "path": "visibility" },
      { "type": "filter", "path": "category" },
      { "type": "filter", "path": "kind" },
      { "type": "filter", "path": "type" },
      { "type": "filter", "path": "sensitivity" },
      { "type": "filter", "path": "status" },
      { "type": "filter", "path": "modalities" },
      { "type": "filter", "path": "importance" },
      { "type": "filter", "path": "createdAt" },
      { "type": "filter", "path": "updatedAt" }
    ]
  }
}
```

Ordinary event-history indexes:

```javascript
db.memory_events.createIndex({ tenantId: 1, scopeSubject: 1, createdAt: -1 });
db.memory_events.createIndex({ tenantId: 1, workspaceId: 1, operation: 1, createdAt: -1 });
```

## Memory Document Shape

Each stored memory includes:

- `_id` (UUID)
- `text` (explicit text or fallback summary generated from parts)
- `vector` (1536-dim L2-normalized embedding)
- `category`
- `subCategory` (optional)
- `type` (`working`, `cache`, `episodic`, `semantic`, `procedural`, `associative`)
- top-level routing fields: `tenantId`, `workspaceId`, `scopeSubject`,
  `subjectType`, `visibility`, `kind`, `status`, `sensitivity`, `modalities`
- `importance`
- `metadata` (optional)
- `tags` (optional)
- `createdAt`, `updatedAt`

## Tools

- `memory_recall({ query, limit? })` (`limit` defaults to `5`)
- `memory_recallx({ query, limit?, kinds?, openCommitmentsOnly?, preferencesOnly?, modalities?, includeSecrets?, includeMetadata? })`
- `memory_store({ text, importance, category, sensitivity? })`
- `memory_store({ parts, text?, importance, category, sensitivity? })` for multimodal embedding
- `memory_forget({ memoryId })` or `memory_forget({ query })`; full UUID
  `memoryId` values are preferred, and unambiguous 8+ character ID prefixes are
  resolved only within the current scope before deletion
- `memory_capture({ entries[], dedupeThreshold?, rejectSecrets? })` where `entries[]` may include `sensitivity: "secret"` for explicit secret storage; `rejectSecrets` is retained for compatibility and no longer bypasses secret classification
- `memory_hygiene({ mode: "plan"|"apply", strategies?, maxCandidates?, planId?, planHash?, approvedActionIds? })` where `strategies[]` may include `dedupe`, `stale-prune`, `conflict-review`, and `promote`; `apply` requires a same-scope `planId`, matching `planHash`, and exact approved action IDs
- `commitment_tracker({ mode: "capture"|"list_open"|"resolve"|"cancel", ... })`
- `preference_miner({ mode: "observe"|"plan_promotions"|"apply_promotions"|"list", ... })`
- `memory_audit({ runId?, cleanupOnSuccess? })` to run probe capture/recall checks after memory config changes, recall-related deploys, or when recall reliability is uncertain; audit probes bypass semantic dedupe so stale probes cannot block a fresh audit, audit recall retries briefly for search-index consistency, and cleanup resolves any short stored ID to a unique exact scoped UUID before deleting. Raw output may include `token`, `storedId`, `resolvedStoredId`, `recallEvidenceIds`, `recallAttempts`, `cleanupReason`, and `reason` on failure, but routine summaries should report `pass: true|false`, `runId`, and, where available, `recallHits`, `latencyMs`, `cleanupResult`, and `reason`

Migration note:

- Advanced recall fields moved from `memory_recall` to `memory_recallx`.
- Mapping example: `memory_recall({ query, kinds, modalities, includeMetadata })` -> `memory_recallx({ query, kinds, modalities, includeMetadata })`.
- If you use explicit tool allowlists/registries, add `memory_recallx` alongside `memory_recall`.

### Delegate Scope Rules

- Tool reads and writes are scoped by default to the invoking subject:
  - `agent:<id>` for main agent sessions
  - `subagent:<id>` for sub-agent sessions
- If scope identity is missing, tool execution fails closed.
- No implicit fallback to another agent scope is performed.
- Shared or project memory is represented only by explicit `visibility` and
  routing policy; the default remains `private`.

### Memory-Ops Metadata

Memory records remain in the same `daisy_memory.memories` collection and use additive metadata:

- `metadata.source` remains required and preserved.
- `metadata.ops` includes:
  - `kind`, `scopeSubject`, `tenantId`, `workspaceId`, `subjectType`,
    `visibility`, `status`, `confidence`, `sensitivity`
  - `sourceMessageIds`, `observationCount`, `stabilityScore`
  - commitment fields (`owner`, `dueAt`, `followUpAt`, `supersedesId`)
- audit fields (`auditRunId`, ephemeral probe state)
  - attachment manifest summary and per-attachment descriptors

### Secret Memory Handling

- Secret-like content is rejected by default.
- Secret-like detection is pattern-based for common credential/token shapes such as API keys, passwords, bearer tokens, connection strings, private keys, and OTP-style verification codes.
- The agent may intentionally store a secret memory only by explicitly setting `sensitivity: "secret"` on `memory_store` or `memory_capture`.
- `memory_recall` never returns secret memories.
- `memory_recallx` excludes secret memories unless `includeSecrets: true` is set.
- Human-readable recall summaries redact secret values even when secret recall is explicitly enabled.
- Secret memories are ignored by ordinary `memory_hygiene` and preference-promotion flows.
- Rejected secret-like captures return `rejected_secret` with a reason telling the caller to re-submit using `sensitivity: "secret"` for intentional storage.

Examples:

- Store a secret with `memory_store({ text: "API key: sk-...", category: "fact", sensitivity: "secret" })`
- Store a secret with `memory_capture({ entries: [{ text: "Mongo URI: mongodb+srv://...", kind: "fact", importance: 0.9, sensitivity: "secret" }] })`
- Recall secret memories with `memory_recallx({ query: "credentials", includeSecrets: true })`

### Capture Guidance

Preferred structured capture shape for `memory_capture.entries[]`:

- `text`
- `kind`
- `importance`
- `category`
- `tags`
- `confidence`
- `sourceMessageIds`
- `status`
- commitment metadata when applicable
- `supersedesId` for replacements
- `sensitivity` when the agent intentionally stores a secret

Avoid storing:

- one-off chat noise
- raw transcript dumps
- temporary troubleshooting chatter or transient errors
- speculative inferences that are not established facts or decisions
- duplicate rewrites of memory that already exists
- secrets that are not intentionally classified for later agent use

### Hygiene Guidance

Use explicit hygiene strategies instead of vague cleanup requests:

- `dedupe` for repeated records with the same meaning
- `conflict-review` for records that disagree and need review
- `stale-prune` for expired or obsolete records
- `promote` only for repeated non-secret observations that should become durable preferences

For noisy memory, start with `dedupe`, `conflict-review`, and `stale-prune`. Use `promote` only when stable repeated evidence supports it.

### Document MIME Matrix (Phased)

Immediate support (inline capture + deterministic retrieval eligibility):

- `application/pdf`
- text-like formats: `text/plain`, `text/markdown`, `text/csv`, `application/json`, YAML, XML, HTML, RTF, TOML, code text formats
- office-family and workspace docs are accepted as first-class manifests and stored deterministically:
  - DOC/DOCX, XLS/XLSX, PPT/PPTX
  - Google Docs/Sheets/Slides MIME variants
  - Apple Pages/Numbers/Keynote MIME variants

Phased extraction behavior:

- text-like formats are decoded and embedded immediately as text
- PDF and media-compatible formats keep inline multimodal embedding paths
- heavier office formats use deterministic deferred-text embedding fallbacks plus durable manifest metadata

## Document Ingestion Skill and Tool

The `memory-mongodb` plugin ships a `document-ingest` skill and
`memory_ingest_document` tool for converting supported local documents into
durable structured memory. This is the preferred path for PDFs and other
documents because it extracts first, shapes memory second, captures through
existing memory-ops primitives third, and verifies recall last.

The ingestion flow is:

1. Extract text locally with deterministic parsers.
2. Use OCR only when requested/needed and available.
3. Chunk by document structure where possible.
4. Build document manifest, summary, chunk, and table candidates.
5. Store through the same `MemoryOpsService.capture` path used by
   `memory_capture`.
6. Verify recall through the same `MemoryOpsService.recall` path used by
   `memory_recallx`.

Do not store raw PDF, Office, image, or full-document inline payloads directly
as durable memory. Extract first, summarize or structure second, capture third,
verify recall last.

Supported v1 inputs:

- PDF: `application/pdf`
- text-like documents: TXT, Markdown, CSV, JSON, XML, HTML, RTF, TOML, and
  common code/text MIME types already accepted by the memory payload chunker
- Office Open XML: DOCX, XLSX, PPTX

`memory_ingest_document` accepts:

```json
{
  "filePath": "/path/to/file.pdf",
  "filename": "optional-display-name.pdf",
  "mimeType": "application/pdf",
  "title": "Optional document title",
  "mode": "summary_and_chunks",
  "tags": ["source-tag"],
  "sourceMessageIds": ["optional-message-id"],
  "maxCharsPerChunk": 18000,
  "maxChunks": 80,
  "enableOcr": true,
  "enableTables": true,
  "dryRun": false
}
```

Defaults are `mode: "summary_and_chunks"`, `maxCharsPerChunk: 18000`,
`maxChunks: 80`, `enableOcr: true`, `enableTables: true`, and
`dryRun: false`.

Dry runs return extraction details and memory candidates without calling
capture. Live runs capture the manifest first, resolve the manifest memory ID
or duplicate ID, then capture child summary/chunk/table memories with
`metadata.ops.document.parentMemoryId` when available.

Document metadata is additive and does not require a MongoDB migration. It is
stored under `metadata.ops.document` with fields such as title, filename, MIME
type, SHA-256 hash, byte length, page count, chunk ID, parent memory ID, and
source range.

### OCR Support

OCR is exposed as the reusable built-in `ocr_extract` tool so other skills can
use the same capability. The document ingest path uses OCR only when
`enableOcr` is true and no usable PDF text layer is available. OCR is optional:
when no local OCR engine is configured, the tool returns `ocr_unavailable`
rather than making OCR a required dependency.

### Tables

CSV and spreadsheet-like documents produce best-effort table summaries. XLSX
extraction is text-oriented in v1, while CSV includes header and row-range
metadata. PDF table extraction remains best-effort and should be treated as text
flow unless a later specialized parser is added.

### Troubleshooting and Limitations

- `missing_file`: the local path could not be resolved.
- `path_is_directory`: the path is a directory, not a document.
- `unsupported_mime_type`: export or convert the document to a supported local
  format first.
- `pdf_no_extractable_text`: enable OCR or provide a text-bearing PDF.
- `ocr_unavailable`: configure a local OCR engine before relying on scanned
  document ingest.
- `memory_capture_failed`: capture did not complete through memory-ops.
- `recall_verification_failed`: capture may have occurred, but verification did
  not prove recallability.

Known limitations:

- OCR quality depends on the local OCR engine and source image quality.
- PDF table reconstruction is not layout-perfect.
- Office extraction is text-oriented and does not extract embedded objects.
- Large documents are capped by chunk limits.
- Original binary files are not persisted by this feature.
- BLOCKED: No stable file-action UI extension point identified in this pass.

## CLI

```bash
openclaw ltm list
openclaw ltm search "dark mode" --limit 5
openclaw ltm backfill-ops --dry-run
openclaw ltm backfill-ops --apply --scope agent:daisy --batch-size 50
openclaw ltm stats
```

`ltm backfill-ops` is a backfill-only migration for legacy records in
`daisy_memory.memories` that do not have `metadata.ops`. A dry run is required
unless `--apply` is supplied explicitly. The command uses the configured MCP
launcher, database, collection, tenant, and workspace; it does not require
direct MongoDB or filesystem access from the caller.

Backfill behavior:

- scans only records where `metadata.ops` is missing
- preserves existing `metadata.source`, top-level routing fields, vectors, text,
  timestamps, and user metadata
- assigns ambiguous legacy records to private DAISy memory with
  `scopeSubject: "agent:daisy"` unless `--scope` is supplied
- derives `tenantId` and `workspaceId` from existing routing fields or configured
  routing defaults
- denormalizes missing top-level routing fields so `vector_index_v2` filters can
  match backfilled records
- writes a single append-only `memory_events` summary on `--apply`

JSON output includes `dryRun`, `scopeSubject`, `tenantId`, `workspaceId`,
`scanned`, `eligible`, `updated`, `skipped`, `failed`, `sampleIds`, and `errors`.

## Migration Notes

From prior Voyage-backed config:

- Remove `voyage` section.
- Add `gemini` section.
- Remove retrieval rerank fields (`retrieval.rerankEnabled`, `retrieval.rerankLimit`).
- Keep MCP configuration shape unchanged.
- Additive routing fields are written to new records while legacy
  `metadata.ops` fields remain readable during backfill.
- For legacy records that predate `metadata.ops`, run
  `openclaw ltm backfill-ops --dry-run` first, inspect the JSON summary, then run
  `openclaw ltm backfill-ops --apply` after `vector_index_v2` exists.

## Custom Launcher Override

Leave `mcp.stdio.command` and `mcp.stdio.args` unset to use the bundled pinned MongoDB MCP server dependency (`mongodb-mcp-server@1.2.0`).

If you must use a custom launcher, treat it as a privileged escape hatch:

- set `mcp.stdio.allowCustomLauncher` to `true` explicitly
- point `mcp.stdio.command` at an absolute executable path
- if you provide `mcp.stdio.args`, ensure `mcp.stdio.args[0]` is an absolute entrypoint path; an empty args array is only allowed for standalone MCP server executables, not the default Node launcher
- do not use shell or package-manager wrappers such as `corepack`, `npx`, `npm`, `pnpm`, `bash`, or `powershell`

```jsonc
{
  "mcp": {
    "transport": "stdio",
    "stdio": {
      "allowCustomLauncher": true,
      "command": "/opt/daisy/bin/node",
      "args": ["/opt/daisy/vendor/mongodb-mcp-server/dist/index.js"],
      "env": {
        "MDB_MCP_CONNECTION_STRING": "${MONGODB_URI}",
      },
    },
  },
}
```

## Verification Checklist

- MCP startup/connect works for selected transport.
- Store path writes documents through MCP `insert-many`.
- Recall path runs `$vectorSearch` through MCP `aggregate`.
- Multimodal chunking enforces Gemini media limits and text splitting.
- Multi-request embeddings aggregate via mean pooling with final normalization.
- Auto-capture and auto-recall hooks remain functional.
- Scoped recall uses `vector_index_v2` filter pushdown and falls back to legacy
  post-filtered recall only during additive rollout.
- `memory_hygiene apply` rejects missing, stale, wrong-scope, or modified plans.
- `memory_audit` records lifecycle events and cleans successful probes.

## Security

- Secrets must be environment-backed (`${MONGODB_URI}`, `${GEMINI_API_KEY}`).
- By default, `stdio` launches the bundled pinned MCP server dependency (`mongodb-mcp-server@1.2.0`) rather than relying on `npx` or runtime downloads.
- MongoDB access remains MCP-only; this plugin does not include a direct MongoDB client path.
- Remote `mongodb://` URIs require TLS (`tls=true`) unless localhost.
- Insecure TLS options (`tlsInsecure`, `tlsAllowInvalidCertificates`) are rejected.
- Connection strings are sanitized from surfaced MCP errors.
- Unsupported media MIME types are rejected before network calls.
