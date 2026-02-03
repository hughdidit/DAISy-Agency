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

if [[ -n "${VERIFY_HEALTH_URL:-}" ]]; then
  checks_run=$((checks_run + 1))
  log "Checking health endpoint: ${VERIFY_HEALTH_URL}"
  response="$(
    curl -fsS --max-time "${VERIFY_HTTP_TIMEOUT:-10}" "${VERIFY_HEALTH_URL}"
  )" || fail "Health check failed for ${VERIFY_HEALTH_URL}"

  if [[ -n "${DEPLOYED_REF:-}" ]]; then
    version_result="$(
      python - "${DEPLOYED_REF}" <<'PY' <<<"$response" || true
import json
import sys

deployed_ref = sys.argv[1] if len(sys.argv) > 1 else ""
payload = sys.stdin.read()
try:
    data = json.loads(payload)
except Exception:
    sys.exit(0)

if not isinstance(data, dict):
    sys.exit(0)

keys = [
    "commit",
    "git_sha",
    "gitSha",
    "version",
    "ref",
    "deployed_ref",
    "build",
]

for key in keys:
    if key in data:
        value = str(data[key])
        if deployed_ref and deployed_ref not in value:
            print(f"MISMATCH:{value}")
        else:
            print(value)
        sys.exit(0)
PY
    )"

    if [[ -n "${version_result}" ]]; then
      if [[ "${version_result}" == MISMATCH:* ]]; then
        fail "Health endpoint version mismatch. Expected ${DEPLOYED_REF}, got ${version_result#MISMATCH:}."
      fi
      log "Health endpoint version: ${version_result}"
    else
      log "Health endpoint response did not include a version field to compare with DEPLOYED_REF."
    fi
  fi
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
  fail "No verification checks configured. Set VERIFY_HEALTH_URL or VERIFY_SSH_HOST with a service/container."
fi

log "Verification completed successfully."
