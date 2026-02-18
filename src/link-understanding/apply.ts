<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
import type { MsgContext } from "../auto-reply/templating.js";
import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.js";
=======
import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.js";
import type { MsgContext } from "../auto-reply/templating.js";
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { MsgContext } from "../auto-reply/templating.js";
import type { OpenClawConfig } from "../config/config.js";
import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.js";
import type { MsgContext } from "../auto-reply/templating.js";
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { MsgContext } from "../auto-reply/templating.js";
import type { OpenClawConfig } from "../config/config.js";
import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.js";
import type { MsgContext } from "../auto-reply/templating.js";
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { formatLinkUnderstandingBody } from "./format.js";
import { runLinkUnderstanding } from "./runner.js";

export type ApplyLinkUnderstandingResult = {
  outputs: string[];
  urls: string[];
};

export async function applyLinkUnderstanding(params: {
  ctx: MsgContext;
  cfg: MoltbotConfig;
}): Promise<ApplyLinkUnderstandingResult> {
  const result = await runLinkUnderstanding({
    cfg: params.cfg,
    ctx: params.ctx,
  });

  if (result.outputs.length === 0) {
    return result;
  }

  params.ctx.LinkUnderstanding = [...(params.ctx.LinkUnderstanding ?? []), ...result.outputs];
  params.ctx.Body = formatLinkUnderstandingBody({
    body: params.ctx.Body,
    outputs: result.outputs,
  });

  finalizeInboundContext(params.ctx, {
    forceBodyForAgent: true,
    forceBodyForCommands: true,
  });

  return result;
}
