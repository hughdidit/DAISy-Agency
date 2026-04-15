# Memory Plugin - MongoDB MCP + Gemini

Persistent long-term memory for DAISy using MongoDB Atlas through the official MongoDB MCP server and Gemini Embedding 2 for multimodal embeddings.

## Architecture Summary

### Components

- `memory-mongodb` plugin: registers memory tools, CLI commands, and lifecycle hooks.
- `McpClientService`: MCP client wrapper for MongoDB tool calls (`connect`, `insert-many`, `aggregate`, `delete-many` with exact `_id` filters for single-memory deletes).
- `PayloadChunker`: validates multimodal parts, enforces supported MIME types, shards oversized payloads into Gemini-safe request chunks.
- `GeminiService`: native `fetch`-based embedding client using `gemini-embedding-2-preview` with output dimensionality fixed to `1536` and manual L2 normalization.
- `MongoMemoryDB`: memory store/search manager built on MCP + Gemini services.

MongoDB access for this plugin is MCP-only. The plugin does not use a direct MongoDB driver path for runtime reads or writes.

### Data Flow

Store path:

1. Input memory is provided as multimodal `parts` (`text` and/or `inlineData` base64 media).
2. PayloadChunker validates and chunks the parts:
   - max 6 image/PDF parts per API request
   - large text parts split at ~28,000 chars per part
3. Gemini embedding vectors are generated per chunk and L2-normalized.
4. If multiple chunks are required, vectors are mean-pooled and normalized again.
5. Memory document is written via MCP `insert-many`.

Recall path:

1. Query text is embedded via Gemini.
2. MCP `aggregate` runs `$vectorSearch` against `vector` using configured index.
3. Results are projected and validated as memory candidates.
4. Top memories are returned to tools/hooks for context construction.

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
| `database.indexName`                      | No          | `vector_index`               | Atlas vector index name                                          |
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
2. Create Atlas Vector Search index in the collection.
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

## Memory Document Shape

Each stored memory includes:

- `_id` (UUID)
- `text` (explicit text or fallback summary generated from parts)
- `vector` (1536-dim L2-normalized embedding)
- `category`
- `subCategory` (optional)
- `type` (`working`, `cache`, `episodic`, `semantic`, `procedural`, `associative`)
- `importance`
- `metadata` (optional)
- `tags` (optional)
- `createdAt`, `updatedAt`

## Tools

- `memory_recall({ query, limit })`
- `memory_store({ text, importance, category })`
- `memory_store({ parts, text?, importance, category })` for multimodal embedding
- `memory_forget({ memoryId })` or `memory_forget({ query })`
- `memory_capture({ entries[], dedupeThreshold?, rejectSecrets? })`
- `memory_hygiene({ mode: "plan"|"apply", strategies?, maxCandidates?, planId? })`
- `commitment_tracker({ mode: "capture"|"list_open"|"resolve"|"cancel", ... })`
- `preference_miner({ mode: "observe"|"plan_promotions"|"apply_promotions"|"list", ... })`
- `memory_audit({ runId?, cleanupOnSuccess? })`

### Delegate Scope Rules

- Tool reads and writes are scoped by default to the invoking subject:
  - `agent:<id>` for main agent sessions
  - `subagent:<id>` for sub-agent sessions
- If scope identity is missing, tool execution fails closed.
- No implicit fallback to another agent scope is performed.

### Memory-Ops Metadata

Memory records remain in the same `daisy_memory.memories` collection and use additive metadata:

- `metadata.source` remains required and preserved.
- `metadata.ops` includes:
  - `kind`, `scopeSubject`, `status`, `confidence`
  - `sourceMessageIds`, `observationCount`, `stabilityScore`
  - commitment fields (`owner`, `dueAt`, `followUpAt`, `supersedesId`)
  - audit fields (`auditRunId`, ephemeral probe state)
  - attachment manifest summary and per-attachment descriptors

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

## CLI

```bash
openclaw ltm list
openclaw ltm search "dark mode" --limit 5
openclaw ltm stats
```

## Migration Notes

From prior Voyage-backed config:

- Remove `voyage` section.
- Add `gemini` section.
- Remove retrieval rerank fields (`retrieval.rerankEnabled`, `retrieval.rerankLimit`).
- Keep MCP and database configuration shape unchanged.

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

## Security

- Secrets must be environment-backed (`${MONGODB_URI}`, `${GEMINI_API_KEY}`).
- By default, `stdio` launches the bundled pinned MCP server dependency (`mongodb-mcp-server@1.2.0`) rather than relying on `npx` or runtime downloads.
- MongoDB access remains MCP-only; this plugin does not include a direct MongoDB client path.
- Remote `mongodb://` URIs require TLS (`tls=true`) unless localhost.
- Insecure TLS options (`tlsInsecure`, `tlsAllowInvalidCertificates`) are rejected.
- Connection strings are sanitized from surfaced MCP errors.
- Unsupported media MIME types are rejected before network calls.
