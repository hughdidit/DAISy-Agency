<<<<<<< HEAD
import type { ChannelGroupContext } from "clawdbot/plugin-sdk";

=======
import type { ChannelGroupContext } from "openclaw/plugin-sdk";
>>>>>>> f06dd8df0 (chore: Enable "experimentalSortImports" in Oxfmt and reformat all imorts.)
import { resolveMattermostAccount } from "./mattermost/accounts.js";

export function resolveMattermostGroupRequireMention(
  params: ChannelGroupContext,
): boolean | undefined {
  const account = resolveMattermostAccount({
    cfg: params.cfg,
    accountId: params.accountId,
  });
  if (typeof account.requireMention === "boolean") return account.requireMention;
  return true;
}
