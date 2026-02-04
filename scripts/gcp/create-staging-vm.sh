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
#   ./scripts/gcp/create-staging-vm.sh [--dry-run]
#
# Prerequisites:
#   - gcloud CLI authenticated with appropriate permissions
#   - Project set: gcloud config set project <PROJECT_ID>
#
set -euo pipefail

# =============================================================================
# Configuration (discovered from production)
# =============================================================================

PROJECT_ID="amiable-raceway-472818-m5"
PROD_ZONE="us-west1-b"
PROD_BOOT_DISK="clawdbot-gw-1"  # Boot disk name (kept from original VM)

# Staging configuration
STAGING_INSTANCE="daisy-staging-1"
STAGING_ZONE="us-west1-b"  # Same zone for simplicity; change if needed
STAGING_MACHINE_TYPE="n2-standard-8"  # Match prod (n2 used due to e2 capacity issues)
STAGING_BOOT_DISK="daisy-staging-boot"
STAGING_STATE_DISK="daisy-staging-state"
STAGING_STATE_DISK_SIZE="50GB"
STAGING_SA_NAME="daisy-staging-sa"
STAGING_SA_EMAIL="${STAGING_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
STAGING_NETWORK="default"
STAGING_SUBNET="default"
STAGING_TAGS="iap-ssh"

# Snapshot naming
SNAPSHOT_NAME="daisy-staging-snapshot-$(date +%Y%m%d-%H%M%S)"

# =============================================================================
# Parse arguments
# =============================================================================

DRY_RUN=false
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
  esac
done

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

# Verify project is set
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
  log "Setting project to $PROJECT_ID..."
  run gcloud config set project "$PROJECT_ID"
fi

# Check if staging instance already exists
if gcloud compute instances describe "$STAGING_INSTANCE" --zone="$STAGING_ZONE" &>/dev/null; then
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

if gcloud iam service-accounts describe "$STAGING_SA_EMAIL" &>/dev/null; then
  log "Service account $STAGING_SA_EMAIL already exists, skipping creation."
else
  log "Creating service account: $STAGING_SA_NAME"
  run gcloud iam service-accounts create "$STAGING_SA_NAME" \
    --project="$PROJECT_ID" \
    --display-name="DAISy Staging VM Service Account"

  log "Granting roles to service account..."

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
fi

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
if gcloud compute disks describe "$STAGING_STATE_DISK" --zone="$STAGING_ZONE" &>/dev/null; then
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
run gcloud compute instances create "$STAGING_INSTANCE" \
  --project="$PROJECT_ID" \
  --zone="$STAGING_ZONE" \
  --machine-type="$STAGING_MACHINE_TYPE" \
  --disk="name=$STAGING_BOOT_DISK,boot=yes,auto-delete=no" \
  --disk="name=$STAGING_STATE_DISK,auto-delete=no" \
  --service-account="$STAGING_SA_EMAIL" \
  --scopes="https://www.googleapis.com/auth/cloud-platform" \
  --no-address \
  --network="$STAGING_NETWORK" \
  --subnet="$STAGING_SUBNET" \
  --tags="$STAGING_TAGS"

# =============================================================================
# Phase 5: Validate IAP SSH Access
# =============================================================================

log ""
log "=== Phase 5: Validate IAP SSH Access ==="

if [[ "$DRY_RUN" == "true" ]]; then
  log "[DRY-RUN] Would test IAP SSH access to $STAGING_INSTANCE"
else
  log "Waiting 30 seconds for VM to boot..."
  sleep 30

  log "Testing IAP SSH access..."
  if gcloud compute ssh "$STAGING_INSTANCE" \
    --project="$PROJECT_ID" \
    --zone="$STAGING_ZONE" \
    --tunnel-through-iap \
    --command="echo 'IAP SSH connection successful! Hostname: '\$(hostname)" \
    -- -o ConnectTimeout=30 -o StrictHostKeyChecking=no; then
    log "IAP SSH access validated successfully!"
  else
    log "WARNING: IAP SSH test failed. Check IAP configuration and IAM permissions."
    log "You may need to grant roles/iap.tunnelResourceAccessor to your user."
  fi
fi

# =============================================================================
# Summary
# =============================================================================

log ""
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
log "     gcloud compute ssh $STAGING_INSTANCE --zone=$STAGING_ZONE --tunnel-through-iap"
log "  2. Copy and run the scrub script on the VM:"
log "     sudo bash /tmp/staging-scrub.sh"
log "  3. Complete manual secret configuration (see docs/deployments/staging-setup.md)"
log "  4. Run verification:"
log "     bash /tmp/staging-verify.sh"
log ""
log "To delete staging resources (rollback):"
log "  gcloud compute instances delete $STAGING_INSTANCE --zone=$STAGING_ZONE --quiet"
log "  gcloud compute disks delete $STAGING_BOOT_DISK $STAGING_STATE_DISK --zone=$STAGING_ZONE --quiet"
log "  gcloud compute snapshots delete $SNAPSHOT_NAME --quiet"
