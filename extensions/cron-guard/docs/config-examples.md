# Config Examples

## Deny Raw Cron And Allow Guarded Tools

```json
{
  "agents": {
    "profiles": {
      "guarded-cron-agent": {
        "tools": {
          "deny": ["cron"],
          "allow": [
            "cron_guard_status",
            "cron_guard_list",
            "cron_guard_add_request",
            "cron_guard_update_request",
            "cron_guard_remove_request"
          ]
        }
      }
    }
  },
  "plugins": {
    "enabled": true,
    "allow": ["cron-guard"],
    "entries": {
      "cron-guard": {
        "enabled": true,
        "config": {
          "approvers": ["discord:123456789"]
        }
      }
    }
  }
}
```

Configure the target agent to deny raw `cron` access and allow only the `cron_guard_*` tools.
