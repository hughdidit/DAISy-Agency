# Memory Plugin - MongoDB MCP + Gemini

Persistent long-term memory for DAISy using MongoDB Atlas through the official MongoDB MCP server and Gemini Embedding 2 for multimodal embeddings.

## Architecture Summary

### Components

- `memory-mongodb` plugin: registers memory tools, CLI commands, and lifecycle hooks.
- `McpClientService`: MCP client wrapper for MongoDB tool calls (`connect`, `insert-many`, `aggregate`, `delete-one`).
- `PayloadChunker`: validates multimodal parts, enforces supported MIME types, shards oversized payloads into Gemini-safe request chunks.
- `GeminiService`: native `fetch`-based embedding client using `gemini-embedding-2-preview` with output dimensionality fixed to `1536` and manual L2 normalization.
- `MongoMemoryDB`: memory store/search manager built on MCP + Gemini services.

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

```json
{
  "plugins": {
    "memory-mongodb": {
      "mcp": {
        "transport": "stdio",
        "stdio": {
          "command": "npx",
          "args": ["-y", "mongodb-mcp-server@<PINNED_VERSION>"],
          "env": {
            "MDB_MCP_CONNECTION_STRING": "${MONGODB_URI}"
          }
        }
      },
      "gemini": {
        "apiKey": "${GEMINI_API_KEY}",
        "embeddingModel": "gemini-embedding-2-preview"
      },
      "database": {
        "name": "daisy_memory",
        "collection": "memories",
        "indexName": "vector_index"
      },
      "retrieval": {
        "minScore": 0.1,
        "vectorLimit": 8,
        "numCandidatesMultiplier": 10
      },
      "autoCapture": true,
      "autoRecall": true
    }
  }
}
```

### Config Fields

| Field                                     | Required    | Default                                     | Description                                                      |
| ----------------------------------------- | ----------- | ------------------------------------------- | ---------------------------------------------------------------- |
| `mcp.transport`                           | No          | `stdio`                                     | `stdio` for managed local MCP process, `sse` for remote endpoint |
| `mcp.stdio.command`                       | No          | `npx`                                       | Command used to launch MongoDB MCP server                        |
| `mcp.stdio.args`                          | No          | `[-y, mongodb-mcp-server@<PINNED_VERSION>]` | Arguments for MCP server command                                 |
| `mcp.stdio.env.MDB_MCP_CONNECTION_STRING` | Yes (stdio) | -                                           | MongoDB Atlas URI passed to MCP server                           |
| `mcp.url`                                 | Yes (sse)   | -                                           | Remote MCP SSE URL                                               |
| `gemini.apiKey`                           | Yes         | -                                           | Gemini API key                                                   |
| `gemini.embeddingModel`                   | No          | `gemini-embedding-2-preview`                | Gemini embedding model                                           |
| `database.name`                           | No          | `daisy_memory`                              | MongoDB database name                                            |
| `database.collection`                     | No          | `memories`                                  | MongoDB collection name                                          |
| `database.indexName`                      | No          | `vector_index`                              | Atlas vector index name                                          |
| `retrieval.minScore`                      | No          | `0.1`                                       | Minimum vector similarity score                                  |
| `retrieval.vectorLimit`                   | No          | `8`                                         | Max candidates returned from vector search                       |
| `retrieval.numCandidatesMultiplier`       | No          | `10`                                        | `numCandidates = vectorLimit * multiplier`                       |
| `captureTriggers`                         | No          | built-in defaults                           | Regex patterns that trigger auto-capture                         |
| `autoCapture`                             | No          | `true`                                      | Auto-store significant memories from conversation                |
| `autoRecall`                              | No          | `true`                                      | Auto-inject relevant memories before agent execution             |

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

## Verification Checklist

- MCP startup/connect works for selected transport.
- Store path writes documents through MCP `insert-many`.
- Recall path runs `$vectorSearch` through MCP `aggregate`.
- Multimodal chunking enforces Gemini media limits and text splitting.
- Multi-request embeddings aggregate via mean pooling with final normalization.
- Auto-capture and auto-recall hooks remain functional.

## Security

- Secrets must be environment-backed (`${MONGODB_URI}`, `${GEMINI_API_KEY}`).
- For `stdio`, prefer pinned MCP server versions (for example `mongodb-mcp-server@x.y.z`) or managed binaries over unpinned runtime downloads.
- Remote `mongodb://` URIs require TLS (`tls=true`) unless localhost.
- Insecure TLS options (`tlsInsecure`, `tlsAllowInvalidCertificates`) are rejected.
- Connection strings are sanitized from surfaced MCP errors.
- Unsupported media MIME types are rejected before network calls.