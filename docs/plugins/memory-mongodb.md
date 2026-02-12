# Memory Plugin — MongoDB Atlas

Persistent, cloud-based long-term memory using MongoDB Atlas with Atlas Vector Search for semantic retrieval.

## When to Use

| Plugin | Use case |
|--------|----------|
| `memory-lancedb` | Local development, single-machine setups, no cloud dependency |
| **`memory-mongodb`** | Multi-instance deployments, shared memory across devices, cloud-native setups |

## Configuration

```json
{
  "plugins": {
    "memory-mongodb": {
      "embedding": {
        "apiKey": "${OPENAI_API_KEY}",
        "model": "text-embedding-3-small"
      },
      "connectionUri": "${MONGODB_URI}",
      "databaseName": "daisy_memory",
      "collectionName": "memories",
      "vectorSearchIndexName": "vector_index",
      "autoCapture": true,
      "autoRecall": true
    }
  }
}
```

### Config Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `embedding.apiKey` | Yes | — | OpenAI API key (use `${OPENAI_API_KEY}` env var) |
| `embedding.model` | No | `text-embedding-3-small` | OpenAI embedding model (`text-embedding-3-small` or `text-embedding-3-large`) |
| `connectionUri` | Yes | — | MongoDB Atlas connection string (use `${MONGODB_URI}` env var) |
| `databaseName` | No | `daisy_memory` | MongoDB database name |
| `collectionName` | No | `memories` | MongoDB collection name |
| `vectorSearchIndexName` | No | `vector_index` | Atlas Vector Search index name |
| `captureTriggers` | No | *(see below)* | Array of regex patterns (case-insensitive) that trigger auto-capture |
| `autoCapture` | No | `true` | Automatically capture important information from conversations |
| `autoRecall` | No | `true` | Automatically inject relevant memories into context |

### Capture Triggers

The `captureTriggers` field controls which messages are auto-captured. Each entry is a regex pattern string (case-insensitive). A message is captured if it matches **any** trigger.

Default triggers:
```json
[
  "remember",
  "prefer",
  "decided|will use",
  "\\+\\d{10,}",
  "[\\w.-]+@[\\w.-]+\\.\\w+",
  "my\\s+\\w+\\s+is|is\\s+my",
  "i (like|prefer|hate|love|want|need)",
  "always|never|important"
]
```

To customize, provide your own array — it **replaces** the defaults entirely:

```json
{
  "captureTriggers": [
    "remember",
    "prefer",
    "project\\s+deadline",
    "budget|cost|price"
  ]
}
```

## Atlas Setup

### 1. Create a cluster

Create a free or dedicated cluster at [cloud.mongodb.com](https://cloud.mongodb.com). Any tier (M0 free tier and above) supports Atlas Vector Search.

### 2. Create database and collection

In the Atlas UI, create a database (e.g., `daisy_memory`) with a collection (e.g., `memories`).

### 3. Create the Vector Search index

In your collection, go to **Search Indexes** → **Create Search Index** → **JSON Editor** and paste:

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
      }
    ]
  }
}
```

> If using `text-embedding-3-large`, change `numDimensions` to `3072`.

The plugin logs this definition at startup for reference.

### 4. Get the connection string

Go to **Database** → **Connect** → **Drivers** and copy the connection string. It will look like:

```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

Store it as an environment variable:

```sh
export MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
```

### 5. Configure the plugin

Add the configuration block shown above to your Moltbot config, referencing `${MONGODB_URI}` and `${OPENAI_API_KEY}`.

## Tools

The plugin registers three tools, identical in interface to `memory-lancedb`:

### `memory_recall`

Search through long-term memories by semantic similarity.

```
memory_recall({ query: "user's color preference", limit: 5 })
```

### `memory_store`

Save information to long-term memory.

```
memory_store({
  text: "User prefers dark mode",
  importance: 0.8,
  category: "preference"
})
```

Categories: `preference`, `fact`, `decision`, `entity`, `other`

### `memory_forget`

Delete a specific memory by ID, or search for candidates to delete.

```
memory_forget({ memoryId: "abc12345-..." })
memory_forget({ query: "dark mode" })
```

## CLI

```sh
moltbot ltm list        # Show total memory count
moltbot ltm search <q>  # Search memories (--limit N)
moltbot ltm stats       # Show memory statistics
```

## Auto-Recall

When `autoRecall` is enabled, the plugin hooks into `before_agent_start` to:

1. Embed the user's prompt
2. Search for the top 3 relevant memories (score >= 0.3)
3. Inject them as `<relevant-memories>` context prepended to the conversation

## Auto-Capture

When `autoCapture` is enabled, the plugin hooks into `agent_end` to:

1. Extract text from user and assistant messages
2. Filter through trigger patterns (preferences, contact info, decisions, remember requests)
3. Check for near-duplicates (0.95 similarity threshold)
4. Store up to 3 new memories per conversation turn

Content that looks like system output, injected context, or agent summaries is automatically filtered out.

## Security

See [Security: MongoDB Atlas Memory](../security/memory-mongodb.md) for details on credential handling, TLS enforcement, query safety, and data protection.
