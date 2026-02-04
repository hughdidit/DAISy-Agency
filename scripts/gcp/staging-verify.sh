#!/usr/bin/env bash
#
# staging-verify.sh
#
# Post-scrub verification script for staging VM.
# Run this ON THE STAGING VM after the scrub and manual secret configuration
# to verify the staging environment is properly configured.
#
# Usage (on the staging VM):
#   bash staging-verify.sh
#
set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

STATE_MOUNT="/var/lib/daisy"
CLAWDBOT_HOME="/var/lib/clawdbot/home"
CONFIG_DIR="$CLAWDBOT_HOME/.clawdbot"
WORKSPACE_DIR="$CLAWDBOT_HOME/clawd"
DEPLOY_DIR="/var/lib/clawdbot"

# =============================================================================
# Helper functions
# =============================================================================

PASS=0
FAIL=0
WARN=0

check_pass() {
  echo "  [PASS] $1"
  ((PASS++))
}

check_fail() {
  echo "  [FAIL] $1"
  ((FAIL++))
}

check_warn() {
  echo "  [WARN] $1"
  ((WARN++))
}

# =============================================================================
# Verification Checks
# =============================================================================

echo "=== Staging VM Verification ==="
echo ""

# -----------------------------------------------------------------------------
# Check 1: Hostname
# -----------------------------------------------------------------------------
echo "Checking hostname..."
HOSTNAME=$(hostname)
if [[ "$HOSTNAME" == *"staging"* ]]; then
  check_pass "Hostname is '$HOSTNAME'"
else
  check_fail "Hostname '$HOSTNAME' does not contain 'staging'"
fi

# -----------------------------------------------------------------------------
# Check 2: No external IP
# -----------------------------------------------------------------------------
echo "Checking external IP access..."
if curl -sf --connect-timeout 5 ifconfig.me &>/dev/null; then
  check_fail "External IP is reachable (VM may have public IP)"
else
  check_pass "No external IP access (IAP-only)"
fi

# -----------------------------------------------------------------------------
# Check 3: State disk mounted
# -----------------------------------------------------------------------------
echo "Checking state disk mount..."
if mountpoint -q "$STATE_MOUNT"; then
  check_pass "State disk mounted at $STATE_MOUNT"
else
  check_fail "State disk NOT mounted at $STATE_MOUNT"
fi

# -----------------------------------------------------------------------------
# Check 4: Config bind mount
# -----------------------------------------------------------------------------
echo "Checking config bind mount..."
if mountpoint -q "$CONFIG_DIR"; then
  check_pass "Config bind mount at $CONFIG_DIR"
else
  check_fail "Config bind mount MISSING at $CONFIG_DIR"
fi

# -----------------------------------------------------------------------------
# Check 5: Workspace bind mount
# -----------------------------------------------------------------------------
echo "Checking workspace bind mount..."
if mountpoint -q "$WORKSPACE_DIR"; then
  check_pass "Workspace bind mount at $WORKSPACE_DIR"
else
  check_fail "Workspace bind mount MISSING at $WORKSPACE_DIR"
fi

# -----------------------------------------------------------------------------
# Check 6: State directories are clean (no prod data)
# -----------------------------------------------------------------------------
echo "Checking state directories..."

CONFIG_COUNT=$(find "$STATE_MOUNT/config" -type f 2>/dev/null | wc -l)
if [[ "$CONFIG_COUNT" -eq 0 ]]; then
  check_pass "Config directory is empty (no production data)"
else
  check_warn "Config directory has $CONFIG_COUNT files (expected after staging setup)"
fi

WORKSPACE_COUNT=$(find "$STATE_MOUNT/workspace" -type f 2>/dev/null | wc -l)
if [[ "$WORKSPACE_COUNT" -eq 0 ]]; then
  check_pass "Workspace directory is empty"
else
  check_warn "Workspace directory has $WORKSPACE_COUNT files"
fi

# -----------------------------------------------------------------------------
# Check 7: Environment marker
# -----------------------------------------------------------------------------
echo "Checking environment marker..."
if [[ -f /etc/environment.d/staging.conf ]]; then
  if grep -q "DAISY_ENVIRONMENT=staging" /etc/environment.d/staging.conf; then
    check_pass "Staging environment marker present"
  else
    check_warn "Environment marker file exists but missing DAISY_ENVIRONMENT"
  fi
else
  check_fail "Staging environment marker file missing"
fi

# -----------------------------------------------------------------------------
# Check 8: .env file exists (staging secrets configured)
# -----------------------------------------------------------------------------
echo "Checking deployment configuration..."
if [[ -f "$DEPLOY_DIR/.env" ]]; then
  check_pass ".env file exists at $DEPLOY_DIR/.env"

  # Check for key variables (without revealing values)
  if grep -q "CLAWDBOT_GATEWAY_TOKEN" "$DEPLOY_DIR/.env"; then
    check_pass "CLAWDBOT_GATEWAY_TOKEN is configured"
  else
    check_warn "CLAWDBOT_GATEWAY_TOKEN not found in .env"
  fi
else
  check_warn ".env file not found - staging secrets not yet configured"
fi

# -----------------------------------------------------------------------------
# Check 9: Docker running
# -----------------------------------------------------------------------------
echo "Checking Docker..."
if command -v docker &>/dev/null; then
  check_pass "Docker is installed"

  if docker ps &>/dev/null; then
    check_pass "Docker daemon is running"

    if docker ps | grep -q moltbot; then
      check_pass "Moltbot container is running"
    else
      check_warn "Moltbot container is not running (expected before first deploy)"
    fi
  else
    check_fail "Docker daemon is not running or not accessible"
  fi
else
  check_fail "Docker is not installed"
fi

# -----------------------------------------------------------------------------
# Check 10: Health check (if container running)
# -----------------------------------------------------------------------------
echo "Checking gateway health..."
if docker ps 2>/dev/null | grep -q moltbot-gateway; then
  if docker exec moltbot-gateway pnpm clawdbot health &>/dev/null; then
    check_pass "Gateway health check passed"
  else
    check_fail "Gateway health check failed"
  fi
else
  check_warn "Gateway container not running - skipping health check"
fi

# -----------------------------------------------------------------------------
# Check 11: No production credentials
# -----------------------------------------------------------------------------
echo "Checking for lingering production credentials..."

PROD_CREDS_FOUND=0

# Check for gcloud credentials
if [[ -d /root/.config/gcloud ]] || [[ -d /home/node/.config/gcloud ]]; then
  check_warn "gcloud credentials directory found (may need cleanup)"
  ((PROD_CREDS_FOUND++))
fi

# Check for production hostname references in .env
if [[ -f "$DEPLOY_DIR/.env" ]] && grep -qi "clawdbot-gw-1\|production" "$DEPLOY_DIR/.env" 2>/dev/null; then
  check_warn ".env may contain production references"
  ((PROD_CREDS_FOUND++))
fi

if [[ "$PROD_CREDS_FOUND" -eq 0 ]]; then
  check_pass "No obvious production credential artifacts found"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "=== Verification Summary ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "  Warnings: $WARN"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo "RESULT: FAILED - $FAIL critical checks failed"
  exit 1
elif [[ "$WARN" -gt 0 ]]; then
  echo "RESULT: PASSED with warnings"
  exit 0
else
  echo "RESULT: ALL CHECKS PASSED"
  exit 0
fi
