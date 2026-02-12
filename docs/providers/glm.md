---
summary: "GLM model family overview + how to use it in Moltbot"
read_when:
  - You want GLM models in Moltbot
  - You need the model naming convention and setup
---

# GLM models

<<<<<<< HEAD
GLM is a **model family** (not a company) available through the Z.AI platform. In Moltbot, GLM
models are accessed via the `zai` provider and model IDs like `zai/glm-4.7`.
=======
GLM is a **model family** (not a company) available through the Z.AI platform. In OpenClaw, GLM
models are accessed via the `zai` provider and model IDs like `zai/glm-5`.
>>>>>>> 5e7842a41 (feat(zai): auto-detect endpoint + default glm-5 (#14786))

## CLI setup

```bash
moltbot onboard --auth-choice zai-api-key
```

## Config snippet

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

## Notes

- GLM versions and availability can change; check Z.AI's docs for the latest.
- Example model IDs include `glm-5`, `glm-4.7`, and `glm-4.6`.
- For provider details, see [/providers/zai](/providers/zai).
