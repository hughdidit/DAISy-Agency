<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { detectBinary } from "../../../commands/onboard-helpers.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../../../config/config.js";
=======
import { detectBinary } from "../../../commands/onboard-helpers.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { detectBinary } from "../../../commands/onboard-helpers.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import type { OpenClawConfig } from "../../../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import type { DmPolicy } from "../../../config/types.js";
import {
  listIMessageAccountIds,
  resolveDefaultIMessageAccountId,
  resolveIMessageAccount,
} from "../../../imessage/accounts.js";
import { normalizeIMessageHandle } from "../../../imessage/targets.js";
import { formatDocsLink } from "../../../terminal/links.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { WizardPrompter } from "../../../wizard/prompts.js";
import type { ChannelOnboardingAdapter, ChannelOnboardingDmPolicy } from "../onboarding-types.js";
<<<<<<< HEAD
import { addWildcardAllowFrom, promptAccountId } from "./helpers.js";
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { WizardPrompter } from "../../../wizard/prompts.js";
import type { ChannelOnboardingAdapter, ChannelOnboardingDmPolicy } from "../onboarding-types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { WizardPrompter } from "../../../wizard/prompts.js";
import type { ChannelOnboardingAdapter, ChannelOnboardingDmPolicy } from "../onboarding-types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { addWildcardAllowFrom, mergeAllowFromEntries, promptAccountId } from "./helpers.js";
>>>>>>> 64f5e4a42 (refactor(onboarding): reuse allowlist merge across channels)

const channel = "imessage" as const;

function setIMessageDmPolicy(cfg: MoltbotConfig, dmPolicy: DmPolicy) {
  const allowFrom =
    dmPolicy === "open" ? addWildcardAllowFrom(cfg.channels?.imessage?.allowFrom) : undefined;
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      imessage: {
        ...cfg.channels?.imessage,
        dmPolicy,
        ...(allowFrom ? { allowFrom } : {}),
      },
    },
  };
}

function setIMessageAllowFrom(
  cfg: MoltbotConfig,
  accountId: string,
  allowFrom: string[],
): MoltbotConfig {
  if (accountId === DEFAULT_ACCOUNT_ID) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        imessage: {
          ...cfg.channels?.imessage,
          allowFrom,
        },
      },
    };
  }
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      imessage: {
        ...cfg.channels?.imessage,
        accounts: {
          ...cfg.channels?.imessage?.accounts,
          [accountId]: {
            ...cfg.channels?.imessage?.accounts?.[accountId],
            allowFrom,
          },
        },
      },
    },
  };
}

function parseIMessageAllowFromInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
=======
import {
  parseOnboardingEntriesAllowingWildcard,
  patchChannelConfigForAccount,
  promptParsedAllowFromForScopedChannel,
  resolveAccountIdForConfigure,
  setChannelDmPolicyWithAllowFrom,
  setOnboardingChannelEnabled,
} from "./helpers.js";

const channel = "imessage" as const;

export function parseIMessageAllowFromEntries(raw: string): { entries: string[]; error?: string } {
  return parseOnboardingEntriesAllowingWildcard(raw, (entry) => {
    const lower = entry.toLowerCase();
    if (lower.startsWith("chat_id:")) {
      const id = entry.slice("chat_id:".length).trim();
      if (!/^\d+$/.test(id)) {
        return { error: `Invalid chat_id: ${entry}` };
      }
      return { value: entry };
    }
    if (lower.startsWith("chat_guid:")) {
      if (!entry.slice("chat_guid:".length).trim()) {
        return { error: "Invalid chat_guid entry" };
      }
      return { value: entry };
    }
    if (lower.startsWith("chat_identifier:")) {
      if (!entry.slice("chat_identifier:".length).trim()) {
        return { error: "Invalid chat_identifier entry" };
      }
      return { value: entry };
    }
    if (!normalizeIMessageHandle(entry)) {
      return { error: `Invalid handle: ${entry}` };
    }
    return { value: entry };
  });
>>>>>>> 32a1273d8 (refactor(onboarding): dedupe channel allowlist flows)
}

async function promptIMessageAllowFrom(params: {
  cfg: MoltbotConfig;
  prompter: WizardPrompter;
  accountId?: string;
}): Promise<MoltbotConfig> {
  const accountId =
    params.accountId && normalizeAccountId(params.accountId)
      ? (normalizeAccountId(params.accountId) ?? DEFAULT_ACCOUNT_ID)
      : resolveDefaultIMessageAccountId(params.cfg);
  const resolved = resolveIMessageAccount({ cfg: params.cfg, accountId });
  const existing = resolved.config.allowFrom ?? [];
  await params.prompter.note(
    [
=======
    prompter: params.prompter,
    noteTitle: "iMessage allowlist",
    noteLines: [
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
      "Allowlist iMessage DMs by handle or chat target.",
      "Examples:",
      "- +15555550123",
      "- user@example.com",
      "- chat_id:123",
      "- chat_guid:... or chat_identifier:...",
      "Multiple entries: comma-separated.",
      `Docs: ${formatDocsLink("/imessage", "imessage")}`,
    ],
    message: "iMessage allowFrom (handle or chat_id)",
    placeholder: "+15555550123, user@example.com, chat_id:123",
    parseEntries: parseIMessageAllowFromEntries,
    getExistingAllowFrom: ({ cfg, accountId }) => {
      const resolved = resolveIMessageAccount({ cfg, accountId });
      return resolved.config.allowFrom ?? [];
    },
  });
}

const dmPolicy: ChannelOnboardingDmPolicy = {
  label: "iMessage",
  channel,
  policyKey: "channels.imessage.dmPolicy",
  allowFromKey: "channels.imessage.allowFrom",
  getCurrent: (cfg) => cfg.channels?.imessage?.dmPolicy ?? "pairing",
  setPolicy: (cfg, policy) =>
    setChannelDmPolicyWithAllowFrom({
      cfg,
      channel: "imessage",
      dmPolicy: policy,
    }),
  promptAllowFrom: promptIMessageAllowFrom,
};

export const imessageOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  getStatus: async ({ cfg }) => {
    const configured = listIMessageAccountIds(cfg).some((accountId) => {
      const account = resolveIMessageAccount({ cfg, accountId });
      return Boolean(
        account.config.cliPath ||
        account.config.dbPath ||
        account.config.allowFrom ||
        account.config.service ||
        account.config.region,
      );
    });
    const imessageCliPath = cfg.channels?.imessage?.cliPath ?? "imsg";
    const imessageCliDetected = await detectBinary(imessageCliPath);
    return {
      channel,
      configured,
      statusLines: [
        `iMessage: ${configured ? "configured" : "needs setup"}`,
        `imsg: ${imessageCliDetected ? "found" : "missing"} (${imessageCliPath})`,
      ],
      selectionHint: imessageCliDetected ? "imsg found" : "imsg missing",
      quickstartScore: imessageCliDetected ? 1 : 0,
    };
  },
  configure: async ({ cfg, prompter, accountOverrides, shouldPromptAccountIds }) => {
    const defaultIMessageAccountId = resolveDefaultIMessageAccountId(cfg);
    const imessageAccountId = await resolveAccountIdForConfigure({
      cfg,
      prompter,
      label: "iMessage",
      accountOverride: accountOverrides.imessage,
      shouldPromptAccountIds,
      listAccountIds: listIMessageAccountIds,
      defaultAccountId: defaultIMessageAccountId,
    });

    let next = cfg;
    const resolvedAccount = resolveIMessageAccount({
      cfg: next,
      accountId: imessageAccountId,
    });
    let resolvedCliPath = resolvedAccount.config.cliPath ?? "imsg";
    const cliDetected = await detectBinary(resolvedCliPath);
    if (!cliDetected) {
      const entered = await prompter.text({
        message: "imsg CLI path",
        initialValue: resolvedCliPath,
        validate: (value) => (value?.trim() ? undefined : "Required"),
      });
      resolvedCliPath = String(entered).trim();
      if (!resolvedCliPath) {
        await prompter.note("imsg CLI path required to enable iMessage.", "iMessage");
      }
    }

    if (resolvedCliPath) {
      next = patchChannelConfigForAccount({
        cfg: next,
        channel: "imessage",
        accountId: imessageAccountId,
        patch: { cliPath: resolvedCliPath },
      });
    }

    await prompter.note(
      [
        "This is still a work in progress.",
        "Ensure Moltbot has Full Disk Access to Messages DB.",
        "Grant Automation permission for Messages when prompted.",
        "List chats with: imsg chats --limit 20",
        `Docs: ${formatDocsLink("/imessage", "imessage")}`,
      ].join("\n"),
      "iMessage next steps",
    );

    return { cfg: next, accountId: imessageAccountId };
  },
  dmPolicy,
  disable: (cfg) => setOnboardingChannelEnabled(cfg, channel, false),
};
