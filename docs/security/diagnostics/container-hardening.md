# Container Hardening

DAISy containers are hardened with multiple security controls applied via `docker-compose.host.yml`.

## Security Controls Summary

```yaml
# docker-compose.host.yml
services:
  openclaw-gateway:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
      - seccomp:/opt/DAISy/monitoring/seccomp/daisy-seccomp.json
      - apparmor:openclaw-container
    read_only: true
    tmpfs:
      - /tmp:size=512M,noexec
```

| Control | Effect |
|---------|--------|
| `cap_drop: ALL` | Removes all Linux capabilities |
| `cap_add: NET_BIND_SERVICE` | Only allows binding to privileged ports |
| `no-new-privileges` | Prevents gaining privileges via SUID/SGID binaries |
| `seccomp` | Blocks dangerous syscalls at the kernel level |
| `apparmor` | Mandatory access control denying access to monitoring paths |
| `read_only: true` | Root filesystem is read-only |
| `tmpfs /tmp` | Writable `/tmp` is memory-backed with 512 MB limit, noexec |

## Seccomp Profile

**File:** `monitoring/seccomp/daisy-seccomp.json`

The seccomp profile uses a default-deny approach: only explicitly listed syscalls are allowed. Based on Docker's default profile with additional restrictions.

### Blocked Syscalls

These syscalls are explicitly blocked with `SCMP_ACT_ERRNO`:

| Category | Syscalls | Risk |
|----------|----------|------|
| eBPF | `bpf` | Kernel exploitation, tracing bypass |
| Kernel loading | `kexec_load`, `kexec_file_load` | Kernel replacement |
| Fault handling | `userfaultfd` | Container escape vector |
| Profiling | `perf_event_open` | Side-channel attacks |
| Process tracing | `ptrace` | Debugger attachment, memory reading |
| Mounting | `mount`, `umount`, `umount2`, `pivot_root` | Filesystem escape |
| Namespaces | `unshare`, `setns` | Namespace manipulation |
| Kernel modules | `init_module`, `finit_module`, `delete_module`, `create_module` | Kernel rootkits |
| System control | `reboot`, `swapon`, `swapoff`, `sethostname`, `setdomainname` | Host disruption |
| Key management | `add_key`, `request_key`, `keyctl` | Keyring manipulation |
| Cross-process | `process_vm_readv`, `process_vm_writev`, `kcmp` | Memory access across processes |
| Personality | `personality` | Security boundary bypass |
| Accounting | `acct` | Process accounting manipulation |
| Handle bypass | `open_by_handle_at` | File handle-based container escape |

### Clone Restrictions

Both `clone` and `clone3` are allowed but restricted:

- **`clone`**: Blocked from creating user namespaces (`CLONE_NEWUSER` flag, bit 0x10000000)
- **`clone3`**: Same restriction applied via args filter on the flags field

This allows normal thread creation while preventing namespace-based container escapes.

### Architectures

The profile supports both `x86_64` and `aarch64` architectures.

## AppArmor Profile

**File:** `monitoring/apparmor/openclaw-container`

A mandatory access control (MAC) profile that enforces filesystem and capability restrictions.

### Key Restrictions

**Denied paths (read + write + link + lock + execute):**

| Path | Reason |
|------|--------|
| `/opt/DAISy/monitoring/**` | Monitoring configs and scripts |
| `/var/log/falco/**` | Falco security event logs |
| `/var/log/daisy-watchdog/**` | Watchdog audit trail |
| `/var/log/audit/**` | Kernel audit logs |
| `/var/lib/aide/**` | AIDE integrity database |
| `/etc/apparmor.d/**` | AppArmor profile directory |
| `/etc/audit/**` | Audit configuration |
| `/etc/shadow` | Password hashes |
| `/etc/gshadow` | Group password hashes |
| `/etc/sudoers`, `/etc/sudoers.d/**` | Privilege escalation configs |

**Denied capabilities:**

| Capability | Risk |
|------------|------|
| `sys_admin` | Broad system administration (mount, namespace, etc.) |
| `sys_module` | Loading kernel modules |
| `sys_rawio` | Direct hardware I/O |
| `sys_ptrace` | Process debugging/tracing |
| `sys_boot` | Rebooting the system |
| `mac_admin` | Modifying MAC policies |
| `mac_override` | Overriding MAC policies |

**Denied operations:** `mount`, `umount`, `pivot_root`

**Allowed:** General filesystem access within the container's mount namespace (`/** rw`), network operations, binary execution from standard paths, and `/proc` + `/sys` reads for diagnostics. Note that the `read_only: true` Docker setting is the primary write protection — the `/** rw` AppArmor rule allows reads and writes within what the container can already access, while the explicit deny rules above take precedence for sensitive paths.

### Installing the AppArmor Profile

The `setup-permissions.sh` script handles installation automatically. For manual installation:

```bash
sudo cp monitoring/apparmor/openclaw-container /etc/apparmor.d/
sudo apparmor_parser -r /etc/apparmor.d/openclaw-container
```

### Verifying AppArmor Status

```bash
# Check if profile is loaded
sudo aa-status | grep openclaw

# Check if container is using the profile
sudo docker inspect <container_id> --format '{{ .HostConfig.SecurityOpt }}'
```

## Defense-in-Depth

The hardening controls are layered and complementary:

1. **Capabilities** (`cap_drop: ALL`): Removes privileges at the Linux capability level
2. **no-new-privileges**: Prevents regaining privileges via SUID binaries
3. **Seccomp**: Blocks dangerous syscalls at the kernel level
4. **AppArmor**: Enforces filesystem and capability restrictions via MAC
5. **Read-only filesystem**: Prevents persistent modifications
6. **Monitoring**: Falco, AIDE, auditd, and watchdog detect any bypass attempts

Even if one layer is bypassed, the remaining layers continue to protect. The monitoring stack runs independently on the host and cannot be disabled from inside containers.
