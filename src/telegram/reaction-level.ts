<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
import type { OpenClawConfig } from "../config/config.js";
import {
  resolveReactionLevel,
  type ReactionLevel,
  type ResolvedReactionLevel as BaseResolvedReactionLevel,
} from "../utils/reaction-level.js";
>>>>>>> 81361755b (refactor(reactions): share reaction level resolver)
import { resolveTelegramAccount } from "./accounts.js";

export type TelegramReactionLevel = ReactionLevel;
export type ResolvedReactionLevel = BaseResolvedReactionLevel;

/**
 * Resolve the effective reaction level and its implications.
 */
export function resolveTelegramReactionLevel(params: {
  cfg: MoltbotConfig;
  accountId?: string;
}): ResolvedReactionLevel {
  const account = resolveTelegramAccount({
    cfg: params.cfg,
    accountId: params.accountId,
  });
  return resolveReactionLevel({
    value: account.config.reactionLevel,
    defaultLevel: "minimal",
    invalidFallback: "ack",
  });
}
