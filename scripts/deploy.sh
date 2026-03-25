#!/usr/bin/env bash
set -euo pipefail

# Deploy script for DAISy staging/production
# Uses gcloud compute ssh with IAP tunneling for secure access
# Usage: deploy.sh [--resolve-only] [--provision] <metadata-path>

RESOLVE_ONLY="false"
PROVISION="false"
WITH_MONITORING="false"

while [[ "${1:-}" == --* ]]; do
  case "${1}" in
    --resolve-only)
      RESOLVE_ONLY="true"
      shift
      ;;
    --provision)
      PROVISION="true"
      shift
      ;;
    --with-monitoring)
      WITH_MONITORING="true"
      shift
      ;;
    *)
      echo "Unknown option: ${1}" >&2
      exit 1
      ;;
  esac
done

META_PATH="${1:-}"

# If IMAGE_REF_OVERRIDE is set, use it directly without reading metadata
if [[ -n "${IMAGE_REF_OVERRIDE:-}" ]]; then
  RESOLVED_REF="${IMAGE_REF_OVERRIDE}"
else
  # Require metadata path when no override
  if [[ -z "${META_PATH}" ]]; then
    echo "ERROR: metadata path required when IMAGE_REF_OVERRIDE is not set" >&2
    exit 1
  fi

  chmod +x scripts/read-release-metadata.sh

  IMAGE="$(scripts/read-release-metadata.sh "$META_PATH" image)"
  DIGEST="$(scripts/read-release-metadata.sh "$META_PATH" digest)"
  FIRST_TAG="$(scripts/read-release-metadata.sh "$META_PATH" first_tag)"

  if [[ -z "${IMAGE//[[:space:]]/}" ]]; then
    echo "ERROR: release metadata missing required field: image" >&2
    exit 3
  fi

  if [[ -n "${DIGEST}" ]]; then
    RESOLVED_REF="${IMAGE}@${DIGEST}"
  elif [[ -n "${FIRST_TAG}" ]]; then
    RESOLVED_REF="${IMAGE}:${FIRST_TAG}"
  else
    echo "ERROR: No image reference available (no digest, no tags)." >&2
    exit 3
  fi
fi

if [[ "${RESOLVE_ONLY}" == "true" ]]; then
  echo "${RESOLVED_REF}"
  exit 0
fi

echo "DEPLOY_ENV: ${DEPLOY_ENV:-<unset>}"
echo "DRY_RUN:    ${DRY_RUN:-<unset>}"
echo "DEPLOY_REF: ${RESOLVED_REF}"

if [[ "${DRY_RUN:-true}" == "true" ]]; then
  echo "Dry-run enabled: no deployment performed."
  exit 0
fi

# Legacy fallback: accept CLAWDBOT_* if OPENCLAW_* not set (migration period)
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-${CLAWDBOT_GATEWAY_TOKEN:-}}"
OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-${CLAWDBOT_GATEWAY_PORT:-}}"
OPENCLAW_BRIDGE_PORT="${OPENCLAW_BRIDGE_PORT:-${CLAWDBOT_BRIDGE_PORT:-}}"
OPENCLAW_GATEWAY_BIND="${OPENCLAW_GATEWAY_BIND:-${CLAWDBOT_GATEWAY_BIND:-loopback}}"

# Validate required environment variables for IAP deploy
: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required for real deploy}"
: "${GCP_ZONE:?GCP_ZONE is required for real deploy}"
: "${GCE_INSTANCE_NAME:?GCE_INSTANCE_NAME is required for real deploy}"
: "${GHCR_USERNAME:?GHCR_USERNAME is required for real deploy}"
: "${GHCR_TOKEN:?GHCR_TOKEN is required for real deploy}"

# App secrets (passed to docker compose on the VM)
: "${OPENCLAW_GATEWAY_TOKEN:?OPENCLAW_GATEWAY_TOKEN is required for real deploy}"
: "${CLAUDE_AI_SESSION_KEY:?CLAUDE_AI_SESSION_KEY is required for real deploy}"
: "${DISCORD_BOT_TOKEN:?DISCORD_BOT_TOKEN is required for real deploy}"
: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY is required for real deploy}"
# OPENAI_API_KEY is optional (OpenAI-backed model/tool access)
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
# MONGODB_URI and GEMINI_API_KEY are optional (memory-mongodb plugin only)
MONGODB_URI="${MONGODB_URI:-}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
# CLAUDE_WEB_SESSION_KEY and CLAUDE_WEB_COOKIE are optional (usage monitoring only)
CLAUDE_WEB_SESSION_KEY="${CLAUDE_WEB_SESSION_KEY:-}"
CLAUDE_WEB_COOKIE="${CLAUDE_WEB_COOKIE:-}"
# BRAVE_API_KEY is optional (web-search tool)
BRAVE_API_KEY="${BRAVE_API_KEY:-}"
# FIRECRAWL_API_KEY is optional (firecrawl tool)
FIRECRAWL_API_KEY="${FIRECRAWL_API_KEY:-}"
# Trello integration secrets are optional
TRELLO_API_KEY="${TRELLO_API_KEY:-}"
TRELLO_TOKEN="${TRELLO_TOKEN:-}"
# GOOGLE_WORKSPACE_CLI_TOKEN is optional (gws-toolkit-phase1 token auth mode)
GOOGLE_WORKSPACE_CLI_TOKEN="${GOOGLE_WORKSPACE_CLI_TOKEN:-}"
# GWS_CREDENTIALS is optional (gws-toolkit-phase1 credentials_file mode, JSON payload)
GWS_CREDENTIALS="${GWS_CREDENTIALS:-}"

DEPLOY_DIR="${DEPLOY_DIR:-/opt/DAISy}"
: "${OPENCLAW_GATEWAY_PORT:?OPENCLAW_GATEWAY_PORT is required for real deploy}"
: "${OPENCLAW_BRIDGE_PORT:?OPENCLAW_BRIDGE_PORT is required for real deploy}"

# Validate that ports are numeric and that bridge port = gateway port + 1
if ! [[ "${OPENCLAW_GATEWAY_PORT}" =~ ^[0-9]+$ ]]; then
  echo "ERROR: OPENCLAW_GATEWAY_PORT must be a numeric port (got: ${OPENCLAW_GATEWAY_PORT})" >&2
  exit 1
fi
if ! [[ "${OPENCLAW_BRIDGE_PORT}" =~ ^[0-9]+$ ]]; then
  echo "ERROR: OPENCLAW_BRIDGE_PORT must be a numeric port (got: ${OPENCLAW_BRIDGE_PORT})" >&2
  exit 1
fi
expected_bridge_port=$((OPENCLAW_GATEWAY_PORT + 1))
if [[ "${OPENCLAW_BRIDGE_PORT}" -ne "${expected_bridge_port}" ]]; then
  echo "ERROR: OPENCLAW_BRIDGE_PORT (${OPENCLAW_BRIDGE_PORT}) must equal OPENCLAW_GATEWAY_PORT + 1 (${expected_bridge_port})" >&2
  exit 1
fi
echo "Deploying to ${GCE_INSTANCE_NAME} via IAP (dir: ${DEPLOY_DIR})..."
echo "Provision: ${PROVISION}"

# Provision VM if requested (creates directory structure and copies docker-compose.yml)
if [[ "${PROVISION}" == "true" ]]; then
  echo "Provisioning VM..."
  printf -v DEPLOY_DIR_ESCAPED '%q' "${DEPLOY_DIR}"

  # Base64 encode compose files to pass as argument (stdin not forwarded by gcloud ssh --command)
  COMPOSE_B64="$(base64 -w0 docker-compose.yml)"
  COMPOSE_HOST_B64="$(base64 -w0 docker-compose.host.yml)"
  COMPOSE_SANDBOX_B64="$(base64 -w0 docker-compose.sandbox.yml)"

  # Provision VM: install docker-compose, create directory structure, copy compose files
  # --quiet suppresses interactive prompts (SSH key generation) that would consume stdin
  gcloud compute ssh "${GCE_INSTANCE_NAME}" \
    --project "${GCP_PROJECT_ID}" \
    --zone "${GCP_ZONE}" \
    --tunnel-through-iap \
    --quiet \
    --command "bash -c 'set -euo pipefail; DEPLOY_DIR=${DEPLOY_DIR_ESCAPED}; if ! command -v docker-compose >/dev/null 2>&1; then echo \"Installing docker-compose...\"; sudo curl -fsSL \"https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64\" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose; fi; sudo mkdir -p \"\${DEPLOY_DIR}\"; sudo chown \"\$(whoami):\$(whoami)\" \"\${DEPLOY_DIR}\"; echo \"${COMPOSE_B64}\" | base64 -d > \"\${DEPLOY_DIR}/docker-compose.yml\"; echo \"${COMPOSE_HOST_B64}\" | base64 -d > \"\${DEPLOY_DIR}/docker-compose.host.yml\"; echo \"${COMPOSE_SANDBOX_B64}\" | base64 -d > \"\${DEPLOY_DIR}/docker-compose.sandbox.yml\"; mkdir -p \"\${DEPLOY_DIR}/config\" \"\${DEPLOY_DIR}/workspace\"; sudo chown 1000:1000 \"\${DEPLOY_DIR}/config\" \"\${DEPLOY_DIR}/workspace\"; sudo find \"\${DEPLOY_DIR}/config\" \"\${DEPLOY_DIR}/workspace\" -mindepth 1 -exec chown 1000:1000 {} + 2>/dev/null || true; echo \"Provisioned \${DEPLOY_DIR}\"; ls -la \"\${DEPLOY_DIR}\"; docker-compose version'"
  echo "Provisioning complete."
fi

printf -v DEPLOY_DIR_ESCAPED '%q' "${DEPLOY_DIR}"

# Keep deploy manifests in sync on every real deploy so compose env changes
# reach existing VMs even when the workflow does not request --provision.
echo "Syncing deploy compose files on VM..."
COMPOSE_B64="$(base64 -w0 docker-compose.yml)"
COMPOSE_HOST_B64="$(base64 -w0 docker-compose.host.yml)"
COMPOSE_SANDBOX_B64="$(base64 -w0 docker-compose.sandbox.yml)"
{
  printf '%s\n' "${COMPOSE_B64}"
  printf '%s\n' "${COMPOSE_HOST_B64}"
  printf '%s\n' "${COMPOSE_SANDBOX_B64}"
} | gcloud compute ssh "${GCE_INSTANCE_NAME}" \
  --project "${GCP_PROJECT_ID}" \
  --zone "${GCP_ZONE}" \
  --tunnel-through-iap \
  --quiet \
  --command "bash -c 'set -euo pipefail; DEPLOY_DIR=${DEPLOY_DIR_ESCAPED}; sudo mkdir -p \"\${DEPLOY_DIR}\"; read -r COMPOSE_B64; read -r COMPOSE_HOST_B64; read -r COMPOSE_SANDBOX_B64; printf %s \"\${COMPOSE_B64}\" | base64 -d | sudo tee \"\${DEPLOY_DIR}/docker-compose.yml\" > /dev/null; printf %s \"\${COMPOSE_HOST_B64}\" | base64 -d | sudo tee \"\${DEPLOY_DIR}/docker-compose.host.yml\" > /dev/null; printf %s \"\${COMPOSE_SANDBOX_B64}\" | base64 -d | sudo tee \"\${DEPLOY_DIR}/docker-compose.sandbox.yml\" > /dev/null; echo \"Deploy manifests updated in \${DEPLOY_DIR}\"; ls -la \"\${DEPLOY_DIR}\"'"
echo "Deploy compose files synced."

# Deploy monitoring stack if requested
if [[ "${WITH_MONITORING}" == "true" ]]; then
  echo "Deploying monitoring stack..."
  printf -v DEPLOY_DIR_ESCAPED '%q' "${DEPLOY_DIR}"
  MONITORING_SRC="monitoring"

  if [[ ! -d "${MONITORING_SRC}" ]]; then
    echo "ERROR: monitoring/ directory not found in working directory." >&2
    exit 1
  fi

  # Base64-encode monitoring configs for transfer (tar to preserve directory structure)
  MONITORING_TARBALL_B64="$(tar -cf - -C . monitoring/ | base64 -w0)"

  # Transfer and extract monitoring configs on the VM.
  # Clear immutable bits first (set by setup-permissions.sh) so tar can overwrite.
  # Ensure DEPLOY_DIR exists even without --provision.
  # Pipe tarball via stdin to avoid "Argument list too long" with large payloads.
  printf '%s\n' "${MONITORING_TARBALL_B64}" | gcloud compute ssh "${GCE_INSTANCE_NAME}" \
    --project "${GCP_PROJECT_ID}" \
    --zone "${GCP_ZONE}" \
    --tunnel-through-iap \
    --quiet \
    --command "bash -c 'set -euo pipefail; DEPLOY_DIR=${DEPLOY_DIR_ESCAPED}; sudo mkdir -p \"\${DEPLOY_DIR}\"; if [[ -d \"\${DEPLOY_DIR}/monitoring\" ]]; then sudo find \"\${DEPLOY_DIR}/monitoring\" -type f -exec chattr -i {} + 2>/dev/null || true; fi; read -r TARBALL_B64; printf %s \"\${TARBALL_B64}\" | base64 -d | sudo tar -xf - -C \"\${DEPLOY_DIR}\"; sudo chmod +x \"\${DEPLOY_DIR}/monitoring/provision-host.sh\" \"\${DEPLOY_DIR}/monitoring/network/conntrack-logger.sh\" \"\${DEPLOY_DIR}/monitoring/watchdog/daisy-watchdog.py\"; echo \"Monitoring configs deployed to \${DEPLOY_DIR}/monitoring/\"; ls -la \"\${DEPLOY_DIR}/monitoring/\"'"

  # Generate .env.monitoring from environment variables (populated by GitHub Secrets)
  if [[ -n "${GRAFANA_ADMIN_PASSWORD:-}" ]]; then
    ENV_CONTENT="GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
DISCORD_ALERTS_WEBHOOK_URL=${DISCORD_ALERTS_WEBHOOK_URL:-}
ALERT_EMAIL_TO=${ALERT_EMAIL_TO:-}
ALERT_SMTP_HOST=${ALERT_SMTP_HOST:-}
ALERT_SMTP_PORT=${ALERT_SMTP_PORT:-587}
ALERT_SMTP_FROM=${ALERT_SMTP_FROM:-}
ALERT_SMTP_USERNAME=${ALERT_SMTP_USERNAME:-}
ALERT_SMTP_PASSWORD=${ALERT_SMTP_PASSWORD:-}"

    ENV_B64="$(printf '%s' "${ENV_CONTENT}" | base64 -w0)"

    # Pass ENV_B64 via stdin to avoid exposing secrets in process arguments
    printf '%s\n' "${ENV_B64}" | gcloud compute ssh "${GCE_INSTANCE_NAME}" \
      --project "${GCP_PROJECT_ID}" \
      --zone "${GCP_ZONE}" \
      --tunnel-through-iap \
      --quiet \
      --command "bash -c 'set -euo pipefail; DEPLOY_DIR=${DEPLOY_DIR_ESCAPED}; read -r ENV_B64; printf %s \"\${ENV_B64}\" | base64 -d | sudo tee \"\${DEPLOY_DIR}/monitoring/.env.monitoring\" > /dev/null; sudo chown root:root \"\${DEPLOY_DIR}/monitoring/.env.monitoring\"; sudo chmod 600 \"\${DEPLOY_DIR}/monitoring/.env.monitoring\"; echo \".env.monitoring written (root:root 600)\"'"
  else
    echo "NOTE: GRAFANA_ADMIN_PASSWORD not set â€” skipping .env.monitoring generation."
    echo "      If .env.monitoring already exists on the VM, it will be reused."
  fi

  # One-time host provisioning (user, packages, auditd, apparmor, AIDE, systemd units)
  gcloud compute ssh "${GCE_INSTANCE_NAME}" \
    --project "${GCP_PROJECT_ID}" \
    --zone "${GCP_ZONE}" \
    --tunnel-through-iap \
    --quiet \
    --command "bash -c 'set -euo pipefail; DEPLOY_DIR=${DEPLOY_DIR_ESCAPED}; if [[ ! -f \"\${DEPLOY_DIR}/monitoring/.setup-complete\" ]]; then echo \"First-run: provisioning host...\"; sudo \"\${DEPLOY_DIR}/monitoring/provision-host.sh\" && sudo touch \"\${DEPLOY_DIR}/monitoring/.setup-complete\"; else echo \"Host already provisioned (skipping provision-host.sh).\"; fi'"

  # Per-deploy: permissions, log dirs, bind mount, auditd/AppArmor refresh, chattr.
  # These run on EVERY deploy to keep host-level configs in sync with new commits.
  # Uses set +e so individual failures don't abort the entire monitoring deploy.
  gcloud compute ssh "${GCE_INSTANCE_NAME}" \
    --project "${GCP_PROJECT_ID}" \
    --zone "${GCP_ZONE}" \
    --tunnel-through-iap \
    --quiet \
    --command "sudo bash -c 'DEPLOY_DIR=${DEPLOY_DIR_ESCAPED}; MONITORING_DIR=\"\${DEPLOY_DIR}/monitoring\"; LOG_BASE=/var/log; PERMS_ERRORS=0
echo \"Applying per-deploy permissions...\"

# -- Refresh host user namespace policy (keeps host in sync with new commits) --
if cat > /etc/sysctl.d/60-daisy-userns.conf <<'\''SYSCTL'\''
kernel.unprivileged_userns_clone = 0
SYSCTL
then
  if sysctl -p /etc/sysctl.d/60-daisy-userns.conf >/dev/null; then
    echo \"  Refreshed user namespace sysctl.\"
  else
    echo \"ERROR: Failed to apply user namespace sysctl.\" >&2
    exit 1
  fi
else
  echo \"ERROR: Failed to write user namespace sysctl config.\" >&2
  exit 1
fi

# -- Log directories + promtail bind mount --
mkdir -p \"\${LOG_BASE}/falco\" \"\${LOG_BASE}/daisy-watchdog\"
mkdir -p /tmp/openclaw \"\${LOG_BASE}/openclaw\"
chown 1000:1000 /tmp/openclaw
chmod 750 /tmp/openclaw
if ! mountpoint -q \"\${LOG_BASE}/openclaw\"; then
  mount --bind /tmp/openclaw \"\${LOG_BASE}/openclaw\" && \
    echo \"  Bind-mounted /tmp/openclaw -> \${LOG_BASE}/openclaw\" || \
    echo \"WARNING: Failed to create bind mount\"
fi
chown root:daisy-monitor \"\${LOG_BASE}/falco\" || echo \"WARNING: chown falco failed\"
chmod 750 \"\${LOG_BASE}/falco\" || echo \"WARNING: chmod falco failed\"
chown daisy-monitor:daisy-monitor \"\${LOG_BASE}/daisy-watchdog\" || echo \"WARNING: chown watchdog failed\"
chmod 750 \"\${LOG_BASE}/daisy-watchdog\" || echo \"WARNING: chmod watchdog failed\"

# -- Clear immutable bits before updating configs --
IMMUTABLE_FILES=(
  \"\${MONITORING_DIR}/prometheus/prometheus.yml\"
  \"\${MONITORING_DIR}/prometheus/alerts.yml\"
  \"\${MONITORING_DIR}/alertmanager/alertmanager.yml\"
  \"\${MONITORING_DIR}/falco/falco.yaml\"
  \"\${MONITORING_DIR}/falco/rules/daisy-agent-rules.yaml\"
  \"\${MONITORING_DIR}/aide/aide.conf\"
  \"\${MONITORING_DIR}/auditd/daisy-containers.rules\"
  \"\${MONITORING_DIR}/seccomp/daisy-seccomp.json\"
)
for f in \"\${IMMUTABLE_FILES[@]}\"; do
  [[ -f \"\$f\" ]] && chattr -i \"\$f\" 2>/dev/null || true
done

# -- Set monitoring config ownership --
chown -R root:daisy-monitor \"\${MONITORING_DIR}\"
chmod 750 \"\${MONITORING_DIR}\"
find \"\${MONITORING_DIR}\" -type d -exec chmod 750 {} +
find \"\${MONITORING_DIR}\" -type f -exec chmod 640 {} +
find \"\${MONITORING_DIR}\" -name \"*.sh\" -exec chmod 750 {} +
find \"\${MONITORING_DIR}\" -name \"*.py\" -exec chmod 750 {} +

# -- Allow container UIDs to read mounted config files --
for dir in grafana loki prometheus alertmanager promtail; do
  d=\"\${MONITORING_DIR}/\${dir}\"
  if [[ -d \"\$d\" ]]; then
    find \"\$d\" -type d -exec chmod 755 {} +
    find \"\$d\" -type f -exec chmod 644 {} +
  fi
done
echo \"  Container config dirs set to world-readable.\"

# -- Protect .env.monitoring --
if [[ -f \"\${MONITORING_DIR}/.env.monitoring\" ]]; then
  chown root:root \"\${MONITORING_DIR}/.env.monitoring\"
  chmod 600 \"\${MONITORING_DIR}/.env.monitoring\"
fi

# -- Refresh auditd rules (keeps host in sync with new commits) --
if [[ -f \"\${MONITORING_DIR}/auditd/daisy-containers.rules\" ]]; then
  cp \"\${MONITORING_DIR}/auditd/daisy-containers.rules\" /etc/audit/rules.d/ && \
    echo \"  Refreshed auditd rules.\" || echo \"WARNING: Failed to copy auditd rules.\"
  command -v augenrules >/dev/null 2>&1 && augenrules --load 2>/dev/null || true
fi

# -- Refresh AppArmor profile (keeps host in sync with new commits) --
if [[ -f \"\${MONITORING_DIR}/apparmor/openclaw-container\" ]]; then
  cp \"\${MONITORING_DIR}/apparmor/openclaw-container\" /etc/apparmor.d/ && \
    echo \"  Refreshed AppArmor profile.\" || echo \"WARNING: Failed to copy AppArmor profile.\"
  command -v apparmor_parser >/dev/null 2>&1 && apparmor_parser -r /etc/apparmor.d/openclaw-container 2>/dev/null || true
fi

# -- Refresh systemd units (keeps host in sync with new commits) --
if [[ -f \"\${MONITORING_DIR}/watchdog/daisy-watchdog.service\" ]]; then
  cp \"\${MONITORING_DIR}/watchdog/daisy-watchdog.service\" /etc/systemd/system/ && \
    echo \"  Refreshed daisy-watchdog.service.\" || echo \"WARNING: Failed to copy watchdog unit.\"
fi
systemctl daemon-reload 2>/dev/null || true

# -- Reapply immutable attributes on critical configs --
for f in \"\${IMMUTABLE_FILES[@]}\"; do
  [[ -f \"\$f\" ]] && { chattr +i \"\$f\" 2>/dev/null && echo \"  +i \$f\" || echo \"  WARN: chattr not supported for \$f\"; }
done

echo \"Per-deploy permissions applied.\"'"

  # Start/restart monitoring compose stack using docker-compose (standalone binary)
  gcloud compute ssh "${GCE_INSTANCE_NAME}" \
    --project "${GCP_PROJECT_ID}" \
    --zone "${GCP_ZONE}" \
    --tunnel-through-iap \
    --quiet \
    --command "sudo bash -c 'set -euo pipefail; DEPLOY_DIR=${DEPLOY_DIR_ESCAPED}; cd \"\${DEPLOY_DIR}\"; if [[ -f monitoring/.env.monitoring ]]; then docker-compose --env-file monitoring/.env.monitoring -f monitoring/docker-compose.monitoring.yml pull && docker-compose --env-file monitoring/.env.monitoring -f monitoring/docker-compose.monitoring.yml up -d --remove-orphans; else echo \"WARNING: monitoring/.env.monitoring not found. Create it from .env.monitoring.example before starting monitoring.\"; fi; systemctl restart daisy-watchdog || echo \"WARNING: daisy-watchdog restart failed\"; systemctl restart daisy-conntrack-logger || echo \"WARNING: daisy-conntrack-logger restart failed\"'"

  echo "Monitoring deployment complete."
fi

# Build the remote script as a variable (avoids heredoc/pipe conflict)
# shellcheck disable=SC2016
REMOTE_SCRIPT='
set -euo pipefail

DEPLOY_REF="$1"
DEPLOY_DIR="$2"
GHCR_USERNAME="$3"
OPENCLAW_GATEWAY_PORT="$4"
OPENCLAW_BRIDGE_PORT="$5"
OPENCLAW_GATEWAY_BIND="${6:-loopback}"
OPENCLAW_CONFIG_FILE="${7:-openclaw.json}"
MIN_FREE_SPACE_MB="${8:-4096}"

: "${OPENCLAW_GATEWAY_PORT:?OPENCLAW_GATEWAY_PORT is required}"
: "${OPENCLAW_BRIDGE_PORT:?OPENCLAW_BRIDGE_PORT is required}"

# Validate OPENCLAW_CONFIG_FILE to prevent path traversal
case "${OPENCLAW_CONFIG_FILE}" in
  *"/"*|*".."*)
    echo "ERROR: OPENCLAW_CONFIG_FILE must be a simple filename (got: ${OPENCLAW_CONFIG_FILE})" >&2
    exit 1
    ;;
esac

# Read secrets from stdin (one per line, passed by outer script)
read -r GHCR_TOKEN
read -r OPENCLAW_GATEWAY_TOKEN
read -r CLAUDE_AI_SESSION_KEY
read -r DISCORD_BOT_TOKEN
read -r ANTHROPIC_API_KEY
read -r OPENAI_API_KEY || OPENAI_API_KEY=""
read -r MONGODB_URI || MONGODB_URI=""
read -r GEMINI_API_KEY || GEMINI_API_KEY=""
read -r CLAUDE_WEB_SESSION_KEY || CLAUDE_WEB_SESSION_KEY=""
read -r CLAUDE_WEB_COOKIE || CLAUDE_WEB_COOKIE=""
read -r BRAVE_API_KEY || BRAVE_API_KEY=""
read -r FIRECRAWL_API_KEY || FIRECRAWL_API_KEY=""
read -r TRELLO_API_KEY || TRELLO_API_KEY=""
read -r TRELLO_TOKEN || TRELLO_TOKEN=""
read -r GOOGLE_WORKSPACE_CLI_TOKEN || GOOGLE_WORKSPACE_CLI_TOKEN=""
read -r GWS_CREDENTIALS_B64 || GWS_CREDENTIALS_B64=""

echo "Deploy ref: ${DEPLOY_REF}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required on the target host." >&2
  exit 127
fi

# Verify sudo docker access
if ! sudo docker version >/dev/null 2>&1; then
  echo "ERROR: sudo docker access required on the target host." >&2
  exit 127
fi

if [[ ! -f "${DEPLOY_DIR}/docker-compose.yml" ]]; then
  echo "ERROR: docker-compose.yml not found at ${DEPLOY_DIR}." >&2
  exit 6
fi

cd "${DEPLOY_DIR}"

# Verify config file exists before docker compose tries to mount it
OPENCLAW_CONFIG_PATH="config/${OPENCLAW_CONFIG_FILE}"
if [[ ! -f "${OPENCLAW_CONFIG_PATH}" ]]; then
  echo "ERROR: Config file not found at ${DEPLOY_DIR}/${OPENCLAW_CONFIG_PATH}" >&2
  echo "Set OPENCLAW_CONFIG_FILE to the correct filename, or create the file." >&2
  exit 6
fi

# Materialize optional gws credentials for credentials_file auth mode.
if [[ -n "${GWS_CREDENTIALS_B64}" ]]; then
  GWS_CREDENTIALS_TMP="$(mktemp)"
  printf '%s' "${GWS_CREDENTIALS_B64}" | base64 -d > "${GWS_CREDENTIALS_TMP}"
  sudo install -d -m 700 -o 1000 -g 1000 "${DEPLOY_DIR}/config/secrets/gws"
  sudo install -m 600 -o 1000 -g 1000 "${GWS_CREDENTIALS_TMP}" "${DEPLOY_DIR}/config/secrets/gws/credentials.json"
  rm -f "${GWS_CREDENTIALS_TMP}"
else
  sudo rm -f "${DEPLOY_DIR}/config/secrets/gws/credentials.json"
fi
unset GWS_CREDENTIALS_B64

# Authenticate to GHCR (use sudo for docker access)
if ! sudo docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin <<<"${GHCR_TOKEN}"; then
  echo "ERROR: Failed to authenticate to GHCR. Check credentials and network." >&2
  exit 1
fi
unset GHCR_TOKEN

# Export app secrets for docker compose
export OPENCLAW_IMAGE="${DEPLOY_REF}"
export OPENCLAW_GATEWAY_TOKEN
export CLAUDE_AI_SESSION_KEY
export DISCORD_BOT_TOKEN
export ANTHROPIC_API_KEY
export OPENAI_API_KEY
export MONGODB_URI
export GEMINI_API_KEY
export CLAUDE_WEB_SESSION_KEY
export CLAUDE_WEB_COOKIE
export BRAVE_API_KEY
export FIRECRAWL_API_KEY
if [[ -n "${TRELLO_API_KEY}" ]]; then
  export TRELLO_API_KEY
else
  unset TRELLO_API_KEY
fi
if [[ -n "${TRELLO_TOKEN}" ]]; then
  export TRELLO_TOKEN
else
  unset TRELLO_TOKEN
fi
export GOOGLE_WORKSPACE_CLI_TOKEN
export OPENCLAW_CONFIG_DIR="${DEPLOY_DIR}/config"
export OPENCLAW_WORKSPACE_DIR="${DEPLOY_DIR}/workspace"
export OPENCLAW_GATEWAY_BIND
export OPENCLAW_GATEWAY_PORT
export OPENCLAW_BRIDGE_PORT
export OPENCLAW_CONFIG_FILE

resolve_sandbox_browser_enabled() {
  local probe_script config_mount config_path
  probe_script="$(cat <<"NODE"
import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";

const INCLUDE_KEY = "$include";
const MAX_INCLUDE_DEPTH = 10;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    return [...target, ...source];
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
      result[key] = key in result ? deepMerge(result[key], value) : value;
    }
    return result;
  }
  return source;
}

function resolveConfigIncludes(value, currentPath, rootDir, visited, depth) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveConfigIncludes(item, currentPath, rootDir, visited, depth));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  if (!(INCLUDE_KEY in value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveConfigIncludes(item, currentPath, rootDir, visited, depth),
      ]),
    );
  }

  const includeValue = value[INCLUDE_KEY];
  const rest = Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== INCLUDE_KEY)
      .map(([key, item]) => [key, resolveConfigIncludes(item, currentPath, rootDir, visited, depth)]),
  );

  const loadInclude = (includePath) => {
    if (depth >= MAX_INCLUDE_DEPTH) {
      throw new Error(`Maximum include depth (${MAX_INCLUDE_DEPTH}) exceeded at: ${includePath}`);
    }
    const resolvedPath = path.normalize(
      path.isAbsolute(includePath) ? includePath : path.resolve(path.dirname(currentPath), includePath),
    );
    if (resolvedPath !== rootDir && !resolvedPath.startsWith(`${rootDir}${path.sep}`)) {
      throw new Error(`Include path escapes config directory: ${includePath}`);
    }
    if (visited.has(resolvedPath)) {
      throw new Error(`Circular include detected: ${[...visited, resolvedPath].join(" -> ")}`);
    }
    const nextVisited = new Set(visited);
    nextVisited.add(resolvedPath);
    const parsed = JSON5.parse(fs.readFileSync(resolvedPath, "utf8"));
    return resolveConfigIncludes(parsed, resolvedPath, rootDir, nextVisited, depth + 1);
  };

  let included;
  if (typeof includeValue === "string") {
    included = loadInclude(includeValue);
  } else if (Array.isArray(includeValue)) {
    included = includeValue.reduce((merged, includePath) => {
      if (typeof includePath !== "string") {
        throw new Error(`Invalid $include array item: expected string, got ${typeof includePath}`);
      }
      return deepMerge(merged, loadInclude(includePath));
    }, {});
  } else {
    throw new Error(`Invalid $include value: expected string or array of strings, got ${typeof includeValue}`);
  }

  if (Object.keys(rest).length === 0) {
    return included;
  }
  if (!isPlainObject(included)) {
    throw new Error("Sibling keys require included content to be an object");
  }
  return deepMerge(included, rest);
}

const configPath = process.env.OPENCLAW_CONFIG_PATH;
if (!configPath) {
  throw new Error("OPENCLAW_CONFIG_PATH is required.");
}

const raw = fs.readFileSync(configPath, "utf8");
const parsed = JSON5.parse(raw);
const rootDir = path.normalize(path.dirname(configPath));
const resolved = resolveConfigIncludes(parsed, configPath, rootDir, new Set([path.normalize(configPath)]), 0);
const enabled = resolved?.agents?.defaults?.sandbox?.browser?.enabled === true;
process.stdout.write(enabled ? "true" : "false");
NODE
)"
  config_mount="/tmp/openclaw-config"
  config_path="${config_mount}/${OPENCLAW_CONFIG_FILE}"
  sudo docker run --rm \
    --entrypoint node \
    -e OPENCLAW_CONFIG_PATH="${config_path}" \
    -v "${DEPLOY_DIR}/config:${config_mount}:ro" \
    "${DEPLOY_REF}" \
    --input-type=module \
    -e "${probe_script}"
}

# Compose file flags: use host networking overlay on Linux VMs
COMPOSE_FILES="-f docker-compose.yml"
if [[ -f docker-compose.host.yml ]]; then
  COMPOSE_FILES="${COMPOSE_FILES} -f docker-compose.host.yml"
fi
if [[ -f docker-compose.sandbox.yml ]]; then
  COMPOSE_FILES="${COMPOSE_FILES} -f docker-compose.sandbox.yml"
  # Detect host Docker socket GID for sandbox compose overlay.
  if [[ -S /var/run/docker.sock ]]; then
    DOCKER_GID="$(stat -c "%g" /var/run/docker.sock)"
    export DOCKER_GID
    echo "Docker socket GID: ${DOCKER_GID}"
  fi
fi

# Ensure the host has enough free disk space before pulling images.
# Check the filesystem that backs Docker storage, not DEPLOY_DIR.
if ! [[ "${MIN_FREE_SPACE_MB}" =~ ^[0-9]+$ ]]; then
  echo "ERROR: MIN_FREE_SPACE_MB must be numeric (got: ${MIN_FREE_SPACE_MB})" >&2
  exit 1
fi
DOCKER_ROOT_DIR="$(sudo docker info --format "{{.DockerRootDir}}" 2>/dev/null || true)"
if [[ -z "${DOCKER_ROOT_DIR}" ]]; then
  DOCKER_ROOT_DIR="/var/lib/docker"
fi
if [[ ! -d "${DOCKER_ROOT_DIR}" ]]; then
  DOCKER_ROOT_DIR="/"
fi
get_free_space_mb() {
  df -Pm "${DOCKER_ROOT_DIR}" | awk "NR==2 {print \$4}"
}
free_space_mb="$(get_free_space_mb)"
if ! [[ "${free_space_mb}" =~ ^[0-9]+$ ]]; then
  echo "ERROR: Failed to determine free space for ${DOCKER_ROOT_DIR} (got: ${free_space_mb})" >&2
  exit 1
fi
echo "Free space on ${DOCKER_ROOT_DIR} before image pulls: ${free_space_mb} MB (required minimum: ${MIN_FREE_SPACE_MB} MB)"
if (( free_space_mb < MIN_FREE_SPACE_MB )); then
  echo "Low disk space detected. Running Docker prune (containers, images, build cache)..."
  sudo docker container prune -f || echo "WARNING: \"docker container prune -f\" failed. Continuing..." >&2
  sudo docker image prune -af || echo "WARNING: \"docker image prune -af\" failed. Continuing..." >&2
  sudo docker builder prune -af || echo "WARNING: \"docker builder prune -af\" failed. Continuing..." >&2

  free_space_mb="$(get_free_space_mb)"
  if ! [[ "${free_space_mb}" =~ ^[0-9]+$ ]]; then
    echo "ERROR: Failed to determine free space for ${DOCKER_ROOT_DIR} after prune (got: ${free_space_mb})" >&2
    exit 1
  fi
  echo "Free space after prune on ${DOCKER_ROOT_DIR}: ${free_space_mb} MB"
  if (( free_space_mb < MIN_FREE_SPACE_MB )); then
    echo "ERROR: Insufficient disk space after prune (${free_space_mb} MB < ${MIN_FREE_SPACE_MB} MB)." >&2
    exit 1
  fi
fi

if ! browser_enabled="$(resolve_sandbox_browser_enabled)"; then
  echo "ERROR: Failed to read sandbox browser enablement from ${DEPLOY_DIR}/${OPENCLAW_CONFIG_PATH} using ${DEPLOY_REF}." >&2
  exit 1
fi
browser_enabled="$(echo "${browser_enabled}" | tr -d '[:space:]')"
if [[ "${browser_enabled}" != "true" ]]; then
  browser_enabled="false"
fi
echo "Sandbox browser enabled in config: ${browser_enabled}"

# Pull sandbox image from GHCR and re-tag to the local name expected by the app.
# The app references "openclaw-sandbox:bookworm-slim" (no registry prefix).
# Extract base image name: strip digest first, then strip tag only from the
# last path segment (avoids treating a registry port like ghcr.io:443 as a tag).
IMAGE_NO_DIGEST="${DEPLOY_REF%%@*}"
IMAGE_LAST_SEGMENT="${IMAGE_NO_DIGEST##*/}"
if [[ "${IMAGE_LAST_SEGMENT}" == *:* ]]; then
  SANDBOX_BASE="${IMAGE_NO_DIGEST%:*}"
else
  SANDBOX_BASE="${IMAGE_NO_DIGEST}"
fi
SANDBOX_GHCR_IMAGE="${SANDBOX_BASE}-sandbox:bookworm-slim"
echo "Pulling sandbox image: ${SANDBOX_GHCR_IMAGE}"
if sudo docker pull "${SANDBOX_GHCR_IMAGE}"; then
  sudo docker tag "${SANDBOX_GHCR_IMAGE}" "openclaw-sandbox:bookworm-slim"
  echo "Sandbox image ready: openclaw-sandbox:bookworm-slim"
else
  echo "WARNING: Failed to pull sandbox image. Sandbox may not function." >&2
fi

if [[ "${browser_enabled}" == "true" ]]; then
  SANDBOX_BROWSER_GHCR_IMAGE="${SANDBOX_BASE}-sandbox-browser:bookworm-slim"
  echo "Pulling sandbox browser image: ${SANDBOX_BROWSER_GHCR_IMAGE}"
  if sudo docker pull "${SANDBOX_BROWSER_GHCR_IMAGE}"; then
    sudo docker tag "${SANDBOX_BROWSER_GHCR_IMAGE}" "openclaw-sandbox-browser:bookworm-slim"
    echo "Sandbox browser image ready: openclaw-sandbox-browser:bookworm-slim"
  else
    echo "ERROR: Failed to pull required sandbox browser image ${SANDBOX_BROWSER_GHCR_IMAGE}." >&2
    exit 1
  fi
fi

# Pull app images while existing containers remain running.
# This reduces downtime if pull fails.
sudo -E docker-compose ${COMPOSE_FILES} pull

# Stop/remove app containers so a crash-looping gateway cannot block startup.
# This avoids "container is restarting" races when openclaw-cli joins gateway network namespace.
sudo -E docker-compose ${COMPOSE_FILES} stop openclaw-gateway openclaw-cli || true
sudo -E docker-compose ${COMPOSE_FILES} rm -f openclaw-gateway openclaw-cli || true

# Start fresh containers so updated host security profiles (seccomp/AppArmor)
# are applied even when the image reference is unchanged.
sudo -E docker-compose ${COMPOSE_FILES} up -d --remove-orphans --force-recreate

# Clear secrets from environment
unset OPENCLAW_GATEWAY_TOKEN CLAUDE_AI_SESSION_KEY DISCORD_BOT_TOKEN ANTHROPIC_API_KEY OPENAI_API_KEY MONGODB_URI GEMINI_API_KEY CLAUDE_WEB_SESSION_KEY CLAUDE_WEB_COOKIE BRAVE_API_KEY FIRECRAWL_API_KEY TRELLO_API_KEY TRELLO_TOKEN GOOGLE_WORKSPACE_CLI_TOKEN GWS_CREDENTIALS_B64

echo "Deployment complete."
'

# Use gcloud compute ssh with IAP tunneling (enforces IAM before connection)
# Pass GHCR_TOKEN via stdin; script passed as bash -c argument to avoid stdin conflict
#
# PR #66 review: escape variables for safe shell interpolation to prevent injection
# The gcloud --command arg is passed to remote shell, so we must escape user-controlled values
printf -v RESOLVED_REF_ESCAPED '%q' "${RESOLVED_REF}"
printf -v DEPLOY_DIR_ESCAPED '%q' "${DEPLOY_DIR}"
printf -v GHCR_USERNAME_ESCAPED '%q' "${GHCR_USERNAME}"
printf -v GATEWAY_PORT_ESCAPED '%q' "${OPENCLAW_GATEWAY_PORT}"
printf -v BRIDGE_PORT_ESCAPED '%q' "${OPENCLAW_BRIDGE_PORT}"
printf -v GATEWAY_BIND_ESCAPED '%q' "${OPENCLAW_GATEWAY_BIND}"
printf -v CONFIG_FILE_ESCAPED '%q' "${OPENCLAW_CONFIG_FILE:-openclaw.json}"
printf -v MIN_FREE_SPACE_MB_ESCAPED '%q' "${MIN_FREE_SPACE_MB:-4096}"

# Base64-wrap multiline credentials payload so stdin remains one-value-per-line.
GWS_CREDENTIALS_B64=""
if [[ -n "${GWS_CREDENTIALS}" ]]; then
  GWS_CREDENTIALS_B64="$(printf '%s' "${GWS_CREDENTIALS}" | base64 | tr -d '\n')"
fi
unset GWS_CREDENTIALS

# Pass all secrets via stdin (one per line)
{
  printf '%s\n' "${GHCR_TOKEN}"
  printf '%s\n' "${OPENCLAW_GATEWAY_TOKEN}"
  printf '%s\n' "${CLAUDE_AI_SESSION_KEY}"
  printf '%s\n' "${DISCORD_BOT_TOKEN}"
  printf '%s\n' "${ANTHROPIC_API_KEY}"
  printf '%s\n' "${OPENAI_API_KEY}"
  printf '%s\n' "${MONGODB_URI}"
  printf '%s\n' "${GEMINI_API_KEY}"
  printf '%s\n' "${CLAUDE_WEB_SESSION_KEY}"
  printf '%s\n' "${CLAUDE_WEB_COOKIE}"
  printf '%s\n' "${BRAVE_API_KEY}"
  printf '%s\n' "${FIRECRAWL_API_KEY}"
  printf '%s\n' "${TRELLO_API_KEY}"
  printf '%s\n' "${TRELLO_TOKEN}"
  printf '%s\n' "${GOOGLE_WORKSPACE_CLI_TOKEN}"
  printf '%s\n' "${GWS_CREDENTIALS_B64}"
} | gcloud compute ssh "${GCE_INSTANCE_NAME}" \
  --project "${GCP_PROJECT_ID}" \
  --zone "${GCP_ZONE}" \
  --tunnel-through-iap \
  --quiet \
  --command "bash -c '${REMOTE_SCRIPT}' -- ${RESOLVED_REF_ESCAPED} ${DEPLOY_DIR_ESCAPED} ${GHCR_USERNAME_ESCAPED} ${GATEWAY_PORT_ESCAPED} ${BRIDGE_PORT_ESCAPED} ${GATEWAY_BIND_ESCAPED} ${CONFIG_FILE_ESCAPED} ${MIN_FREE_SPACE_MB_ESCAPED}"
