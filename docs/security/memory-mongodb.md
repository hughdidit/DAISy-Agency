# Security: MongoDB MCP Memory Extension

This document covers security considerations for `@openclaw/memory-mongodb`.

## Credential Management

### Secret fields

- `mcp.stdio.env.MDB_MCP_CONNECTION_STRING` contains MongoDB credentials and is marked `sensitive` in plugin manifests.
- `gemini.apiKey` is marked `sensitive` in plugin manifests.
- Prefer env var references (`${MONGODB_URI}`, `${GEMINI_API_KEY}`) over inline secrets.

### Error sanitization

- MCP connection/tool failures are sanitized to remove raw MongoDB connection strings before surfacing errors.

## Transport Security

### TLS enforcement for MongoDB connection strings

- `mongodb+srv://` is accepted as TLS-enabled by protocol.
- `mongodb://` for non-localhost targets must include `tls=true` (or `ssl=true`).
- URIs with `tlsInsecure=true` or `tlsAllowInvalidCertificates=true` are rejected.
- Plain remote `mongodb://` without TLS is rejected at config-parse time.

### MCP transport

- `stdio` transport launches a local MongoDB MCP process using a bundled pinned server dependency by default.
- Custom `mcp.stdio.command` / `mcp.stdio.args` overrides are privileged escape hatches and must be enabled explicitly with `mcp.stdio.allowCustomLauncher=true`.
- Even in privileged mode, shell and package-manager launchers are rejected; the override must point to an absolute executable path.
- `sse` transport requires explicit URL configuration.
- No inbound listener is started by this extension.

### Least-privilege execution

- The MCP child environment is a least-privilege boundary, not a wholesale inheritance of the DAISy gateway process environment.
- The MCP child process receives an allowlisted environment instead of the full inherited gateway environment.
- Operator-provided `mcp.stdio.env` values are validated against an approved allowlist before they are passed to the child process.
- Runtime-mutating Node and tsx env such as `NODE_OPTIONS`, `NODE_PATH`, `TS_NODE_PROJECT`, and `TSX_TSCONFIG_PATH` are rejected.
- Sensitive MongoDB credentials remain env-backed and are not passed via command-line arguments.
- Operators should use MongoDB credentials or Atlas service accounts scoped to the minimum required database permissions for the configured memory and event collections.

## Query and Data Safety

- Database operations are executed through MongoDB MCP tools (`insert-many`, `aggregate`, `delete-many` with exact `_id` filters for single-memory deletes).
- The plugin does not use a direct MongoDB driver path for runtime reads or writes.
- `memory_forget` resolves explicit UUIDs or unambiguous scoped UUID prefixes to
  an exact in-scope UUID before delete operations.
- `memory_audit` probe cleanup deletes only an exact stored UUID or a unique
  scoped UUID resolved from audit evidence before mutation.
- Vector embeddings are not returned in tool output payloads.
- Malformed aggregate documents are skipped and not forwarded to context.
- New memory records copy routing fields to top-level properties so Atlas can filter by tenant, workspace, scope, visibility, kind, status, sensitivity, and modality before candidate selection.
- Legacy `metadata.ops` scope filtering remains as an additive-rollout fallback, not the primary isolation mechanism for new records.
- `memory_hygiene apply` requires a cached same-scope plan ID, matching plan hash, and exact approved action IDs before deleting or promoting records.
- Memory lifecycle mutations write best-effort append-only records to `memory_events` for operational auditability.

## Multimodal Payload Guardrails

- Allowed inline MIME types are explicitly whitelisted:
  - `image/png`, `image/jpeg`, `image/jpg`
  - `video/mp4`, `video/quicktime`
  - `audio/mpeg`, `audio/mp3`, `audio/wav`
  - `application/pdf`
- Unsupported MIME types are rejected before any API call.
- Image/PDF parts are chunked to a maximum of 6 per Gemini embedding request.
- Very large text parts are split at ~28,000 chars per part to avoid oversize payloads.
- Single-item payloads that exceed Gemini API limits are surfaced as API errors; binary-level splitting is intentionally out of scope.

## Embedding and Retrieval Safety

- Embeddings request `outputDimensionality: 1536` and enforce dimensionality checks at runtime.
- Returned vectors are manually L2-normalized for cosine similarity consistency.
- Multi-request embeddings are normalized, mean-pooled, and normalized again before storage.
- Vector retrieval uses bounded candidate selection:
  - `vectorLimit`
  - `numCandidatesMultiplier`

## Auto-Capture Guardrails

`shouldCapture()` rejects:

- content shorter than 10 chars or longer than 500 chars
- injected `<relevant-memories>` blocks
- system-like tagged payloads
- markdown summary-like payloads
- emoji-heavy payloads

Capture triggers are admin-configurable regex patterns and validated at parse time.

Automatic capture only considers user-originated messages. Assistant output is not
stored as durable memory by default, and auto-observed preferences are routed
through `preference_miner` as repeated evidence rather than promoted from a
single turn.

## Network Posture

Outbound-only connections:

- MongoDB Atlas/self-hosted MongoDB through MongoDB MCP server
- Gemini API for embeddings

No inbound network port is required by this extension.
