#!/usr/bin/env python3
"""
DAISy Watchdog — Host-level process monitor, audit logger, and anomaly detector.

Runs as a systemd service OUTSIDE Docker containers. Provides:
1. Process tree monitoring inside all DAISy containers
2. Executable allowlist enforcement
3. Tool invocation audit trail from OpenClaw structured logs
4. Container lifecycle event tracking
5. Rate limiting detection (runaway agent loops)
6. Immutable append-only audit log

Install:
    sudo cp daisy-watchdog.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable --now daisy-watchdog

Logs to: /var/log/daisy-watchdog/audit.log (append-only via chattr +a)
"""

import json
import os
import re
import signal
import subprocess
import sys
import threading
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml  # pip install pyyaml

# ═══════════════════════════════════════════════════════════
# Secret Redaction
# ═══════════════════════════════════════════════════════════

# Centralized redaction applied to ALL output before logging or notification
_REDACT_PATTERN = re.compile(
    r"(sk-ant-[a-zA-Z0-9_-]{10,}|"        # Anthropic API keys
    r"ghp_[a-zA-Z0-9]{30,}|"               # GitHub PATs
    r"gho_[a-zA-Z0-9]{30,}|"               # GitHub OAuth
    r"xoxb-[a-zA-Z0-9-]{30,}|"             # Slack bot tokens
    r"xoxp-[a-zA-Z0-9-]{30,}|"             # Slack user tokens
    r"sk-[a-zA-Z0-9]{20,}|"                # OpenAI keys
    r"Bearer\s+[a-zA-Z0-9._-]{20,}|"       # Bearer tokens
    r"eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}|"  # JWTs
    r"AKIA[A-Z0-9]{16}|"                   # AWS access keys
    r"[a-zA-Z0-9_-]*(?:password|passwd|secret|token|api[_-]?key|"
    r"credential|auth[_-]?key|private[_-]?key|session[_-]?key|"
    r"webhook[_-]?url|service[_-]?key)\s*[=:]\s*\S+)",
    re.IGNORECASE,
)


def redact_secrets(text: str) -> str:
    """Redact any secret/credential patterns from a string before logging."""
    if not text:
        return text
    return _REDACT_PATTERN.sub("[REDACTED]", text)


# ═══════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════

CONFIG_DIR = Path(os.environ.get("WATCHDOG_CONFIG_DIR", "/opt/DAISy/monitoring/watchdog"))
LOG_DIR = Path(os.environ.get("WATCHDOG_LOG_DIR", "/var/log/daisy-watchdog"))
OPENCLAW_LOG_DIR = Path(os.environ.get("OPENCLAW_LOG_DIR", "/tmp/openclaw"))

PROCESS_SCAN_INTERVAL = 5  # seconds
TOOL_RATE_LIMIT = 50  # max tool invocations per agent per minute
CONTAINER_NAME_PATTERNS = ["openclaw", "sandbox"]
NTFY_TOPIC = os.environ.get("NTFY_TOPIC", "")
NTFY_URL = f"https://ntfy.sh/{NTFY_TOPIC}" if NTFY_TOPIC else ""

# Load process allowlist
ALLOWLIST_FILE = CONFIG_DIR / "process-allowlist.yml"


def load_allowlist() -> dict:
    """Load the process allowlist from YAML config."""
    if ALLOWLIST_FILE.exists():
        with open(ALLOWLIST_FILE, "r") as f:
            return yaml.safe_load(f) or {}
    return {"allowed_processes": [], "allowed_parents": []}


# ═══════════════════════════════════════════════════════════
# Logging
# ═══════════════════════════════════════════════════════════

class AuditLogger:
    """Structured JSON audit logger with append-only file."""

    def __init__(self, log_dir: Path):
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.audit_file = self.log_dir / "audit.log"
        self.alert_file = self.log_dir / "alerts.log"

    def log(self, event_type: str, severity: str, data: dict[str, Any]):
        """Write a structured JSON log line."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "severity": severity,
            **data,
        }
        line = json.dumps(entry, separators=(",", ":")) + "\n"

        # Write to audit log (append-only)
        with open(self.audit_file, "a") as f:
            f.write(line)

        # Also write warnings+ to alerts log for Promtail
        if severity in ("warning", "critical"):
            with open(self.alert_file, "a") as f:
                f.write(line)

        # Print to stdout for systemd journal
        print(line.rstrip(), flush=True)

        # Send ntfy notification for critical events
        if severity == "critical" and NTFY_URL:
            self._send_ntfy(event_type, data)

    def _send_ntfy(self, event_type: str, data: dict):
        """Send push notification via ntfy.sh. All content is redacted."""
        try:
            msg = redact_secrets(f"{event_type}: {json.dumps(data, default=str)[:200]}")
            subprocess.run(
                [
                    "curl", "-s", "-o", "/dev/null",
                    "-H", "Title: 🚨 DAISy Watchdog Alert",
                    "-H", "Priority: urgent",
                    "-H", "Tags: rotating_light,robot",
                    "-d", msg,
                    NTFY_URL,
                ],
                timeout=5,
                capture_output=True,
            )
        except Exception:
            pass  # Don't let notification failure break monitoring


logger = AuditLogger(LOG_DIR)


# ═══════════════════════════════════════════════════════════
# Container Discovery
# ═══════════════════════════════════════════════════════════

def get_daisy_containers() -> list[dict]:
    """List running Docker containers matching DAISy patterns."""
    try:
        result = subprocess.run(
            [
                "docker", "ps", "--format",
                '{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}","status":"{{.Status}}"}',
            ],
            capture_output=True, text=True, timeout=10,
        )
        containers = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            try:
                c = json.loads(line)
                if any(p in c["name"].lower() for p in CONTAINER_NAME_PATTERNS):
                    containers.append(c)
            except json.JSONDecodeError:
                continue
        return containers
    except Exception as e:
        logger.log("error", "warning", {"message": f"Failed to list containers: {e}"})
        return []


# ═══════════════════════════════════════════════════════════
# Process Monitor
# ═══════════════════════════════════════════════════════════

class ProcessMonitor:
    """Monitors processes inside DAISy containers against an allowlist."""

    def __init__(self):
        self.allowlist = load_allowlist()
        self.allowed_procs = set(self.allowlist.get("allowed_processes", []))
        self.allowed_parents = set(self.allowlist.get("allowed_parents", []))
        self.seen_violations: dict[str, float] = {}  # dedup key -> timestamp
        self.violation_cooldown = 300  # 5 min cooldown per unique violation

    def scan_container(self, container: dict):
        """Scan all processes in a container and check against allowlist."""
        try:
            result = subprocess.run(
                ["docker", "top", container["id"], "-eo", "pid,ppid,user,comm,args"],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode != 0:
                return

            lines = result.stdout.strip().split("\n")
            if len(lines) < 2:
                return

            # Parse process table (skip header)
            for line in lines[1:]:
                parts = line.split(None, 4)
                if len(parts) < 4:
                    continue

                pid, ppid, user, comm = parts[0], parts[1], parts[2], parts[3]
                args = redact_secrets(parts[4]) if len(parts) > 4 else ""

                # Check against allowlist
                if comm not in self.allowed_procs and not any(
                    comm.startswith(p) for p in self.allowed_parents
                ):
                    dedup_key = f"{container['name']}:{comm}"
                    now = time.time()

                    # Dedup: only alert once per violation per cooldown
                    if dedup_key not in self.seen_violations or (
                        now - self.seen_violations[dedup_key] > self.violation_cooldown
                    ):
                        self.seen_violations[dedup_key] = now
                        logger.log(
                            "unexpected_process",
                            "warning",
                            {
                                "container": container["name"],
                                "process": comm,
                                "pid": pid,
                                "ppid": ppid,
                                "user": user,
                                "args": args[:500],  # truncate long args
                            },
                        )

                # Check for root processes (agent should be uid 1000)
                if user == "root" and comm not in ("tini", "docker-init", "pause"):
                    logger.log(
                        "root_process",
                        "critical",
                        {
                            "container": container["name"],
                            "process": comm,
                            "pid": pid,
                            "user": user,
                            "args": args[:500],
                        },
                    )

        except subprocess.TimeoutExpired:
            logger.log("scan_timeout", "warning", {"container": container["name"]})
        except Exception as e:
            logger.log("scan_error", "warning", {
                "container": container["name"],
                "error": str(e),
            })


# ═══════════════════════════════════════════════════════════
# Tool Invocation Auditor
# ═══════════════════════════════════════════════════════════

class ToolAuditor:
    """Tails OpenClaw structured logs and audits tool invocations."""

    def __init__(self):
        self.tool_counts: dict[str, list[float]] = defaultdict(list)  # agent_id -> timestamps
        self.file_positions: dict[str, int] = {}  # file -> byte offset

    def scan_logs(self):
        """Scan OpenClaw log files for new tool invocations."""
        if not OPENCLAW_LOG_DIR.exists():
            return

        for log_file in OPENCLAW_LOG_DIR.glob("openclaw-*.log"):
            self._tail_file(log_file)

    def _tail_file(self, path: Path):
        """Read new lines from a log file since last scan."""
        str_path = str(path)
        last_pos = self.file_positions.get(str_path, 0)

        try:
            with open(path, "r") as f:
                f.seek(last_pos)
                for line in f:
                    self._process_line(line.strip())
                self.file_positions[str_path] = f.tell()
        except Exception:
            pass

    def _process_line(self, line: str):
        """Process a single JSON log line."""
        if not line:
            return
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            return

        # Look for tool invocation events
        tool = entry.get("tool") or entry.get("toolName")
        if not tool:
            return

        agent_id = entry.get("agentId", "unknown")
        session = entry.get("sessionKey", "unknown")
        command = entry.get("command", "")
        args = entry.get("args", entry.get("input", ""))

        # Redact credentials from both command and arguments
        command = redact_secrets(str(command))
        if isinstance(args, str):
            args = redact_secrets(args)
        elif isinstance(args, dict):
            args = redact_secrets(json.dumps(args, default=str)[:500])

        # Log the tool invocation
        logger.log(
            "tool_invocation",
            "info",
            {
                "agent_id": agent_id,
                "session": session[:8] + "..." if len(session) > 8 else session,
                "tool": tool,
                "command": command[:200],
                "args_preview": args[:200],
            },
        )

        # Rate limiting check
        now = time.time()
        self.tool_counts[agent_id].append(now)

        # Keep only last 60 seconds of invocations
        self.tool_counts[agent_id] = [
            t for t in self.tool_counts[agent_id] if now - t < 60
        ]

        if len(self.tool_counts[agent_id]) > TOOL_RATE_LIMIT:
            logger.log(
                "tool_rate_limit_exceeded",
                "critical",
                {
                    "agent_id": agent_id,
                    "count_per_minute": len(self.tool_counts[agent_id]),
                    "limit": TOOL_RATE_LIMIT,
                    "latest_tool": tool,
                },
            )

        # Check for suspicious tool patterns
        self._check_suspicious(tool, command, args, agent_id)

    def _check_suspicious(self, tool: str, command: str, args: str, agent_id: str):
        """Check for suspicious tool usage patterns.

        NOTE: command and args are already redacted by _process_line before
        reaching this method, so logged output is safe.
        """
        combined = f"{command} {args}".lower()

        # Detection patterns for suspicious behavior
        suspicious_patterns = {
            "credential_in_message": r"(sk-ant-|api[_-]?key|password|secret|token)\s*[:=]",
            "base64_large_payload": r"[A-Za-z0-9+/]{100,}={0,2}",
            "curl_to_exfil_service": r"curl.*(pastebin|transfer\.sh|ngrok|webhook\.site)",
            "reverse_shell_pattern": r"(\/dev\/tcp|nc\s+-e|ncat|socat\s+exec)",
            "docker_socket_access": r"docker\.(sock|socket)|/var/run/docker",
        }

        for pattern_name, regex in suspicious_patterns.items():
            if re.search(regex, combined, re.IGNORECASE):
                # Redact again as defense-in-depth before logging
                logger.log(
                    f"suspicious_{pattern_name}",
                    "critical",
                    {
                        "agent_id": agent_id,
                        "tool": tool,
                        "pattern": pattern_name,
                        "command_preview": redact_secrets(combined[:200]),
                    },
                )


# ═══════════════════════════════════════════════════════════
# Container Lifecycle Monitor
# ═══════════════════════════════════════════════════════════

class ContainerLifecycleMonitor:
    """Monitors Docker events for container lifecycle changes."""

    def __init__(self):
        self.process: subprocess.Popen | None = None

    def start(self):
        """Start monitoring Docker events in a background thread."""
        thread = threading.Thread(target=self._monitor, daemon=True)
        thread.start()

    def _monitor(self):
        """Watch Docker events stream."""
        while True:
            try:
                self.process = subprocess.Popen(
                    [
                        "docker", "events",
                        "--filter", "type=container",
                        "--format", '{"time":"{{.Time}}","action":"{{.Action}}","name":"{{.Actor.Attributes.name}}","image":"{{.Actor.Attributes.image}}"}',
                    ],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )

                for line in self.process.stdout:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        event = json.loads(line)
                        self._handle_event(event)
                    except json.JSONDecodeError:
                        continue

            except Exception as e:
                logger.log("docker_events_error", "warning", {"error": str(e)})
                time.sleep(5)  # Retry after brief pause

    def _handle_event(self, event: dict):
        """Process a Docker lifecycle event."""
        name = event.get("name", "")
        action = event.get("action", "")

        # Only log events for DAISy containers
        if not any(p in name.lower() for p in CONTAINER_NAME_PATTERNS + ["daisy-"]):
            return

        severity = "info"
        if action in ("die", "oom", "kill"):
            severity = "warning"
        if action == "oom":
            severity = "critical"

        logger.log(
            "container_lifecycle",
            severity,
            {
                "container": name,
                "action": action,
                "image": event.get("image", ""),
            },
        )

        # Alert on unexpected container creation (possible Docker-in-Docker)
        if action == "create" and "sandbox" not in name.lower() and "daisy-" not in name.lower():
            logger.log(
                "unexpected_container_created",
                "warning",
                {
                    "container": name,
                    "image": event.get("image", ""),
                },
            )


# ═══════════════════════════════════════════════════════════
# Main Loop
# ═══════════════════════════════════════════════════════════

def main():
    """Main watchdog loop."""
    logger.log("watchdog_start", "info", {
        "pid": os.getpid(),
        "config_dir": str(CONFIG_DIR),
        "log_dir": str(LOG_DIR),
        "scan_interval": PROCESS_SCAN_INTERVAL,
        "tool_rate_limit": TOOL_RATE_LIMIT,
    })

    # Initialize monitors
    process_monitor = ProcessMonitor()
    tool_auditor = ToolAuditor()
    lifecycle_monitor = ContainerLifecycleMonitor()

    # Start lifecycle monitor in background
    lifecycle_monitor.start()

    # Graceful shutdown
    running = True

    def handle_signal(signum, frame):
        nonlocal running
        logger.log("watchdog_stop", "info", {"signal": signum})
        running = False

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    # Main scan loop
    while running:
        try:
            # Discover running containers
            containers = get_daisy_containers()

            # Scan processes in each container
            for container in containers:
                process_monitor.scan_container(container)

            # Audit tool invocations from logs
            tool_auditor.scan_logs()

            # Sleep until next scan
            time.sleep(PROCESS_SCAN_INTERVAL)

        except Exception as e:
            logger.log("watchdog_error", "warning", {"error": str(e)})
            time.sleep(PROCESS_SCAN_INTERVAL)

    logger.log("watchdog_shutdown", "info", {"message": "Clean shutdown"})


if __name__ == "__main__":
    main()
