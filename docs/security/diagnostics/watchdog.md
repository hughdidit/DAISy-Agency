# Watchdog Service

The `daisy-watchdog` is a Python 3 daemon (stdlib only, no pip dependencies) that monitors running processes inside DAISy containers against an allowlist and tracks container lifecycle events.

## Configuration

| Setting            | Value                                        |
| ------------------ | -------------------------------------------- |
| Binary             | `monitoring/watchdog/daisy-watchdog.py`      |
| Systemd unit       | `monitoring/watchdog/daisy-watchdog.service` |
| Allowlist          | `monitoring/watchdog/process-allowlist.yml`  |
| Log file           | `/var/log/daisy-watchdog/audit.jsonl`        |
| Scan interval      | 10 seconds                                   |
| Heartbeat interval | 300 seconds (5 minutes)                      |
| Container filter   | Containers with name prefix `openclaw`       |

## How It Works

The watchdog runs three concurrent threads:

1. **Process scanner** (main thread): Every 10 seconds, scans `/proc` for processes running inside DAISy containers. Compares each process executable against the allowlist. Emits `process_violation` events for unauthorized processes.

2. **Docker event watcher** (background thread): Subscribes to Docker events filtered by `name=openclaw`. Logs container lifecycle events (start, stop, die, OOM). Auto-retries on disconnect with 10-second delay.

3. **Heartbeat emitter** (background thread): Every 5 minutes, emits a `heartbeat` event confirming the watchdog is alive. Used by the external [dead man's switch](heartbeat.md).

### Container Scoping

The watchdog only monitors DAISy containers, not all containers on the host. It queries `docker ps --filter name=openclaw` to get container IDs and refreshes this list every 60 seconds (6 scan cycles).

## Event Types

All events are written as JSONL to `/var/log/daisy-watchdog/audit.jsonl`:

| Event Type                   | When                          | Fields                                                  |
| ---------------------------- | ----------------------------- | ------------------------------------------------------- |
| `watchdog_start`             | Service starts                | version                                                 |
| `allowlist_loaded`           | Allowlist parsed              | count (number of allowed executables)                   |
| `process_violation`          | Unauthorized process found    | severity, pid, process, exe, cmdline, uid, container_id |
| `container_lifecycle`        | Container start/stop/die      | action, container, image, exit_code                     |
| `container_oom`              | Container OOM killed          | severity, container                                     |
| `docker_events_connected`    | Docker event stream connected | —                                                       |
| `docker_events_disconnected` | Docker event stream lost      | error                                                   |
| `heartbeat`                  | Periodic health check         | status ("alive")                                        |

## Allowlist

The process allowlist (`monitoring/watchdog/process-allowlist.yml`) contains approved executable basenames:

```yaml
allowed_processes:
  # Runtimes
  - node
  - python3
  # Shells
  - bash
  - sh
  # Dev tools
  - git
  - rg
  - curl
  # Package managers
  - pnpm
  - npm
  - npx
  # Common utilities
  - cat
  - grep
  - find
  - ls
  # ... (40+ standard Unix commands)
```

The full executable path is logged in violation events for investigation even though matching is by basename. Falco provides an additional layer of process monitoring at the syscall level.

## Systemd Unit

The service runs with comprehensive hardening:

- `NoNewPrivileges=true`
- `ProtectSystem=strict` (read-only filesystem except allowed paths)
- `ProtectHome=true`
- `PrivateTmp=true`
- `ProtectKernelTunables=true`
- `ProtectKernelModules=true`
- `ProtectControlGroups=true`
- `RestrictNamespaces=true`
- `MemoryDenyWriteExecute=true`
- `ReadWritePaths=/var/log/daisy-watchdog`
- `ReadOnlyPaths=/proc /opt/DAISy/monitoring`

### Managing the Service

```bash
# Start / stop / restart
sudo systemctl start daisy-watchdog
sudo systemctl stop daisy-watchdog
sudo systemctl restart daisy-watchdog

# Check status
sudo systemctl status daisy-watchdog

# View logs
sudo journalctl -u daisy-watchdog -f

# View audit trail
sudo tail -f /var/log/daisy-watchdog/audit.jsonl | jq .
```

## Modifying the Allowlist

1. Edit `monitoring/watchdog/process-allowlist.yml`
2. Restart the watchdog: `sudo systemctl restart daisy-watchdog`
3. The watchdog logs the number of loaded entries on startup

Adding a process to the allowlist does not exempt it from Falco monitoring. Both systems operate independently.
