#!/usr/bin/env bash
# DAISy Monitoring Stack Deployment Script
# Deploys the full monitoring suite to the GCP VM
#
# Prerequisites:
#   - SSH access via IAP to the target VM
#   - Docker and docker-compose v2 installed
#   - Root access (for Falco, AIDE, auditd, systemd)
#
# Usage:
#   ./monitoring/deploy-monitoring.sh [staging|production]
#
# This script:
#   1. Copies monitoring configs to the VM
#   2. Installs host-level tools (Falco, AIDE, auditd)
#   3. Starts the monitoring Docker Compose stack
#   4. Runs the anti-tampering setup
#   5. Verifies all components are operational
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-staging}"
DEPLOY_DIR="/opt/DAISy/monitoring"

# GCP configuration — these must be set in CI (passed from deploy.yml env vars)
: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
GCP_ZONE="${GCP_ZONE:-us-central1-a}"

case "${ENVIRONMENT}" in
    staging)
        VM_NAME="${GCE_INSTANCE_NAME:-daisy-staging-1}"
        ;;
    production)
        VM_NAME="${GCE_INSTANCE_NAME:-daisy-production-1}"
        ;;
    *)
        echo "Usage: $0 [staging|production]"
        exit 1
        ;;
esac

# ─── Port configuration ───
# Sourced from GitHub environment variables (${{ vars.OPENCLAW_GATEWAY_PORT }})
# via deploy.yml → deploy.sh → this script's environment
: "${OPENCLAW_GATEWAY_PORT:?OPENCLAW_GATEWAY_PORT is required (set in GitHub environment variables)}"
OPENCLAW_BRIDGE_PORT="${OPENCLAW_BRIDGE_PORT:-$((OPENCLAW_GATEWAY_PORT + 1))}"

echo "═══════════════════════════════════════════════════════════"
echo "DAISy Monitoring Deployment"
echo "  Environment: ${ENVIRONMENT}"
echo "  VM: ${VM_NAME}"
echo "  Zone: ${GCP_ZONE}"
echo "  Gateway Port: ${OPENCLAW_GATEWAY_PORT}"
echo "  Bridge Port:  ${OPENCLAW_BRIDGE_PORT}"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Helper: run command on VM via IAP SSH
vm_exec() {
    gcloud compute ssh "${VM_NAME}" \
        --project="${GCP_PROJECT_ID}" \
        --zone="${GCP_ZONE}" \
        --tunnel-through-iap \
        --quiet \
        --command="$1"
}

# ─── Step 1: Template and copy monitoring configs to VM ───
echo "▸ Step 1: Templating configs with port ${OPENCLAW_GATEWAY_PORT} and copying to VM..."

# Template port placeholders in config files before copying
# Configs use __OPENCLAW_GATEWAY_PORT__ and __OPENCLAW_BRIDGE_PORT__ as placeholders
TEMPLATE_DIR=$(mktemp -d)
cp -r "${SCRIPT_DIR}/." "${TEMPLATE_DIR}/"

# Replace placeholders with actual port values
find "${TEMPLATE_DIR}" -type f \( -name "*.yml" -o -name "*.yaml" -o -name "*.json" \) \
    -exec sed -i "s/__OPENCLAW_GATEWAY_PORT__/${OPENCLAW_GATEWAY_PORT}/g" {} \;
find "${TEMPLATE_DIR}" -type f \( -name "*.yml" -o -name "*.yaml" -o -name "*.json" \) \
    -exec sed -i "s/__OPENCLAW_BRIDGE_PORT__/${OPENCLAW_BRIDGE_PORT}/g" {} \;

# Stream templated configs to VM via tar|ssh (avoids scp --recurse nesting issues)
vm_exec "sudo mkdir -p ${DEPLOY_DIR} && sudo chown \$(whoami):\$(whoami) ${DEPLOY_DIR}"
tar -C "${TEMPLATE_DIR}" -czf - . | \
    gcloud compute ssh "${VM_NAME}" \
        --project="${GCP_PROJECT_ID}" \
        --zone="${GCP_ZONE}" \
        --tunnel-through-iap \
        --quiet \
        --command="tar -C ${DEPLOY_DIR} -xzf -"

# Clean up temp dir
rm -rf "${TEMPLATE_DIR}"
echo "  ✓ Configs templated and copied"

# Copy .env if it exists
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
    gcloud compute scp \
        "${SCRIPT_DIR}/.env" \
        "${VM_NAME}:${DEPLOY_DIR}/.env" \
        --project="${GCP_PROJECT_ID}" \
        --zone="${GCP_ZONE}" \
        --tunnel-through-iap \
        --quiet
    echo "  ✓ .env copied"
else
    echo "  ⚠ No .env file found — using defaults"
fi

# ─── Step 2: Install host-level tools ───
echo ""
echo "▸ Step 2: Installing host-level monitoring tools..."

vm_exec "sudo bash -c '
    set -e

    # Update package lists
    apt-get update -qq

    # Install AIDE (File Integrity Monitoring)
    if ! command -v aide &>/dev/null; then
        apt-get install -y -qq aide aide-common
        echo \"  ✓ AIDE installed\"
    else
        echo \"  ✓ AIDE already installed\"
    fi

    # Install auditd (System audit framework)
    if ! command -v auditctl &>/dev/null; then
        apt-get install -y -qq auditd audispd-plugins
        echo \"  ✓ auditd installed\"
    else
        echo \"  ✓ auditd already installed\"
    fi

    # Install conntrack (Network connection tracking)
    if ! command -v conntrack &>/dev/null; then
        apt-get install -y -qq conntrack
        echo \"  ✓ conntrack installed\"
    else
        echo \"  ✓ conntrack already installed\"
    fi

    # Install Falco (Runtime security)
    if ! command -v falco &>/dev/null; then
        curl -fsSL https://falco.org/repo/falcosecurity-packages.asc | gpg --dearmor -o /usr/share/keyrings/falco-archive-keyring.gpg
        echo \"deb [signed-by=/usr/share/keyrings/falco-archive-keyring.gpg] https://download.falco.org/packages/deb stable main\" > /etc/apt/sources.list.d/falcosecurity.list
        apt-get update -qq
        FALCO_FRONTEND=noninteractive apt-get install -y -qq falco
        echo \"  ✓ Falco installed\"
    else
        echo \"  ✓ Falco already installed\"
    fi

    # Install Python dependencies for watchdog
    pip3 install --quiet pyyaml 2>/dev/null || apt-get install -y -qq python3-yaml

    # Install AppArmor utils
    if ! command -v aa-status &>/dev/null; then
        apt-get install -y -qq apparmor apparmor-utils
        echo \"  ✓ AppArmor installed\"
    else
        echo \"  ✓ AppArmor already installed\"
    fi
'"

# ─── Step 3: Configure Falco ───
echo ""
echo "▸ Step 3: Configuring Falco..."

vm_exec "sudo bash -c '
    # Create Falco log directory
    mkdir -p /var/log/falco

    # Copy custom Falco config
    cp ${DEPLOY_DIR}/falco/falco.yaml /etc/falco/falco.yaml

    # Copy custom rules
    mkdir -p /opt/DAISy/monitoring/falco/rules
    cp ${DEPLOY_DIR}/falco/rules/daisy-agent-rules.yaml /opt/DAISy/monitoring/falco/rules/

    # Enable and start Falco
    systemctl enable falco
    systemctl restart falco
    echo \"  ✓ Falco configured and started\"
'"

# ─── Step 4: Start monitoring Docker Compose stack ───
echo ""
echo "▸ Step 4: Starting monitoring Docker Compose stack..."

vm_exec "sudo bash -c '
    cd ${DEPLOY_DIR}

    # Pull latest images
    docker compose -f docker-compose.monitoring.yml pull --quiet

    # Start the stack
    docker compose -f docker-compose.monitoring.yml up -d --remove-orphans

    echo \"  ✓ Monitoring stack started\"
'"

# ─── Step 5: Run anti-tampering setup ───
echo ""
echo "▸ Step 5: Running anti-tampering setup..."

vm_exec "sudo bash ${DEPLOY_DIR}/setup-permissions.sh"

# ─── Step 6: Verify deployment ───
echo ""
echo "▸ Step 6: Verifying deployment..."
echo ""

vm_exec "sudo bash -c '
    echo \"── Service Status ──\"

    # Check Docker monitoring containers
    for svc in daisy-prometheus daisy-loki daisy-grafana daisy-alertmanager daisy-cadvisor daisy-node-exporter daisy-promtail; do
        status=\$(docker inspect --format=\"{{.State.Health.Status}}\" \"\${svc}\" 2>/dev/null || docker inspect --format=\"{{.State.Status}}\" \"\${svc}\" 2>/dev/null || echo \"not found\")
        if [[ \"\${status}\" == \"running\" ]] || [[ \"\${status}\" == \"healthy\" ]]; then
            echo \"  ✓ \${svc}: \${status}\"
        else
            echo \"  ✗ \${svc}: \${status}\"
        fi
    done

    # Check host services
    for svc in falco daisy-watchdog daisy-conntrack-logger; do
        if systemctl is-active --quiet \"\${svc}\" 2>/dev/null; then
            echo \"  ✓ \${svc}: active\"
        else
            echo \"  ✗ \${svc}: inactive\"
        fi
    done

    # Check AIDE timer
    if systemctl is-active --quiet daisy-aide-check.timer 2>/dev/null; then
        echo \"  ✓ daisy-aide-check.timer: active\"
    else
        echo \"  ✗ daisy-aide-check.timer: inactive\"
    fi

    echo \"\"
    echo \"── Endpoint Tests ──\"

    # Test Prometheus
    if curl -sf http://127.0.0.1:9090/-/healthy > /dev/null 2>&1; then
        echo \"  ✓ Prometheus: healthy\"
    else
        echo \"  ✗ Prometheus: unreachable\"
    fi

    # Test Loki
    if curl -sf http://127.0.0.1:3100/ready > /dev/null 2>&1; then
        echo \"  ✓ Loki: ready\"
    else
        echo \"  ✗ Loki: unreachable\"
    fi

    # Test Grafana
    if curl -sf http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
        echo \"  ✓ Grafana: healthy\"
    else
        echo \"  ✗ Grafana: unreachable\"
    fi

    # Test Alertmanager
    if curl -sf http://127.0.0.1:9093/-/healthy > /dev/null 2>&1; then
        echo \"  ✓ Alertmanager: healthy\"
    else
        echo \"  ✗ Alertmanager: unreachable\"
    fi

    echo \"\"
    echo \"── Anti-Tampering ──\"

    # Check immutable files
    immutable_count=\$(lsattr ${DEPLOY_DIR}/prometheus/prometheus.yml 2>/dev/null | grep -c \"i\" || echo \"0\")
    if [[ \"\${immutable_count}\" -gt 0 ]]; then
        echo \"  ✓ Config files are immutable (chattr +i)\"
    else
        echo \"  ✗ Config files NOT immutable\"
    fi

    # Check audit log append-only
    append_only=\$(lsattr /var/log/daisy-watchdog/audit.log 2>/dev/null | grep -c \"a\" || echo \"0\")
    if [[ \"\${append_only}\" -gt 0 ]]; then
        echo \"  ✓ Audit log is append-only (chattr +a)\"
    else
        echo \"  ✗ Audit log NOT append-only\"
    fi

    # Check AppArmor profile
    if aa-status 2>/dev/null | grep -q \"openclaw-container\"; then
        echo \"  ✓ AppArmor profile loaded\"
    else
        echo \"  ✗ AppArmor profile not loaded\"
    fi

    echo \"\"
    echo \"Deployment complete! Access Grafana via IAP tunnel:\"
    echo \"  gcloud compute ssh ${VM_NAME} --project=${GCP_PROJECT_ID} --zone=${GCP_ZONE} --tunnel-through-iap -- -L 3000:127.0.0.1:3000\"
    echo \"  Then open http://localhost:3000\"
'"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✓ Monitoring stack deployed to ${VM_NAME}"
echo "═══════════════════════════════════════════════════════════"
