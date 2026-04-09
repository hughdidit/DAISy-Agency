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

shell_single_quote() {
  printf "'%s'" "$(printf '%s' "${1}" | sed "s/'/'\\\\''/g")"
}

normalize_runtime_arch() {
  case "${1}" in
    amd64|x86_64)
      printf 'amd64\n'
      ;;
    arm64|aarch64)
      printf 'arm64\n'
      ;;
    *)
      return 1
      ;;
  esac
}

append_runtime_bin_line() {
  local binary="${1:?binary required}"
  local binary_path="${2:?binary path required}"
  if [[ -n "${runtime_bins:-}" ]]; then
    runtime_bins+=$'\n'
  fi
  runtime_bins+="${binary}"$'\t'"${binary_path}"
}

build_direct_exec_smoke_command() {
  local command_prefix="${1:?command prefix required}"
  local binary_path="${2:?binary path required}"
  local binary="${3:?binary required}"
  local smoke_command="${4:?smoke command required}"
  local smoke_suffix smoke_command_remote arg
  local -a smoke_args=()

  case "${smoke_command}" in
    "${binary}"|"${binary} "*)
      smoke_suffix="${smoke_command#${binary}}"
      smoke_suffix="${smoke_suffix# }"
      ;;
    *)
      printf 'Unsupported direct smoke command for %s: %s\n' "${binary}" "${smoke_command}" >&2
      return 1
      ;;
  esac

  if [[ "${smoke_suffix}" == *"'"* || "${smoke_suffix}" == *'"'* || "${smoke_suffix}" == *'\\'* || "${smoke_suffix}" == *'|'* || "${smoke_suffix}" == *'>'* || "${smoke_suffix}" == *'<'* || "${smoke_suffix}" == *';'* || "${smoke_suffix}" == *'&'* ]]; then
    printf 'Unsupported complex direct smoke suffix for %s: %s\n' "${binary}" "${smoke_suffix}" >&2
    return 1
  fi

  smoke_command_remote="${command_prefix} $(printf '%q' "${binary_path}")"
  if [[ -n "${smoke_suffix}" ]]; then
    read -r -a smoke_args <<< "${smoke_suffix}"
    for arg in "${smoke_args[@]}"; do
      smoke_command_remote+=" $(printf '%q' "${arg}")"
    done
  fi

  printf '%s\n' "${smoke_command_remote}"
}

build_target_manifest_check_command() {
  local mode="${1:?mode required}"
  local target_escaped="${2:?target required}"
  local manifest_path="${3:?manifest path required}"
  local manifest_path_escaped
  manifest_path_escaped="$(printf '%q' "${manifest_path}")"
  case "${mode}" in
    container)
      printf 'sudo docker exec %s test -f %s\n' "${target_escaped}" "${manifest_path_escaped}"
      ;;
    image)
      printf 'sudo docker run --rm --entrypoint test %s -f %s\n' "${target_escaped}" "${manifest_path_escaped}"
      ;;
    *)
      return 1
      ;;
  esac
}

build_target_arch_command() {
  local mode="${1:?mode required}"
  local target_escaped="${2:?target required}"
  case "${mode}" in
    container)
      printf 'sudo docker exec %s dpkg --print-architecture\n' "${target_escaped}"
      ;;
    image)
      printf 'sudo docker run --rm --entrypoint dpkg %s --print-architecture\n' "${target_escaped}"
      ;;
    *)
      return 1
      ;;
  esac
}

build_target_wrapper_test_command() {
  local mode="${1:?mode required}"
  local target_escaped="${2:?target required}"
  local binary_path="${3:?binary path required}"
  local binary_path_escaped
  binary_path_escaped="$(printf '%q' "${binary_path}")"
  case "${mode}" in
    container)
      printf 'sudo docker exec %s test -x %s\n' "${target_escaped}" "${binary_path_escaped}"
      ;;
    image)
      printf 'sudo docker run --rm --entrypoint test %s -x %s\n' "${target_escaped}" "${binary_path_escaped}"
      ;;
    *)
      return 1
      ;;
  esac
}

build_target_direct_exec_command() {
  local mode="${1:?mode required}"
  local target_escaped="${2:?target required}"
  local binary_path="${3:?binary path required}"
  local binary="${4:?binary required}"
  local smoke_command="${5:?smoke command required}"
  local command_prefix smoke_suffix arg
  local -a smoke_args=()
  case "${mode}" in
    container)
      command_prefix="sudo docker exec ${target_escaped}"
      build_direct_exec_smoke_command "${command_prefix}" "${binary_path}" "${binary}" "${smoke_command}"
      ;;
    image)
      case "${smoke_command}" in
        "${binary}"|"${binary} "*)
          smoke_suffix="${smoke_command#${binary}}"
          smoke_suffix="${smoke_suffix# }"
          ;;
        *)
          printf 'Unsupported direct smoke command for %s: %s\n' "${binary}" "${smoke_command}" >&2
          return 1
          ;;
      esac
      if [[ "${smoke_suffix}" == *"'"* || "${smoke_suffix}" == *'"'* || "${smoke_suffix}" == *'\\'* || "${smoke_suffix}" == *'|'* || "${smoke_suffix}" == *'>'* || "${smoke_suffix}" == *'<'* || "${smoke_suffix}" == *';'* || "${smoke_suffix}" == *'&'* ]]; then
        printf 'Unsupported complex direct smoke suffix for %s: %s\n' "${binary}" "${smoke_suffix}" >&2
        return 1
      fi
      command_prefix="sudo docker run --rm --entrypoint $(printf '%q' "${binary_path}") ${target_escaped}"
      if [[ -n "${smoke_suffix}" ]]; then
        read -r -a smoke_args <<< "${smoke_suffix}"
        for arg in "${smoke_args[@]}"; do
          command_prefix+=" $(printf '%q' "${arg}")"
        done
      fi
      printf '%s\n' "${command_prefix}"
      ;;
    *)
      return 1
      ;;
  esac
}

build_target_shell_command() {
  local mode="${1:?mode required}"
  local target_escaped="${2:?target required}"
  local probe_escaped="${3:?probe required}"
  case "${mode}" in
    container)
      printf 'sudo docker exec %s sh -c %s\n' "${target_escaped}" "${probe_escaped}"
      ;;
    image)
      printf 'sudo docker run --rm --entrypoint sh %s -c %s\n' "${target_escaped}" "${probe_escaped}"
      ;;
    *)
      return 1
      ;;
  esac
}

verify_runtime_binaries_for_target() {
  local mode="${1:?mode required}"
  local target_escaped="${2:?target required}"
  local target_label="${3:?target label required}"
  local runtime_arch_raw runtime_arch entries_json binary smoke_command wrapper_type binary_path
  local smoke_command_remote nonwrapper_probe nonwrapper_probe_escaped
  local manifest_check_command arch_command wrapper_test_command nonwrapper_command

  manifest_check_command="$(build_target_manifest_check_command "${mode}" "${target_escaped}" "${runtime_binary_manifest_in_image}")" \
    || fail "Failed to build manifest check command for ${target_label}"
  gce_ssh "${manifest_check_command}" \
    || fail "Runtime binary manifest missing in ${target_label} at ${runtime_binary_manifest_in_image}"

  arch_command="$(build_target_arch_command "${mode}" "${target_escaped}")" \
    || fail "Failed to build architecture check command for ${target_label}"
  runtime_arch_raw="$(gce_ssh_lastline "${arch_command}")" \
    || fail "Failed to detect deployed architecture in ${target_label}"
  runtime_arch="$(normalize_runtime_arch "$(echo "${runtime_arch_raw}" | tr -d '[:space:]')")" \
    || fail "Unsupported deployed architecture reported by ${target_label}: ${runtime_arch_raw}"

  entries_json="$(jq -ec --arg arch "${runtime_arch}" '.[] | select(.architectures | index($arch))' "${runtime_binary_manifest_in_repo}")" \
    || fail "Failed to load runtime binary manifest entries for ${runtime_arch} from ${runtime_binary_manifest_in_repo}"
  [[ -n "${entries_json}" ]] \
    || fail "No runtime binary manifest entries defined for ${runtime_arch} in ${runtime_binary_manifest_in_repo}"

  runtime_bins="arch=${runtime_arch}"
  while IFS= read -r entry_json; do
    binary="$(printf '%s\n' "${entry_json}" | jq -r '.binary')"
    smoke_command="$(printf '%s\n' "${entry_json}" | jq -r '.smoke')"
    wrapper_type="$(printf '%s\n' "${entry_json}" | jq -r '.install.wrapper.type // empty')"

    if [[ "${wrapper_type}" == "node-entrypoint" ]]; then
      binary_path="${runtime_wrapper_bin}/${binary}"
      wrapper_test_command="$(build_target_wrapper_test_command "${mode}" "${target_escaped}" "${binary_path}")" \
        || fail "Failed to build wrapper existence command for ${binary} in ${target_label}"
      gce_ssh "${wrapper_test_command}" \
        || fail "Missing wrapper-backed runtime binary ${binary} at ${binary_path} in ${target_label}"
      smoke_command_remote="$(build_target_direct_exec_command "${mode}" "${target_escaped}" "${binary_path}" "${binary}" "${smoke_command}")" \
        || fail "Failed to build direct smoke command for ${binary} in ${target_label}"
      gce_ssh "${smoke_command_remote}" >/dev/null \
        || fail "Failed smoke check for ${binary} using direct exec path ${binary_path} in ${target_label}"
      append_runtime_bin_line "${binary}" "${binary_path}"
      continue
    fi

    nonwrapper_probe="$(cat <<SH
set -eu
binary_path="\$(command -v ${binary} || true)"
if [ -z "\${binary_path}" ]; then
  echo "missing_binary:${binary}" >&2
  exit 1
fi
if ! ${smoke_command} >/dev/null 2>&1; then
  echo "failed_smoke:${binary}:${smoke_command}" >&2
  exit 1
fi
printf '%s\n' "\${binary_path}"
SH
)"
    nonwrapper_probe_escaped="$(shell_single_quote "${nonwrapper_probe}")"
    nonwrapper_command="$(build_target_shell_command "${mode}" "${target_escaped}" "${nonwrapper_probe_escaped}")" \
      || fail "Failed to build shell probe command for ${binary} in ${target_label}"
    binary_path="$(
      gce_ssh "${nonwrapper_command}"
    )" || fail "Failed to validate runtime binary ${binary} in ${target_label}"
    append_runtime_bin_line "${binary}" "$(echo "${binary_path}" | tail -1)"
  done <<< "${entries_json}"

  printf '%s\n' "${runtime_bins}"
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

  script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  repo_root="$(cd -- "${script_dir}/.." && pwd)"
  # Check 3: required runtime binaries are present in the deployed app image.
  checks_run=$((checks_run + 1))
  log "Checking bundled runtime binaries in ${container}..."
  runtime_binary_manifest_in_image="/usr/local/share/openclaw/runtime-binaries.json"
  runtime_binary_manifest_in_repo="${repo_root}/scripts/docker/runtime-binaries.json"
  runtime_wrapper_bin="${OPENCLAW_RUNTIME_WRAPPER_BIN:-/opt/daisy/bin}"
  [[ -r "${runtime_binary_manifest_in_repo}" ]] \
    || fail "Runtime binary manifest missing or unreadable at ${runtime_binary_manifest_in_repo}"
  runtime_bins="$(
    verify_runtime_binaries_for_target "container" "${container_escaped}" "${container}"
  )" || fail "Failed to check required runtime binaries in ${container}"
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
    gws_route_probe_js="$(cat <<'NODE'
import fs from "node:fs";
import JSON5 from "json5";

const snapshot = JSON5.parse(fs.readFileSync("/home/node/.openclaw/.runtime-openclaw.json", "utf8"));
function getActiveConfig(value) {
  if (value?.resolved && typeof value.resolved === "object") {
    return value.resolved;
  }
  if (value?.config && typeof value.config === "object") {
    return value.config;
  }
  return value;
}

const activeConfig = getActiveConfig(snapshot);
const cfg = activeConfig?.plugins?.entries?.["gws-toolkit-phase1"]?.config;
const bindingSubject = "agent:main";
const boundRoute =
  typeof cfg?.agentCredentialBindings?.[bindingSubject] === "string" &&
  cfg.agentCredentialBindings[bindingSubject].length > 0
    ? cfg.agentCredentialBindings[bindingSubject]
    : null;
const route =
  boundRoute ??
  (cfg?.allowUnboundAgents === true &&
  typeof cfg?.defaultCredentialRoute === "string" &&
  cfg.defaultCredentialRoute.length > 0
    ? cfg.defaultCredentialRoute
    : null);
const active =
  route && cfg?.credentialRoutes && typeof cfg.credentialRoutes[route] === "object"
    ? cfg.credentialRoutes[route]
    : null;

if (!route || !active || typeof active.mode !== "string" || active.mode.length === 0) {
  process.exit(1);
}

process.stdout.write(
  JSON.stringify({
    bindingSubject,
    route,
    mode: active.mode,
    credentialsFile: typeof active.credentialsFile === "string" ? active.credentialsFile : null,
  }),
);
NODE
)"
    gws_route_probe_js_escaped="$(printf '%q' "${gws_route_probe_js}")"
    gws_active_route_json="$(
      gce_ssh_lastline "sudo docker exec ${container_escaped} node --input-type=module -e ${gws_route_probe_js_escaped}"
    )" || fail "Failed to inspect active Google Workspace credential route mode in ${container}"
    gws_active_route_mode="$(jq -r '.mode' <<<"${gws_active_route_json}" | tr -d '[:space:]')" \
      || fail "Failed to parse GWS active route JSON (mode field) in ${container}"
    if [[ "${gws_active_route_mode}" == "credentials_file" ]]; then
      gws_active_credentials_path="$(jq -r '.credentialsFile | select(type == "string" and length > 0)' <<<"${gws_active_route_json}")" \
        || fail "Failed to inspect active Google Workspace credentials file path in ${container}"
      case "${gws_active_credentials_path}" in
        /home/node/.openclaw/*) ;;
        *)
          fail "Active Google Workspace credentials file path is outside the mounted OpenClaw config root in ${container}: ${gws_active_credentials_path}"
          ;;
      esac
      if [[ ! "${gws_active_credentials_path}" =~ ^[A-Za-z0-9/_.-]+$ ]]; then
        fail "Active Google Workspace credentials file path contains unsafe characters in ${container}: ${gws_active_credentials_path}"
      fi
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
    # running from the host-rendered runtime config with locked-down permissions.
    checks_run=$((checks_run + 1))
    log "Checking monitoring Alertmanager runtime config delivery on ${GCE_INSTANCE_NAME}..."
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

      runtime_config_status="$(
        gce_ssh_lastline "sudo -n sh -c 'if [ -f /opt/DAISy/monitoring-runtime/alertmanager/alertmanager.yml ]; then stat -c \"%U:%G %a\" /opt/DAISy/monitoring-runtime/alertmanager/alertmanager.yml; else echo missing; fi'"
      )" || fail "Failed to inspect rendered Alertmanager runtime config on ${GCE_INSTANCE_NAME}"
      runtime_config_status="$(printf '%s' "${runtime_config_status}" | sed 's/[[:space:]]*$//')"
      if [[ "${runtime_config_status}" != "root:root 600" ]]; then
        fail "Rendered Alertmanager runtime config has unexpected ownership or mode on ${GCE_INSTANCE_NAME}: ${runtime_config_status:-<missing>} (expected root:root 600)"
      fi

      runtime_config_mount="$(
        gce_ssh_lastline "sudo docker inspect monitoring-alertmanager-1 --format '{{range .Mounts}}{{if eq .Destination \"/etc/alertmanager/alertmanager.yml\"}}{{.Source}}{{end}}{{end}}'"
      )" || fail "Failed to inspect Alertmanager runtime config mount on ${GCE_INSTANCE_NAME}"
      runtime_config_mount="$(echo "${runtime_config_mount}" | tr -d '[:space:]')"
      if [[ "${runtime_config_mount}" != "/opt/DAISy/monitoring-runtime/alertmanager/alertmanager.yml" ]]; then
        fail "monitoring-alertmanager-1 is not mounted from the rendered runtime config on ${GCE_INSTANCE_NAME}: ${runtime_config_mount:-<empty>}"
      fi

      unresolved_runtime_placeholders="$(
        gce_ssh_lastline "sudo -n sh -c 'if grep -Eq '\''[$](ALERT_SMTP_HOST|ALERT_SMTP_PORT|ALERT_SMTP_FROM|ALERT_SMTP_USERNAME|ALERT_SMTP_PASSWORD|DISCORD_ALERTS_WEBHOOK_URL|ALERT_EMAIL_TO)([^[:alnum:]_]|$)'\'' /opt/DAISy/monitoring-runtime/alertmanager/alertmanager.yml; then echo unresolved; else echo clean; fi'"
      )" || fail "Failed to inspect rendered Alertmanager runtime config placeholders on ${GCE_INSTANCE_NAME}"
      unresolved_runtime_placeholders="$(echo "${unresolved_runtime_placeholders}" | tr -d '[:space:]')"
      if [[ "${unresolved_runtime_placeholders}" != "clean" ]]; then
        fail "Rendered Alertmanager runtime config still contains unresolved placeholders on ${GCE_INSTANCE_NAME}"
      fi

      log "Monitoring Alertmanager runtime config delivery passed."
    else
      log "Monitoring env file is absent; skipping Alertmanager runtime config delivery check."
    fi
  else
    log "VERIFY_ENV=${VERIFY_ENV:-<unset>}; skipping staging-specific verification."
  fi

  # Check 8: when sandboxing is enabled, the deployed sandbox image must exist
  # locally and include the required runtime binaries.
  checks_run=$((checks_run + 1))
  log "Checking sandbox runtime config and image requirements from deployed config..."
  sandbox_probe_js="$(cat <<'NODE'
import { loadConfig } from "/app/dist/config/config.js";
import { resolveSandboxConfigForAgent } from "/app/dist/agents/sandbox/config.js";

const sandboxConfig = resolveSandboxConfigForAgent(loadConfig());
const sandboxEnabled = sandboxConfig.mode !== "off";
const sandboxImage = sandboxConfig.docker.image;
const browserEnabled = sandboxConfig.browser.enabled === true;
const sandboxBrowserImage = sandboxConfig.browser.image;

process.stdout.write(
  JSON.stringify({
    sandboxEnabled,
    sandboxImage,
    browserEnabled,
    sandboxBrowserImage,
  }),
);
NODE
)"
  sandbox_probe_js_escaped="$(shell_single_quote "${sandbox_probe_js}")"
  sandbox_config_json="$(
    gce_ssh_lastline "sudo docker exec ${container_escaped} node --input-type=module -e ${sandbox_probe_js_escaped}"
  )" || fail "Failed to read sandbox config from ${container}"
  sandbox_enabled="$(jq -r '.sandboxEnabled' <<<"${sandbox_config_json}" | tr -d '[:space:]')" \
    || fail "Failed to parse sandboxEnabled from deployed config"
  sandbox_image="$(jq -r '.sandboxImage' <<<"${sandbox_config_json}" | tr -d '[:space:]')" \
    || fail "Failed to parse sandboxImage from deployed config"
  browser_enabled="$(jq -r '.browserEnabled' <<<"${sandbox_config_json}" | tr -d '[:space:]')" \
    || fail "Failed to parse browserEnabled from deployed config"
  sandbox_browser_image="$(jq -r '.sandboxBrowserImage' <<<"${sandbox_config_json}" | tr -d '[:space:]')" \
    || fail "Failed to parse sandboxBrowserImage from deployed config"
  if [[ "${sandbox_enabled}" == "true" ]]; then
    sandbox_image_escaped="$(printf '%q' "${sandbox_image}")"
    gce_ssh "sudo docker image inspect ${sandbox_image_escaped} >/dev/null" \
      || fail "Sandboxing is enabled, but image ${sandbox_image} is missing on ${GCE_INSTANCE_NAME}"
    sandbox_runtime_bins="$(
      verify_runtime_binaries_for_target "image" "${sandbox_image_escaped}" "sandbox image ${sandbox_image}"
    )" || fail "Sandbox runtime binary smoke failed for image ${sandbox_image} on ${GCE_INSTANCE_NAME}"
    printf '%s\n' "${sandbox_runtime_bins}"
  else
    log "Sandboxing is disabled; skipping sandbox image runtime binary smoke."
  fi
  if [[ "${browser_enabled}" == "true" ]]; then
    sandbox_browser_image_escaped="$(printf '%q' "${sandbox_browser_image}")"
    log "Sandbox browser is enabled; checking required image..."
    gce_ssh "sudo docker image inspect ${sandbox_browser_image_escaped} >/dev/null" \
      || fail "Sandbox browser is enabled, but image ${sandbox_browser_image} is missing on ${GCE_INSTANCE_NAME}"
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
