# Config Examples

## Deny Raw Cron And Allow Guarded Tools

```json
{
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
