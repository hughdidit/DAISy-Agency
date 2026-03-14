# Network Monitoring

## Conntrack Logger

Logs all new outbound TCP/UDP connections as JSONL using the kernel's connection tracking subsystem (`conntrack`).

| Setting      | Value                                                     |
| ------------ | --------------------------------------------------------- |
| Script       | `monitoring/network/conntrack-logger.sh`                  |
| Systemd unit | `daisy-conntrack-logger.service`                          |
| Output       | stdout (captured by systemd journal, shipped by Promtail) |
| Exclusions   | Localhost traffic (127.\*, ::1)                           |

### How It Works

The script runs `conntrack -E -e NEW` to stream new connection events from the kernel's netfilter connection tracking table, piped through a single long-running `awk` process that parses and formats each event as a JSONL record. This avoids per-line process forking.

**Logged fields:**

| Field        | Description            |
| ------------ | ---------------------- |
| `timestamp`  | ISO 8601 timestamp     |
| `service`    | `conntrack-logger`     |
| `event_type` | `new_connection`       |
| `proto`      | Protocol (tcp/udp)     |
| `src`        | Source IP address      |
| `dst`        | Destination IP address |
| `sport`      | Source port            |
| `dport`      | Destination port       |

**Example output:**

```json
{
  "timestamp": "2026-03-14T10:05:12Z",
  "service": "conntrack-logger",
  "event_type": "new_connection",
  "proto": "tcp",
  "src": "10.128.0.2",
  "dst": "142.250.80.106",
  "sport": "48234",
  "dport": "443"
}
```

### What It Detects

Combined with Prometheus alert rules and Grafana dashboards:

- **Unexpected outbound connections** to unknown IPs
- **High connection rates** suggesting scanning or data exfiltration
- **Connections to suspicious ports** (crypto mining, C2 channels)
- **Metadata service access** (169.254.169.254) is additionally caught by Falco

### Viewing Connection Logs

```bash
# Real-time via journal
sudo journalctl -u daisy-conntrack-logger -f

# Via Grafana: Network Traffic dashboard

# Via Loki query
# {job="syslog"} |= "conntrack-logger"
```

### Managing the Service

```bash
sudo systemctl start daisy-conntrack-logger
sudo systemctl stop daisy-conntrack-logger
sudo systemctl status daisy-conntrack-logger
```

## Network Alert Rules

The following Prometheus alert rules relate to network activity:

| Alert            | Severity | Condition                         |
| ---------------- | -------- | --------------------------------- |
| `NetworkTxSpike` | warning  | Outbound traffic > 50 MB/s for 2m |

Additional network detection is provided by Falco:

| Rule                    | Priority | Trigger                                 |
| ----------------------- | -------- | --------------------------------------- |
| Metadata Service Access | CRITICAL | Connection to 169.254.169.254           |
| Large Outbound Transfer | WARNING  | Single connection > 10 MB               |
| Unexpected Listener     | WARNING  | Container listens on non-standard ports |
