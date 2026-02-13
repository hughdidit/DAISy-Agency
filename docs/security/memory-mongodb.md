# Security: MongoDB Atlas Memory Extension

This document covers security considerations for the `@moltbot/memory-mongodb` extension.

## Credential Management

### Connection string handling
- The `connectionUri` field contains MongoDB credentials (`user:pass@host`). It is **never logged** — startup messages only reference `databaseName/collectionName`.
- Both `connectionUri` and `embedding.apiKey` are marked `sensitive: true` in the plugin manifest, which prevents UI display and enables log masking.
- **Recommended**: Use environment variable references (`${MONGODB_URI}`) instead of inline credentials. Direct credentials in config files are stored cleartext on disk.

### Error sanitization
- MongoDB driver errors may contain the full connection URI. The provider catches these in `doInitialize()` and strips the URI (and URI variants) from error messages before re-throwing.

## Transport Security

### TLS enforcement
- `mongodb+srv://` requires TLS by protocol — no additional validation needed.
- For plain `mongodb://` URIs, the config parser validates that either:
  - The host is localhost (`localhost`, `127.0.0.1`, `::1`), or
  - The query string includes `tls=true` (or `ssl=true`)
- Connections to remote hosts over plaintext are **rejected at config parse time**.
- The plugin **never sets** `tlsInsecure` or `tlsAllowInvalidCertificates` on the MongoClient.
- The config parser **rejects** connection URIs containing `tlsInsecure=true` or `tlsAllowInvalidCertificates=true` in query parameters.

## Query Safety

### Parameterized queries
- All MongoDB operations use the driver's parameterized BSON query methods (`insertOne`, `findOne`, `deleteOne`, `aggregate`). No string interpolation is used in query construction, preventing injection attacks.

### No raw filter parameter
- The `search()` method does not accept arbitrary user-controlled filter objects. Passing untrusted objects as MongoDB query filters could enable `$where` injection. This parameter was excluded by design.

### UUID validation
- The `delete()` and `get()` methods validate that the `id` parameter matches UUID format (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) before querying. This is defense-in-depth, consistent with the LanceDB plugin.

## Data Protection

### Vector stripping
- `memory_recall` and `memory_forget` tools strip embedding vectors from returned results before passing them to the agent. Embedding vectors should not be exposed in tool responses.

### `clear()` not exposed
- The `MongoMemoryDB.clear()` method (which calls `deleteMany({})`) exists on the provider class but is **not exposed** via any tool. Bulk deletion cannot be triggered by the agent.

### Atlas encryption at rest
- For production use, enable [Atlas Encryption at Rest](https://www.mongodb.com/docs/atlas/security-encryption-at-rest/) (available on M10+ dedicated clusters). The plugin cannot enforce this server-side setting.

## Auto-Capture Guardrails

### Content filtering
- The `shouldCapture()` function rejects:
  - Content shorter than 10 characters or longer than 500 characters
  - Injected memory context (`<relevant-memories>` tags)
  - System-generated XML content
  - Markdown-heavy agent summaries
  - Emoji-heavy responses (>3 emoji)
- Only content matching specific trigger patterns (preferences, contact info, decisions, explicit remember requests) is captured.

### Configurable triggers
- Capture triggers can be customized via the `captureTriggers` config field (array of regex pattern strings).
- Custom patterns are validated at config parse time — invalid regex syntax is rejected.
- Triggers are compiled once at plugin registration, not per-message.
- Since triggers are admin-configured (same trust level as the connection string and API key), ReDoS from intentionally pathological patterns is accepted risk. Avoid patterns with nested quantifiers (e.g., `(a+)+$`) in production.

### Deduplication
- A 0.95 cosine similarity threshold prevents near-exact duplicates from being stored, guarding against agent loops filling the database.

### Per-conversation cap
- Auto-capture stores a maximum of 3 memories per `agent_end` event.

## Network Posture

- The plugin makes **outbound connections only**:
  - To MongoDB Atlas (or a self-hosted MongoDB instance) for data storage
  - To the OpenAI API (`api.openai.com`) for embedding generation
- No listening ports are opened. No inbound network access is required.
