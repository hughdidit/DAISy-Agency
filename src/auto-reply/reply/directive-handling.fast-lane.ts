<<<<<<< HEAD
import type { ModelAliasIndex } from "../../agents/model-selection.js";
import type { MoltbotConfig } from "../../config/config.js";
import type { SessionEntry } from "../../config/sessions.js";
import type { MsgContext } from "../templating.js";
import type { ReplyPayload } from "../types.js";
=======
import type { ReplyPayload } from "../types.js";
<<<<<<< HEAD
import type { ApplyInlineDirectivesFastLaneParams } from "./directive-handling.params.js";
<<<<<<< HEAD
import type { ElevatedLevel, ReasoningLevel, ThinkLevel, VerboseLevel } from "./directives.js";
>>>>>>> 48fd9d7dc (refactor(auto-reply): share directive handling params)
import { handleDirectiveOnly } from "./directive-handling.impl.js";
import type { InlineDirectives } from "./directive-handling.parse.js";
=======
import { handleDirectiveOnly } from "./directive-handling.impl.js";
import { resolveCurrentDirectiveLevels } from "./directive-handling.levels.js";
>>>>>>> 22c1210a1 (refactor(auto-reply): share directive level resolution)
=======
import { handleDirectiveOnly } from "./directive-handling.impl.js";
import { resolveCurrentDirectiveLevels } from "./directive-handling.levels.js";
import type { ApplyInlineDirectivesFastLaneParams } from "./directive-handling.params.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { isDirectiveOnly } from "./directive-handling.parse.js";
import type { ElevatedLevel, ReasoningLevel, ThinkLevel, VerboseLevel } from "./directives.js";

<<<<<<< HEAD
export async function applyInlineDirectivesFastLane(params: {
  directives: InlineDirectives;
  commandAuthorized: boolean;
  ctx: MsgContext;
  cfg: MoltbotConfig;
  agentId?: string;
  isGroup: boolean;
  sessionEntry: SessionEntry;
  sessionStore: Record<string, SessionEntry>;
  sessionKey: string;
  storePath?: string;
  elevatedEnabled: boolean;
  elevatedAllowed: boolean;
  elevatedFailures?: Array<{ gate: string; key: string }>;
  messageProviderKey?: string;
  defaultProvider: string;
  defaultModel: string;
  aliasIndex: ModelAliasIndex;
  allowedModelKeys: Set<string>;
  allowedModelCatalog: Awaited<
    ReturnType<typeof import("../../agents/model-catalog.js").loadModelCatalog>
  >;
  resetModelOverride: boolean;
  provider: string;
  model: string;
  initialModelLabel: string;
  formatModelSwitchEvent: (label: string, alias?: string) => string;
  agentCfg?: NonNullable<MoltbotConfig["agents"]>["defaults"];
  modelState: {
    resolveDefaultThinkingLevel: () => Promise<ThinkLevel | undefined>;
    allowedModelKeys: Set<string>;
    allowedModelCatalog: Awaited<
      ReturnType<typeof import("../../agents/model-catalog.js").loadModelCatalog>
    >;
    resetModelOverride: boolean;
  };
}): Promise<{ directiveAck?: ReplyPayload; provider: string; model: string }> {
=======
export async function applyInlineDirectivesFastLane(
  params: ApplyInlineDirectivesFastLaneParams,
): Promise<{ directiveAck?: ReplyPayload; provider: string; model: string }> {
>>>>>>> 48fd9d7dc (refactor(auto-reply): share directive handling params)
  const {
    directives,
    commandAuthorized,
    ctx,
    cfg,
    agentId,
    isGroup,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    elevatedEnabled,
    elevatedAllowed,
    elevatedFailures,
    messageProviderKey,
    defaultProvider,
    defaultModel,
    aliasIndex,
    allowedModelKeys,
    allowedModelCatalog,
    resetModelOverride,
    formatModelSwitchEvent,
    modelState,
  } = params;

  let { provider, model } = params;
  if (
    !commandAuthorized ||
    isDirectiveOnly({
      directives,
      cleanedBody: directives.cleaned,
      ctx,
      cfg,
      agentId,
      isGroup,
    })
  ) {
    return { directiveAck: undefined, provider, model };
  }

  const agentCfg = params.agentCfg;
  const { currentThinkLevel, currentVerboseLevel, currentReasoningLevel, currentElevatedLevel } =
    await resolveCurrentDirectiveLevels({
      sessionEntry,
      agentCfg,
      resolveDefaultThinkingLevel: () => modelState.resolveDefaultThinkingLevel(),
    });

  const directiveAck = await handleDirectiveOnly({
    cfg,
    directives,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    elevatedEnabled,
    elevatedAllowed,
    elevatedFailures,
    messageProviderKey,
    defaultProvider,
    defaultModel,
    aliasIndex,
    allowedModelKeys,
    allowedModelCatalog,
    resetModelOverride,
    provider,
    model,
    initialModelLabel: params.initialModelLabel,
    formatModelSwitchEvent,
    currentThinkLevel,
    currentVerboseLevel,
    currentReasoningLevel,
    currentElevatedLevel,
  });

  if (sessionEntry?.providerOverride) {
    provider = sessionEntry.providerOverride;
  }
  if (sessionEntry?.modelOverride) {
    model = sessionEntry.modelOverride;
  }

  return { directiveAck, provider, model };
}
