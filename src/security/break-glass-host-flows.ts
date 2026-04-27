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

export const BREAK_GLASS_HOST_AUDIT_ACTIONS = [
  "requested",
  "accepted",
  "started",
  "finished",
  "completed",
  "failed",
  "reset",
  "set",
  "unset",
] as const;

export type BreakGlassHostAuditAction = (typeof BREAK_GLASS_HOST_AUDIT_ACTIONS)[number];

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
  action: BreakGlassHostAuditAction;
  subject?: string;
  result?: string;
}): string {
  const flow = getBreakGlassHostFlow(params.flowId);
  const subjectValue = sanitizeBreakGlassAuditField(params.subject);
  const resultValue = sanitizeBreakGlassAuditField(params.result);
  const subject = subjectValue ? ` subject=${JSON.stringify(subjectValue)}` : "";
  const result = resultValue ? ` result=${JSON.stringify(resultValue)}` : "";
  return `${BREAK_GLASS_HOST_LABEL}: ${flow.id} ${params.action}${subject}${result}`;
}

function sanitizeBreakGlassAuditField(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const normalized = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127 ? " " : char;
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /(\b(?:password|passwd|pwd|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*=\s*)("[^"]*"|'[^']*'|\S+)/gi,
      "$1[redacted]",
    )
    .replace(
      /(--(?:password|token|secret|api-key|access-token|refresh-token)(?:=|\s+))("[^"]*"|'[^']*'|\S+)/gi,
      "$1[redacted]",
    );
  if (normalized.length <= 512) {
    return normalized;
  }
  return `${normalized.slice(0, 252)}...${normalized.slice(-252)}`;
}
