import { listAgentIds, resolveDefaultAgentId } from "../../agents/agent-scope.js";
import {
  buildResolvedToolCatalogGroupsFromManifest,
  collectGatewayCapabilityInputs,
  resolveCapabilityManifest,
} from "../../agents/capabilities/index.js";
import { PROFILE_OPTIONS } from "../../agents/tool-catalog.js";
import { loadConfig } from "../../config/config.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateToolsCatalogParams,
} from "../protocol/index.js";
import type { GatewayRequestHandlers, RespondFn } from "./types.js";

function resolveAgentIdOrRespondError(rawAgentId: unknown, respond: RespondFn) {
  const cfg = loadConfig();
  const knownAgents = listAgentIds(cfg);
  const requestedAgentId = typeof rawAgentId === "string" ? rawAgentId.trim() : "";
  const agentId = requestedAgentId || resolveDefaultAgentId(cfg);
  if (requestedAgentId && !knownAgents.includes(agentId)) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, `unknown agent id "${requestedAgentId}"`),
    );
    return null;
  }
  return { cfg, agentId };
}

export const toolsCatalogHandlers: GatewayRequestHandlers = {
  "tools.catalog": ({ params, respond }) => {
    if (!validateToolsCatalogParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid tools.catalog params: ${formatValidationErrors(validateToolsCatalogParams.errors)}`,
        ),
      );
      return;
    }
    const resolved = resolveAgentIdOrRespondError(params.agentId, respond);
    if (!resolved) {
      return;
    }
    const includePlugins = params.includePlugins !== false;
    const collected = collectGatewayCapabilityInputs({
      config: resolved.cfg,
      agentId: resolved.agentId,
      includePlugins,
    });
    const manifest = resolveCapabilityManifest(collected);
    const groups = buildResolvedToolCatalogGroupsFromManifest({
      tools: collected.tools,
      manifest,
    });
    respond(
      true,
      {
        agentId: resolved.agentId,
        profiles: PROFILE_OPTIONS.map((profile) => ({ id: profile.id, label: profile.label })),
        groups,
      },
      undefined,
    );
  },
};
