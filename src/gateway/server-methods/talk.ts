<<<<<<< HEAD
<<<<<<< HEAD
import type { GatewayRequestHandlers } from "./types.js";
=======
=======
import type { GatewayRequestHandlers } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
import { readConfigFileSnapshot } from "../../config/config.js";
import { redactConfigObject } from "../../config/redact-snapshot.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateTalkModeParams,
} from "../protocol/index.js";

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
