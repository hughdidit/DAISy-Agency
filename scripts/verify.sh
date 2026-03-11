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

# Helper: run a command on the GCE instance via IAP SSH and return only the last
# line of stdout. This filters out SSH keygen noise that gcloud emits on first
# connection (key fingerprints, randomart) which would otherwise contaminate
# captured output and leak key material into CI logs.
gce_ssh_lastline() {
  gcloud compute ssh "${GCE_INSTANCE_NAME}" \
    --project "${GCP_PROJECT_ID}" \
    --zone "${GCP_ZONE}" \
    --tunnel-through-iap \
    --quiet \
    --command "$1" | tail -1
}

if [[ -n "${GCE_INSTANCE_NAME:-}" ]]; then
  : "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required for GCE verify}"
  : "${GCP_ZONE:?GCP_ZONE is required for GCE verify}"

  container="${VERIFY_GCE_CONTAINER:-openclaw-gateway}"
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
    gcloud compute ssh "${GCE_INSTANCE_NAME}" \
      --project "${GCP_PROJECT_ID}" \
      --zone "${GCP_ZONE}" \
      --tunnel-through-iap \
      --quiet \
      --command "sudo docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'" || true
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

  # Check 3: verify deployed image matches DEPLOYED_REF (if set)
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
