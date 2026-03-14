#!/usr/bin/env python3
"""
DAISy-Agency Watchdog Service

Monitors container processes, enforces an executable allowlist,
tracks container lifecycle events, and emits a dead man's switch
heartbeat.

Output: JSONL to /var/log/daisy-watchdog/audit.jsonl
        (ingested by Promtail → Loki)

Dependencies: Python 3 stdlib only (no pip packages).
Runs as: daisy-monitor (uid 2000), group docker.
"""

import json
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────────────

SCAN_INTERVAL = 10  # seconds between /proc scans
HEARTBEAT_INTERVAL = 300  # 5 minutes
LOG_DIR = Path("/var/log/daisy-watchdog")
LOG_FILE = LOG_DIR / "audit.jsonl"
ALLOWLIST_PATH = Path("/opt/DAISy/monitoring/watchdog/process-allowlist.yml")
CONTAINER_NAME_PREFIX = "openclaw"

# ── Logging ────────────────────────────────────────────────────────────


def emit(event_type: str, **fields):
    """Write a JSONL event to the audit log."""
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "daisy-watchdog",
        "event": event_type,
        **fields,
    }
    line = json.dumps(record, default=str)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except OSError as e:
        print(f"[watchdog] log write error: {e}", file=sys.stderr)
    # Also write to stdout for systemd journal
    print(line, flush=True)


# ── Allowlist ──────────────────────────────────────────────────────────


def load_allowlist() -> set:
    """Load the process allowlist from YAML (simple parser, no PyYAML)."""
    allowed = set()
    try:
        with open(ALLOWLIST_PATH) as f:
            in_list = False
            for line in f:
                stripped = line.strip()
                if stripped == "allowed_processes:":
                    in_list = True
                    continue
                if in_list:
                    if stripped.startswith("- "):
                        proc = stripped[2:].strip()
                        if proc and not proc.startswith("#"):
                            allowed.add(proc)
                    elif stripped and not stripped.startswith("#"):
                        break  # end of list
    except FileNotFoundError:
        emit("allowlist_missing", path=str(ALLOWLIST_PATH))
    except OSError as e:
        emit("allowlist_error", error=str(e))
    return allowed


# ── Container Process Scanning ─────────────────────────────────────────


def get_container_pids() -> dict:
    """
    Get PIDs running inside containers by reading /proc/<pid>/cgroup.
    Returns {pid: container_id} for container processes.
    """
    container_pids = {}
    proc = Path("/proc")
    for entry in proc.iterdir():
        if not entry.name.isdigit():
            continue
        pid = int(entry.name)
        try:
            cgroup_path = entry / "cgroup"
            cgroup_text = cgroup_path.read_text()
            for line in cgroup_text.splitlines():
                if "docker" in line or "containerd" in line:
                    # Extract container ID from cgroup path
                    parts = line.split("/")
                    container_id = parts[-1][:12] if parts else "unknown"
                    container_pids[pid] = container_id
                    break
        except (OSError, PermissionError):
            continue
    return container_pids


def get_process_info(pid: int) -> dict | None:
    """Read process name and cmdline from /proc."""
    try:
        proc_dir = Path(f"/proc/{pid}")
        # Get executable name
        try:
            exe = os.readlink(proc_dir / "exe")
            name = os.path.basename(exe)
        except OSError:
            comm = (proc_dir / "comm").read_text().strip()
            name = comm
            exe = "unknown"

        # Get command line
        try:
            cmdline_raw = (proc_dir / "cmdline").read_bytes()
            cmdline = cmdline_raw.replace(b"\x00", b" ").decode(
                "utf-8", errors="replace"
            ).strip()
        except OSError:
            cmdline = ""

        # Get UID
        try:
            status = (proc_dir / "status").read_text()
            uid = -1
            for line in status.splitlines():
                if line.startswith("Uid:"):
                    uid = int(line.split()[1])
                    break
        except OSError:
            uid = -1

        return {
            "pid": pid,
            "name": name,
            "exe": exe,
            "cmdline": cmdline[:500],  # truncate long commands
            "uid": uid,
        }
    except (OSError, PermissionError):
        return None


def scan_processes(allowlist: set, known_pids: set) -> set:
    """Scan container processes and check against allowlist."""
    container_pids = get_container_pids()
    current_pids = set(container_pids.keys())

    # Check new processes
    new_pids = current_pids - known_pids
    for pid in new_pids:
        info = get_process_info(pid)
        if info is None:
            continue

        if info["name"] not in allowlist:
            emit(
                "process_violation",
                severity="warning",
                pid=pid,
                process=info["name"],
                exe=info["exe"],
                cmdline=info["cmdline"],
                uid=info["uid"],
                container_id=container_pids.get(pid, "unknown"),
            )

    return current_pids


# ── Container Lifecycle via docker events ──────────────────────────────


def watch_docker_events():
    """Watch Docker container lifecycle events."""
    try:
        proc = subprocess.Popen(
            [
                "docker", "events",
                "--filter", "type=container",
                "--format", "{{json .}}",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        for line in proc.stdout:
            try:
                event = json.loads(line.strip())
                action = event.get("Action", "")
                actor = event.get("Actor", {})
                attrs = actor.get("Attributes", {})
                container_name = attrs.get("name", "unknown")

                # Only track events for DAISy containers
                if CONTAINER_NAME_PREFIX not in container_name:
                    continue

                if action in ("start", "stop", "die", "kill", "oom", "restart"):
                    emit(
                        "container_lifecycle",
                        action=action,
                        container=container_name,
                        image=attrs.get("image", "unknown"),
                        exit_code=attrs.get("exitCode", ""),
                    )

                    if action == "oom":
                        emit(
                            "container_oom",
                            severity="critical",
                            container=container_name,
                        )
            except json.JSONDecodeError:
                continue
    except FileNotFoundError:
        emit("docker_events_error", error="docker binary not found")
    except OSError as e:
        emit("docker_events_error", error=str(e))


# ── Heartbeat (Dead Man's Switch) ──────────────────────────────────────


def heartbeat_loop():
    """Emit periodic heartbeat for dead man's switch monitoring."""
    while True:
        emit("heartbeat", status="alive")
        time.sleep(HEARTBEAT_INTERVAL)


# ── Main ───────────────────────────────────────────────────────────────


def main():
    # Ensure log directory exists
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    emit("watchdog_start", version="1.0.0", pid=os.getpid())

    # Load allowlist
    allowlist = load_allowlist()
    if allowlist:
        emit("allowlist_loaded", count=len(allowlist),
             processes=sorted(allowlist))
    else:
        emit("allowlist_empty",
             severity="warning",
             message="No allowlist loaded, all processes will be flagged")

    # Start Docker events watcher in background thread
    docker_thread = threading.Thread(target=watch_docker_events, daemon=True)
    docker_thread.start()

    # Start heartbeat in background thread
    heartbeat_thread = threading.Thread(target=heartbeat_loop, daemon=True)
    heartbeat_thread.start()

    # Main process scanning loop
    known_pids: set = set()
    while True:
        try:
            known_pids = scan_processes(allowlist, known_pids)
        except Exception as e:
            emit("scan_error", error=str(e))
        time.sleep(SCAN_INTERVAL)


if __name__ == "__main__":
    main()
