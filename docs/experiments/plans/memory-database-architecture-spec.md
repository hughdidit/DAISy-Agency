---
summary: "Architecture specification for a reliable MCP-backed multimodal memory database system using Gemini Embedding 2"
read_when:
  - Planning a memory-mongodb redesign or stabilization pass
  - Diagnosing memory tools that are visible to agents but fail at invocation time
  - Designing multimodal long-term memory capture and recall for DAISy delegates
owner: "openclaw"
status: "draft"
last_updated: "2026-05-12"
title: "Memory Database Architecture"
---

# Memory Database Architecture Specification

## 1) Mission

Build a reliable long-term memory database system for DAISy agents where memory tools only appear usable when the memory backend is actually ready, failures are diagnosable, and recall supports multimodal vector search using Gemini Embedding 2.

The architecture must preserve the existing memory tool surface while making the runtime boundaries explicit:

- tool and skill availability
- agent and subagent scope
- MCP transport readiness
- MongoDB connectivity
- Gemini Embedding 2 readiness
- Atlas vector index shape
- schema and routing compatibility
- multimodal payload handling
- audit round-trip behavior

The goal is not only to fix the current `memory-mongodb` extension. The goal is to establish a memory subsystem architecture that can be operated, verified, and extended without agents falsely believing memory is available when the backend cannot actually capture or recall records.

## 2) Current State

The current memory bundle includes:

- plugin-shipped `memory-ops` skill under `extensions/memory-mongodb/skills/memory-ops`
- plugin tools: `memory_recall`, `memory_recallx`, `memory_store`, `memory_forget`, `memory_capture`, `memory_hygiene`, `commitment_tracker`, `preference_miner`, and `memory_audit`
- `MemoryOpsService` for higher-level capture, recall, hygiene, commitment, preference, and audit behavior
- `MongoMemoryDB` for persistence and search
- `GeminiService` for embedding generation
- `McpClientService` for MongoDB MCP transport and tool-call parsing
- Atlas vector search through the scoped `vector_index_v2` index

The current weakness is architectural coupling. A memory tool can be visible to an agent while the actual backend path fails because of a missing allowlist, missing scope, MCP startup failure, MongoDB credential problem, Gemini embedding failure, Atlas index mismatch, schema drift, or routing filter mismatch. Those failures are currently discovered too late and are not represented as one coherent readiness contract.

## 3) Core Requirements

- Preserve existing tool names:
  - `memory_recall`
  - `memory_recallx`
  - `memory_store`
  - `memory_forget`
  - `memory_capture`
  - `memory_hygiene`
  - `commitment_tracker`
  - `preference_miner`
  - `memory_audit`
- Support multimodal memory capture and recall through Gemini Embedding 2 for text, images, audio, video, and supported document inputs.
- Store one normalized vector per memory record, using the configured Gemini Embedding 2 model and 1536 output dimensions.
- Keep agent-local memory as the default scope. Shared or project memory must be explicitly requested and policy-controlled.
- Keep MongoDB access MCP-only in the production path unless a later security-reviewed ADR explicitly approves another backend.
- Separate memory-ops behavior from MongoDB, MCP, Gemini, and vector-index implementation details.
- Add readiness reporting so agents and operators can distinguish unavailable tools, unhealthy backend, missing scope, bad vector index, schema drift, and failed embeddings.
- Keep `memory_audit` as the deep write/read/cleanup probe, but add non-mutating health checks that can run before writing a probe memory.
- Preserve additive migration compatibility with existing memory records while adding richer routing and multimodal metadata.

## 4) Target Architecture

### Memory Service Facade

Introduce a backend-neutral memory service interface. `MemoryOpsService` must depend on this facade rather than on MongoDB, MCP, or Gemini classes directly.

```ts
interface MemoryService {
  health(scope?: MemoryScope): Promise<MemoryHealthReport>;
  capture(input: CaptureInput): Promise<CaptureResult>;
  recall(input: RecallInput): Promise<RecallResult>;
  forget(input: ForgetInput): Promise<ForgetResult>;
  listByScope(input: ListScopeInput): Promise<ListScopeResult>;
  audit(input: AuditInput): Promise<AuditResult>;
}
```

The first implementation is `MongoMcpGeminiMemoryBackend`.

### Backend Modules

`MongoMcpGeminiMemoryBackend` should be composed of explicit modules:

- `MongoMcpTransport`: starts and connects to the MongoDB MCP server, applies least-privilege stdio environment policy, calls MCP tools, parses response payloads, and sanitizes failures.
- `GeminiEmbeddingProvider`: embeds normalized multimodal payloads with Gemini Embedding 2, validates 1536-dimensional output, normalizes vectors, and classifies embedding failures.
- `MultimodalPayloadNormalizer`: validates text, media, and document parts; creates Gemini-compatible chunks; builds attachment manifests; and creates safe fallback text for deferred document formats.
- `MemoryRepository`: stores, searches, deletes, lists, and records memory events through MongoDB MCP only.
- `VectorSearchReadiness`: verifies that the active vector index exists, matches Gemini Embedding 2 dimensions, and contains required routing/filter fields.
- `SchemaReadiness`: detects missing top-level routing fields and `metadata.ops` drift, and reports dry-run backfill eligibility.

### Tool Layer

Memory tools should be thin adapters:

1. Resolve the calling scope.
2. Check or request readiness details where needed.
3. Call `MemoryService`.
4. Return concise user-facing text and structured details.

Every memory tool schema must use strict object boundaries with `additionalProperties: false`.

### Skill Layer

The `memory-ops` skill remains plugin-backed and shipped with the backend that implements it. Its instructions must reflect runtime reality:

- use `memory_recallx` for continuity-sensitive recall when available
- fall back to `memory_recall` only when the advanced tool is unavailable
- use `commitment_tracker` for actionable commitments
- use `memory_capture` for durable non-actionable facts and decisions
- use `memory_hygiene` only in plan/apply phases with explicit reviewed approval fields
- use memory readiness/status when memory behavior itself is in question
- use `memory_audit` after memory config, deploy, routing, schema, or vector-index changes
- do not imply memory is healthy just because the skill or tools are visible

## 5) Multimodal Vector Search

Gemini Embedding 2 is the required embedding model family for this architecture.

### Capture Path

1. Normalize input into multimodal parts.
2. Validate supported modalities and MIME types.
3. Build attachment manifests for non-text inputs.
4. Create fallback text for media-only or deferred-document records.
5. Chunk oversized payloads into Gemini-compatible requests.
6. Embed each chunk with Gemini Embedding 2.
7. Mean-pool chunk embeddings.
8. L2-normalize the final vector.
9. Store one 1536-dimensional vector on the memory record.
10. Store top-level modality and routing fields plus `metadata.ops` details.

### Recall Path

1. Normalize the query as text or multimodal query parts when supported by the caller.
2. Embed the query through the same Gemini Embedding 2 provider.
3. Run Atlas vector search against the active scoped vector index.
4. Push down tenant, workspace, visibility, scope, kind, status, sensitivity, and modality filters where index support exists.
5. Apply defensive post-filtering after MCP response parsing.
6. Return sanitized summaries and structured recall details.

### Required Modality Semantics

`memory_recallx` must support modality filters for:

- `text`
- `image`
- `audio`
- `video`
- `document`

Unsupported or deferred document formats must not be silently dropped. They must be represented as fallback text and attachment metadata, with readiness or capture output explaining the unsupported or deferred status.

## 6) Readiness Contract

Add `MemoryRuntimeStatus` and reuse it across status, doctor, verify, tool diagnostics, and agent-facing guidance.

Required readiness checks:

- `pluginLoaded`
- `skillProjected`
- `toolsAllowed`
- `scopeResolved`
- `mcpConfigured`
- `mcpConnected`
- `mongoConnected`
- `embeddingConfigured`
- `embeddingHealthy`
- `vectorIndexReady`
- `schemaReady`
- `routingReady`
- `multimodalReady`
- `auditReady`

Each check must include:

- `status`: `ready`, `degraded`, `failed`, or `unknown`
- `reasonCode`
- `summary`
- `nextAction`
- sanitized `evidence`

Stable reason codes:

- `plugin_not_loaded`
- `skill_not_projected`
- `tool_not_allowed`
- `scope_missing`
- `mcp_config_missing`
- `mcp_startup_failed`
- `mongo_connect_failed`
- `mcp_contract_failed`
- `embedding_auth_failed`
- `embedding_request_failed`
- `vector_index_missing`
- `vector_index_filter_mismatch`
- `schema_missing_ops`
- `routing_filter_miss`
- `multimodal_payload_invalid`
- `audit_roundtrip_failed`

## 7) Data Model

Memory records should include:

- `_id`
- `text`
- `vector`
- `embeddingModel`
- `embeddingDimensions`
- `tenantId`
- `workspaceId`
- `scopeSubject`
- `subjectType`
- `visibility`
- `kind`
- `status`
- `sensitivity`
- `modalities`
- `category`
- `type`
- `importance`
- `tags`
- `createdAt`
- `updatedAt`
- `metadata.source`
- `metadata.ops`

`metadata.ops` should include:

- capture source
- confidence
- content hash
- attachment summary
- attachment manifests
- preference metadata
- commitment metadata
- audit run id
- supersession links
- expiration fields
- source message ids when available

The additive migration baseline should preserve existing records and add missing fields through explicit backfill. A stricter schema validator can follow once staging proves compatibility.

## 8) Security And Privacy

- MongoDB runtime access remains MCP-only by default.
- Connection strings, API keys, and credential-like content must be redacted from errors and readiness evidence.
- Secret-like captures are rejected unless explicitly marked with `sensitivity: "secret"`.
- Secret memories are excluded from ordinary recall, hygiene, preference promotion, and commitment listing unless a caller explicitly requests secret visibility through an approved path.
- Agent-local scope is the default. There is no implicit fallback to the main agent or another delegate.
- Shared/project memory requires explicit future policy design before broad use.

## 9) Migration Strategy

### Phase 1: Live Evidence And Observability

- Capture staging failures.
- Add non-mutating backend health.
- Surface readiness in status, doctor, and verify.
- Keep existing storage behavior.

### Phase 2: Backend Boundary

- Add the `MemoryService` facade.
- Move MCP transport, Gemini embedding, payload normalization, repository behavior, and readiness checks into explicit modules.
- Preserve existing tool names and payload compatibility.

### Phase 3: Multimodal Hardening

- Validate the modality matrix.
- Verify Gemini Embedding 2 chunking, pooling, normalization, and vector dimensions.
- Add modality-aware recall tests and diagnostics.
- Add vector index readiness checks.

### Phase 4: Schema And Routing Cleanup

- Add dry-run legacy record scan.
- Backfill `metadata.ops` and top-level routing only after explicit apply.
- Keep additive compatibility during migration.

### Phase 5: Backend Strategy ADR

- Compare MCP-only, direct MongoDB driver, remote memory service, and hybrid health-only approaches.
- Evaluate Zero Trust, least privilege, failure modes, latency, operations, and migration cost.
- Do not implement a direct driver path without explicit approval.

## 10) Acceptance Criteria

- Agents no longer report that they can use memory when every backend interaction will fail.
- Status and doctor identify the exact broken memory dependency.
- Tool-policy omissions are diagnosed separately from backend failures.
- Missing scope fails closed with actionable output.
- `memory_audit` can prove capture, recall, evidence matching, and cleanup in the same scope.
- `memory_recallx` supports modality filters for text, image, audio, video, and documents.
- Stored multimodal records preserve fallback text, modality metadata, and attachment manifests.
- Existing memory tool names remain stable.
- Staging verify includes a memory readiness branch when `memory-mongodb` is active.
