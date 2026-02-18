<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
// @ts-nocheck
=======
import type { ApiClientOptions } from "grammy";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { ApiClientOptions } from "grammy";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { sequentialize } from "@grammyjs/runner";
import { apiThrottler } from "@grammyjs/transformer-throttler";
<<<<<<< HEAD
<<<<<<< HEAD
import type { ApiClientOptions } from "grammy";
=======
import { ReactionTypeEmoji } from "@grammyjs/types";
>>>>>>> 147eba11f (chore: Manually fix TypeScript errors uncovered by sorting imports.)
import { Bot, webhookCallback } from "grammy";
=======
import { type Message, ReactionTypeEmoji } from "@grammyjs/types";
=======
import type { ApiClientOptions } from "grammy";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { sequentialize } from "@grammyjs/runner";
import { apiThrottler } from "@grammyjs/transformer-throttler";
<<<<<<< HEAD
import { type Message, type UserFromGetMe, ReactionTypeEmoji } from "@grammyjs/types";
>>>>>>> 96abc1c86 (Telegram: remove @ts-nocheck from bot.ts, fix duplicate error handler, harden sticker caching (#9077))
=======
import { type Message, type UserFromGetMe } from "@grammyjs/types";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> cd4f7524e (feat(telegram): receive and surface user message reactions (#10075))
import { Bot, webhookCallback } from "grammy";
import type { OpenClawConfig, ReplyToMode } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
<<<<<<< HEAD
import type { TelegramContext } from "./bot/types.js";
>>>>>>> da6de4981 (Telegram: use Grammy types directly, add typed Probe/Audit to plugin interface (#8403))
=======
>>>>>>> a69e82765 (fix(telegram): stream replies in-place without duplicate final sends)
=======
import type { ApiClientOptions } from "grammy";
import { Bot, webhookCallback } from "grammy";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { Bot, webhookCallback } from "grammy";
import type { OpenClawConfig, ReplyToMode } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
>>>>>>> ed11e93cf (chore(format))
=======
import type { ApiClientOptions } from "grammy";
import { Bot, webhookCallback } from "grammy";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { Bot, webhookCallback } from "grammy";
import type { OpenClawConfig, ReplyToMode } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { ApiClientOptions } from "grammy";
import { Bot, webhookCallback } from "grammy";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
<<<<<<< HEAD
import { isControlCommandMessage } from "../auto-reply/command-detection.js";
import { resolveTextChunkLimit } from "../auto-reply/chunk.js";
=======
import { resolveTextChunkLimit } from "../auto-reply/chunk.js";
import { isAbortRequestText } from "../auto-reply/reply/abort.js";
>>>>>>> b2aa6e094 (fix(telegram): prevent non-abort slash commands from racing chat replies (#17899))
import { DEFAULT_GROUP_HISTORY_LIMIT, type HistoryEntry } from "../auto-reply/reply/history.js";
import {
  isNativeCommandsExplicitlyDisabled,
  resolveNativeCommandsEnabled,
  resolveNativeSkillsEnabled,
} from "../config/commands.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig, ReplyToMode } from "../config/config.js";
=======
import type { OpenClawConfig, ReplyToMode } from "../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OpenClawConfig, ReplyToMode } from "../config/config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { OpenClawConfig, ReplyToMode } from "../config/config.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { loadConfig } from "../config/config.js";
import {
  resolveChannelGroupPolicy,
  resolveChannelGroupRequireMention,
} from "../config/group-policy.js";
import { loadSessionStore, resolveStorePath } from "../config/sessions.js";
import { danger, logVerbose, shouldLogVerbose } from "../globals.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { formatUncaughtError } from "../infra/errors.js";
import { getChildLogger } from "../logging.js";
<<<<<<< HEAD
import { withTelegramApiErrorLogging } from "./api-logging.js";
import { resolveAgentRoute } from "../routing/resolve-route.js";
<<<<<<< HEAD
import { resolveThreadSessionKeys } from "../routing/session-key.js";
import type { RuntimeEnv } from "../runtime.js";
=======
>>>>>>> 96abc1c86 (Telegram: remove @ts-nocheck from bot.ts, fix duplicate error handler, harden sticker caching (#9077))
import { resolveTelegramAccount } from "./accounts.js";
import {
  buildTelegramGroupPeerId,
  resolveTelegramForumThreadId,
  resolveTelegramStreamMode,
} from "./bot/helpers.js";
import type { TelegramContext, TelegramMessage } from "./bot/types.js";
=======
import { createSubsystemLogger } from "../logging/subsystem.js";
import type { RuntimeEnv } from "../runtime.js";
import { resolveTelegramAccount } from "./accounts.js";
>>>>>>> a69e82765 (fix(telegram): stream replies in-place without duplicate final sends)
import { registerTelegramHandlers } from "./bot-handlers.js";
import { createTelegramMessageProcessor } from "./bot-message.js";
import { registerTelegramNativeCommands } from "./bot-native-commands.js";
import {
  buildTelegramUpdateKey,
  createTelegramUpdateDedupe,
  resolveTelegramUpdateId,
  type TelegramUpdateKeyContext,
} from "./bot-updates.js";
<<<<<<< HEAD
=======
import {
  buildTelegramGroupPeerId,
  resolveTelegramForumThreadId,
  resolveTelegramStreamMode,
} from "./bot/helpers.js";
>>>>>>> ddedb56c0 (fix(telegram): pass parentPeer for forum topic binding inheritance (#9789))
import { resolveTelegramFetch } from "./fetch.js";

export type TelegramBotOptions = {
  token: string;
  accountId?: string;
  runtime?: RuntimeEnv;
  requireMention?: boolean;
  allowFrom?: Array<string | number>;
  groupAllowFrom?: Array<string | number>;
  mediaMaxMb?: number;
  replyToMode?: ReplyToMode;
  proxyFetch?: typeof fetch;
  config?: MoltbotConfig;
  updateOffset?: {
    lastUpdateId?: number | null;
    onUpdateId?: (updateId: number) => void | Promise<void>;
  };
  testTimings?: {
    mediaGroupFlushMs?: number;
    textFragmentGapMs?: number;
  };
};

export function getTelegramSequentialKey(ctx: {
  chat?: { id?: number };
  me?: UserFromGetMe;
  message?: Message;
  update?: {
    message?: Message;
    edited_message?: Message;
    callback_query?: { message?: Message };
    message_reaction?: { chat?: { id?: number } };
  };
}): string {
  // Handle reaction updates
  const reaction = ctx.update?.message_reaction;
  if (reaction?.chat?.id) {
    return `telegram:${reaction.chat.id}`;
  }
  const msg =
    ctx.message ??
    ctx.update?.message ??
    ctx.update?.edited_message ??
    ctx.update?.callback_query?.message;
  const chatId = msg?.chat?.id ?? ctx.chat?.id;
  const rawText = msg?.text ?? msg?.caption;
  const botUsername = ctx.me?.username;
  if (isAbortRequestText(rawText, botUsername ? { botUsername } : undefined)) {
    if (typeof chatId === "number") {
      return `telegram:${chatId}:control`;
    }
    return "telegram:control";
  }
  const isGroup = msg?.chat?.type === "group" || msg?.chat?.type === "supergroup";
  const messageThreadId = msg?.message_thread_id;
  const isForum = msg?.chat?.is_forum;
  const threadId = isGroup
    ? resolveTelegramForumThreadId({ isForum, messageThreadId })
    : messageThreadId;
  if (typeof chatId === "number") {
    return threadId != null ? `telegram:${chatId}:topic:${threadId}` : `telegram:${chatId}`;
  }
  return "telegram:unknown";
}

export function createTelegramBot(opts: TelegramBotOptions) {
  const runtime: RuntimeEnv = opts.runtime ?? {
    log: console.log,
    error: console.error,
    exit: (code: number): never => {
      throw new Error(`exit ${code}`);
    },
  };
  const cfg = opts.config ?? loadConfig();
  const account = resolveTelegramAccount({
    cfg,
    accountId: opts.accountId,
  });
  const telegramCfg = account.config;

  const fetchImpl = resolveTelegramFetch(opts.proxyFetch, {
    network: telegramCfg.network,
  }) as unknown as ApiClientOptions["fetch"];
  const shouldProvideFetch = Boolean(fetchImpl);
  // grammY's ApiClientOptions types still track `node-fetch` types; Node 22+ global fetch
  // (undici) is structurally compatible at runtime but not assignable in TS.
  const fetchForClient = fetchImpl as unknown as NonNullable<ApiClientOptions["fetch"]>;
  const timeoutSeconds =
    typeof telegramCfg?.timeoutSeconds === "number" && Number.isFinite(telegramCfg.timeoutSeconds)
      ? Math.max(1, Math.floor(telegramCfg.timeoutSeconds))
      : undefined;
  const client: ApiClientOptions | undefined =
    shouldProvideFetch || timeoutSeconds
      ? {
          ...(shouldProvideFetch && fetchImpl ? { fetch: fetchForClient } : {}),
          ...(timeoutSeconds ? { timeoutSeconds } : {}),
        }
      : undefined;

  const bot = new Bot(opts.token, client ? { client } : undefined);
  bot.api.config.use(apiThrottler());
  bot.use(sequentialize(getTelegramSequentialKey));
  // Catch all errors from bot middleware to prevent unhandled rejections
  bot.catch((err) => {
    runtime.error?.(danger(`telegram bot error: ${formatUncaughtError(err)}`));
  });

  const recentUpdates = createTelegramUpdateDedupe();
  let lastUpdateId =
    typeof opts.updateOffset?.lastUpdateId === "number" ? opts.updateOffset.lastUpdateId : null;

  const recordUpdateId = (ctx: TelegramUpdateKeyContext) => {
    const updateId = resolveTelegramUpdateId(ctx);
    if (typeof updateId !== "number") {
      return;
    }
    if (lastUpdateId !== null && updateId <= lastUpdateId) {
      return;
    }
    lastUpdateId = updateId;
    void opts.updateOffset?.onUpdateId?.(updateId);
  };

  const shouldSkipUpdate = (ctx: TelegramUpdateKeyContext) => {
    const updateId = resolveTelegramUpdateId(ctx);
    if (typeof updateId === "number" && lastUpdateId !== null) {
      if (updateId <= lastUpdateId) {
        return true;
      }
    }
    const key = buildTelegramUpdateKey(ctx);
    const skipped = recentUpdates.check(key);
    if (skipped && key && shouldLogVerbose()) {
      logVerbose(`telegram dedupe: skipped ${key}`);
    }
    return skipped;
  };

  const rawUpdateLogger = createSubsystemLogger("gateway/channels/telegram/raw-update");
  const MAX_RAW_UPDATE_CHARS = 8000;
  const MAX_RAW_UPDATE_STRING = 500;
  const MAX_RAW_UPDATE_ARRAY = 20;
  const stringifyUpdate = (update: unknown) => {
    const seen = new WeakSet();
    return JSON.stringify(update ?? null, (key, value) => {
      if (typeof value === "string" && value.length > MAX_RAW_UPDATE_STRING) {
        return `${value.slice(0, MAX_RAW_UPDATE_STRING)}...`;
      }
      if (Array.isArray(value) && value.length > MAX_RAW_UPDATE_ARRAY) {
        return [
          ...value.slice(0, MAX_RAW_UPDATE_ARRAY),
          `...(${value.length - MAX_RAW_UPDATE_ARRAY} more)`,
        ];
      }
      if (value && typeof value === "object") {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    });
  };

  bot.use(async (ctx, next) => {
    if (shouldLogVerbose()) {
      try {
        const raw = stringifyUpdate(ctx.update);
        const preview =
          raw.length > MAX_RAW_UPDATE_CHARS ? `${raw.slice(0, MAX_RAW_UPDATE_CHARS)}...` : raw;
        rawUpdateLogger.debug(`telegram update: ${preview}`);
      } catch (err) {
        rawUpdateLogger.debug(`telegram update log failed: ${String(err)}`);
      }
    }
    await next();
    recordUpdateId(ctx);
  });

  const historyLimit = Math.max(
    0,
    telegramCfg.historyLimit ??
      cfg.messages?.groupChat?.historyLimit ??
      DEFAULT_GROUP_HISTORY_LIMIT,
  );
  const groupHistories = new Map<string, HistoryEntry[]>();
  const textLimit = resolveTextChunkLimit(cfg, "telegram", account.accountId);
  const dmPolicy = telegramCfg.dmPolicy ?? "pairing";
  const allowFrom = opts.allowFrom ?? telegramCfg.allowFrom;
  const groupAllowFrom =
    opts.groupAllowFrom ??
    telegramCfg.groupAllowFrom ??
    (telegramCfg.allowFrom && telegramCfg.allowFrom.length > 0
      ? telegramCfg.allowFrom
      : undefined) ??
    (opts.allowFrom && opts.allowFrom.length > 0 ? opts.allowFrom : undefined);
<<<<<<< HEAD
  const replyToMode = opts.replyToMode ?? telegramCfg.replyToMode ?? "first";
  const streamMode = resolveTelegramStreamMode(telegramCfg);
=======
  const replyToMode = opts.replyToMode ?? telegramCfg.replyToMode ?? "off";
>>>>>>> ad96c126e (fix(telegram): change default replyToMode from "first" to "off")
  const nativeEnabled = resolveNativeCommandsEnabled({
    providerId: "telegram",
    providerSetting: telegramCfg.commands?.native,
    globalSetting: cfg.commands?.native,
  });
  const nativeSkillsEnabled = resolveNativeSkillsEnabled({
    providerId: "telegram",
    providerSetting: telegramCfg.commands?.nativeSkills,
    globalSetting: cfg.commands?.nativeSkills,
  });
  const nativeDisabledExplicit = isNativeCommandsExplicitlyDisabled({
    providerSetting: telegramCfg.commands?.native,
    globalSetting: cfg.commands?.native,
  });
  const useAccessGroups = cfg.commands?.useAccessGroups !== false;
  const ackReactionScope = cfg.messages?.ackReactionScope ?? "group-mentions";
  const mediaMaxBytes = (opts.mediaMaxMb ?? telegramCfg.mediaMaxMb ?? 5) * 1024 * 1024;
  const logger = getChildLogger({ module: "telegram-auto-reply" });
<<<<<<< HEAD
  let botHasTopicsEnabled: boolean | undefined;
  const resolveBotTopicsEnabled = async (ctx?: TelegramContext) => {
    if (typeof ctx?.me?.has_topics_enabled === "boolean") {
      botHasTopicsEnabled = ctx.me.has_topics_enabled;
      return botHasTopicsEnabled;
    }
    if (typeof botHasTopicsEnabled === "boolean") {
      return botHasTopicsEnabled;
    }
    try {
      const me = await withTelegramApiErrorLogging({
        operation: "getMe",
        runtime,
        fn: () => bot.api.getMe(),
      });
      botHasTopicsEnabled = Boolean(me?.has_topics_enabled);
    } catch (err) {
      logVerbose(`telegram getMe failed: ${String(err)}`);
      botHasTopicsEnabled = false;
    }
    return botHasTopicsEnabled;
  };
=======
  const streamMode = resolveTelegramStreamMode(telegramCfg);
>>>>>>> a69e82765 (fix(telegram): stream replies in-place without duplicate final sends)
  const resolveGroupPolicy = (chatId: string | number) =>
    resolveChannelGroupPolicy({
      cfg,
      channel: "telegram",
      accountId: account.accountId,
      groupId: String(chatId),
    });
  const resolveGroupActivation = (params: {
    chatId: string | number;
    agentId?: string;
    messageThreadId?: number;
    sessionKey?: string;
  }) => {
    const agentId = params.agentId ?? resolveDefaultAgentId(cfg);
    const sessionKey =
      params.sessionKey ??
      `agent:${agentId}:telegram:group:${buildTelegramGroupPeerId(params.chatId, params.messageThreadId)}`;
    const storePath = resolveStorePath(cfg.session?.store, { agentId });
    try {
      const store = loadSessionStore(storePath);
      const entry = store[sessionKey];
      if (entry?.groupActivation === "always") {
        return false;
      }
      if (entry?.groupActivation === "mention") {
        return true;
      }
    } catch (err) {
      logVerbose(`Failed to load session for activation check: ${String(err)}`);
    }
    return undefined;
  };
  const resolveGroupRequireMention = (chatId: string | number) =>
    resolveChannelGroupRequireMention({
      cfg,
      channel: "telegram",
      accountId: account.accountId,
      groupId: String(chatId),
      requireMentionOverride: opts.requireMention,
      overrideOrder: "after-config",
    });
  const resolveTelegramGroupConfig = (chatId: string | number, messageThreadId?: number) => {
    const groups = telegramCfg.groups;
    if (!groups) {
      return { groupConfig: undefined, topicConfig: undefined };
    }
    const groupKey = String(chatId);
    const groupConfig = groups[groupKey] ?? groups["*"];
    const topicConfig =
      messageThreadId != null ? groupConfig?.topics?.[String(messageThreadId)] : undefined;
    return { groupConfig, topicConfig };
  };

  const processMessage = createTelegramMessageProcessor({
    bot,
    cfg,
    account,
    telegramCfg,
    historyLimit,
    groupHistories,
    dmPolicy,
    allowFrom,
    groupAllowFrom,
    ackReactionScope,
    logger,
    resolveGroupActivation,
    resolveGroupRequireMention,
    resolveTelegramGroupConfig,
    runtime,
    replyToMode,
    streamMode,
    textLimit,
    opts,
  });

  registerTelegramNativeCommands({
    bot,
    cfg,
    runtime,
    accountId: account.accountId,
    telegramCfg,
    allowFrom,
    groupAllowFrom,
    replyToMode,
    textLimit,
    useAccessGroups,
    nativeEnabled,
    nativeSkillsEnabled,
    nativeDisabledExplicit,
    resolveGroupPolicy,
    resolveTelegramGroupConfig,
    shouldSkipUpdate,
    opts,
  });

  registerTelegramHandlers({
    cfg,
    accountId: account.accountId,
    bot,
    opts,
    runtime,
    mediaMaxBytes,
    telegramCfg,
    groupAllowFrom,
    resolveGroupPolicy,
    resolveTelegramGroupConfig,
    shouldSkipUpdate,
    processMessage,
    logger,
  });

  return bot;
}

export function createTelegramWebhookCallback(bot: Bot, path = "/telegram-webhook") {
  return { path, handler: webhookCallback(bot, "http") };
}
