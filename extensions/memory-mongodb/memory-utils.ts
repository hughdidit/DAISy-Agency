export function agentIdFromScopeSubject(scopeSubject: string): string | undefined {
  const [kind, value] = scopeSubject.split(":", 2);
  if ((kind === "agent" || kind === "subagent") && value) {
    return value;
  }
  return undefined;
}
