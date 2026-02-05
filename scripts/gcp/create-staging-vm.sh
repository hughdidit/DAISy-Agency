#!/usr/bin/env bash
#
# create-staging-vm.sh
#
# Creates a staging VM by cloning the production boot disk.
# This script performs phases 1-5 of the staging VM provisioning:
#   1. Discovery (values pre-filled from production)
#   2. Create staging service account
#   3. Snapshot prod boot disk and create staging disks
#   4. Create staging VM
#   5. Validate IAP SSH access
#
# Usage:
#   ./scripts/gcp/create-staging-vm.sh [--dry-run] [--show-defaults]
#
# Configuration via environment variables:
#   GCP_PROJECT_ID          - GCP project (REQUIRED - no default)
#   GCP_ZONE                - Zone for staging VM (default: us-west1-b)
#   PROD_BOOT_DISK          - Production boot disk to clone (default: clawdbot-gw-1)
#   STAGING_INSTANCE        - Staging VM name (default: daisy-staging-1)
#   STAGING_MACHINE_TYPE    - Machine type (default: n2-standard-8)
#   STAGING_STATE_DISK_SIZE - State disk size (default: 200GB)
#
# Prerequisites:
#   - gcloud CLI authenticated with appropriate permissions
#
set -euo pipefail

# =============================================================================
# Configuration (override via environment variables)
# =============================================================================

# GCP project (required - no default to prevent accidental use of wrong project)
if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  echo "ERROR: GCP_PROJECT_ID is required."
  echo ""
  echo "Set it before running:"
  echo "  export GCP_PROJECT_ID=your-project-id"
  echo "  ./scripts/gcp/create-staging-vm.sh"
  exit 1
fi
PROJECT_ID="$GCP_PROJECT_ID"

# GCP zone and production disk
PROD_ZONE="${GCP_ZONE:-us-west1-b}"
PROD_BOOT_DISK="${PROD_BOOT_DISK:-clawdbot-gw-1}"

# Staging configuration
STAGING_INSTANCE="${STAGING_INSTANCE:-daisy-staging-1}"
STAGING_ZONE="${STAGING_ZONE:-$PROD_ZONE}"
STAGING_MACHINE_TYPE="${STAGING_MACHINE_TYPE:-n2-standard-8}"
STAGING_BOOT_DISK="${STAGING_BOOT_DISK:-${STAGING_INSTANCE}-boot}"
STAGING_STATE_DISK="${STAGING_STATE_DISK:-${STAGING_INSTANCE}-state}"
STAGING_STATE_DISK_SIZE="${STAGING_STATE_DISK_SIZE:-200GB}"
STAGING_SA_NAME="${STAGING_SA_NAME:-${STAGING_INSTANCE}-sa}"
STAGING_SA_EMAIL="${STAGING_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
STAGING_NETWORK="${STAGING_NETWORK:-default}"
STAGING_SUBNET="${STAGING_SUBNET:-default}"
STAGING_TAGS="${STAGING_TAGS:-iap-ssh}"

# Snapshot naming
SNAPSHOT_NAME="${SNAPSHOT_NAME:-${STAGING_INSTANCE}-snapshot-$(date +%Y%m%d-%H%M%S)-${USER:-$(whoami)}}"

# =============================================================================
# Parse arguments
# =============================================================================

DRY_RUN=false
SHOW_DEFAULTS=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --show-defaults)
      SHOW_DEFAULTS=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--dry-run] [--show-defaults]"
      echo ""
      echo "Options:"
      echo "  --dry-run       Show what would be done without making changes"
      echo "  --show-defaults Show current configuration and exit"
      echo "  --help          Show this help message"
      echo ""
      echo "Configure via environment variables:"
      echo "  GCP_PROJECT_ID, GCP_ZONE, PROD_BOOT_DISK, STAGING_INSTANCE,"
      echo "  STAGING_MACHINE_TYPE, STAGING_STATE_DISK_SIZE"
      exit 0
      ;;
  esac
done

# =============================================================================
# Show defaults mode
# =============================================================================

if [[ "$SHOW_DEFAULTS" == "true" ]]; then
  echo "=== Current Configuration ==="
  echo ""
  echo "GCP Settings:"
  echo "  GCP_PROJECT_ID          = $PROJECT_ID"
  echo "  GCP_ZONE                = $PROD_ZONE"
  echo "  PROD_BOOT_DISK          = $PROD_BOOT_DISK"
  echo ""
  echo "Staging VM:"
  echo "  STAGING_INSTANCE        = $STAGING_INSTANCE"
  echo "  STAGING_ZONE            = $STAGING_ZONE"
  echo "  STAGING_MACHINE_TYPE    = $STAGING_MACHINE_TYPE"
  echo "  STAGING_BOOT_DISK       = $STAGING_BOOT_DISK"
  echo "  STAGING_STATE_DISK      = $STAGING_STATE_DISK"
  echo "  STAGING_STATE_DISK_SIZE = $STAGING_STATE_DISK_SIZE"
  echo "  STAGING_SA_NAME         = $STAGING_SA_NAME"
  echo "  STAGING_NETWORK         = $STAGING_NETWORK"
  echo "  STAGING_SUBNET          = $STAGING_SUBNET"
  echo "  STAGING_TAGS            = $STAGING_TAGS"
  echo ""
  echo "To override, export variables before running:"
  echo "  export STAGING_INSTANCE=my-staging-2"
  echo "  ./scripts/gcp/create-staging-vm.sh"
  exit 0
fi

# =============================================================================
# Safety checks (prevent footguns)
# =============================================================================

# Require explicit PROD_BOOT_DISK confirmation (don't blindly use default)
# User must either set a different value OR confirm the default explicitly
if [[ "${PROD_BOOT_DISK}" == "clawdbot-gw-1" && -z "${PROD_BOOT_DISK_CONFIRMED:-}" ]]; then
  echo "ERROR: PROD_BOOT_DISK defaults to 'clawdbot-gw-1'. Please confirm this is correct."
  echo ""
  echo "Either set a different value:"
  echo "  export PROD_BOOT_DISK=your-prod-boot-disk"
  echo ""
  echo "Or confirm the default is correct:"
  echo "  export PROD_BOOT_DISK_CONFIRMED=1"
  echo "  ./scripts/gcp/create-staging-vm.sh"
  exit 1
fi

# Staging instance name must differ from common production patterns
PROD_PATTERNS="prod|production|daisy-1$|clawdbot-gw"
if echo "$STAGING_INSTANCE" | grep -qiE "$PROD_PATTERNS"; then
  echo "ERROR: STAGING_INSTANCE '$STAGING_INSTANCE' looks like a production name."
  echo "Choose a name that clearly indicates staging (e.g., 'daisy-staging-1')."
  exit 1
fi

# Staging instance must not match production boot disk name
if [[ "$STAGING_INSTANCE" == "$PROD_BOOT_DISK" ]]; then
  echo "ERROR: STAGING_INSTANCE cannot be the same as PROD_BOOT_DISK."
  exit 1
fi

# =============================================================================
# Helper functions
# =============================================================================

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "[DRY-RUN] $*"
  else
    log "Running: $*"
    "$@"
  fi
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

log "=== Staging VM Creation Script ==="
log "Project: $PROJECT_ID"
log "Production boot disk: $PROD_BOOT_DISK (zone: $PROD_ZONE)"
log "Staging instance: $STAGING_INSTANCE (zone: $STAGING_ZONE)"
log "Dry run: $DRY_RUN"
echo

# Verify gcloud is authenticated
if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" | grep -q .; then
  log "ERROR: No active gcloud account. Run 'gcloud auth login' first."
  exit 1
fi

# Check if staging instance already exists
if gcloud compute instances describe "$STAGING_INSTANCE" --project="$PROJECT_ID" --zone="$STAGING_ZONE" &>/dev/null; then
  log "ERROR: Staging instance '$STAGING_INSTANCE' already exists in zone '$STAGING_ZONE'."
  log "Delete it first or choose a different name."
  exit 1
fi

if [[ "$DRY_RUN" == "false" ]]; then
  confirm "Proceed with staging VM creation?" || exit 0
fi

# =============================================================================
# Phase 2: Create Staging Service Account
# =============================================================================

log ""
log "=== Phase 2: Create Staging Service Account ==="

if gcloud iam service-accounts describe "$STAGING_SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
  log "Service account $STAGING_SA_EMAIL already exists."
else
  log "Creating service account: $STAGING_SA_NAME"
  run gcloud iam service-accounts create "$STAGING_SA_NAME" \
    --project="$PROJECT_ID" \
    --display-name="DAISy Staging VM Service Account"
fi

# Always ensure roles are granted (idempotent - safe to run multiple times)
log "Ensuring service account has required roles..."

# Logging
run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$STAGING_SA_EMAIL" \
  --role="roles/logging.logWriter" \
  --quiet

# Monitoring
run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$STAGING_SA_EMAIL" \
  --role="roles/monitoring.metricWriter" \
  --quiet

# Artifact Registry (for pulling Docker images)
run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$STAGING_SA_EMAIL" \
  --role="roles/artifactregistry.reader" \
  --quiet

# =============================================================================
# Phase 3: Clone Production Boot Disk
# =============================================================================

log ""
log "=== Phase 3: Clone Production Boot Disk ==="

# 3.1 Snapshot production boot disk
log "Creating snapshot of production boot disk..."
run gcloud compute disks snapshot "$PROD_BOOT_DISK" \
  --project="$PROJECT_ID" \
  --zone="$PROD_ZONE" \
  --snapshot-names="$SNAPSHOT_NAME"

# 3.2 Create staging boot disk from snapshot
log "Creating staging boot disk from snapshot..."
run gcloud compute disks create "$STAGING_BOOT_DISK" \
  --project="$PROJECT_ID" \
  --zone="$STAGING_ZONE" \
  --source-snapshot="$SNAPSHOT_NAME"

# 3.3 Create staging state disk (fresh, empty)
log "Creating staging state disk..."
if gcloud compute disks describe "$STAGING_STATE_DISK" --project="$PROJECT_ID" --zone="$STAGING_ZONE" &>/dev/null; then
  log "State disk $STAGING_STATE_DISK already exists, skipping creation."
else
  run gcloud compute disks create "$STAGING_STATE_DISK" \
    --project="$PROJECT_ID" \
    --zone="$STAGING_ZONE" \
    --size="$STAGING_STATE_DISK_SIZE" \
    --type=pd-standard
fi

# =============================================================================
# Phase 4: Create Staging VM
# =============================================================================

log ""
log "=== Phase 4: Create Staging VM ==="

log "Creating staging VM: $STAGING_INSTANCE"
# Use least-privilege scopes (not broad cloud-platform)
# auto-delete=no prevents accidental data loss; delete disks manually (see Rollback in docs)
run gcloud compute instances create "$STAGING_INSTANCE" \
  --project="$PROJECT_ID" \
  --zone="$STAGING_ZONE" \
  --machine-type="$STAGING_MACHINE_TYPE" \
  --disk="name=$STAGING_BOOT_DISK,boot=yes,auto-delete=no" \
  --disk="name=$STAGING_STATE_DISK,auto-delete=no" \
  --service-account="$STAGING_SA_EMAIL" \
  --scopes="logging-write,monitoring-write,storage-ro" \
  --no-address \
  --network="$STAGING_NETWORK" \
  --subnet="$STAGING_SUBNET" \
  --tags="$STAGING_TAGS"

# =============================================================================
# Phase 5: Validate Security Posture (No External IP + IAP Works)
# =============================================================================

log ""
log "=== Phase 5: Validate Security Posture ==="

if [[ "$DRY_RUN" == "true" ]]; then
  log "[DRY-RUN] Would validate: no external IP + IAP SSH works"
else
  log "Waiting 30 seconds for VM to boot..."
  sleep 30

  # Check 1: Verify no external IP
  log "Checking VM has no external IP..."
  EXTERNAL_IP=$(gcloud compute instances describe "$STAGING_INSTANCE" \
    --project="$PROJECT_ID" \
    --zone="$STAGING_ZONE" \
    --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null || echo "")

  if [[ -n "$EXTERNAL_IP" ]]; then
    log "ERROR: VM has external IP $EXTERNAL_IP - this violates IAP-only requirement!"
    log "Delete the VM and recreate with --no-address flag."
    exit 1
  fi
  log "OK: No external IP assigned"

  # Check 2: Verify IAP SSH works
  log "Testing IAP SSH access..."
  if gcloud compute ssh "$STAGING_INSTANCE" \
    --project="$PROJECT_ID" \
    --zone="$STAGING_ZONE" \
    --tunnel-through-iap \
    --command="echo 'IAP SSH connection successful! Hostname: '\$(hostname)" \
    -- -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new; then
    log "OK: IAP SSH access validated"
  else
    log "ERROR: IAP SSH failed. Check:"
    log "  1. Firewall rule allows 35.235.240.0/20 -> tcp:22 for tag '$STAGING_TAGS'"
    log "  2. Your user has roles/iap.tunnelResourceAccessor"
    exit 1
  fi
fi

# =============================================================================
# Phase 6: Copy Scrub and Verify Scripts to VM
# =============================================================================

log ""
log "=== Phase 6: Copy Scripts to VM ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$DRY_RUN" == "true" ]]; then
  log "[DRY-RUN] Would copy scripts to VM:"
  log "  - $SCRIPT_DIR/staging-scrub.sh -> /tmp/staging-scrub.sh"
  log "  - $SCRIPT_DIR/staging-verify.sh -> /tmp/staging-verify.sh"
else
  # Copy scrub script
  if [[ -f "$SCRIPT_DIR/staging-scrub.sh" ]]; then
    log "Copying staging-scrub.sh to VM..."
    gcloud compute scp "$SCRIPT_DIR/staging-scrub.sh" \
      "$STAGING_INSTANCE:/tmp/staging-scrub.sh" \
      --project="$PROJECT_ID" \
      --zone="$STAGING_ZONE" \
      --tunnel-through-iap
    log "OK: staging-scrub.sh copied to /tmp/staging-scrub.sh"
  else
    log "WARN: staging-scrub.sh not found at $SCRIPT_DIR"
  fi

  # Copy verify script
  if [[ -f "$SCRIPT_DIR/staging-verify.sh" ]]; then
    log "Copying staging-verify.sh to VM..."
    gcloud compute scp "$SCRIPT_DIR/staging-verify.sh" \
      "$STAGING_INSTANCE:/tmp/staging-verify.sh" \
      --project="$PROJECT_ID" \
      --zone="$STAGING_ZONE" \
      --tunnel-through-iap
    log "OK: staging-verify.sh copied to /tmp/staging-verify.sh"
  else
    log "WARN: staging-verify.sh not found at $SCRIPT_DIR"
  fi
fi

# =============================================================================
# Summary
# =============================================================================

log ""
if [[ "$DRY_RUN" == "true" ]]; then
  log "=== Dry Run Summary ==="
  log "No resources were created (dry-run mode)."
  log ""
  log "The following resources WOULD be created:"
  log "  - Service Account: $STAGING_SA_EMAIL"
  log "  - Snapshot: $SNAPSHOT_NAME"
  log "  - Boot Disk: $STAGING_BOOT_DISK"
  log "  - State Disk: $STAGING_STATE_DISK"
  log "  - VM Instance: $STAGING_INSTANCE"
  log ""
  log "To actually create the staging VM, run without --dry-run:"
  log "  ./scripts/gcp/create-staging-vm.sh"
else
  log "=== Summary ==="
  log "Staging VM created successfully!"
  log ""
  log "Resources created:"
  log "  - Service Account: $STAGING_SA_EMAIL"
  log "  - Snapshot: $SNAPSHOT_NAME"
  log "  - Boot Disk: $STAGING_BOOT_DISK"
  log "  - State Disk: $STAGING_STATE_DISK"
  log "  - VM Instance: $STAGING_INSTANCE"
  log ""
  log "Next steps:"
  log "  1. SSH into the VM:"
  log "     gcloud compute ssh $STAGING_INSTANCE --project=$PROJECT_ID --zone=$STAGING_ZONE --tunnel-through-iap"
  log "  2. Run the scrub script (already copied to VM):"
  log "     sudo bash /tmp/staging-scrub.sh"
  log "  3. Complete manual secret configuration (see docs/deployments/staging-setup.md)"
  log "  4. Run verification (already copied to VM):"
  log "     bash /tmp/staging-verify.sh"
  log ""
  log "To delete staging resources (rollback):"
  log "  gcloud compute instances delete $STAGING_INSTANCE --project=$PROJECT_ID --zone=$STAGING_ZONE --quiet"
  log "  gcloud compute disks delete $STAGING_BOOT_DISK $STAGING_STATE_DISK --project=$PROJECT_ID --zone=$STAGING_ZONE --quiet"
  log "  gcloud compute snapshots delete $SNAPSHOT_NAME --project=$PROJECT_ID --quiet"
fi
