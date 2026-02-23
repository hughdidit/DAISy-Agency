import type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
<<<<<<< HEAD
  MoltbotConfig,
} from "clawdbot/plugin-sdk";
import { jsonResult, readStringParam } from "clawdbot/plugin-sdk";

=======
  OpenClawConfig,
} from "openclaw/plugin-sdk";
import { extractToolSend, jsonResult, readStringParam } from "openclaw/plugin-sdk";
>>>>>>> 0183610db (refactor: de-duplicate channel runtime and payload helpers)
import { listEnabledZaloAccounts } from "./accounts.js";
import { sendMessageZalo } from "./send.js";

const providerId = "zalo";

function listEnabledAccounts(cfg: MoltbotConfig) {
  return listEnabledZaloAccounts(cfg).filter(
    (account) => account.enabled && account.tokenSource !== "none",
  );
}

export const zaloMessageActions: ChannelMessageActionAdapter = {
  listActions: ({ cfg }) => {
<<<<<<< HEAD
    const accounts = listEnabledAccounts(cfg as MoltbotConfig);
    if (accounts.length === 0) return [];
=======
    const accounts = listEnabledAccounts(cfg);
    if (accounts.length === 0) {
      return [];
    }
>>>>>>> 230ca789e (chore: Lint extensions folder.)
    const actions = new Set<ChannelMessageActionName>(["send"]);
    return Array.from(actions);
  },
  supportsButtons: () => false,
  extractToolSend: ({ args }) => extractToolSend(args, "sendMessage"),
  handleAction: async ({ action, params, cfg, accountId }) => {
    if (action === "send") {
      const to = readStringParam(params, "to", { required: true });
      const content = readStringParam(params, "message", {
        required: true,
        allowEmpty: true,
      });
      const mediaUrl = readStringParam(params, "media", { trim: false });

      const result = await sendMessageZalo(to ?? "", content ?? "", {
        accountId: accountId ?? undefined,
        mediaUrl: mediaUrl ?? undefined,
<<<<<<< HEAD
        cfg: cfg as MoltbotConfig,
=======
        cfg: cfg,
>>>>>>> 230ca789e (chore: Lint extensions folder.)
      });

      if (!result.ok) {
        return jsonResult({
          ok: false,
          error: result.error ?? "Failed to send Zalo message",
        });
      }

      return jsonResult({ ok: true, to, messageId: result.messageId });
    }

    throw new Error(`Action ${action} is not supported for provider ${providerId}.`);
  },
};
