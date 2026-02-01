import type { WebhookContext, WebhookVerificationResult } from "../../types.js";
<<<<<<< HEAD
import type { Logger } from "../../manager/context.js";
import { defaultLogger, sanitizeLogValue } from "../../manager/context.js";
import { verifyTwilioWebhook } from "../../webhook-security.js";

=======
>>>>>>> f06dd8df0 (chore: Enable "experimentalSortImports" in Oxfmt and reformat all imorts.)
import type { TwilioProviderOptions } from "../twilio.js";
import { verifyTwilioWebhook } from "../../webhook-security.js";

export function verifyTwilioProviderWebhook(params: {
  ctx: WebhookContext;
  authToken: string;
  currentPublicUrl?: string | null;
  options: TwilioProviderOptions;
  logger?: Logger;
}): WebhookVerificationResult {
  const logger = params.logger ?? defaultLogger;
  const result = verifyTwilioWebhook(params.ctx, params.authToken, {
    publicUrl: params.currentPublicUrl || undefined,
    allowNgrokFreeTierLoopbackBypass:
      params.options.allowNgrokFreeTierLoopbackBypass ?? false,
    skipVerification: params.options.skipVerification,
  });

  if (!result.ok) {
    logger.warn(`[twilio] Webhook verification failed: ${sanitizeLogValue(result.reason ?? "unknown")}`);
    if (result.verificationUrl) {
      logger.warn(`[twilio] Verification URL: ${sanitizeLogValue(result.verificationUrl)}`);
    }
  }

  return {
    ok: result.ok,
    reason: result.reason,
  };
}
