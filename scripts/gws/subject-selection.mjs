export const GWS_BINDING_SUBJECT_PATTERN = /^(agent|subagent):[A-Za-z0-9._-]+$/;

export function isValidGwsBindingSubject(subject) {
  return typeof subject === "string" && GWS_BINDING_SUBJECT_PATTERN.test(subject);
}

export function selectGwsBindingSubjects(agentCredentialBindings) {
  const bindings =
    agentCredentialBindings && typeof agentCredentialBindings === "object"
      ? agentCredentialBindings
      : {};
  const subjects = Object.keys(bindings).filter(isValidGwsBindingSubject).toSorted();
  const agentSubjects = subjects.filter((subject) => subject.startsWith("agent:"));
  const subagentSubjects = subjects.filter((subject) => subject.startsWith("subagent:"));
  const baselineSubject = agentSubjects[0] ?? subagentSubjects[0] ?? null;
  const delegateSubjects = [...subagentSubjects, ...agentSubjects].filter(
    (subject) => subject !== baselineSubject,
  );

  return {
    agentSubjects,
    subagentSubjects,
    baselineSubject,
    delegateSubjects,
  };
}
