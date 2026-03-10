# Security: MongoDB MCP Memory Extension

This document covers security considerations for `@openclaw/memory-mongodb`.

## Credential Management

### Secret fields

- `mcp.stdio.env.MDB_MCP_CONNECTION_STRING` contains MongoDB credentials and is marked `sensitive` in plugin manifests.
- `voyage.apiKey` is marked `sensitive` in plugin manifests.
- Prefer env var references (`${MONGODB_URI}`, `${VOYAGE_API_KEY}`) over inline secrets.

### Error sanitization

- MCP connection/tool failures are sanitized to remove raw MongoDB connection strings before surfacing errors.

## Transport Security

### TLS enforcement for MongoDB connection strings

- `mongodb+srv://` is accepted as TLS-enabled by protocol.
- `mongodb://` for non-localhost targets must include `tls=true` (or `ssl=true`).
- URIs with `tlsInsecure=true` or `tlsAllowInvalidCertificates=true` are rejected.
- Plain remote `mongodb://` without TLS is rejected at config-parse time.

### MCP transport

- `stdio` transport launches a local MCP process (`mongodb-mcp-server`) with explicit command/args/env.
- `sse` transport requires explicit URL configuration.
- No inbound listener is started by this extension.

## Query and Data Safety

- Database operations are executed through MongoDB MCP tools (`insert-many`, `aggregate`, `delete-one`).
- `memory_forget` enforces UUID validation before delete operations.
- Vector embeddings are not returned in tool output payloads.
- Malformed aggregate documents are skipped and not forwarded to context.

## Auto-Capture Guardrails

`shouldCapture()` rejects:

- content shorter than 10 chars or longer than 500 chars
- injected `<relevant-memories>` blocks
- system-like tagged payloads
- markdown summary-like payloads
- emoji-heavy payloads

Capture triggers are admin-configurable regex patterns and validated at parse time.

## Retrieval and Rerank Safety

- Vector retrieval uses bounded candidate selection:
  - `vectorLimit`
  - `numCandidatesMultiplier`
- Reranking is bounded by `rerankLimit`.
- If reranking fails, retrieval falls back to vector-score ordering without failing the request.

## Network Posture

Outbound-only connections:

- MongoDB Atlas/self-hosted MongoDB through MongoDB MCP server
- Voyage API for embeddings and rerank

No inbound network port is required by this extension.
