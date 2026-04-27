import { BREAK_GLASS_HOST_LABEL } from "../agents/sandbox/trust-posture.js";

export const BREAK_GLASS_HOST_FLOW_IDS = [
  "chat-bash",
  "exec-gateway",
  "exec-node",
  "acp-runtime",
  "gateway-restart",
  "runtime-debug",
  "sandbox-dangerous-override",
] as const;

export type BreakGlassHostFlowId = (typeof BREAK_GLASS_HOST_FLOW_IDS)[number];

export type BreakGlassHostFlow = {
  id: BreakGlassHostFlowId;
  title: string;
  surface: string;
  summary: string;
};

export const BREAK_GLASS_HOST_FLOWS: Readonly<Record<BreakGlassHostFlowId, BreakGlassHostFlow>> =
  Object.freeze({
    "chat-bash": {
      id: "chat-bash",
      title: "Host shell chat command",
      surface: "/bash and !",
      summary: "Runs a shell command on the gateway host through elevated host authority gates.",
    },
    "exec-gateway": {
      id: "exec-gateway",
      title: "Gateway host exec",
      surface: 'tools.exec.host="gateway"',
      summary: "Routes exec outside the sandbox boundary to the gateway host approval path.",
    },
    "exec-node": {
      id: "exec-node",
      title: "Node host exec",
      surface: 'tools.exec.host="node"',
      summary: "Routes exec outside the sandbox boundary to a registered node host.",
    },
    "acp-runtime": {
      id: "acp-runtime",
      title: "ACP host runtime",
      surface: 'sessions_spawn runtime="acp"',
      summary: "Starts an ACP runtime outside the OpenClaw sandbox.",
    },
    "gateway-restart": {
      id: "gateway-restart",
      title: "Gateway restart",
      surface: "/restart",
      summary: "Controls the gateway host process rather than a sandboxed agent runtime.",
    },
    "runtime-debug": {
      id: "runtime-debug",
      title: "Runtime debug override",
      surface: "/debug",
      summary: "Mutates gateway runtime state in memory for operator diagnostics.",
    },
    "sandbox-dangerous-override": {
      id: "sandbox-dangerous-override",
      title: "Dangerous sandbox override",
      surface: "agents.*.sandbox.docker.dangerouslyAllow*",
      summary: "Explicitly widens or pierces the sandbox boundary for a trusted runtime.",
    },
  });

export function getBreakGlassHostFlow(id: BreakGlassHostFlowId): BreakGlassHostFlow {
  return BREAK_GLASS_HOST_FLOWS[id];
}

export function formatBreakGlassHostFlowLabel(id: BreakGlassHostFlowId): string {
  return `${BREAK_GLASS_HOST_LABEL}: ${getBreakGlassHostFlow(id).title}`;
}

export function formatBreakGlassHostFlowSummary(id: BreakGlassHostFlowId): string {
  const flow = getBreakGlassHostFlow(id);
  return `${formatBreakGlassHostFlowLabel(id)} (${flow.surface}) - ${flow.summary}`;
}

export function formatBreakGlassHostAuditEvent(params: {
  flowId: BreakGlassHostFlowId;
  action: string;
  subject?: string;
  result?: string;
}): string {
  const flow = getBreakGlassHostFlow(params.flowId);
  const subject = params.subject?.trim() ? ` subject=${params.subject.trim()}` : "";
  const result = params.result?.trim() ? ` result=${params.result.trim()}` : "";
  return `${BREAK_GLASS_HOST_LABEL}: ${flow.id} ${params.action}${subject}${result}`;
}
