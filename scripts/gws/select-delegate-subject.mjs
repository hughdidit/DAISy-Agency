import { loadActiveGwsPluginConfig } from "./active-config.mjs";

const { configPath, config: cfg } = loadActiveGwsPluginConfig();
const bindings =
  cfg?.agentCredentialBindings && typeof cfg.agentCredentialBindings === "object"
    ? cfg.agentCredentialBindings
    : {};
const subjects = Object.keys(bindings);
const subagentSubjects = subjects.filter((subject) => subject.startsWith("subagent:"));
const delegatedAgentSubjects = subjects.filter(
  (subject) => subject.startsWith("agent:") && subject !== "agent:main",
);
const delegateSubjects = [...subagentSubjects, ...delegatedAgentSubjects];

process.stdout.write(JSON.stringify({ configPath, delegateSubjects }));
