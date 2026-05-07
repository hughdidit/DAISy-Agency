import { loadActiveGwsPluginConfig } from "./active-config.mjs";
import { selectGwsBindingSubjects } from "./subject-selection.mjs";

const { configPath, config: cfg } = loadActiveGwsPluginConfig();
const selection = selectGwsBindingSubjects(cfg?.agentCredentialBindings);

process.stdout.write(
  JSON.stringify({
    configPath,
    ...selection,
  }),
);
