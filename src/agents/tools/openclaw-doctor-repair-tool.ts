import crypto from "node:crypto";
import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { loadConfig } from "../../config/config.js";
import { hasConfiguredSecretInput } from "../../config/types.secrets.js";
import { isLoopbackHost } from "../../gateway/net.js";
import { parseSshTarget } from "../../infra/ssh-tunnel.js";
import { requestExecApprovalDecisionForHost } from "../bash-tools.exec-approval-request.js";
import { stringEnum } from "../schema/typebox.js";
import {
  type AnyAgentTool,
  jsonResult,
  readNumberParam,
  readStringParam,
  ToolInputError,
} from "./common.js";
import { callGatewayTool } from "./gateway.js";

const OPENCLAW_DOCTOR_REPAIR_ACTIONS = ["preview", "apply"] as const;
const DEFAULT_TOOL_TIMEOUT_MS = 10 * 60_000;
const MAX_TOOL_TIMEOUT_MS = 30 * 60_000;

type DoctorRepairAction = (typeof OPENCLAW_DOCTOR_REPAIR_ACTIONS)[number];

const OpenClawDoctorRepairToolSchema = Type.Object({
  action: stringEnum(OPENCLAW_DOCTOR_REPAIR_ACTIONS),
  timeoutMs: Type.Optional(Type.Number({ minimum: 1_000, maximum: MAX_TOOL_TIMEOUT_MS })),
});

type DoctorRepairRoute = {
  transport: "ssh" | "direct";
  target: string;
};

function trimToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isDoctorRepairAction(value: string): value is DoctorRepairAction {
  return OPENCLAW_DOCTOR_REPAIR_ACTIONS.includes(value as DoctorRepairAction);
}

function resolveDoctorRepairRoute(cfg: OpenClawConfig): DoctorRepairRoute {
  if (cfg.gateway?.mode !== "remote") {
    throw new ToolInputError(
      "openclaw_doctor_repair requires gateway.mode=remote and refuses local gateway targets.",
    );
  }

  const remote = cfg.gateway?.remote;
  const remoteUrl = trimToUndefined(remote?.url);
  if (!remoteUrl) {
    throw new ToolInputError(
      "gateway.remote.url is required for openclaw_doctor_repair; local fallback is disabled.",
    );
  }

  const transport = remote?.transport === "ssh" ? "ssh" : "direct";
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(remoteUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ToolInputError(`Invalid gateway.remote.url: ${message}`);
  }

  if (transport === "direct" && isLoopbackHost(parsedUrl.hostname)) {
    throw new ToolInputError(
      "openclaw_doctor_repair refuses loopback gateway.remote.url values in direct mode. Use a non-loopback remote URL or configure gateway.remote.transport=ssh with gateway.remote.sshTarget.",
    );
  }

  if (
    !hasConfiguredSecretInput(remote?.token, cfg.secrets?.defaults) &&
    !hasConfiguredSecretInput(remote?.password, cfg.secrets?.defaults)
  ) {
    throw new ToolInputError(
      "Configure gateway.remote.token or gateway.remote.password before using openclaw_doctor_repair.",
    );
  }

  if (transport === "ssh") {
    const sshTarget = trimToUndefined(remote?.sshTarget);
    if (!sshTarget) {
      throw new ToolInputError(
        "gateway.remote.sshTarget is required when gateway.remote.transport=ssh.",
      );
    }
    const parsedTarget = parseSshTarget(sshTarget);
    if (!parsedTarget) {
      throw new ToolInputError("gateway.remote.sshTarget is invalid.");
    }
    if (isLoopbackHost(parsedTarget.host)) {
      throw new ToolInputError(
        "openclaw_doctor_repair refuses loopback gateway.remote.sshTarget values. Use a non-loopback SSH host.",
      );
    }
    return {
      transport,
      target: `ssh:${sshTarget}`,
    };
  }

  return {
    transport,
    target: remoteUrl,
  };
}

function resolveRequestedTimeoutMs(params: Record<string, unknown>): number | undefined {
  const timeoutMs = readNumberParam(params, "timeoutMs", { integer: true });
  if (timeoutMs === undefined) {
    return undefined;
  }
  return Math.max(1_000, Math.min(timeoutMs, MAX_TOOL_TIMEOUT_MS));
}

function buildDoctorMode(action: DoctorRepairAction): "dry-run" | "apply" {
  switch (action) {
    case "preview":
      return "dry-run";
    case "apply":
      return "apply";
    default:
      throw new ToolInputError(`Unsupported openclaw_doctor_repair action: ${String(action)}`);
  }
}

function buildDoctorApprovalCommand(mode: "dry-run" | "apply"): {
  command: string;
  argv: string[];
} {
  if (mode === "dry-run") {
    return {
      command: "openclaw doctor --dry-run --non-interactive",
      argv: ["openclaw", "doctor", "--dry-run", "--non-interactive"],
    };
  }
  return {
    command: "openclaw doctor --repair --yes --non-interactive",
    argv: ["openclaw", "doctor", "--repair", "--yes", "--non-interactive"],
  };
}

export function createOpenClawDoctorRepairTool(options?: {
  agentSessionKey?: string;
  agentChannel?: string;
  agentAccountId?: string;
  currentChannelId?: string;
  currentThreadTs?: string | number;
  config?: OpenClawConfig;
}): AnyAgentTool {
  return {
    label: "OpenClaw Doctor Repair",
    name: "openclaw_doctor_repair",
    ownerOnly: true,
    description:
      "Preview or apply remote OpenClaw doctor repairs through the dedicated doctor.run gateway RPC. Requires explicit approval and a configured remote gateway route.",
    parameters: OpenClawDoctorRepairToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const actionRaw = readStringParam(params, "action", { required: true });
      if (!isDoctorRepairAction(actionRaw)) {
        throw new ToolInputError(`Unsupported openclaw_doctor_repair action: ${String(actionRaw)}`);
      }
      const action = actionRaw;
      const cfg = options?.config ?? loadConfig();
      const route = resolveDoctorRepairRoute(cfg);
      const mode = buildDoctorMode(action);
      const requestedTimeoutMs = resolveRequestedTimeoutMs(params);
      const timeoutMs = requestedTimeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
      const approval = buildDoctorApprovalCommand(mode);

      const decision = await requestExecApprovalDecisionForHost({
        approvalId: crypto.randomUUID(),
        command: approval.command,
        commandArgv: approval.argv,
        workdir: "<remote gateway>",
        host: "gateway",
        security: "full",
        ask: "always",
        sessionKey: options?.agentSessionKey,
        turnSourceChannel: options?.agentChannel,
        turnSourceTo: options?.currentChannelId,
        turnSourceAccountId: options?.agentAccountId,
        turnSourceThreadId: options?.currentThreadTs,
      });

      if (decision !== "allow-once" && decision !== "allow-always") {
        return jsonResult({
          ok: false,
          status: "not-approved",
          decision: decision ?? "timeout",
          mode,
          transport: route.transport,
          target: route.target,
        });
      }

      const gatewayResult = await callGatewayTool<{
        ok?: boolean;
        background?: boolean;
        pid?: number;
        exitCode?: number | null;
        timedOut?: boolean;
        stdoutTail?: string | null;
        stderrTail?: string | null;
        durationMs?: number;
      }>(
        "doctor.run",
        {
          timeoutMs: mode === "dry-run" ? timeoutMs + 5_000 : 30_000,
        },
        {
          mode,
          ...(requestedTimeoutMs !== undefined ? { timeoutMs: requestedTimeoutMs } : {}),
        },
      );

      return jsonResult({
        ok: gatewayResult?.ok !== false,
        decision,
        mode,
        transport: route.transport,
        target: route.target,
        result: gatewayResult,
      });
    },
  };
}
