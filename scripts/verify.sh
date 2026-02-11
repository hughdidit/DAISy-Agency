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

if [[ -n "${GCE_INSTANCE_NAME:-}" ]]; then
  : "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required for GCE verify}"
  : "${GCP_ZONE:?GCP_ZONE is required for GCE verify}"

  container="${VERIFY_GCE_CONTAINER:-moltbot-gateway}"
  health_timeout="${VERIFY_HEALTH_TIMEOUT:-30}"

  # Check 1: container is running
  checks_run=$((checks_run + 1))
  log "Checking container ${container} on ${GCE_INSTANCE_NAME}..."
  running_state="$(
    gcloud compute ssh "${GCE_INSTANCE_NAME}" \
      --project "${GCP_PROJECT_ID}" \
      --zone "${GCP_ZONE}" \
      --tunnel-through-iap \
      --quiet \
      --command "sudo docker inspect --format '{{.State.Running}}' \$(sudo docker ps -qf 'name=${container}' | head -1) 2>/dev/null || echo false"
  )" || fail "Failed to check container ${container} on ${GCE_INSTANCE_NAME}"

  running_state="$(echo "${running_state}" | tr -d '[:space:]')"
  if [[ "${running_state}" != "true" ]]; then
    fail "Container ${container} is not running on ${GCE_INSTANCE_NAME}"
  fi
  log "Container ${container} is running."

  # Check 2: moltbot health --json returns ok: true
  checks_run=$((checks_run + 1))
  log "Running moltbot health via docker exec (timeout: ${health_timeout}s)..."
  health_output="$(
    gcloud compute ssh "${GCE_INSTANCE_NAME}" \
      --project "${GCP_PROJECT_ID}" \
      --zone "${GCP_ZONE}" \
      --tunnel-through-iap \
      --quiet \
      --command "sudo docker exec \$(sudo docker ps -qf 'name=${container}' | head -1) node dist/index.js health --json --timeout ${health_timeout}000 2>/dev/null"
  )" || fail "moltbot health check failed on ${GCE_INSTANCE_NAME}"

  health_ok="$(echo "${health_output}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("true" if d.get("ok") else "false")' 2>/dev/null || echo "false")"
  if [[ "${health_ok}" != "true" ]]; then
    log "Health output: ${health_output}"
    fail "moltbot health returned ok=false on ${GCE_INSTANCE_NAME}"
  fi
  log "moltbot health check passed."

  # Check 3: verify deployed image matches DEPLOYED_REF (if set)
  if [[ -n "${DEPLOYED_REF:-}" ]]; then
    checks_run=$((checks_run + 1))
    log "Checking deployed image matches DEPLOYED_REF (${DEPLOYED_REF})..."
    image_ref="$(
      gcloud compute ssh "${GCE_INSTANCE_NAME}" \
        --project "${GCP_PROJECT_ID}" \
        --zone "${GCP_ZONE}" \
        --tunnel-through-iap \
        --quiet \
        --command "sudo docker inspect --format '{{.Config.Image}}' \$(sudo docker ps -qf 'name=${container}' | head -1) 2>/dev/null"
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
  fail "No verification checks configured. Set GCE_INSTANCE_NAME or VERIFY_SSH_HOST."
fi

log "Verification completed successfully."
