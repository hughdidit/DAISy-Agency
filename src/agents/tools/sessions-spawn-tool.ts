<<<<<<< HEAD
import crypto from "node:crypto";

import { Type } from "@sinclair/typebox";

import { formatThinkingLevels, normalizeThinkLevel } from "../../auto-reply/thinking.js";
import { loadConfig } from "../../config/config.js";
import { callGateway } from "../../gateway/call.js";
import { normalizeAgentId, parseAgentSessionKey } from "../../routing/session-key.js";
import { normalizeDeliveryContext } from "../../utils/delivery-context.js";
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
import { resolveAgentConfig } from "../agent-scope.js";
import { AGENT_LANE_SUBAGENT } from "../lanes.js";
import { resolveDefaultModelForAgent } from "../model-selection.js";
import { optionalStringEnum } from "../schema/typebox.js";
import { buildSubagentSystemPrompt } from "../subagent-announce.js";
<<<<<<< HEAD
import { registerSubagentRun } from "../subagent-registry.js";
import type { AnyAgentTool } from "./common.js";
=======
import { getSubagentDepthFromSessionStore } from "../subagent-depth.js";
import { countActiveRunsForSession, registerSubagentRun } from "../subagent-registry.js";
>>>>>>> b8f66c260 (Agents: add nested subagent orchestration controls and reduce subagent token waste (#14447))
=======
import { Type } from "@sinclair/typebox";
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
import { optionalStringEnum } from "../schema/typebox.js";
import { spawnSubagentDirect } from "../subagent-spawn.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 5a3a448bc (feat(commands): add /subagents spawn command)
=======
import type { AnyAgentTool } from "./common.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { AnyAgentTool } from "./common.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { AnyAgentTool } from "./common.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { jsonResult, readStringParam } from "./common.js";

const SessionsSpawnToolSchema = Type.Object({
  task: Type.String(),
  label: Type.Optional(Type.String()),
  agentId: Type.Optional(Type.String()),
  model: Type.Optional(Type.String()),
  thinking: Type.Optional(Type.String()),
  runTimeoutSeconds: Type.Optional(Type.Number({ minimum: 0 })),
  // Back-compat: older callers used timeoutSeconds for this tool.
  timeoutSeconds: Type.Optional(Type.Number({ minimum: 0 })),
  cleanup: optionalStringEnum(["delete", "keep"] as const),
});

export function createSessionsSpawnTool(opts?: {
  agentSessionKey?: string;
  agentChannel?: GatewayMessageChannel;
  agentAccountId?: string;
  agentTo?: string;
  agentThreadId?: string | number;
  agentGroupId?: string | null;
  agentGroupChannel?: string | null;
  agentGroupSpace?: string | null;
  sandboxed?: boolean;
  /** Explicit agent ID override for cron/hook sessions where session key parsing may not work. */
  requesterAgentIdOverride?: string;
}): AnyAgentTool {
  return {
    label: "Sessions",
    name: "sessions_spawn",
    description:
      "Spawn a background sub-agent run in an isolated session and announce the result back to the requester chat.",
    parameters: SessionsSpawnToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const task = readStringParam(params, "task", { required: true });
      const label = typeof params.label === "string" ? params.label.trim() : "";
      const requestedAgentId = readStringParam(params, "agentId");
      const modelOverride = readStringParam(params, "model");
      const thinkingOverrideRaw = readStringParam(params, "thinking");
      const cleanup =
        params.cleanup === "keep" || params.cleanup === "delete" ? params.cleanup : "keep";
      // Back-compat: older callers used timeoutSeconds for this tool.
      const timeoutSecondsCandidate =
        typeof params.runTimeoutSeconds === "number"
          ? params.runTimeoutSeconds
          : typeof params.timeoutSeconds === "number"
            ? params.timeoutSeconds
            : undefined;
      const runTimeoutSeconds =
        typeof timeoutSecondsCandidate === "number" && Number.isFinite(timeoutSecondsCandidate)
          ? Math.max(0, Math.floor(timeoutSecondsCandidate))
          : undefined;

      const result = await spawnSubagentDirect(
        {
          task,
          label: label || undefined,
          agentId: requestedAgentId,
          model: modelOverride,
          thinking: thinkingOverrideRaw,
          runTimeoutSeconds,
          cleanup,
        },
        {
          agentSessionKey: opts?.agentSessionKey,
          agentChannel: opts?.agentChannel,
          agentAccountId: opts?.agentAccountId,
          agentTo: opts?.agentTo,
          agentThreadId: opts?.agentThreadId,
          agentGroupId: opts?.agentGroupId,
          agentGroupChannel: opts?.agentGroupChannel,
          agentGroupSpace: opts?.agentGroupSpace,
          requesterAgentIdOverride: opts?.requesterAgentIdOverride,
        },
      );

<<<<<<< HEAD
      const resolvedThinkingDefaultRaw =
        readStringParam(targetAgentConfig?.subagents ?? {}, "thinking") ??
        readStringParam(cfg.agents?.defaults?.subagents ?? {}, "thinking");

      let thinkingOverride: string | undefined;
      const thinkingCandidateRaw = thinkingOverrideRaw || resolvedThinkingDefaultRaw;
      if (thinkingCandidateRaw) {
        const normalized = normalizeThinkLevel(thinkingCandidateRaw);
        if (!normalized) {
          const { provider, model } = splitModelRef(resolvedModel);
          const hint = formatThinkingLevels(provider, model);
          return jsonResult({
            status: "error",
            error: `Invalid thinking level "${thinkingCandidateRaw}". Use one of: ${hint}.`,
          });
        }
        thinkingOverride = normalized;
      }
      try {
        await callGateway({
          method: "sessions.patch",
          params: { key: childSessionKey, spawnDepth: childDepth },
          timeoutMs: 10_000,
        });
      } catch (err) {
        const messageText =
          err instanceof Error ? err.message : typeof err === "string" ? err : "error";
        return jsonResult({
          status: "error",
          error: messageText,
          childSessionKey,
        });
      }

      if (resolvedModel) {
        try {
          await callGateway({
            method: "sessions.patch",
            params: { key: childSessionKey, model: resolvedModel },
            timeoutMs: 10_000,
          });
          modelApplied = true;
        } catch (err) {
          const messageText =
            err instanceof Error ? err.message : typeof err === "string" ? err : "error";
          const recoverable =
            messageText.includes("invalid model") || messageText.includes("model not allowed");
          if (!recoverable) {
            return jsonResult({
              status: "error",
              error: messageText,
              childSessionKey,
            });
          }
          modelWarning = messageText;
        }
      }
      const childSystemPrompt = buildSubagentSystemPrompt({
        requesterSessionKey,
        requesterOrigin,
        childSessionKey,
        label: label || undefined,
        task,
        childDepth,
        maxSpawnDepth,
      });

      const childIdem = crypto.randomUUID();
      let childRunId: string = childIdem;
      try {
        const response = await callGateway<{ runId: string }>({
          method: "agent",
          params: {
            message: task,
            sessionKey: childSessionKey,
            channel: requesterOrigin?.channel,
            idempotencyKey: childIdem,
            deliver: false,
            lane: AGENT_LANE_SUBAGENT,
            extraSystemPrompt: childSystemPrompt,
            thinking: thinkingOverride,
            timeout: runTimeoutSeconds,
            label: label || undefined,
            spawnedBy: spawnedByKey,
            groupId: opts?.agentGroupId ?? undefined,
            groupChannel: opts?.agentGroupChannel ?? undefined,
            groupSpace: opts?.agentGroupSpace ?? undefined,
          },
          timeoutMs: 10_000,
        });
        if (typeof response?.runId === "string" && response.runId) {
          childRunId = response.runId;
        }
      } catch (err) {
        const messageText =
          err instanceof Error ? err.message : typeof err === "string" ? err : "error";
        return jsonResult({
          status: "error",
          error: messageText,
          childSessionKey,
          runId: childRunId,
        });
      }

      registerSubagentRun({
        runId: childRunId,
        childSessionKey,
        requesterSessionKey: requesterInternalKey,
        requesterOrigin,
        requesterDisplayKey,
        task,
        cleanup,
        label: label || undefined,
        model: resolvedModel,
        runTimeoutSeconds,
      });

      return jsonResult({
        status: "accepted",
        childSessionKey,
        runId: childRunId,
        modelApplied: resolvedModel ? modelApplied : undefined,
        warning: modelWarning,
      });
=======
      return jsonResult(result);
>>>>>>> 5a3a448bc (feat(commands): add /subagents spawn command)
    },
  };
}
