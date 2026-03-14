# Security Detection

Three independent detection systems monitor for malicious or anomalous activity: Falco (real-time syscall monitoring), AIDE (file integrity), and auditd (kernel audit trail).

## Falco

Real-time kernel-level security monitoring using eBPF. Runs as a systemd service on the host (not inside Docker) for unrestricted kernel access.

| Setting | Value                                           |
| ------- | ----------------------------------------------- |
| Driver  | eBPF                                            |
| Output  | JSON to `/var/log/falco/events.json`            |
| Config  | `monitoring/falco/falco.yaml`                   |
| Rules   | `monitoring/falco/rules/daisy-agent-rules.yaml` |

### Detection Rules

| Rule                         | Priority | Trigger                                                                       |
| ---------------------------- | -------- | ----------------------------------------------------------------------------- |
| Shell Spawned in Container   | WARNING  | bash/sh/zsh/dash spawned inside a container                                   |
| Sensitive File Read          | CRITICAL | Container reads `/etc/shadow`, `/etc/passwd`, private keys, cloud credentials |
| Docker Socket Access         | CRITICAL | Non-openclaw container touches `/var/run/docker.sock`                         |
| Container Escape Attempt     | CRITICAL | `nsenter`, `unshare`, or chroot used in a container                           |
| Privilege Escalation Attempt | CRITICAL | `chmod`/`fchmod` with SUID/SGID bits (`S_ISUID`/`S_ISGID`) in a container     |
| Ptrace Detected              | CRITICAL | `ptrace` syscall from inside a container                                      |
| System Directory Write       | WARNING  | Container writes to `/bin`, `/sbin`, `/usr/bin`, `/lib`, `/etc`               |
| Metadata Service Access      | CRITICAL | Container connects to `169.254.169.254` (SSRF/cloud credential theft)         |
| Monitoring Config Tampered   | CRITICAL | Any process modifies monitoring config files (zero-trust: no root exclusion)  |
| Unexpected Listener          | WARNING  | Container opens a listening socket on ports other than 18789/18790            |
| Kernel Module Load           | CRITICAL | `init_module`/`finit_module` syscall detected                                 |
| Crypto Mining Detected       | CRITICAL | Process arguments contain known mining pool domains or stratum protocol URIs  |
| Large Outbound Transfer      | WARNING  | Container sends > 10 MB in a single connection                                |
| Credential in Process Args   | CRITICAL | API keys, tokens, or passwords visible in process command line                |
| Unexpected Process           | NOTICE   | Process not in allowlist running inside a DAISy container                     |

**Allowed processes:** node, python3, bash, sh, git, rg, curl, pnpm, npm, npx (plus standard shell utilities).

### Viewing Falco Events

```bash
# Real-time
sudo tail -f /var/log/falco/events.json | jq .

# Via Grafana
# Open Security Events dashboard → Falco panel

# Via Loki (CLI)
# Filter: {job="falco"} | json | priority = `Critical`
```

## AIDE (File Integrity Monitoring)

Detects unauthorized modifications to critical system and application files.

| Setting        | Value                        |
| -------------- | ---------------------------- |
| Config         | `monitoring/aide/aide.conf`  |
| Database       | `/var/lib/aide/aide.db`      |
| Check interval | Every 15 minutes (cron)      |
| Hash algorithm | SHA256 + extended attributes |

### Monitored Paths

**Application configs:**

- `docker-compose.yml`, `docker-compose.host.yml`, `docker-compose.sandbox.yml`
- `.env` (application environment)

**Monitoring configs:**

- `prometheus.yml`, `alerts.yml`, `alertmanager.yml`
- `falco.yaml`, `daisy-agent-rules.yaml`
- `loki-config.yml`, `promtail-config.yml`

**System binaries:**

- Docker: `docker`, `dockerd`, `containerd`, `runc`
- Security: `falco`, `aide`, `sudo`, `su`, `passwd`
- SSH: `ssh`, `sshd`

**System config:**

- `/etc/passwd`, `/etc/group`, `/etc/shadow`
- `/etc/sudoers`, `/etc/sudoers.d/*`
- `/etc/ssh/sshd_config`

**Cron jobs:** `/etc/cron*`, `/var/spool/cron`

**State data:** `/var/lib/daisy` (data-only hash, no metadata)

**Self-monitoring:** AIDE monitors its own binary (`/usr/bin/aide`) to detect replacement attacks.

### Manual AIDE Check

```bash
# Run integrity check
sudo aide --check --config /opt/DAISy/monitoring/aide/aide.conf

# Update database after legitimate changes
sudo aide --update --config /opt/DAISy/monitoring/aide/aide.conf
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

## auditd (Kernel Audit)

Low-level kernel audit rules for tracking sensitive syscalls.

| Setting      | Value                                      |
| ------------ | ------------------------------------------ |
| Rules        | `monitoring/auditd/daisy-containers.rules` |
| Install path | `/etc/audit/rules.d/`                      |
| Log          | `/var/log/audit/audit.log`                 |

### Audit Rules

**File access monitoring:**

- Watches on `/etc/passwd`, `/etc/shadow`, `/etc/sudoers`
- Watches on Docker socket (`/var/run/docker.sock`)
- Watches on monitoring configs

**Process signal tracking:**

- `kill`/`tkill` (signal at arg position a1): tracks SIGKILL (9) and SIGTERM (15)
- `tgkill` (signal at arg position a2): separate rules for correct argument position

**Syscall monitoring (non-root users, uid >= 1000):**

- `execve`: all program executions
- `connect`: outbound network connections
- `mount`/`umount2`: filesystem mount attempts
- `ptrace`: process tracing attempts
- `init_module`/`finit_module`: kernel module loading

### Viewing Audit Logs

```bash
# Search by key
sudo ausearch -k docker_sock
sudo ausearch -k process_kill
sudo ausearch -k net_connect

# Recent events
sudo ausearch --start recent

# Via Grafana: Audit Trail dashboard
```
