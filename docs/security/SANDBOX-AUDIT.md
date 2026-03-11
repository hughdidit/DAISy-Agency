# VM Container Security Audit: DAISy Agent Permissions

## Context

DAISy is a fork of OpenClaw deployed on a GCP VM, containerized via Docker. The user wants to verify whether the VM container agents run in is truly full read/write, understand the escape risks, and explore least-privilege strategies that don't limit agent functionality.

---

## Finding: Previous Default Configuration Was Wide Open

**The sandbox mode previously defaulted to `"off"`.** As of this audit, the code defaults have been hardened:

In `src/agents/sandbox/config.ts:191`:

```
mode: agentSandbox?.mode ?? agent?.mode ?? "all"       // was "off"
scope: ... ?? "session"                                 // was "agent"
workspaceAccess: ... ?? "rw"                            // was "none"
```

With the old defaults, all agent tool execution (exec, read, write, edit, process) ran directly on the host — not in any container. The Docker containers in `docker-compose.yml` house the Gateway process itself, but agent tool execution happened on the same host unless sandbox mode was explicitly enabled. **The new defaults sandbox all sessions by default.** Deployments can override back to `"off"` via `agents.defaults.sandbox.mode` in `openclaw.json`.

### What "full read/write" actually means in practice:

| Capability         | Default (sandbox off)                       | With sandbox enabled                    |
| ------------------ | ------------------------------------------- | --------------------------------------- |
| File read          | **Unrestricted host filesystem**            | Sandboxed workspace only                |
| File write         | **Unrestricted host filesystem**            | Sandboxed workspace only                |
| Command execution  | **Runs on host** (exec-approvals only gate) | Runs in Docker container                |
| Network access     | **Full host network**                       | No network (default)                    |
| Process spawning   | **Unrestricted**                            | Limited by container PID limits         |
| Docker socket      | **Accessible if host has it**               | Blocked by bind validation              |
| System directories | **Accessible**                              | `/etc`, `/proc`, `/sys`, `/dev` blocked |

**Verdict: With sandbox mode `"off"`, agents have full read/write access to everything the Gateway process can reach. The new default (`"all"`) sandboxes all sessions. The table above shows the risk when sandbox is explicitly disabled.**

---

## Safety Issues: Agent Container Escape Vectors

### 1. There IS No Container to Escape (sandbox off)

With the default `sandbox.mode: "off"`, there is no isolation boundary. The "container" is just the Docker container running the Gateway Node.js process. Agent tool calls (`exec`, `write`, `read`) execute within the same process/host context. An agent manipulated via prompt injection can:

- **Read any file** on the host filesystem (SSH keys, cloud credentials, other service configs)
- **Write any file** including crontabs, systemd units, `.bashrc`, authorized_keys
- **Execute arbitrary commands** (only gated by exec-approvals, which default to `"deny"` but can be overridden)
- **Access cloud metadata endpoints** (GCP: `169.254.169.254`) to steal service account tokens
- **Pivot to other services** on the same network

### 2. Even With Sandbox Enabled, Escape Vectors Exist

If sandbox mode is enabled (`"non-main"` or `"all"`), the Docker isolation is good but not perfect:

| Vector                            | Risk     | Notes                                                                          |
| --------------------------------- | -------- | ------------------------------------------------------------------------------ |
| **Elevated exec escape hatch**    | High     | `tools.elevated` explicitly runs on host, bypassing sandbox                    |
| **Bind mount misconfiguration**   | Medium   | Custom binds with `:rw` pierce sandbox filesystem                              |
| **`dangerouslyAllow*` overrides** | Medium   | Three config flags explicitly disable security checks                          |
| **Docker socket exposure**        | Critical | If `/var/run/docker.sock` is mounted (blocked by default but overridable)      |
| **Kernel exploits**               | Low      | Container shares host kernel; CVEs like Leaky Vessels (2024)                   |
| **Symlink/TOCTOU races**          | Low      | Validated via `resolveSandboxHostPathViaExistingAncestor` but edge cases exist |
| **Network escape (if bridge)**    | Medium   | Default is `"none"` but if changed to `"bridge"`, full egress                  |

### 3. Prompt Injection as the Primary Threat

The threat model explicitly states: **"The model/agent is not a trusted principal."** This means:

- Any user message, fetched URL, email, or webhook payload could contain adversarial instructions
- An agent manipulated via prompt injection with host exec access = **full system compromise**
- The exec-approval system is the only gate, and it relies on user judgment (or is bypassed when set to `"full"`)
- The threat model rates T-IMPACT-001 (Unauthorized Command Execution) as **Critical**

---

## Least-Privilege Strategy: Defense Without Limiting Functionality

### Tier 1: Enable Sandboxing (Immediate, No Functionality Loss)

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // Sandbox ALL sessions, not just non-main
        "scope": "session", // One container per session (best isolation)
        "workspaceAccess": "rw", // Agents can still read/write workspace files
        "docker": {
          "network": "none", // No network (already default)
          "readOnlyRoot": true, // Already default
          "capDrop": ["ALL"], // Already default
        },
      },
    },
  },
}
```

**What agents keep:** Full read/write access to workspace, shell execution inside container, file operations within workspace.

**What agents lose:** Access to host filesystem outside workspace, access to other services on the network, access to cloud metadata.

**Functionality impact:** None. The `docker.network: "none"` setting only affects the sandbox container where `exec` runs. High-level tools route through the gateway or separate containers:

| Tool                  | Execution Location                           | Affected by sandbox `network: "none"`?  |
| --------------------- | -------------------------------------------- | --------------------------------------- |
| `exec` (bash/shell)   | Sandbox container                            | **Yes** — `curl`, `wget`, etc. blocked  |
| `read`/`write`/`edit` | Sandbox (via fs-bridge)                      | No — filesystem bridge handles I/O      |
| `web_fetch`           | **Gateway host**                             | **No** — full internet access preserved |
| `web_search`          | **Gateway host**                             | **No** — full internet access preserved |
| `browser`             | **Separate browser container** (own network) | **No** — has its own Docker network     |
| `message`             | **Gateway host**                             | **No** — routes through gateway         |

**This is the key insight: sandbox network isolation blocks rogue `curl`/`nc` data exfiltration from exec, but does NOT limit the agent's high-level capabilities (browsing, fetching, messaging).** This is by design — the sandbox isolates code execution, while network-dependent tools are routed through the gateway where they can be logged and policy-controlled.

### Tier 2: Tighten Exec Approvals (Immediate)

```jsonc
{
  "tools": {
    "exec": {
      "security": "allowlist", // Only allowlisted commands
      "ask": "on-miss", // Prompt for unknown commands
      "askFallback": "deny", // Deny if no UI available to ask
    },
  },
}
```

This ensures even inside the sandbox, only known-safe commands run without approval.

### Tier 3: Restrict Filesystem Scope (Recommended)

```jsonc
{
  "tools": {
    "fs": {
      "workspaceOnly": true, // read/write/edit confined to workspace
    },
    "exec": {
      "applyPatch": {
        "workspaceOnly": true, // apply_patch confined to workspace
      },
    },
  },
}
```

### Tier 4: Disable Dangerous Escape Hatches

```jsonc
{
  "tools": {
    "elevated": {
      "enabled": false, // No "run on host" escape
    },
  },
}
```

And ensure NO `dangerouslyAllow*` flags are set:

- `dangerouslyAllowReservedContainerTargets`: false
- `dangerouslyAllowExternalBindSources`: false
- `dangerouslyAllowContainerNamespaceJoin`: false

### Tier 5: Network Egress Control (Only If Needed)

Since `web_fetch`, `browser`, and `message` tools route through the gateway (not the sandbox container), most agents do NOT need sandbox network access. Only grant it for agents whose skills need to run network commands (e.g., `pip install`, `npm install`, `git clone`) inside the sandbox:

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "build-agent",
        "sandbox": {
          "docker": {
            "network": "bridge", // Allow network for this agent only
            "dns": ["1.1.1.1"], // Explicit DNS, not host resolver
          },
        },
      },
    ],
  },
}
```

For most agents, keep `network: "none"` (the default). This blocks data exfiltration via `curl`/`nc` in exec while preserving all high-level tool functionality.

### Tier 6: Tool Policy Profiles (Role-Based)

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "chat-agent",
        "tools": {
          "profile": "messaging",
          "deny": ["group:runtime", "group:fs", "sessions_spawn"],
        },
      },
      {
        "id": "coding-agent",
        "tools": {
          "profile": "coding",
          "deny": ["group:automation"],
        },
      },
    ],
  },
}
```

Agents only get the tools they actually need.

### Tier 7: Subagent Delegation Hardening

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "main",
        "subagents": {
          "allowAgents": ["coding-agent"], // Narrow delegation
        },
      },
    ],
  },
}
```

Use `sandbox: "require"` on `sessions_spawn` calls to prevent spawning unsandboxed children.

---

## Summary: Risk vs. Mitigation Matrix

| Risk                                | Current State  | After Least-Privilege           | Residual Risk                            |
| ----------------------------------- | -------------- | ------------------------------- | ---------------------------------------- |
| Host filesystem access              | **Full**       | Workspace only                  | Low                                      |
| Arbitrary command execution         | **Host-level** | Sandboxed + allowlisted         | Low                                      |
| Cloud metadata theft                | **Possible**   | No network in sandbox           | None                                     |
| Docker socket access                | **Possible**   | Blocked by validation           | None                                     |
| Agent-to-agent lateral movement     | **Possible**   | Session-scoped containers       | Low                                      |
| Data exfiltration via exec (`curl`) | **Possible**   | No network in sandbox           | None                                     |
| Data exfiltration via `web_fetch`   | **Possible**   | Still possible (gateway-routed) | Medium — needs URL allowlisting (Tier 8) |
| Prompt injection → RCE              | **Critical**   | Sandbox + approvals             | Medium (defense in depth)                |

## Key Files Modified

### Code defaults (in this repo) — DONE

| File                           | Line | Change                                    |
| ------------------------------ | ---- | ----------------------------------------- |
| `src/agents/sandbox/config.ts` | 191  | Default mode `"off"` → `"all"`            |
| `src/agents/sandbox/config.ts` | 193  | Default workspaceAccess `"none"` → `"rw"` |
| `src/agents/sandbox/config.ts` | 73   | Default scope `"agent"` → `"session"`     |

### Runtime config (on the GCP VM)

- **Config file**: `/opt/DAISy/config/openclaw.json` (mounted read-only into the container at `/home/node/.openclaw/openclaw.json`)
- **Workspace dir**: `/opt/DAISy/workspace/` (mounted read-write at `/home/node/.openclaw/workspace`)
- **Compose files**: `/opt/DAISy/docker-compose.yml` + `/opt/DAISy/docker-compose.host.yml`
- **Environment file**: `/opt/DAISy/config/.env` (optional, for env-var overrides)

---

## VM Access & File Locations

### SSH into the VM

All access is via IAP-tunneled SSH (no public SSH port):

```bash
gcloud compute ssh <GCE_INSTANCE_NAME> \
  --project <GCP_PROJECT_ID> \
  --zone <GCP_ZONE> \
  --tunnel-through-iap
```

Replace `<GCE_INSTANCE_NAME>`, `<GCP_PROJECT_ID>`, and `<GCP_ZONE>` with the
values from your GitHub environment secrets/variables (e.g., staging or
production).

### VM directory layout

```
/opt/DAISy/
├── docker-compose.yml          # Main compose (deployed by CI)
├── docker-compose.host.yml     # Host-networking overlay (deployed by CI)
├── config/
│   ├── openclaw.json           # Runtime config (EDIT THIS for Tiers 2-7)
│   └── .env                    # Optional env overrides
└── workspace/                  # Agent session data (owned by uid 1000)
```

- `config/` and `workspace/` are owned by uid `1000` (the `node` user inside the container)
- `openclaw.json` is bind-mounted `:ro` into the container — changes require a container restart

### Edit the config

```bash
# SSH in
gcloud compute ssh <INSTANCE> --project <PROJECT> --zone <ZONE> --tunnel-through-iap

# Edit config (nano, vi, or your preferred editor)
sudo -u "$(stat -c '%U' /opt/DAISy/config)" nano /opt/DAISy/config/openclaw.json

# Restart gateway to pick up changes
cd /opt/DAISy
sudo docker-compose -f docker-compose.yml -f docker-compose.host.yml restart openclaw-gateway

# Verify health
sudo docker inspect --format '{{.State.Health.Status}}' $(sudo docker ps -qf 'name=^openclaw-gateway$' | head -1)
```

### Verify sandbox status

After restarting with config changes:

```bash
# Check sandbox config via CLI (run inside the gateway container)
sudo docker exec $(sudo docker ps -qf 'name=^openclaw-gateway$' | head -1) \
  node dist/index.js sandbox explain

# Or check security audit
sudo docker exec $(sudo docker ps -qf 'name=^openclaw-gateway$' | head -1) \
  node dist/index.js security audit --deep
```

### Prerequisite: sandbox Docker image

The sandbox containers use the image `openclaw-sandbox:bookworm-slim`. If this
image is not built on the VM, sandbox mode will fail at container creation.

Check if it exists:

```bash
sudo docker images openclaw-sandbox:bookworm-slim
```

If missing, you'll need to build or pull the sandbox image before enabling
sandbox mode. Alternatively, set `agents.defaults.sandbox.mode: "off"` in
`openclaw.json` to disable sandboxing until the image is available.

---

## Verification

1. After config changes, run `openclaw sandbox explain` to verify effective sandbox mode
2. Run `openclaw security audit --deep` to check for remaining issues
3. Test agent functionality with sandbox enabled to confirm no regressions
4. Verify `exec` tool runs inside container: agent runs `id -u` and confirms the UID matches the configured sandbox Docker user (often a numeric uid:gid), not a privileged host user like `root`
5. Verify network isolation: agent runs `curl 169.254.169.254` → should fail (no network)
6. Verify filesystem isolation: agent tries `cat /etc/passwd` → should see container's `/etc/passwd`, not host's
