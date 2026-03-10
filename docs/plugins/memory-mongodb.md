# Memory Plugin - MongoDB MCP + Voyage

Persistent long-term memory for DAISy using MongoDB Atlas through the official MongoDB MCP server and Voyage AI for embeddings and reranking.

## Architecture Summary

### Components

- `memory-mongodb` plugin: registers memory tools, CLI commands, and lifecycle hooks.
- `McpClientService`: MCP client wrapper for MongoDB tool calls (`connect`, `insert-many`, `aggregate`, `delete-one`).
- `VoyageService`: embeddings (`voyage-3-large` default) and reranking (`rerank-2` default).
- `MongoMemoryDB`: memory store/search manager built on MCP + Voyage services.

### Data Flow

Store path:

1. Input text is categorized (`category`, `type`, optional `subCategory`).
2. Voyage embedding is generated.
3. Memory document is built with vector and metadata.
4. Document is written via MCP `insert-many`.

Recall path:

1. Query text is embedded with Voyage.
2. MCP `aggregate` runs `$vectorSearch` against `vector` using configured index.
3. Results are projected and validated as memory candidates.
4. Optional Voyage rerank reorders bounded candidates.
5. Top memories are returned to tools/hooks for context construction.

## Configuration

```json
{
  "plugins": {
    "memory-mongodb": {
      "mcp": {
        "transport": "stdio",
        "stdio": {
          "command": "npx",
          "args": ["-y", "mongodb-mcp-server"],
          "env": {
            "MDB_MCP_CONNECTION_STRING": "${MONGODB_URI}"
          }
        }
      },
      "voyage": {
        "apiKey": "${VOYAGE_API_KEY}",
        "embeddingModel": "voyage-3-large",
        "rerankModel": "rerank-2"
      },
      "database": {
        "name": "daisy_memory",
        "collection": "memories",
        "indexName": "vector_index"
      },
      "retrieval": {
        "minScore": 0.1,
        "vectorLimit": 8,
        "numCandidatesMultiplier": 10,
        "rerankEnabled": true,
        "rerankLimit": 8
      },
      "autoCapture": true,
      "autoRecall": true
    }
  }
}
```

### Config Fields

| Field                                     | Required    | Default                    | Description                                                      |
| ----------------------------------------- | ----------- | -------------------------- | ---------------------------------------------------------------- |
| `mcp.transport`                           | No          | `stdio`                    | `stdio` for managed local MCP process, `sse` for remote endpoint |
| `mcp.stdio.command`                       | No          | `npx`                      | Command used to launch MongoDB MCP server                        |
| `mcp.stdio.args`                          | No          | `[-y, mongodb-mcp-server]` | Arguments for MCP server command                                 |
| `mcp.stdio.env.MDB_MCP_CONNECTION_STRING` | Yes (stdio) | -                          | MongoDB Atlas URI passed to MCP server                           |
| `mcp.url`                                 | Yes (sse)   | -                          | Remote MCP SSE URL                                               |
| `voyage.apiKey`                           | Yes         | -                          | Voyage API key                                                   |
| `voyage.embeddingModel`                   | No          | `voyage-3-large`           | Voyage embedding model                                           |
| `voyage.rerankModel`                      | No          | `rerank-2`                 | Voyage rerank model                                              |
| `database.name`                           | No          | `daisy_memory`             | MongoDB database name                                            |
| `database.collection`                     | No          | `memories`                 | MongoDB collection name                                          |
| `database.indexName`                      | No          | `vector_index`             | Atlas vector index name                                          |
| `retrieval.minScore`                      | No          | `0.1`                      | Minimum vector similarity score                                  |
| `retrieval.vectorLimit`                   | No          | `8`                        | Max candidates returned from vector search                       |
| `retrieval.numCandidatesMultiplier`       | No          | `10`                       | `numCandidates = vectorLimit * multiplier`                       |
| `retrieval.rerankEnabled`                 | No          | `true`                     | Enable Voyage rerank stage                                       |
| `retrieval.rerankLimit`                   | No          | `8`                        | Max candidates sent to reranker                                  |
| `captureTriggers`                         | No          | built-in defaults          | Regex patterns that trigger auto-capture                         |
| `autoCapture`                             | No          | `true`                     | Auto-store significant memories from conversation                |
| `autoRecall`                              | No          | `true`                     | Auto-inject relevant memories before agent execution             |

## Atlas Setup

1. Create Atlas cluster and collection (`daisy_memory.memories` by default).
2. Create Atlas Vector Search index in the collection.
3. Set `numDimensions` to the embedding model dimension.

Default index for `voyage-3-large` (`1024` dimensions):

```json
{
  "name": "vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "vector",
        "numDimensions": 1024,
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
- `text`
- `vector`
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
- `memory_forget({ memoryId })` or `memory_forget({ query })`

## CLI

```bash
openclaw ltm list
openclaw ltm search "dark mode" --limit 5
openclaw ltm stats
```

## Migration Notes

From legacy direct-driver config:

- Remove `embedding` and `connectionUri` fields.
- Add `mcp` and `voyage` sections.
- Move DB names under `database`.
- Optional retrieval tuning now under `retrieval`.

## Verification Checklist

- MCP startup/connect works for selected transport.
- Store path writes documents through MCP `insert-many`.
- Recall path runs `$vectorSearch` through MCP `aggregate`.
- Rerank path uses Voyage and falls back to vector ordering if rerank fails.
- Auto-capture and auto-recall hooks remain functional.

## Security

- Secrets must be environment-backed (`${MONGODB_URI}`, `${VOYAGE_API_KEY}`).
- Remote `mongodb://` URIs require TLS (`tls=true`) unless localhost.
- Insecure TLS options (`tlsInsecure`, `tlsAllowInvalidCertificates`) are rejected.
- Connection strings are sanitized from surfaced MCP errors.
