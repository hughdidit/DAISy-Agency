# Security Review: daisy/dev -> Staging

**Date:** February 16, 2026
**Branch:** `daisy/dev`
**Target:** Staging Deployment
**Remediation:** February 17, 2026

## Executive Summary

The `daisy/dev` branch introduces several new features, including a MongoDB-backed long-term memory system and updates to the execution environment. The overall security posture is good, with strong defaults for TLS and secret handling. However, the **staging environment provisioning process** presents a significant risk by cloning the production boot disk, potentially exposing production secrets to the staging environment. Additionally, the new memory system's default behavior of auto-capturing conversation data should be reviewed for privacy compliance.

## High Risk Findings

### 1. Staging VM Provisioning via Production Disk Cloning
- **File:** `scripts/gcp/create-staging-vm.sh`
- **Issue:** The script creates the staging VM by snapshotting the **production boot disk** (`PROD_BOOT_DISK`).
- **Risk:** This copies all data, configuration, and potentially unencrypted secrets from the production environment to the staging environment. If the staging environment has broader access controls (e.g., more developers have SSH access), production secrets could be compromised.
- **Recommendation:**
    - **Ideally:** Provision Staging from a fresh base image using configuration management (e.g., Ansible, startup scripts) and inject only staging-specific secrets.
    - **Mitigation:** If cloning is required for fidelity, ensuring that Staging ACLs (SSH access, IAM roles) are **identical** to Production is critical. Verify that no developer has access to Staging who does not also have access to Production.
    - **Action:** Verify `scripts/gcp/staging-scrub.sh` (if it exists and is run) effectively removes all production secrets immediately after cloning.
- **Remediation:** `staging-scrub.sh` now accepts `--force` for non-interactive execution; `create-staging-vm.sh` accepts `--auto-scrub` to automatically run the scrub after VM creation, ensuring production secrets are removed without relying on a manual step.

## Medium Risk Findings

### 2. MongoDB Memory Extension Defaults to Auto-Capture
- **File:** `extensions/memory-mongodb/config.ts` (Line 282)
- **Issue:** The `autoCapture` setting defaults to `true`.
- **Risk:** The plugin automatically captures text matching triggers like "password", "important", "remember" and sends them to the configured embedding provider (default: OpenAI) to generate vector embeddings. This could inadvertently leak sensitive PII or credentials discussed in the chat to the third-party provider.
- **Recommendation:**
    - Default `autoCapture` to `false` in the configuration schema to require opt-in.
    - Add a prominent warning in the UI/documentation that conversation snippets are sent to a third-party service.
- **Remediation:** Accepted risk -- autoCapture/autoRecall remain ON (opt-out). The agent's core operation requires memory to function as designed.

## Low Risk Findings

### 3. Elevated Execution Logic Bypasses Approvals
- **File:** `src/agents/bash-tools.exec.ts`
- **Issue:** If `elevated.defaultLevel` is configured to `"full"`, the agent can execute root commands without human approval (`ask = "off"`).
- **Risk:** While a valid feature for autonomous agents, a malicious or accidental configuration change could grant unchecked root access.
- **Verification:** Confirmed that no default configuration files in the repository enable this setting. It remains a configuration-time risk.
- **Remediation:** A warning is now emitted when full elevated mode is active, making it visible in logs and command output.

### 4. Control UI Authentication Exposure
- **File:** `src/gateway/server-http.ts`
- **Issue:** `handleControlUiHttpRequest` is mounted without an explicit `resolvedAuth` check in the handler itself (relying on the middleware/setup).
- **Risk:** If `controlUiEnabled` is true and the gateway binds to `0.0.0.0`, the Control UI might be exposed if not protected by a reverse proxy or VPN.
- **Mitigation:** `scripts/deploy.sh` defaults `CLAWDBOT_GATEWAY_BIND` to `loopback`, and the staging setup uses IAP tunneling, which mitigates this risk for remote attackers.
- **Remediation:** Auth gate added to both `handleControlUiHttpRequest` and `handleControlUiAvatarRequest` -- non-local requests now require a valid bearer token. Local direct requests (loopback) continue to work without auth for backward compatibility.

### 5. Deployment Script Secret Logging
- **File:** `scripts/deploy.sh`
- **Observation:** The script echoes `DEPLOY_ENV` and other variables.
- **Status:** Good. The script carefully avoids echoing actual secret values (lines 77-80), logging only that they are "required".
- **Remediation:** No action required -- already handled correctly.

## Positive Findings

- **MongoDB TLS Enforcement:** The `extensions/memory-mongodb` plugin strictly enforces TLS for non-localhost connections and sanitizes connection strings in error messages to prevent credential leakage.
- **Dependency Safety:** No new dependencies were added to `package.json`, reducing the supply chain attack surface.
- **Secure Comparison:** The `safeTokenEqual` function is used for webhook token validation, preventing timing attacks.

## Conclusion

The `daisy/dev` branch is generally safe to deploy to staging, **provided that the Staging VM access controls are strictly aligned with Production** due to the disk cloning strategy. We recommend disabling `autoCapture` by default in the MongoDB extension before merging to `daisy/main`.
