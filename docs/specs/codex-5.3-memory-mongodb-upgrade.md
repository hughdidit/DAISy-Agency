# Programming Spec: Codex-5.3 Upgrade for memory-mongodb

## 1. Overview
This specification outlines the upgrade plan for the `memory-mongodb` extension. The goal is to transition from a direct MongoDB connection to an **MCP (Model Context Protocol)** based architecture, and to restructure the memory system to align with the provided architecture diagram, utilizing **Voyage AI** for embeddings and reranking.

We will utilize the official **MongoDB MCP Server** (`@mongodb-js/mcp-server`) to handle database interactions.

## 2. Architecture

### 2.1 Component Architecture
The extension will be refactored to act as the **Memory Provider** and **Memory Management System** as depicted in the architecture diagram.

*   **Database**: MongoDB Atlas (External).
    *   Features: RBAC, Encryption, Vector Search.
*   **Connection Protocol**: MCP (Model Context Protocol).
    *   **Client**: `memory-mongodb` extension.
    *   **Server**: MongoDB MCP Server (External process).
        *   Package: `@mongodb-js/mcp-server`
        *   Repository: `https://github.com/mongodb-js/mongodb-mcp-server`
*   **AI Services**:
    *   **Embedding**: Voyage AI (`voyage-3-large`).
    *   **Reranking**: Voyage AI (`rerank-2`).
*   **Memory Structure**:
    *   **Short Term**:
        *   `Working Memory`: Immediate context.
        *   `Cache`: Temporary storage.
    *   **Long Term**:
        *   `Episodic`: Conversational, Summaries, Observations.
        *   `Semantic`: Knowledge Base, Entity Store, Persona Store.
        *   `Procedural`: Toolbox Store, Workflow Store.
        *   `Associative`: Graph-like links.
*   **Context Management**:
    *   Retrieves relevant memories via Vector Search + Reranking.
    *   Constructs augmented context.

### 2.2 Data Flow
1.  **Ingestion (Store)**:
    *   Input text -> Classified -> Embedded (`voyage-3-large`).
    *   Data sent to MongoDB via MCP Tool: `insertMany`.
2.  **Retrieval (Recall)**:
    *   Query text -> Embedded (`voyage-3-large`).
    *   Vector search via MCP Tool: `aggregate` (using `$vectorSearch` pipeline).
    *   Results -> Reranked (`rerank-2`).
    *   Top results -> Context Window.

## 3. Implementation Specification

### 3.1 Dependencies
*   **Remove**: `mongodb` (driver), `openai`.
*   **Add**:
    *   `@modelcontextprotocol/sdk`: For MCP client.
    *   `voyageai`: For Embeddings/Reranking.
    *   `zod`: For schema validation (if not already present).
    *   `mongodb-mcp-server`: To ensure a local, version-controlled copy of the server is available.

### 3.2 Configuration (`config.ts`)
Update `MemoryConfig` schema.

**MCP Server Configuration:**
The extension needs to start the MCP server or connect to it.
*   **Option A (Managed Process)**: The extension spawns the MCP server.
    *   Command: `npx` (or `node` pointing to local install)
    *   Args: `["-y", "mongodb-mcp-server"]` (or path to local bin)
    *   Env Vars:
        *   `MDB_MCP_CONNECTION_STRING`: MongoDB Connection URI.
        *   `MDB_MCP_API_CLIENT_ID` / `MDB_MCP_API_CLIENT_SECRET`: (Optional) for Atlas management tools.
*   **Option B (Remote/Existing)**: Connect to an existing MCP server (SSE/Stdio).

**Updated Config Schema**:
```typescript
type MemoryConfig = {
  mcp: {
    transport: "stdio" | "sse";
    // For stdio (managed):
    command?: string; // default: "npx"
    args?: string[];  // default: ["-y", "mongodb-mcp-server"]
    env?: Record<string, string>; // MDB_MCP_CONNECTION_STRING here
    // For sse (remote):
    url?: string;
  };
  voyage: {
    apiKey: string;
    embeddingModel?: string; // "voyage-3-large"
    rerankModel?: string;    // "rerank-2"
  };
  database: {
    name: string;
    collection: string;
    indexName: string;
  };
  // ... existing capture triggers ...
};
```

### 3.3 Core Components

#### 3.3.1 `McpClientService`
Wrapper for `@modelcontextprotocol/sdk`.
*   **Tools to Use**:
    *   `insertMany`: For storing memories.
        *   Args: `{ database: string, collection: string, documents: Document[] }`
    *   `aggregate`: For Vector Search.
        *   Args: `{ database: string, collection: string, pipeline: Document[] }`
    *   `find`: For basic retrieval (optional).
    *   `createCollection` / `createIndex`: Setup helper (optional).

#### 3.3.2 `VoyageService`
*   `embed(text)`: Returns `number[]`.
*   `rerank(query, documents)`: Returns sorted results.

#### 3.3.3 `MemoryManager`
Refactored logic.

**Store Logic**:
1.  Construct `MemoryDocument` (with `category`, `subCategory`, `text`).
2.  Generate embedding via `VoyageService`.
3.  Add `vector` field to document.
4.  Call MCP `insertMany` with `[document]`.

**Search Logic**:
1.  Generate query embedding via `VoyageService`.
2.  Build Aggregation Pipeline:
    ```javascript
    [
      {
        $vectorSearch: {
          index: config.database.indexName,
          path: "vector",
          queryVector: embedding,
          numCandidates: 100,
          limit: 20
        }
      },
      {
        $project: {
          _id: 0,
          text: 1,
          category: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]
    ```
3.  Call MCP `aggregate`.
4.  Rerank results via `VoyageService` (if `rerank` enabled).
5.  Return top `k` results.

### 3.4 Data Schema
Standardize the document structure.
```typescript
interface MemoryDocument {
  _id: string; // UUID
  text: string;
  vector: number[];
  category: MemoryCategory; // "short_term", "long_term"
  subCategory: string;      // "working", "episodic", etc.
  type: string;             // "observation", "fact", etc.
  createdAt: number;
  metadata?: Record<string, any>;
}
```

## 4. Migration Steps
1.  **Refactor `package.json`**: Update dependencies.
2.  **Config**: Update `config.ts` to support MCP/Voyage.
3.  **Services**: Implement `McpClientService` (using `Client` from SDK) and `VoyageService`.
4.  **Provider**: Rewrite `mongodb-provider.ts` -> `memory-provider.ts` using the new services.
5.  **Hooks**: Update `index.ts` to use the new provider methods.
6.  **Testing**:
    *   Verify `npx mongodb-mcp-server` starts correctly.
    *   Verify `aggregate` with `$vectorSearch` returns results.

## 5. Resources
*   **MongoDB MCP Server**: `https://github.com/mongodb-js/mongodb-mcp-server`
*   **Voyage AI**: `https://docs.voyageai.com/`

### 3.4 Data Schema (MongoDB Document)
```typescript
interface MemoryDocument {
  _id: string; // UUID
  content: string;
  vector: number[]; // Embedding
  category: 'short_term' | 'long_term';
  subCategory: 'working' | 'cache' | 'episodic' | 'semantic' | 'procedural' | 'associative';
  type: 'conversational' | 'summary' | 'observation' | 'knowledge' | 'entity' | 'persona' | 'toolbox' | 'workflow' | 'associative';
  tags: string[];
  importance: number; // 0 to 1
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.5 Refactoring Steps
1.  **Refactor `package.json`**: Swap dependencies.
2.  **Refactor `config.ts`**: Update schema with Zod/TypeBox.
3.  **Create `src/services/mcp-client.ts`**: Implement MCP connection.
4.  **Create `src/services/voyage.ts`**: Implement Voyage AI logic.
5.  **Refactor `src/mongodb-provider.ts`**: Rename to `src/memory-provider.ts` and switch to using `McpClientService`.
6.  **Refactor `src/index.ts`**:
    *   Initialize `MemoryManager` with new config.
    *   Update `generate:before` hook to use new retrieval/reranking logic.
    *   Update `generate:after` hook to use new categorization and storage logic.

## 4. Verification
*   Verify MCP connection handles reconnection and errors.
*   Verify Vector Search works via MCP (ensure MCP server supports it or generic find command allows aggregation/vector pipeline).
*   Verify Voyage AI embeddings and reranking improve relevance.
