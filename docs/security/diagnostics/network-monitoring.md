# Network Monitoring

## Conntrack Logger

Logs new outbound TCP/UDP connections as bounded JSONL using the kernel's connection tracking subsystem (`conntrack`).

| Setting      | Value                                                     |
| ------------ | --------------------------------------------------------- |
| Script       | `monitoring/network/conntrack-logger.sh`                  |
| Systemd unit | `daisy-conntrack-logger.service`                          |
| Output       | stdout (captured by systemd journal, shipped by Promtail) |
| Exclusions   | Localhost traffic (127.\*, ::1)                           |
| Rate limit   | `CONNTRACK_LOG_RATE_PER_SEC` (default 25)                 |
| Burst        | `CONNTRACK_LOG_BURST` (default 50)                        |

### How It Works

The script runs `conntrack -E -e NEW` to stream new connection events from the kernel's netfilter connection tracking table. It parses, rate limits, and formats events with shell builtins, avoiding per-line process forking while keeping sandbox or metadata-service connection storms from wedging the host through journal pressure.

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

When events are suppressed by rate limiting, the logger emits a summary record:

```json
{
  "timestamp": "2026-03-14T10:05:13Z",
  "service": "conntrack-logger",
  "event_type": "rate_limited",
  "suppressed": 137,
  "rate_per_sec": 25,
  "burst": 50
}
```

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
- **Metadata service access** (169.254.169.254) is logged within the rate limit and additionally caught by Falco

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
