#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
EXTRA_COMPOSE_FILE="$ROOT_DIR/docker-compose.extra.yml"
IMAGE_NAME="${CLAWDBOT_IMAGE:-moltbot:local}"
EXTRA_MOUNTS="${CLAWDBOT_EXTRA_MOUNTS:-}"
HOME_VOLUME_NAME="${CLAWDBOT_HOME_VOLUME:-}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1" >&2
    exit 1
  fi
}

contains_disallowed_chars() {
  local value="$1"
  [[ "$value" == *$'\n'* || "$value" == *$'\r'* || "$value" == *$'\t'* ]]
}

validate_mount_path_value() {
  local label="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    fail "$label cannot be empty."
  fi
  if contains_disallowed_chars "$value"; then
    fail "$label contains unsupported control characters."
  fi
  if [[ "$value" =~ [[:space:]] ]]; then
    fail "$label cannot contain whitespace."
  fi
}

validate_named_volume() {
  local value="$1"
  if [[ ! "$value" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]]; then
    fail "OPENCLAW_HOME_VOLUME must match [A-Za-z0-9][A-Za-z0-9_.-]* when using a named volume."
  fi
}

validate_mount_spec() {
  local mount="$1"
  if contains_disallowed_chars "$mount"; then
    fail "OPENCLAW_EXTRA_MOUNTS entries cannot contain control characters."
  fi
  # Keep mount specs strict to avoid YAML structure injection.
  # Expected format: source:target[:options]
  if [[ ! "$mount" =~ ^[^[:space:],:]+:[^[:space:],:]+(:[^[:space:],:]+)?$ ]]; then
    fail "Invalid mount format '$mount'. Expected source:target[:options] without spaces."
  fi
}

require_cmd docker
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose not available (try: docker compose version)" >&2
  exit 1
fi

mkdir -p "${CLAWDBOT_CONFIG_DIR:-$HOME/.clawdbot}"
mkdir -p "${CLAWDBOT_WORKSPACE_DIR:-$HOME/clawd}"

<<<<<<< HEAD
export CLAWDBOT_CONFIG_DIR="${CLAWDBOT_CONFIG_DIR:-$HOME/.clawdbot}"
export CLAWDBOT_WORKSPACE_DIR="${CLAWDBOT_WORKSPACE_DIR:-$HOME/clawd}"
export CLAWDBOT_GATEWAY_PORT="${CLAWDBOT_GATEWAY_PORT:-18789}"
export CLAWDBOT_BRIDGE_PORT="${CLAWDBOT_BRIDGE_PORT:-18790}"
export CLAWDBOT_GATEWAY_BIND="${CLAWDBOT_GATEWAY_BIND:-lan}"
export CLAWDBOT_IMAGE="$IMAGE_NAME"
export CLAWDBOT_DOCKER_APT_PACKAGES="${CLAWDBOT_DOCKER_APT_PACKAGES:-}"
=======
validate_mount_path_value "OPENCLAW_CONFIG_DIR" "$OPENCLAW_CONFIG_DIR"
validate_mount_path_value "OPENCLAW_WORKSPACE_DIR" "$OPENCLAW_WORKSPACE_DIR"
if [[ -n "$HOME_VOLUME_NAME" ]]; then
  if [[ "$HOME_VOLUME_NAME" == *"/"* ]]; then
    validate_mount_path_value "OPENCLAW_HOME_VOLUME" "$HOME_VOLUME_NAME"
  else
    validate_named_volume "$HOME_VOLUME_NAME"
  fi
fi
if contains_disallowed_chars "$EXTRA_MOUNTS"; then
  fail "OPENCLAW_EXTRA_MOUNTS cannot contain control characters."
fi

mkdir -p "$OPENCLAW_CONFIG_DIR"
mkdir -p "$OPENCLAW_WORKSPACE_DIR"
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 7255c20dd (fix(docker): harden docker-setup mount validation)
=======
# Seed device-identity parent eagerly for Docker Desktop/Windows bind mounts
# that reject creating new subdirectories from inside the container.
mkdir -p "$OPENCLAW_CONFIG_DIR/identity"
>>>>>>> f0542df9f (Docker: precreate identity dir in docker setup)
=======
# Seed directory tree eagerly so bind mounts work even on Docker Desktop/Windows
# where the container (even as root) cannot create new host subdirectories.
mkdir -p "$OPENCLAW_CONFIG_DIR/identity"
mkdir -p "$OPENCLAW_CONFIG_DIR/agents/main/agent"
mkdir -p "$OPENCLAW_CONFIG_DIR/agents/main/sessions"
>>>>>>> a262a3ea0 (fix(docker): ensure agent directory permissions in docker-setup.sh (#28841))

if [[ -z "${CLAWDBOT_GATEWAY_TOKEN:-}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    CLAWDBOT_GATEWAY_TOKEN="$(openssl rand -hex 32)"
  else
    CLAWDBOT_GATEWAY_TOKEN="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
)"
  fi
fi
export CLAWDBOT_GATEWAY_TOKEN

COMPOSE_FILES=("$COMPOSE_FILE")
COMPOSE_ARGS=()

write_extra_compose() {
  local home_volume="$1"
  shift
  local mount
  local gateway_home_mount
  local gateway_config_mount
  local gateway_workspace_mount

  cat >"$EXTRA_COMPOSE_FILE" <<'YAML'
services:
  moltbot-gateway:
    volumes:
YAML

  if [[ -n "$home_volume" ]]; then
<<<<<<< HEAD
    printf '      - %s:/home/node\n' "$home_volume" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/.clawdbot\n' "$CLAWDBOT_CONFIG_DIR" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/clawd\n' "$CLAWDBOT_WORKSPACE_DIR" >>"$EXTRA_COMPOSE_FILE"
=======
    gateway_home_mount="${home_volume}:/home/node"
    gateway_config_mount="${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw"
    gateway_workspace_mount="${OPENCLAW_WORKSPACE_DIR}:/home/node/.openclaw/workspace"
    validate_mount_spec "$gateway_home_mount"
    validate_mount_spec "$gateway_config_mount"
    validate_mount_spec "$gateway_workspace_mount"
    printf '      - %s\n' "$gateway_home_mount" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s\n' "$gateway_config_mount" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s\n' "$gateway_workspace_mount" >>"$EXTRA_COMPOSE_FILE"
>>>>>>> 7255c20dd (fix(docker): harden docker-setup mount validation)
  fi

  for mount in "$@"; do
    validate_mount_spec "$mount"
    printf '      - %s\n' "$mount" >>"$EXTRA_COMPOSE_FILE"
  done

  cat >>"$EXTRA_COMPOSE_FILE" <<'YAML'
  moltbot-cli:
    volumes:
YAML

  if [[ -n "$home_volume" ]]; then
<<<<<<< HEAD
    printf '      - %s:/home/node\n' "$home_volume" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/.clawdbot\n' "$CLAWDBOT_CONFIG_DIR" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/clawd\n' "$CLAWDBOT_WORKSPACE_DIR" >>"$EXTRA_COMPOSE_FILE"
=======
    printf '      - %s\n' "$gateway_home_mount" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s\n' "$gateway_config_mount" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s\n' "$gateway_workspace_mount" >>"$EXTRA_COMPOSE_FILE"
>>>>>>> 7255c20dd (fix(docker): harden docker-setup mount validation)
  fi

  for mount in "$@"; do
    validate_mount_spec "$mount"
    printf '      - %s\n' "$mount" >>"$EXTRA_COMPOSE_FILE"
  done

  if [[ -n "$home_volume" && "$home_volume" != *"/"* ]]; then
    validate_named_volume "$home_volume"
    cat >>"$EXTRA_COMPOSE_FILE" <<YAML
volumes:
  ${home_volume}:
YAML
  fi
}

VALID_MOUNTS=()
if [[ -n "$EXTRA_MOUNTS" ]]; then
  IFS=',' read -r -a mounts <<<"$EXTRA_MOUNTS"
  for mount in "${mounts[@]}"; do
    mount="${mount#"${mount%%[![:space:]]*}"}"
    mount="${mount%"${mount##*[![:space:]]}"}"
    if [[ -n "$mount" ]]; then
      VALID_MOUNTS+=("$mount")
    fi
  done
fi

if [[ -n "$HOME_VOLUME_NAME" || ${#VALID_MOUNTS[@]} -gt 0 ]]; then
  # Bash 3.2 + nounset treats "${array[@]}" on an empty array as unbound.
  if [[ ${#VALID_MOUNTS[@]} -gt 0 ]]; then
    write_extra_compose "$HOME_VOLUME_NAME" "${VALID_MOUNTS[@]}"
  else
    write_extra_compose "$HOME_VOLUME_NAME"
  fi
  COMPOSE_FILES+=("$EXTRA_COMPOSE_FILE")
fi
for compose_file in "${COMPOSE_FILES[@]}"; do
  COMPOSE_ARGS+=("-f" "$compose_file")
done
COMPOSE_HINT="docker compose"
for compose_file in "${COMPOSE_FILES[@]}"; do
  COMPOSE_HINT+=" -f ${compose_file}"
done

ENV_FILE="$ROOT_DIR/.env"
upsert_env() {
  local file="$1"
  shift
  local -a keys=("$@")
  local tmp
  tmp="$(mktemp)"
  # Use a delimited string instead of an associative array so the script
  # works with Bash 3.2 (macOS default) which lacks `declare -A`.
  local seen=" "

  if [[ -f "$file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      local key="${line%%=*}"
      local replaced=false
      for k in "${keys[@]}"; do
        if [[ "$key" == "$k" ]]; then
          printf '%s=%s\n' "$k" "${!k-}" >>"$tmp"
          seen="$seen$k "
          replaced=true
          break
        fi
      done
      if [[ "$replaced" == false ]]; then
        printf '%s\n' "$line" >>"$tmp"
      fi
    done <"$file"
  fi

  for k in "${keys[@]}"; do
    if [[ "$seen" != *" $k "* ]]; then
      printf '%s=%s\n' "$k" "${!k-}" >>"$tmp"
    fi
  done

  mv "$tmp" "$file"
}

upsert_env "$ENV_FILE" \
  CLAWDBOT_CONFIG_DIR \
  CLAWDBOT_WORKSPACE_DIR \
  CLAWDBOT_GATEWAY_PORT \
  CLAWDBOT_BRIDGE_PORT \
  CLAWDBOT_GATEWAY_BIND \
  CLAWDBOT_GATEWAY_TOKEN \
  CLAWDBOT_IMAGE \
  CLAWDBOT_EXTRA_MOUNTS \
  CLAWDBOT_HOME_VOLUME \
  CLAWDBOT_DOCKER_APT_PACKAGES

<<<<<<< HEAD
<<<<<<< HEAD
echo "==> Building Docker image: $IMAGE_NAME"
docker build \
  --build-arg "CLAWDBOT_DOCKER_APT_PACKAGES=${CLAWDBOT_DOCKER_APT_PACKAGES}" \
  -t "$IMAGE_NAME" \
  -f "$ROOT_DIR/Dockerfile" \
  "$ROOT_DIR"
=======
if [ "$IMAGE_NAME" == "openclaw:local" ]; then
=======
if [[ "$IMAGE_NAME" == "openclaw:local" ]]; then
>>>>>>> c7f88e85b (feature/OPENCLAW_IMAGE)
  echo "==> Building Docker image: $IMAGE_NAME"
  docker build \
    --build-arg "OPENCLAW_DOCKER_APT_PACKAGES=${OPENCLAW_DOCKER_APT_PACKAGES}" \
    -t "$IMAGE_NAME" \
    -f "$ROOT_DIR/Dockerfile" \
    "$ROOT_DIR"
else
  echo "==> Pulling Docker image: $IMAGE_NAME"
  if ! docker pull "$IMAGE_NAME"; then
    echo "ERROR: Failed to pull image $IMAGE_NAME. Please check the image name and your access permissions." >&2
    exit 1
  fi
fi
<<<<<<< HEAD
    --build-arg "OPENCLAW_DOCKER_APT_PACKAGES=${OPENCLAW_DOCKER_APT_PACKAGES}" \
    -t "$IMAGE_NAME" \
    -f "$ROOT_DIR/Dockerfile" \
    "$ROOT_DIR"
else
  echo "==> Pulling Docker image: $IMAGE_NAME"
  docker pull "$IMAGE_NAME"
fi
>>>>>>> 15240bdbf (feature/OPENCLAW_IMAGE)
=======
>>>>>>> a898acbd5 (feature/OPENCLAW_IMAGE)

# Ensure bind-mounted data directories are writable by the container's `node`
# user (uid 1000). Host-created dirs inherit the host user's uid which may
# differ, causing EACCES when the container tries to mkdir/write.
# Running a brief root container to chown is the portable Docker idiom --
# it works regardless of the host uid and doesn't require host-side root.
echo ""
echo "==> Fixing data-directory permissions"
# Use -xdev to restrict chown to the config-dir mount only — without it,
# the recursive chown would cross into the workspace bind mount and rewrite
# ownership of all user project files on Linux hosts.
# After fixing the config dir, only the OpenClaw metadata subdirectory
# (.openclaw/) inside the workspace gets chowned, not the user's project files.
docker compose "${COMPOSE_ARGS[@]}" run --rm --user root --entrypoint sh openclaw-cli -c \
  'find /home/node/.openclaw -xdev -exec chown node:node {} +; \
   [ -d /home/node/.openclaw/workspace/.openclaw ] && chown -R node:node /home/node/.openclaw/workspace/.openclaw || true'

echo ""
echo "==> Onboarding (interactive)"
echo "When prompted:"
echo "  - Gateway bind: lan"
echo "  - Gateway auth: token"
echo "  - Gateway token: $CLAWDBOT_GATEWAY_TOKEN"
echo "  - Tailscale exposure: Off"
echo "  - Install Gateway daemon: No"
echo ""
docker compose "${COMPOSE_ARGS[@]}" run --rm moltbot-cli onboard --no-install-daemon

echo ""
echo "==> Provider setup (optional)"
echo "WhatsApp (QR):"
echo "  ${COMPOSE_HINT} run --rm moltbot-cli providers login"
echo "Telegram (bot token):"
echo "  ${COMPOSE_HINT} run --rm moltbot-cli providers add --provider telegram --token <token>"
echo "Discord (bot token):"
echo "  ${COMPOSE_HINT} run --rm moltbot-cli providers add --provider discord --token <token>"
echo "Docs: https://docs.molt.bot/providers"

echo ""
echo "==> Starting gateway"
docker compose "${COMPOSE_ARGS[@]}" up -d moltbot-gateway

echo ""
echo "Gateway running with host port mapping."
echo "Access from tailnet devices via the host's tailnet IP."
echo "Config: $CLAWDBOT_CONFIG_DIR"
echo "Workspace: $CLAWDBOT_WORKSPACE_DIR"
echo "Token: $CLAWDBOT_GATEWAY_TOKEN"
echo ""
echo "Commands:"
echo "  ${COMPOSE_HINT} logs -f moltbot-gateway"
echo "  ${COMPOSE_HINT} exec moltbot-gateway node dist/index.js health --token \"$CLAWDBOT_GATEWAY_TOKEN\""
