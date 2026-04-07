#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '%s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

log "Verifying environment..."
log "VERIFY_ENV: ${VERIFY_ENV:-<unset>}"
log "DEPLOYED_REF: ${DEPLOYED_REF:-<unset>}"

if [[ "${DRY_RUN:-}" == "1" ]]; then
  log "DRY_RUN=1, skipping verification checks."
  exit 0
fi

checks_run=0

# Helper: run a command on the GCE instance via IAP SSH.
gce_ssh() {
  gcloud compute ssh "${GCE_INSTANCE_NAME}" \
    --project "${GCP_PROJECT_ID}" \
    --zone "${GCP_ZONE}" \
    --tunnel-through-iap \
    --quiet \
    --command "$1"
}

# Helper: run a command on the GCE instance via IAP SSH and return only the last
# line of stdout. This filters out SSH keygen noise that gcloud emits on first
# connection (key fingerprints, randomart) which would otherwise contaminate
# captured output and leak key material into CI logs.
gce_ssh_lastline() {
  gce_ssh "$1" | tail -1
}

docker_container_state() {
  local name="${1:?container name required}"
  local escaped_name
  escaped_name="$(printf '%q' "${name}")"
  gce_ssh_lastline "sudo docker ps --filter 'name=^${escaped_name}\$' --format '{{.State}}'"
}

docker_container_health() {
  local name="${1:?container name required}"
  local escaped_name
  escaped_name="$(printf '%q' "${name}")"
  gce_ssh_lastline "cid=\$(sudo docker ps -qf 'name=^${escaped_name}\$' | head -1) && sudo docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' \"\$cid\" 2>/dev/null"
}

if [[ -n "${GCE_INSTANCE_NAME:-}" ]]; then
  : "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required for GCE verify}"
  : "${GCP_ZONE:?GCP_ZONE is required for GCE verify}"

  container="${VERIFY_GCE_CONTAINER:-openclaw-gateway}"
  container_escaped="$(printf '%q' "${container}")"
  health_timeout="${VERIFY_HEALTH_TIMEOUT:-30}"

  # Check 1: container is running
  checks_run=$((checks_run + 1))
  log "Checking container ${container} on ${GCE_INSTANCE_NAME}..."
  running_state="$(
    gce_ssh_lastline "sudo docker ps --filter 'name=^${container}\$' --format '{{.State}}'"
  )" || fail "Failed to check container ${container} on ${GCE_INSTANCE_NAME}"

  running_state="$(echo "${running_state}" | tr -d '[:space:]')"
  if [[ "${running_state}" != "running" ]]; then
    log "DEBUG: Container '${container}' state='${running_state}'. Listing all containers..."
    gce_ssh "sudo docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'" || true
    fail "Container ${container} is not running on ${GCE_INSTANCE_NAME}"
  fi
  log "Container ${container} is running."

  # Check 2: Docker health status is "healthy"
  # Uses the container's built-in healthcheck (hits /healthz) rather than the
  # full CLI which requires WebSocket RPC init and is fragile over docker exec.
  checks_run=$((checks_run + 1))
  log "Checking Docker health status for ${container} (timeout: ${health_timeout}s)..."
  health_status=""
  elapsed=0
  while [[ "${elapsed}" -lt "${health_timeout}" ]]; do
    health_status="$(
      gce_ssh_lastline "sudo docker inspect --format '{{.State.Health.Status}}' \$(sudo docker ps -qf 'name=^${container}\$' | head -1) 2>/dev/null"
    )" || true
    health_status="$(echo "${health_status}" | tr -d '[:space:]')"
    if [[ "${health_status}" == "healthy" ]]; then
      break
    fi
    log "Health status: ${health_status:-<empty>} (${elapsed}s elapsed, waiting...)"
    sleep 5
    elapsed=$((elapsed + 5))
  done

  if [[ "${health_status}" != "healthy" ]]; then
    fail "Container ${container} health status is '${health_status}' (expected 'healthy') on ${GCE_INSTANCE_NAME}"
  fi
  log "Container health check passed (status: healthy)."

  # Check 3: required runtime binaries are present in the deployed app image.
  checks_run=$((checks_run + 1))
  log "Checking bundled runtime binaries in ${container}..."
  if ! runtime_bins="$(
    gce_ssh "sudo docker exec ${container_escaped} bash -lc 'command -v jq && command -v rg'"
  )"; then
    fail "Failed to check required runtime binaries in ${container} (SSH or docker exec error)"
  fi
  jq_path="$(printf '%s\n' "${runtime_bins}" | sed -n '1p')"
  rg_path="$(printf '%s\n' "${runtime_bins}" | sed -n '2p')"
  if [[ -z "${jq_path}" || -z "${rg_path}" ]]; then
    fail "Required runtime binaries (jq, rg) are missing from ${container}"
  fi
  printf '%s\n' "${runtime_bins}"

  if [[ "${VERIFY_ENV:-}" == "staging" ]]; then
    # Check 4: Trello skill is eligible inside the deployed container.
    checks_run=$((checks_run + 1))
    log "Checking Trello skill eligibility in ${container}..."
    trello_skill_json="$(
      gce_ssh "sudo docker exec ${container_escaped} bash -lc 'cd /app && node dist/index.js skills info trello --json'"
    )" || fail "Failed to inspect Trello skill status in ${container}"
    printf '%s\n' "${trello_skill_json}"
    gce_ssh "sudo docker exec ${container_escaped} bash -lc 'cd /app && node dist/index.js skills info trello --json | jq -e \".name == \\\"trello\\\" and .eligible == true\" >/dev/null'" \
      || fail "Trello skill is not eligible in ${container}"
    log "Trello skill is eligible."

    # Check 5: Trello secrets must be present and the live Trello API smoke must work.
    checks_run=$((checks_run + 1))
    log "Checking Trello secrets and live API smoke in ${container}..."
    trello_smoke_output="$(
      gce_ssh "sudo docker exec ${container_escaped} bash -lc 'set -euo pipefail; if [[ -z \"\${TRELLO_API_KEY:-}\" || -z \"\${TRELLO_TOKEN:-}\" ]]; then echo \"missing_trello_env\"; exit 12; fi; printf '\''url = \"https://api.trello.com/1/members/me/boards?key=%s&token=%s&fields=name,id\"\\n'\'' \"\${TRELLO_API_KEY}\" \"\${TRELLO_TOKEN}\" | curl -fsSK - | jq -e '\''if type == \"array\" then {boardCount:length, sampleBoards:(.[0:3] | map({id, name}))} else error(\"unexpected_trello_payload\") end'\'''"
    )" || {
      status=$?
      if [[ "${status}" -eq 12 ]]; then
        fail "TRELLO_API_KEY and TRELLO_TOKEN must be present in staging for Trello live verification."
      fi
      fail "Live Trello API smoke failed in ${container}"
    }
    printf '%s\n' "${trello_smoke_output}"
    log "Live Trello API smoke passed."

    # Check 6: when the active gws-toolkit-phase1 default credential route uses
    # credentials_file mode, the deployed credentials file must exist on the VM
    # and remain usable.
    checks_run=$((checks_run + 1))
    log "Checking Google Workspace active credential route materialization and auth health on ${GCE_INSTANCE_NAME}..."
    gws_active_route_json="$(
      gce_ssh_lastline "sudo docker exec ${container_escaped} bash -lc 'jq -cer '\''.plugins.entries[\"gws-toolkit-phase1\"].config as \$cfg | (\$cfg.defaultCredentialRoute | select(type == \"string\" and length > 0)) as \$route | (\$cfg.credentialRoutes[\$route] | select(type == \"object\")) as \$active | { route: \$route, mode: (\$active.mode | select(type == \"string\" and length > 0)), credentialsFile: (\$active.credentialsFile // null) }'\'' /home/node/.openclaw/.runtime-openclaw.json'"
    )" || fail "Failed to inspect active Google Workspace credential route mode in ${container}"
    gws_active_route_mode="$(jq -r '.mode' <<<"${gws_active_route_json}" | tr -d '[:space:]')"
    if [[ "${gws_active_route_mode}" == "credentials_file" ]]; then
      gws_active_credentials_path="$(jq -r '.credentialsFile | select(type == "string" and length > 0)' <<<"${gws_active_route_json}")" \
        || fail "Failed to inspect active Google Workspace credentials file path in ${container}"
      case "${gws_active_credentials_path}" in
        /home/node/.openclaw/*) ;;
        *)
          fail "Active Google Workspace credentials file path is outside the mounted OpenClaw config root in ${container}: ${gws_active_credentials_path}"
          ;;
      esac
      gws_credentials_host_path="/opt/DAISy/config${gws_active_credentials_path#/home/node/.openclaw}"
      gws_credentials_status="$(
        gce_ssh_lastline "sudo -n sh -c 'if [ -f \"${gws_credentials_host_path}\" ]; then stat -c \"present(size=%s)\" \"${gws_credentials_host_path}\"; else echo missing; fi'"
      )" || fail "Failed to inspect Google Workspace credentials file on ${GCE_INSTANCE_NAME}"
      if [[ "${gws_credentials_status}" == "missing" ]]; then
        fail "gws-toolkit-phase1 requires credentials_file mode, but ${gws_credentials_host_path} is missing on ${GCE_INSTANCE_NAME}"
      fi
      log "Google Workspace credentials file status (${gws_credentials_host_path}): ${gws_credentials_status}"

      gws_binary_path="$(
        gce_ssh_lastline "sudo docker exec ${container_escaped} bash -lc 'command -v gws'"
      )" || fail "gws binary is not available inside ${container}"
      gws_binary_path="$(echo "${gws_binary_path}" | tr -d '[:space:]')"
      if [[ -z "${gws_binary_path}" ]]; then
        fail "gws binary is not available inside ${container}"
      fi

      gws_auth_status="$(
        gce_ssh_lastline "sudo sh -c 'docker exec ${container_escaped} bash -lc \"set -euo pipefail; export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=\\\"${gws_active_credentials_path}\\\"; gws auth status | jq -c .\"'"
      )" || fail "Failed to run gws auth status inside ${container}"
      printf '%s\n' "${gws_auth_status}"

      if ! jq -e '.plain_credentials_exists == true and .token_valid == true and ((.token_error // "") == "")' >/dev/null <<<"${gws_auth_status}"; then
        gws_token_error="$(jq -r '.token_error // empty' <<<"${gws_auth_status}")"
        if [[ -n "${gws_token_error}" ]]; then
          fail "Google Workspace credentials are present but invalid in ${container}: ${gws_token_error}"
        fi
        fail "Google Workspace credentials are present but gws auth status is not healthy in ${container}"
      fi
      log "Google Workspace auth status is healthy."
    else
      log "Google Workspace active credential route mode is ${gws_active_route_mode:-<unset>}; skipping credentials file check."
    fi

    # Check 7: when monitoring env has been generated, Alertmanager must be
    # running and receive the sensitive webhook/env payloads from .env.monitoring.
    checks_run=$((checks_run + 1))
    log "Checking monitoring Alertmanager env delivery on ${GCE_INSTANCE_NAME}..."
    monitoring_env_present="$(
      gce_ssh_lastline "sudo -n sh -c 'if [ -f /opt/DAISy/monitoring/.env.monitoring ]; then echo true; else echo false; fi'"
    )" || fail "Failed to inspect monitoring env file on ${GCE_INSTANCE_NAME}"
    monitoring_env_present="$(echo "${monitoring_env_present}" | tr -d '[:space:]')"
    if [[ "${monitoring_env_present}" == "true" ]]; then
      monitoring_state="$(docker_container_state "monitoring-alertmanager-1" | tr -d '[:space:]')" || true
      if [[ "${monitoring_state}" != "running" ]]; then
        gce_ssh "sudo docker ps -a --filter 'name=^monitoring-alertmanager-1\$' --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'" || true
        fail "monitoring-alertmanager-1 is not running on ${GCE_INSTANCE_NAME}"
      fi

      monitoring_health="$(docker_container_health "monitoring-alertmanager-1" | tr -d '[:space:]')" || true
      if [[ "${monitoring_health}" != "healthy" ]]; then
        gce_ssh "sudo docker logs --tail 50 monitoring-alertmanager-1 2>&1" || true
        fail "monitoring-alertmanager-1 health status is '${monitoring_health:-<empty>}' on ${GCE_INSTANCE_NAME}"
      fi

      missing_monitoring_env="$(
        gce_ssh "sudo docker inspect monitoring-alertmanager-1 --format '{{range .Config.Env}}{{println .}}{{end}}' | awk -F= 'BEGIN { required[\"DISCORD_ALERTS_WEBHOOK_URL\"]=1; required[\"GRAFANA_ADMIN_PASSWORD\"]=1; required[\"ALERT_SMTP_USERNAME\"]=1; required[\"ALERT_SMTP_PASSWORD\"]=1 } \$1 in required && length(substr(\$0, index(\$0, \"=\") + 1)) > 0 { seen[\$1]=1 } END { for (key in required) if (!(key in seen)) print key }'"
      )" || fail "Failed to inspect Alertmanager env vars on ${GCE_INSTANCE_NAME}"
      if [[ -n "${missing_monitoring_env}" ]]; then
        fail "monitoring-alertmanager-1 is missing required monitoring env vars on ${GCE_INSTANCE_NAME}: ${missing_monitoring_env//$'\n'/, }"
      fi
      log "Monitoring Alertmanager env delivery passed."
    else
      log "Monitoring env file is absent; skipping Alertmanager env delivery check."
    fi
  else
    log "VERIFY_ENV=${VERIFY_ENV:-<unset>}; skipping staging-specific verification."
  fi

  # Check 8: require the sandbox browser image when the deployed config enables it.
  checks_run=$((checks_run + 1))
  log "Checking sandbox browser image requirement from deployed config..."
  browser_probe_js="$(cat <<'NODE'
import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";

const INCLUDE_KEY = "$include";
const MAX_INCLUDE_DEPTH = 10;
const MAX_INCLUDE_FILE_BYTES = 2 * 1024 * 1024;
const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isBlockedObjectKey(key) {
  return BLOCKED_KEYS.has(key);
}

function isPathInside(basePath, candidatePath) {
  const base = path.resolve(basePath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(base, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function safeRealpath(target) {
  try {
    return path.normalize(fs.realpathSync(target));
  } catch {
    return path.normalize(target);
  }
}

function deepMerge(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    return [...target, ...source];
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (isBlockedObjectKey(key)) {
        continue;
      }
      result[key] = key in result ? deepMerge(result[key], value) : value;
    }
    return result;
  }
  return source;
}

function resolveConfigIncludes(value, currentPath, rootDir, rootRealDir, visited, depth) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveConfigIncludes(item, currentPath, rootDir, rootRealDir, visited, depth));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  if (!(INCLUDE_KEY in value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveConfigIncludes(item, currentPath, rootDir, rootRealDir, visited, depth),
      ]),
    );
  }

  const includeValue = value[INCLUDE_KEY];
  const rest = Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== INCLUDE_KEY)
      .map(([key, item]) => [
        key,
        resolveConfigIncludes(item, currentPath, rootDir, rootRealDir, visited, depth),
      ]),
  );

  const loadInclude = (includePath) => {
    if (depth >= MAX_INCLUDE_DEPTH) {
      throw new Error(`Maximum include depth (${MAX_INCLUDE_DEPTH}) exceeded at: ${includePath}`);
    }
    const resolvedPath = path.normalize(
      path.isAbsolute(includePath) ? includePath : path.resolve(path.dirname(currentPath), includePath),
    );
    if (!isPathInside(rootDir, resolvedPath)) {
      throw new Error(`Include path escapes config directory: ${includePath}`);
    }
    const realPath = safeRealpath(resolvedPath);
    if (!isPathInside(rootRealDir, realPath)) {
      throw new Error(`Include path resolves outside config directory (symlink): ${includePath}`);
    }
    if (visited.has(resolvedPath)) {
      throw new Error(`Circular include detected: ${[...visited, resolvedPath].join(" -> ")}`);
    }
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile() || stats.size > MAX_INCLUDE_FILE_BYTES) {
      throw new Error(
        `Include file failed security checks (regular file, max ${MAX_INCLUDE_FILE_BYTES} bytes): ${includePath}`,
      );
    }
    const nextVisited = new Set(visited);
    nextVisited.add(resolvedPath);
    const parsed = JSON5.parse(fs.readFileSync(resolvedPath, "utf8"));
    return resolveConfigIncludes(parsed, resolvedPath, rootDir, rootRealDir, nextVisited, depth + 1);
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
const rootRealDir = safeRealpath(rootDir);
const resolved = resolveConfigIncludes(
  parsed,
  configPath,
  rootDir,
  rootRealDir,
  new Set([path.normalize(configPath)]),
  0,
);
const enabled = resolved?.agents?.defaults?.sandbox?.browser?.enabled === true;
process.stdout.write(enabled ? "true" : "false");
NODE
)"
  browser_probe_js_escaped="$(printf '%q' "${browser_probe_js}")"
  browser_enabled="$(
    gce_ssh_lastline "sudo docker exec ${container_escaped} node --input-type=module -e ${browser_probe_js_escaped}"
  )" || fail "Failed to read sandbox browser config from ${container}"
  browser_enabled="$(echo "${browser_enabled}" | tr -d '[:space:]')"
  if [[ "${browser_enabled}" == "true" ]]; then
    log "Sandbox browser is enabled; checking required image..."
    gce_ssh "sudo docker image inspect openclaw-sandbox-browser:bookworm-slim >/dev/null" \
      || fail "Sandbox browser is enabled, but image openclaw-sandbox-browser:bookworm-slim is missing on ${GCE_INSTANCE_NAME}"
    log "Sandbox browser image is present."
  else
    log "Sandbox browser is disabled; skipping image presence check."
  fi

  # Check 9: verify deployed image matches DEPLOYED_REF (if set)
  if [[ -n "${DEPLOYED_REF:-}" ]]; then
    checks_run=$((checks_run + 1))
    log "Checking deployed image matches DEPLOYED_REF (${DEPLOYED_REF})..."
    image_ref="$(
      gce_ssh_lastline "cid=\$(sudo docker ps -qf 'name=^${container}\$' | head -1) && sudo docker inspect --format '{{.Config.Image}}' \"\$cid\" 2>/dev/null"
    )" || fail "Failed to inspect image on ${GCE_INSTANCE_NAME}"

    image_ref="$(echo "${image_ref}" | tr -d '[:space:]')"
    short_ref="$(echo "${DEPLOYED_REF}" | cut -c1-7)"
    if [[ -n "${image_ref}" && "${image_ref}" != *"${short_ref}"* ]]; then
      fail "Container image ${image_ref} does not match DEPLOYED_REF ${DEPLOYED_REF} (short: ${short_ref})"
    fi
    log "Container image: ${image_ref}"
  fi

  # Check 10: smoke-test the bundled mongodb-mcp-server CLI inside the deployed
  # container. This catches the Node 22 startup crash that can occur before MCP
  # stdio connects, even while the gateway health endpoint still reports healthy.
  checks_run=$((checks_run + 1))
  log "Checking mongodb-mcp-server startup smoke in ${container}..."
  mcp_smoke_output="$(
    gce_ssh "sudo docker exec ${container_escaped} node -e 'const fs=require(\"fs\"); const path=require(\"path\"); const { spawnSync } = require(\"child_process\"); const entryPath=require.resolve(\"mongodb-mcp-server\"); let dir=path.dirname(entryPath); let packageJson=null; let packageRoot=\"\"; while (true) { const candidatePath=path.join(dir, \"package.json\"); if (fs.existsSync(candidatePath)) { const candidateJson=JSON.parse(fs.readFileSync(candidatePath, \"utf8\")); if (candidateJson.name === \"mongodb-mcp-server\") { packageJson=candidateJson; packageRoot=dir; break; } } const parentDir=path.dirname(dir); if (parentDir === dir) throw new Error(\"Unable to locate mongodb-mcp-server package root from \" + entryPath); dir=parentDir; } const binPath=path.join(packageRoot, packageJson.bin[\"mongodb-mcp-server\"]); console.log(\"node_version=\" + process.version); console.log(\"mongodb_mcp_bin=\" + binPath); const result=spawnSync(process.execPath, [binPath, \"--version\"], { encoding: \"utf8\" }); if ((result.stdout || \"\").trim()) console.log(\"mongodb_mcp_version=\" + result.stdout.trim()); if (result.status !== 0) { if (result.stderr) process.stderr.write(result.stderr); process.exit(result.status ?? 1); }'"
  )" || fail "mongodb-mcp-server startup smoke failed in ${container}"
  printf '%s\n' "${mcp_smoke_output}"

  # Check 11: ensure the current container logs do not contain the known
  # translator crash or the resulting MCP connection-closed failure.
  checks_run=$((checks_run + 1))
  log "Checking ${container} logs for MongoDB MCP startup crash signatures..."
  crash_signatures="$(
    gce_ssh "sudo docker logs ${container_escaped} 2>&1 | grep -F -e 'node:internal/modules/esm/translators:213' -e 'MongoDB MCP connection failed: MCP error -32000: Connection closed' || true"
  )" || fail "Failed to inspect ${container} logs on ${GCE_INSTANCE_NAME}"
  if [[ -n "${crash_signatures}" ]]; then
    printf '%s\n' "${crash_signatures}" >&2
    fail "Detected MongoDB MCP startup crash signatures in ${container} logs"
  fi
  log "No MongoDB MCP startup crash signatures found in ${container} logs."
fi

if [[ -n "${VERIFY_SSH_HOST:-}" ]]; then
  ssh_host="${VERIFY_SSH_HOST}"
  if [[ -n "${VERIFY_SSH_USER:-}" ]]; then
    ssh_host="${VERIFY_SSH_USER}@${VERIFY_SSH_HOST}"
  fi

  if [[ -z "${VERIFY_SYSTEMD_SERVICE:-}" && -z "${VERIFY_DOCKER_CONTAINER:-}" ]]; then
    fail "VERIFY_SSH_HOST is set, but no VERIFY_SYSTEMD_SERVICE or VERIFY_DOCKER_CONTAINER is configured."
  fi

  ssh_opts=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)

  if [[ -n "${VERIFY_SYSTEMD_SERVICE:-}" ]]; then
    checks_run=$((checks_run + 1))
    log "Checking systemd service on ${ssh_host}: ${VERIFY_SYSTEMD_SERVICE}"
    ssh "${ssh_opts[@]}" "${ssh_host}" \
      "systemctl is-active --quiet $(printf '%q' "${VERIFY_SYSTEMD_SERVICE}")" \
      || fail "Systemd service ${VERIFY_SYSTEMD_SERVICE} is not active on ${ssh_host}"
  fi

  if [[ -n "${VERIFY_DOCKER_CONTAINER:-}" ]]; then
    checks_run=$((checks_run + 1))
    log "Checking docker container on ${ssh_host}: ${VERIFY_DOCKER_CONTAINER}"
    running_state="$(
      ssh "${ssh_opts[@]}" "${ssh_host}" \
        "docker inspect --format '{{.State.Running}}' $(printf '%q' "${VERIFY_DOCKER_CONTAINER}")"
    )" || fail "Failed to inspect container ${VERIFY_DOCKER_CONTAINER} on ${ssh_host}"

    if [[ "${running_state}" != "true" ]]; then
      fail "Container ${VERIFY_DOCKER_CONTAINER} is not running on ${ssh_host}"
    fi

    if [[ -n "${DEPLOYED_REF:-}" ]]; then
      image_ref="$(
        ssh "${ssh_opts[@]}" "${ssh_host}" \
          "docker inspect --format '{{.Config.Image}}' $(printf '%q' "${VERIFY_DOCKER_CONTAINER}")"
      )" || fail "Failed to inspect image for ${VERIFY_DOCKER_CONTAINER} on ${ssh_host}"

      if [[ -n "${image_ref}" && "${image_ref}" != *"${DEPLOYED_REF}"* ]]; then
        fail "Container image ${image_ref} does not include DEPLOYED_REF ${DEPLOYED_REF}."
      fi
      log "Container image: ${image_ref}"
    fi
  fi
fi

if [[ "${checks_run}" -eq 0 ]]; then
  log "WARNING: No verification checks configured. Set GCE_INSTANCE_NAME or VERIFY_SSH_HOST."
  log "Skipping verification (no-op)."
  exit 0
fi

log "Verification completed successfully (${checks_run} check(s) passed)."
