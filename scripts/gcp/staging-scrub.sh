#!/usr/bin/env bash
#
# staging-scrub.sh
#
# First-boot scrub script for staging VM.
# Run this ON THE STAGING VM after creation to:
#   1. Stop services
#   2. Clear production state from boot disk paths (before bind mounts)
#   3. Format and mount the fresh state disk with bind mounts
#   4. Remove production secrets from deploy directory
#   5. Set staging identity
#   6. Disable production-specific services
#   7. Reboot
#
# Usage (on the staging VM):
#   sudo bash staging-scrub.sh
#
# Prerequisites:
#   - Run as root (sudo)
#   - State disk attached as second disk (typically /dev/sdb)
#
set -euo pipefail

# =============================================================================
# Configuration (override via environment variables)
# =============================================================================

# Auto-detect hostname from GCE metadata if not set
if [[ -z "${STAGING_HOSTNAME:-}" ]]; then
  STAGING_HOSTNAME=$(curl -sf -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/name 2>/dev/null || echo "daisy-staging-1")
fi

STATE_DISK="${STATE_DISK:-/dev/sdb}"
STATE_MOUNT="${STATE_MOUNT:-/var/lib/daisy}"
CLAWDBOT_HOME="${CLAWDBOT_HOME:-/var/lib/clawdbot/home}"
CONFIG_DIR="${CONFIG_DIR:-$CLAWDBOT_HOME/.clawdbot}"
WORKSPACE_DIR="${WORKSPACE_DIR:-$CLAWDBOT_HOME/clawd}"
# DEPLOY_DIR is where docker-compose.yml and .env live (separate from state)
DEPLOY_DIR="${DEPLOY_DIR:-/opt/DAISy}"
CLAWDBOT_USER="${CLAWDBOT_USER:-clawdbot}"

# =============================================================================
# Helper functions
# =============================================================================

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

confirm() {
  local prompt="$1"
  read -r -p "$prompt [y/N] " response
  case "$response" in
    [yY][eE][sS]|[yY]) return 0 ;;
    *) return 1 ;;
  esac
}

# =============================================================================
# Pre-flight checks
# =============================================================================

log "=== Staging VM Scrub Script ==="

# Must run as root
if [[ $EUID -ne 0 ]]; then
  log "ERROR: This script must be run as root (use sudo)"
  exit 1
fi

# Check state disk exists
if [[ ! -b "$STATE_DISK" ]]; then
  log "ERROR: State disk $STATE_DISK not found."
  log "Available block devices:"
  lsblk
  exit 1
fi

log "State disk found: $STATE_DISK"
log "Will mount to: $STATE_MOUNT"
log "Bind mounts: $CONFIG_DIR, $WORKSPACE_DIR"
log "Deploy directory: $DEPLOY_DIR"
log ""

# Check deploy directory has compose file (prevents scrubbing wrong location)
if [[ ! -f "$DEPLOY_DIR/docker-compose.yml" ]] && [[ ! -f "$DEPLOY_DIR/compose.yml" ]]; then
  log "ERROR: No docker-compose.yml or compose.yml found in $DEPLOY_DIR"
  log "Either DEPLOY_DIR is wrong, or the compose file has a different name."
  log "Set DEPLOY_DIR to the directory containing your compose file."
  exit 1
fi

confirm "This will FORMAT $STATE_DISK and clear production state. Continue?" || exit 0

# =============================================================================
# Phase 1: Stop Services
# =============================================================================

log ""
log "=== Phase 1: Stop Services ==="

log "Stopping moltbot-gateway systemd service (if exists)..."
systemctl stop moltbot-gateway 2>/dev/null || log "  (service not found or not running)"

log "Stopping Docker containers..."
if [[ -f "$DEPLOY_DIR/docker-compose.yml" ]]; then
  cd "$DEPLOY_DIR"
  docker compose down 2>/dev/null || log "  (no containers running)"
else
  log "  (no docker-compose.yml found at $DEPLOY_DIR)"
fi

# =============================================================================
# Phase 2: Clear Production State from Boot Disk
# =============================================================================

log ""
log "=== Phase 2: Clear Production State from Boot Disk ==="

# IMPORTANT: Clear production state from boot disk paths BEFORE bind mounts
# This prevents production data from leaking if bind mounts ever fail.
# After bind mounts are applied, these paths will point to the fresh state disk.

if [[ -d "$CONFIG_DIR" ]]; then
  log "Clearing production config from boot disk ($CONFIG_DIR)..."
  rm -rf "${CONFIG_DIR:?}"/* 2>/dev/null || true
fi

if [[ -d "$WORKSPACE_DIR" ]]; then
  log "Clearing production workspace from boot disk ($WORKSPACE_DIR)..."
  rm -rf "${WORKSPACE_DIR:?}"/* 2>/dev/null || true
fi

# =============================================================================
# Phase 3: Format and Mount State Disk
# =============================================================================

log ""
log "=== Phase 3: Format and Mount State Disk ==="

# Unmount if already mounted
if mountpoint -q "$STATE_MOUNT" 2>/dev/null; then
  log "Unmounting existing $STATE_MOUNT..."
  umount "$STATE_MOUNT"
fi

# Format the state disk (this is a NEW, empty disk)
log "Formatting $STATE_DISK as ext4..."
mkfs.ext4 -F "$STATE_DISK"

# Create mount point
log "Creating mount point $STATE_MOUNT..."
mkdir -p "$STATE_MOUNT"

# Mount the state disk
log "Mounting $STATE_DISK to $STATE_MOUNT..."
mount "$STATE_DISK" "$STATE_MOUNT"

# Create subdirectories on the fresh state disk
log "Creating subdirectories for config and workspace..."
mkdir -p "$STATE_MOUNT/config"
mkdir -p "$STATE_MOUNT/workspace"
chown -R "$CLAWDBOT_USER:$CLAWDBOT_USER" "$STATE_MOUNT"

# Ensure bind mount target directories exist
log "Ensuring bind mount target directories exist..."
mkdir -p "$CONFIG_DIR"
mkdir -p "$WORKSPACE_DIR"
chown "$CLAWDBOT_USER:$CLAWDBOT_USER" "$CONFIG_DIR" "$WORKSPACE_DIR"

# Remove existing fstab entries for these mounts
log "Updating /etc/fstab..."
sed -i "\|$STATE_MOUNT|d" /etc/fstab
sed -i "\|$CONFIG_DIR|d" /etc/fstab
sed -i "\|$WORKSPACE_DIR|d" /etc/fstab

# Add fstab entries
cat <<EOF >> /etc/fstab

# DAISy staging state disk
$STATE_DISK $STATE_MOUNT ext4 defaults 0 2
$STATE_MOUNT/config $CONFIG_DIR none bind 0 0
$STATE_MOUNT/workspace $WORKSPACE_DIR none bind 0 0
EOF

# Apply bind mounts (now CONFIG_DIR and WORKSPACE_DIR point to fresh state disk)
log "Applying bind mounts..."
mount --bind "$STATE_MOUNT/config" "$CONFIG_DIR"
mount --bind "$STATE_MOUNT/workspace" "$WORKSPACE_DIR"

log "Verifying mounts..."
mountpoint "$STATE_MOUNT" && log "  $STATE_MOUNT: OK"
mountpoint "$CONFIG_DIR" && log "  $CONFIG_DIR: OK"
mountpoint "$WORKSPACE_DIR" && log "  $WORKSPACE_DIR: OK"

# =============================================================================
# Phase 4: Remove Production Secrets from Deploy Directory
# =============================================================================

log ""
log "=== Phase 4: Remove Production Secrets from Deploy Directory ==="

# Remove deploy .env file
if [[ -f "$DEPLOY_DIR/.env" ]]; then
  log "Removing production .env file..."
  rm -f "$DEPLOY_DIR/.env"
fi

# Remove any .env.* files
rm -f "$DEPLOY_DIR"/.env.* 2>/dev/null || true

# Remove cached gcloud credentials (root)
if [[ -d /root/.config/gcloud ]]; then
  log "Removing root gcloud credentials..."
  rm -rf /root/.config/gcloud
fi

# Remove cached gcloud credentials (node user)
if [[ -d /home/node/.config/gcloud ]]; then
  log "Removing node user gcloud credentials..."
  rm -rf /home/node/.config/gcloud
fi

# Remove any SSH known_hosts that might reference prod hosts
log "Clearing SSH known_hosts..."
rm -f /root/.ssh/known_hosts 2>/dev/null || true
rm -f /home/node/.ssh/known_hosts 2>/dev/null || true

# =============================================================================
# Phase 5: Set Staging Identity
# =============================================================================

log ""
log "=== Phase 5: Set Staging Identity ==="

log "Setting hostname to $STAGING_HOSTNAME..."
hostnamectl set-hostname "$STAGING_HOSTNAME"

# Update /etc/hosts
log "Updating /etc/hosts..."
sed -i "s/clawdbot-gw-1/$STAGING_HOSTNAME/g" /etc/hosts 2>/dev/null || true

# Create staging environment marker
log "Creating staging environment marker..."
mkdir -p /etc/environment.d
cat <<EOF > /etc/environment.d/staging.conf
STAGING_INSTANCE=$STAGING_HOSTNAME
DAISY_ENVIRONMENT=staging
EOF

# =============================================================================
# Phase 6: Disable Production-Specific Services
# =============================================================================

log ""
log "=== Phase 6: Disable Production-Specific Services ==="

# Remove root crontab
log "Removing root crontab..."
crontab -r 2>/dev/null || log "  (no root crontab)"

# Remove node user crontab
log "Removing node user crontab..."
crontab -u node -r 2>/dev/null || log "  (no node user crontab)"

# Disable any Cloudflare tunnel service
if systemctl list-units --type=service | grep -q cloudflared; then
  log "Disabling cloudflared service..."
  systemctl disable cloudflared 2>/dev/null || true
  systemctl stop cloudflared 2>/dev/null || true
fi

# =============================================================================
# Summary and Reboot
# =============================================================================

log ""
log "=== Scrub Complete ==="
log ""
log "The following has been done:"
log "  - Services stopped"
log "  - State disk formatted and mounted at $STATE_MOUNT"
log "  - Bind mounts configured: $CONFIG_DIR, $WORKSPACE_DIR"
log "  - Production config/credentials removed"
log "  - Hostname set to $STAGING_HOSTNAME"
log "  - Production cron jobs removed"
log ""
log "MANUAL STEPS REQUIRED after reboot:"
log "  1. Create $DEPLOY_DIR/.env with staging secrets"
log "  2. Configure staging Discord bot token"
log "  3. Configure staging API keys"
log "  4. Pull staging Docker image and start services"
log "  5. Run staging-verify.sh to validate"
log ""

confirm "Reboot now to apply all changes?" && {
  log "Rebooting in 5 seconds..."
  sleep 5
  reboot
} || {
  log "Skipping reboot. Run 'sudo reboot' when ready."
}
