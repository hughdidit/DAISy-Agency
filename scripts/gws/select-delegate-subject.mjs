import fs from "node:fs";
import JSON5 from "json5";

const runtimeConfigPath =
  process.env.OPENCLAW_RUNTIME_CONFIG_PATH ?? "/home/node/.openclaw/.runtime-openclaw.json";

function getActiveConfig(value) {
  if (value?.resolved && typeof value.resolved === "object") {
    return value.resolved;
  }
  if (value?.config && typeof value.config === "object") {
    return value.config;
  }
  return value;
}

const snapshot = JSON5.parse(fs.readFileSync(runtimeConfigPath, "utf8"));
const activeConfig = getActiveConfig(snapshot);
const cfg = activeConfig?.plugins?.entries?.["gws-toolkit-phase1"]?.config;
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

process.stdout.write(JSON.stringify({ delegateSubjects }));
