<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
import type { GatewayRequestHandlers } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { readConfigFileSnapshot } from "../../config/config.js";
import { redactConfigObject } from "../../config/redact-snapshot.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateTalkModeParams,
} from "../protocol/index.js";
<<<<<<< HEAD
<<<<<<< HEAD
import type { GatewayRequestHandlers } from "./types.js";
<<<<<<< HEAD
=======
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { GatewayRequestHandlers } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)

const ADMIN_SCOPE = "operator.admin";
const TALK_SECRETS_SCOPE = "operator.talk.secrets";

function canReadTalkSecrets(client: { connect?: { scopes?: string[] } } | null): boolean {
  const scopes = Array.isArray(client?.connect?.scopes) ? client.connect.scopes : [];
  return scopes.includes(ADMIN_SCOPE) || scopes.includes(TALK_SECRETS_SCOPE);
}

function normalizeTalkConfigSection(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const source = value as Record<string, unknown>;
  const talk: Record<string, unknown> = {};
  if (typeof source.voiceId === "string") {
    talk.voiceId = source.voiceId;
  }
  if (
    source.voiceAliases &&
    typeof source.voiceAliases === "object" &&
    !Array.isArray(source.voiceAliases)
  ) {
    const aliases: Record<string, string> = {};
    for (const [alias, id] of Object.entries(source.voiceAliases as Record<string, unknown>)) {
      if (typeof id !== "string") {
        continue;
      }
      aliases[alias] = id;
    }
    if (Object.keys(aliases).length > 0) {
      talk.voiceAliases = aliases;
    }
  }
  if (typeof source.modelId === "string") {
    talk.modelId = source.modelId;
  }
  if (typeof source.outputFormat === "string") {
    talk.outputFormat = source.outputFormat;
  }
  if (typeof source.apiKey === "string") {
    talk.apiKey = source.apiKey;
  }
  if (typeof source.interruptOnSpeech === "boolean") {
    talk.interruptOnSpeech = source.interruptOnSpeech;
  }
  return Object.keys(talk).length > 0 ? talk : undefined;
}
>>>>>>> 90ef2d6bd (chore: Update formatting.)

export const talkHandlers: GatewayRequestHandlers = {
  "talk.mode": ({ params, respond, context, client, isWebchatConnect }) => {
    if (client && isWebchatConnect(client.connect) && !context.hasConnectedMobileNode()) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, "talk disabled: no connected iOS/Android nodes"),
      );
      return;
    }
    if (!validateTalkModeParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid talk.mode params: ${formatValidationErrors(validateTalkModeParams.errors)}`,
        ),
      );
      return;
    }
    const payload = {
      enabled: (params as { enabled: boolean }).enabled,
      phase: (params as { phase?: string }).phase ?? null,
      ts: Date.now(),
    };
    context.broadcast("talk.mode", payload, { dropIfSlow: true });
    respond(true, payload, undefined);
  },
};
