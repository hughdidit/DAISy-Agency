---
summary: "Issue-sized implementation backlog for the DAISy multimodal memory database redesign"
read_when:
  - Breaking the memory database architecture into implementation issues
  - Planning a memory-mongodb redesign milestone
  - Creating GitHub issues for memory readiness, backend boundaries, and Gemini Embedding 2 multimodal search
owner: "openclaw"
status: "draft"
last_updated: "2026-05-12"
title: "Memory Database Backlog"
---

# Memory Database Backlog Specification

## 1) Backlog Shape

This backlog breaks the memory database redesign into issue-sized chunks. Each item should be independently reviewable and should avoid mixing live diagnostics, architecture boundaries, behavior changes, and release closeout in one PR unless explicitly approved.

Implementation order should follow the dependency chain:

1. Evidence and readiness contracts
2. Non-mutating health
3. Backend boundary
4. Gemini Embedding 2 multimodal hardening
5. Schema and vector readiness
6. Agent-facing guidance
7. Staging verify and release closeout

## MEM-001: Capture Live Staging Failure Evidence

Collect active staging evidence before implementation changes.

Acceptance criteria:

- Capture active plugin config, memory slot, loaded plugin status, per-agent tool allowlists, sandbox tool allowlists, and skill snapshot state.
- Run representative calls for `memory_recall`, `memory_recallx`, `memory_capture`, and `memory_audit`.
- Record exact sanitized failure strings.
- Classify each failure using the memory reason-code taxonomy.
- Separate operational/config failures from code defects.

Verification:

- Attach sanitized command output or workflow artifacts to the issue.
- Record whether `gcloud` access was available or blocked by auth state.

## MEM-002: Define Memory Runtime Status Contract

Add shared readiness types for memory runtime state.

Acceptance criteria:

- Define `MemoryRuntimeStatus` and per-check result types.
- Include readiness checks for plugin, skill, tool policy, scope, MCP, MongoDB, Gemini embedding, vector index, schema, routing, multimodal payload handling, and audit.
- Each check includes `status`, `reasonCode`, `summary`, `nextAction`, and sanitized `evidence`.
- Tests cover ready, degraded, failed, and unknown states.

Verification:

- Type tests or unit tests prove stable payload shape.
- Existing status payloads remain backward compatible unless explicitly versioned.

## MEM-003: Add Non-Mutating Backend Health

Implement lightweight health checks that can run before `memory_audit`.

Acceptance criteria:

- Health checks do not write memory records.
- MCP startup, MongoDB connectivity, Gemini embedding capability, vector index readiness, and schema readiness are classified separately.
- Secrets and connection strings are redacted.
- Health results use stable reason codes.

Verification:

- Tests cover MCP startup failure, MongoDB connection failure, Gemini auth failure, vector index missing, and schema drift.
- Manual staging run shows health output without creating probe records.

## MEM-004: Add Gemini Embedding 2 Multimodal Provider

Create the embedding provider boundary required by the architecture.

Acceptance criteria:

- Provider embeds normalized multimodal parts with Gemini Embedding 2.
- Output vectors are normalized and dimension-checked at 1536 dimensions.
- Chunked embeddings are mean-pooled and normalized.
- Auth, request, payload, and dimensionality failures are classified separately.
- The configured model id is persisted on stored memory records.

Verification:

- Unit tests cover single chunk, multiple chunks, dimension mismatch, auth failure classification, and request failure classification.
- Existing Gemini embedding behavior remains compatible.

## MEM-005: Add Multimodal Payload Normalizer

Centralize multimodal payload validation and attachment manifest generation.

Acceptance criteria:

- Supports text, image, audio, video, and configured document MIME types.
- Builds attachment manifests with modality, MIME type, content hash, byte length, storage mode, and optional filename/reference fields.
- Creates explicit fallback text for media-only and deferred-document records.
- Unsupported payloads return `multimodal_payload_invalid`.
- No supported part is silently dropped.

Verification:

- Tests cover mixed text/media, media-only fallback, deferred document fallback, oversized payloads, unsupported MIME types, and attachment manifest hashes.

## MEM-006: Add Vector Index Readiness Validation

Detect Atlas vector index mismatches before recall fails.

Acceptance criteria:

- Reports missing active vector index as `vector_index_missing`.
- Reports missing filter fields as `vector_index_filter_mismatch`.
- Confirms index dimensions match Gemini Embedding 2 output.
- Documents the expected scoped index definition.

Verification:

- Tests cover missing index, missing routing filters, dimension mismatch, and healthy index metadata.
- Docs include the expected `vector_index_v2` shape.

## MEM-007: Add Memory Service Facade

Decouple memory-ops behavior from MongoDB, MCP, and Gemini implementation classes.

Acceptance criteria:

- Define `MemoryService` and related input/result types.
- `MemoryOpsService` depends on `MemoryService`.
- Existing memory-ops behavior and details payloads remain compatible.
- No new mock-file infrastructure is introduced.

Verification:

- Existing memory-ops tests are preserved or strengthened.
- Type boundaries prevent memory-ops from importing MongoDB/MCP/Gemini implementation classes directly.

## MEM-008: Extract Mongo MCP Gemini Backend

Move current backend behavior behind explicit backend modules.

Acceptance criteria:

- Extract MCP transport, repository, embedding provider, payload normalizer, and readiness modules.
- Store, recall, forget, list, event, and audit behavior remains unchanged.
- MCP response parsing remains fail-closed and sanitized.
- MongoDB access remains MCP-only in the production path.

Verification:

- Existing round-trip and MCP response-shape tests pass.
- New tests cover backend module boundaries.

## MEM-009: Strict Tool Schema Pass

Tighten memory tool parameter schemas.

Acceptance criteria:

- All memory-mongodb tools use `additionalProperties: false`.
- Existing valid calls continue to work.
- Extra unexpected fields are rejected consistently.
- Schema errors are useful and do not leak secrets.

Verification:

- Tests cover valid and invalid calls for every memory tool.

## MEM-010: Surface Memory Readiness In Status And Doctor

Expose memory health to operators.

Acceptance criteria:

- Status shows active memory plugin and readiness summary.
- Doctor shows failing dependency, reason code, and next action.
- Disabled memory and `memory-core` are handled cleanly.
- Failed `memory-mongodb` readiness does not get confused with tool-policy disablement.

Verification:

- Tests cover ready `memory-mongodb`, failed `memory-mongodb`, `memory-core`, and disabled memory slot.

## MEM-011: Gate Agent Memory Guidance On Readiness

Prevent misleading agent behavior when memory is unhealthy.

Acceptance criteria:

- Agents do not receive guidance implying working memory when backend readiness is failed.
- Tool-policy failure and backend failure produce distinct messages.
- The `memory-ops` skill explains how to respond when memory tools are visible but backend readiness is degraded.
- Existing skill invocation behavior remains compatible.

Verification:

- Tests or fixture prompts cover healthy memory, not-allowlisted memory, and degraded backend memory.

## MEM-012: Improve Memory Audit

Keep audit as the deep write/read/cleanup probe.

Acceptance criteria:

- Audit reports capture result, recall result, evidence ids, latency, cleanup result, and reason when failed.
- Successful probes can be cleaned up.
- Raw probe tokens are treated as diagnostic fields and are not required in routine summaries.
- Audit records lifecycle events.

Verification:

- Tests cover capture failure, recall miss, cleanup success, cleanup failure, and event recording.

## MEM-013: Add Schema And Routing Readiness

Detect records that cannot participate in scoped recall.

Acceptance criteria:

- Readiness detects missing top-level routing fields and missing `metadata.ops`.
- Dry-run scan reports eligible backfill count and sample ids.
- Apply remains explicit and records a memory event.
- Legacy compatibility behavior is documented.

Verification:

- Tests cover legacy unscoped records, current scoped records, dry-run, apply, and event recording.

## MEM-014: Add Modality-Aware Recall Tests

Verify multimodal recall behavior.

Acceptance criteria:

- `memory_recallx` supports `text`, `image`, `audio`, `video`, and `document` modality filters.
- Secret memories remain excluded unless explicitly requested.
- Document fallback text is searchable.
- Different scopes do not leak results.
- Modality filters work with both pushdown and defensive post-filtering.

Verification:

- Tests cover each modality and cross-scope isolation.

## MEM-015: Add Staging Verify Memory Branch

Extend staging acceptance when `memory-mongodb` is active.

Acceptance criteria:

- Verify selects the memory branch when `memory-mongodb` is active and higher-priority configured branches do not apply.
- Verify runs memory readiness and `memory_audit`.
- Verify uploads sanitized readiness and audit artifacts.
- Verify reports an explicit skip reason when memory branch is inactive.

Verification:

- Workflow or script tests cover active memory branch and inactive skip branch.
- Staging run records workflow run id and deployed ref.

## MEM-016: Write Backend Strategy ADR

Evaluate long-term memory backend options.

Acceptance criteria:

- Compares MCP-only, direct MongoDB driver, remote memory service, and hybrid health-only designs.
- Evaluates Zero Trust, least privilege, credential exposure, latency, failure modes, observability, migration cost, and operational support.
- Recommends a production posture.
- Does not implement backend replacement.

Verification:

- ADR is reviewed as a design artifact.
- Any direct-driver path remains explicitly out of implementation scope unless separately approved.

## MEM-017: Release And Staging Closeout

Ship the approved implementation through DAISy release discipline.

Acceptance criteria:

- Feature branch is created from `daisy/dev`.
- CI is green.
- Review threads are addressed and resolved.
- Human approval is obtained before merge.
- Docker Release completes.
- Staging dry-run deploy succeeds.
- Staging real deploy succeeds.
- `verify.yml` passes or reports a clearly unrelated operational blocker.
- Closeout records run ids, merged SHA, deployed SHA, verified areas, and unverified areas.

Verification:

- Final closeout includes `Synopsis`, `Live Staging Evidence`, and `What I Verified vs. Not`.

## 2) Cross-Issue Constraints

- Do not weaken test coverage to make the redesign pass.
- Do not add mock-file infrastructure that violates the anti-mock policy.
- Do not implement a direct MongoDB driver production path without the backend ADR and explicit approval.
- Do not change existing tool names during migration.
- Do not store secrets unless the caller explicitly marks the memory as secret.
- Do not rely on another agent's memory scope as an implicit fallback.
