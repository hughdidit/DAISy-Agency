# GWS Audit Events

Every read and write attempt emits a structured audit event through the plugin
logger.

## Core fields

- `timestamp`
- `agentId`
- `sessionId`
- `sessionKey`
- `bindingSubject`
- `routeName`
- `toolName`
- `action`
- `targetService`
- `readOnly`
- `decision`
- `denyReason`
- `credentialMode`
- `latencyMs`
- `exitCode`
- `resultCode`

## Write guarantees

- every write attempt is audited whether allowed or denied
- deny reasons remain redacted for secrets and path material
- audit events are emitted even for validation and config failures
