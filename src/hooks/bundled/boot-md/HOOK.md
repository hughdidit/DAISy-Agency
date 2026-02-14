---
name: boot-md
description: "Run BOOT.md on gateway startup"
<<<<<<< HEAD
homepage: https://docs.molt.bot/hooks#boot-md
=======
homepage: https://docs.openclaw.ai/automation/hooks#boot-md
>>>>>>> f8ba8f769 (fix(docs): update outdated hooks documentation URLs (#16165))
metadata:
  {
    "moltbot":
      {
        "emoji": "🚀",
        "events": ["gateway:startup"],
        "requires": { "config": ["workspace.dir"] },
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with Moltbot" }],
      },
  }
---

# Boot Checklist Hook

Runs `BOOT.md` every time the gateway starts, if the file exists in the workspace.
