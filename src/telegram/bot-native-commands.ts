import type { Bot, Context } from "grammy";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
import type { CommandArgs } from "../auto-reply/commands-registry.js";
import type { OpenClawConfig } from "../config/config.js";
import type { ChannelGroupPolicy } from "../config/group-policy.js";
import type {
  ReplyToMode,
  TelegramAccountConfig,
  TelegramGroupConfig,
  TelegramTopicConfig,
} from "../config/types.js";
import type { RuntimeEnv } from "../runtime.js";
import type { TelegramContext } from "./bot/types.js";
<<<<<<< HEAD
>>>>>>> da6de4981 (Telegram: use Grammy types directly, add typed Probe/Audit to plugin interface (#8403))
import { resolveEffectiveMessagesConfig } from "../agents/identity.js";
=======
>>>>>>> 5d82c8231 (feat: per-channel responsePrefix override (#9001))
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { resolveChunkMode } from "../auto-reply/chunk.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { CommandArgs } from "../auto-reply/commands-registry.js";
import type { OpenClawConfig } from "../config/config.js";
import type { ChannelGroupPolicy } from "../config/group-policy.js";
import type {
  ReplyToMode,
  TelegramAccountConfig,
  TelegramGroupConfig,
  TelegramTopicConfig,
} from "../config/types.js";
import type { RuntimeEnv } from "../runtime.js";
import type { TelegramContext } from "./bot/types.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { resolveChunkMode } from "../auto-reply/chunk.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { CommandArgs } from "../auto-reply/commands-registry.js";
import type { OpenClawConfig } from "../config/config.js";
import type { ChannelGroupPolicy } from "../config/group-policy.js";
import type {
  ReplyToMode,
  TelegramAccountConfig,
  TelegramGroupConfig,
  TelegramTopicConfig,
} from "../config/types.js";
import type { RuntimeEnv } from "../runtime.js";
import type { TelegramContext } from "./bot/types.js";
import { resolveChunkMode } from "../auto-reply/chunk.js";
import {
  buildCommandTextFromArgs,
  findCommandByNativeName,
  listNativeCommandSpecs,
  listNativeCommandSpecsForConfig,
  parseCommandArgs,
  resolveCommandArgMenu,
} from "../auto-reply/commands-registry.js";
import { listSkillCommandsForAgents } from "../auto-reply/skill-commands.js";
<<<<<<< HEAD
import type { CommandArgs } from "../auto-reply/commands-registry.js";
=======
import { resolveCommandAuthorizedFromAuthorizers } from "../channels/command-gating.js";
import { createReplyPrefixOptions } from "../channels/reply-prefix.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
>>>>>>> 5d82c8231 (feat: per-channel responsePrefix override (#9001))
import { resolveTelegramCustomCommands } from "../config/telegram-custom-commands.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { dispatchReplyWithBufferedBlockDispatcher } from "../auto-reply/reply/provider-dispatcher.js";
import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.js";
import { danger, logVerbose } from "../globals.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
import { withTelegramApiErrorLogging } from "./api-logging.js";
import {
  normalizeTelegramCommandName,
  TELEGRAM_COMMAND_NAME_PATTERN,
} from "../config/telegram-custom-commands.js";
<<<<<<< HEAD
<<<<<<< HEAD
import { resolveAgentRoute } from "../routing/resolve-route.js";
import { resolveThreadSessionKeys } from "../routing/session-key.js";
import { resolveCommandAuthorizedFromAuthorizers } from "../channels/command-gating.js";
=======
=======
>>>>>>> cc2249a43 (refactor(telegram): extract native command menu helpers)
=======
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import type {
  ReplyToMode,
  TelegramAccountConfig,
  TelegramGroupConfig,
  TelegramTopicConfig,
} from "../config/types.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { danger, logVerbose } from "../globals.js";
import { getChildLogger } from "../logging.js";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 147eba11f (chore: Manually fix TypeScript errors uncovered by sorting imports.)
=======
import { readChannelAllowFromStore } from "../pairing/pairing-store.js";
>>>>>>> 24fbafa9a (refactor: use shared pairing store for telegram)
=======
import { getAgentScopedMediaLocalRoots } from "../media/local-roots.js";
>>>>>>> 35c5d2be5 (refactor(telegram): share group allowFrom resolution)
import {
  executePluginCommand,
  getPluginCommandSpecs,
  matchPluginCommand,
} from "../plugins/commands.js";
<<<<<<< HEAD
import type { ChannelGroupPolicy } from "../config/group-policy.js";
import type {
  ReplyToMode,
  TelegramAccountConfig,
  TelegramGroupConfig,
  TelegramTopicConfig,
} from "../config/types.js";
import type { MoltbotConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
=======
import { resolveAgentRoute } from "../routing/resolve-route.js";
import { resolveThreadSessionKeys } from "../routing/session-key.js";
import { withTelegramApiErrorLogging } from "./api-logging.js";
import { firstDefined, isSenderAllowed, normalizeAllowFromWithStore } from "./bot-access.js";
import {
  buildCappedTelegramMenuCommands,
  buildPluginTelegramMenuCommands,
  syncTelegramMenuCommands,
} from "./bot-native-command-menu.js";
import { TelegramUpdateKeyContext } from "./bot-updates.js";
import { TelegramBotOptions } from "./bot.js";
>>>>>>> 147eba11f (chore: Manually fix TypeScript errors uncovered by sorting imports.)
import { deliverReplies } from "./bot/delivery.js";
import { buildInlineKeyboard } from "./send.js";
import {
  buildSenderName,
  buildTelegramGroupFrom,
  buildTelegramGroupPeerId,
  buildTelegramParentPeer,
<<<<<<< HEAD
  resolveTelegramForumThreadId,
=======
  resolveTelegramGroupAllowFromContext,
  resolveTelegramThreadSpec,
>>>>>>> 35c5d2be5 (refactor(telegram): share group allowFrom resolution)
} from "./bot/helpers.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { firstDefined, isSenderAllowed, normalizeAllowFromWithStore } from "./bot-access.js";
import { readTelegramAllowFromStore } from "./pairing-store.js";
=======
=======
=======
import type { TelegramContext } from "./bot/types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { TelegramContext } from "./bot/types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import {
  evaluateTelegramGroupBaseAccess,
  evaluateTelegramGroupPolicyAccess,
} from "./group-access.js";
>>>>>>> b6a9741ba (refactor(telegram): simplify send/dispatch/target handling (#17819))
import { buildInlineKeyboard } from "./send.js";

const EMPTY_RESPONSE_FALLBACK = "No response generated. Please try again.";
>>>>>>> 24fbafa9a (refactor: use shared pairing store for telegram)

type TelegramNativeCommandContext = Context & { match?: string };

type TelegramCommandAuthResult = {
  chatId: number;
  isGroup: boolean;
  isForum: boolean;
  resolvedThreadId?: number;
  senderId: string;
  senderUsername: string;
  groupConfig?: TelegramGroupConfig;
  topicConfig?: TelegramTopicConfig;
  commandAuthorized: boolean;
};

export type RegisterTelegramHandlerParams = {
  cfg: OpenClawConfig;
  accountId: string;
  bot: Bot;
  mediaMaxBytes: number;
  opts: TelegramBotOptions;
  runtime: RuntimeEnv;
  telegramCfg: TelegramAccountConfig;
  groupAllowFrom?: Array<string | number>;
  resolveGroupPolicy: (chatId: string | number) => ChannelGroupPolicy;
  resolveTelegramGroupConfig: (
    chatId: string | number,
    messageThreadId?: number,
  ) => { groupConfig?: TelegramGroupConfig; topicConfig?: TelegramTopicConfig };
  shouldSkipUpdate: (ctx: TelegramUpdateKeyContext) => boolean;
  processMessage: (
    ctx: TelegramContext,
    allMedia: Array<{ path: string; contentType?: string }>,
    storeAllowFrom: string[],
    options?: {
      messageIdOverride?: string;
      forceWasMentioned?: boolean;
    },
  ) => Promise<void>;
  logger: ReturnType<typeof getChildLogger>;
};

type RegisterTelegramNativeCommandsParams = {
  bot: Bot;
  cfg: MoltbotConfig;
  runtime: RuntimeEnv;
  accountId: string;
  telegramCfg: TelegramAccountConfig;
  allowFrom?: Array<string | number>;
  groupAllowFrom?: Array<string | number>;
  replyToMode: ReplyToMode;
  textLimit: number;
  useAccessGroups: boolean;
  nativeEnabled: boolean;
  nativeSkillsEnabled: boolean;
  nativeDisabledExplicit: boolean;
  resolveGroupPolicy: (chatId: string | number) => ChannelGroupPolicy;
  resolveTelegramGroupConfig: (
    chatId: string | number,
    messageThreadId?: number,
  ) => { groupConfig?: TelegramGroupConfig; topicConfig?: TelegramTopicConfig };
  shouldSkipUpdate: (ctx: TelegramUpdateKeyContext) => boolean;
  opts: { token: string };
};

async function resolveTelegramCommandAuth(params: {
  msg: NonNullable<TelegramNativeCommandContext["message"]>;
  bot: Bot;
<<<<<<< HEAD
  cfg: MoltbotConfig;
=======
  cfg: OpenClawConfig;
  accountId: string;
>>>>>>> 6957354d4 (fix (telegram/whatsapp): use account-scoped pairing allowlists)
  telegramCfg: TelegramAccountConfig;
  allowFrom?: Array<string | number>;
  groupAllowFrom?: Array<string | number>;
  useAccessGroups: boolean;
  resolveGroupPolicy: (chatId: string | number) => ChannelGroupPolicy;
  resolveTelegramGroupConfig: (
    chatId: string | number,
    messageThreadId?: number,
  ) => { groupConfig?: TelegramGroupConfig; topicConfig?: TelegramTopicConfig };
  requireAuth: boolean;
}): Promise<TelegramCommandAuthResult | null> {
  const {
    msg,
    bot,
    cfg,
    accountId,
    telegramCfg,
    allowFrom,
    groupAllowFrom,
    useAccessGroups,
    resolveGroupPolicy,
    resolveTelegramGroupConfig,
    requireAuth,
  } = params;
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
  const messageThreadId = (msg as { message_thread_id?: number }).message_thread_id;
  const isForum = (msg.chat as { is_forum?: boolean }).is_forum === true;
  const groupAllowContext = await resolveTelegramGroupAllowFromContext({
    chatId,
    accountId,
    isForum,
    messageThreadId,
    groupAllowFrom,
    resolveTelegramGroupConfig,
  });
  const {
    resolvedThreadId,
    storeAllowFrom,
    groupConfig,
    topicConfig,
    effectiveGroupAllow,
    hasGroupAllowOverride,
  } = groupAllowContext;
  const senderId = msg.from?.id ? String(msg.from.id) : "";
  const senderUsername = msg.from?.username ?? "";

  const sendAuthMessage = async (text: string) => {
    await withTelegramApiErrorLogging({
      operation: "sendMessage",
      fn: () => bot.api.sendMessage(chatId, text),
    });
    return null;
  };
  const rejectNotAuthorized = async () => {
    return await sendAuthMessage("You are not authorized to use this command.");
  };

  const baseAccess = evaluateTelegramGroupBaseAccess({
    isGroup,
    groupConfig,
    topicConfig,
    hasGroupAllowOverride,
    effectiveGroupAllow,
    senderId,
    senderUsername,
    enforceAllowOverride: requireAuth,
    requireSenderForAllowOverride: true,
  });
  if (!baseAccess.allowed) {
    if (baseAccess.reason === "group-disabled") {
      return await sendAuthMessage("This group is disabled.");
    }
    if (baseAccess.reason === "topic-disabled") {
      return await sendAuthMessage("This topic is disabled.");
    }
    return await rejectNotAuthorized();
  }

  const policyAccess = evaluateTelegramGroupPolicyAccess({
    isGroup,
    chatId,
    cfg,
    telegramCfg,
    topicConfig,
    groupConfig,
    effectiveGroupAllow,
    senderId,
    senderUsername,
    resolveGroupPolicy,
    enforcePolicy: useAccessGroups,
    useTopicAndGroupOverrides: false,
    enforceAllowlistAuthorization: requireAuth,
    allowEmptyAllowlistEntries: true,
    requireSenderForAllowlistAuthorization: true,
    checkChatAllowlist: useAccessGroups,
  });
  if (!policyAccess.allowed) {
    if (policyAccess.reason === "group-policy-disabled") {
      return await sendAuthMessage("Telegram group commands are disabled.");
    }
    if (
      policyAccess.reason === "group-policy-allowlist-no-sender" ||
      policyAccess.reason === "group-policy-allowlist-unauthorized"
    ) {
      return await rejectNotAuthorized();
    }
    if (policyAccess.reason === "group-chat-not-allowed") {
      return await sendAuthMessage("This group is not allowed.");
    }
  }

  const dmAllow = normalizeAllowFromWithStore({
    allowFrom: allowFrom,
    storeAllowFrom,
  });
  const senderAllowed = isSenderAllowed({
    allow: dmAllow,
    senderId,
    senderUsername,
  });
  const commandAuthorized = resolveCommandAuthorizedFromAuthorizers({
    useAccessGroups,
    authorizers: [{ configured: dmAllow.hasEntries, allowed: senderAllowed }],
    modeWhenAccessGroupsOff: "configured",
  });
  if (requireAuth && !commandAuthorized) {
    return await rejectNotAuthorized();
  }

  return {
    chatId,
    isGroup,
    isForum,
    resolvedThreadId,
    senderId,
    senderUsername,
    groupConfig,
    topicConfig,
    commandAuthorized,
  };
}

export const registerTelegramNativeCommands = ({
  bot,
  cfg,
  runtime,
  accountId,
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
}: RegisterTelegramNativeCommandsParams) => {
<<<<<<< HEAD
  const boundRoute = resolveAgentRoute({ cfg, channel: "telegram", accountId });
  const boundAgentIds = boundRoute?.agentId ? [boundRoute.agentId] : undefined;
=======
  const boundRoute =
    nativeEnabled && nativeSkillsEnabled
      ? resolveAgentRoute({ cfg, channel: "telegram", accountId })
      : null;
  const boundAgentIds = boundRoute ? [boundRoute.agentId] : null;
>>>>>>> 1d01bb1c8 (fix(telegram): scope default account skill commands to resolved agent (#15599))
  const skillCommands =
    nativeEnabled && nativeSkillsEnabled
      ? listSkillCommandsForAgents({ cfg, agentIds: boundAgentIds })
      : [];
  const nativeCommands = nativeEnabled
    ? listNativeCommandSpecsForConfig(cfg, {
        skillCommands,
        provider: "telegram",
      })
    : [];
  const reservedCommands = new Set(
    listNativeCommandSpecs().map((command) => command.name.toLowerCase()),
  );
  for (const command of skillCommands) {
    reservedCommands.add(command.name.toLowerCase());
  }
  const customResolution = resolveTelegramCustomCommands({
    commands: telegramCfg.customCommands,
    reservedCommands,
  });
  for (const issue of customResolution.issues) {
    runtime.error?.(danger(issue.message));
  }
  const customCommands = customResolution.commands;
  const pluginCommandSpecs = getPluginCommandSpecs();
  const existingCommands = new Set(
    [
      ...nativeCommands.map((command) => command.name),
      ...customCommands.map((command) => command.command),
    ].map((command) => command.toLowerCase()),
  );
  const pluginCatalog = buildPluginTelegramMenuCommands({
    specs: pluginCommandSpecs,
    existingCommands,
  });
  for (const issue of pluginCatalog.issues) {
    runtime.error?.(danger(issue));
  }
  const allCommandsFull: Array<{ command: string; description: string }> = [
    ...nativeCommands.map((command) => ({
      command: command.name,
      description: command.description,
    })),
    ...(nativeEnabled ? pluginCatalog.commands : []),
    ...customCommands,
  ];
<<<<<<< HEAD
  // Telegram Bot API limits commands to 100 per scope.
  // Truncate with a warning rather than failing with BOT_COMMANDS_TOO_MUCH.
  const TELEGRAM_MAX_COMMANDS = 100;
  if (allCommandsFull.length > TELEGRAM_MAX_COMMANDS) {
    runtime.log?.(
      `telegram: truncating ${allCommandsFull.length} commands to ${TELEGRAM_MAX_COMMANDS} (Telegram Bot API limit)`,
    );
  }
  const allCommands = allCommandsFull.slice(0, TELEGRAM_MAX_COMMANDS);

  if (allCommands.length > 0) {
    withTelegramApiErrorLogging({
      operation: "setMyCommands",
      runtime,
      fn: () => bot.api.setMyCommands(allCommands),
    }).catch(() => {});
=======
  const { commandsToRegister, totalCommands, maxCommands, overflowCount } =
    buildCappedTelegramMenuCommands({
      allCommands: allCommandsFull,
    });
  if (overflowCount > 0) {
    runtime.log?.(
      `Telegram limits bots to ${maxCommands} commands. ` +
        `${totalCommands} configured; registering first ${maxCommands}. ` +
        `Use channels.telegram.commands.native: false to disable, or reduce plugin/skill/custom commands.`,
    );
  }
  // Telegram only limits the setMyCommands payload (menu entries).
  // Keep hidden commands callable by registering handlers for the full catalog.
  syncTelegramMenuCommands({ bot, runtime, commandsToRegister });
>>>>>>> cc2249a43 (refactor(telegram): extract native command menu helpers)

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
  const resolveCommandRuntimeContext = (params: {
    msg: NonNullable<TelegramNativeCommandContext["message"]>;
    isGroup: boolean;
    isForum: boolean;
    resolvedThreadId?: number;
  }) => {
    const { msg, isGroup, isForum, resolvedThreadId } = params;
    const chatId = msg.chat.id;
    const messageThreadId = (msg as { message_thread_id?: number }).message_thread_id;
    const threadSpec = resolveTelegramThreadSpec({
      isGroup,
      isForum,
      messageThreadId,
    });
    const parentPeer = buildTelegramParentPeer({ isGroup, resolvedThreadId, chatId });
    const route = resolveAgentRoute({
      cfg,
      channel: "telegram",
      accountId,
      peer: {
        kind: isGroup ? "group" : "direct",
        id: isGroup ? buildTelegramGroupPeerId(chatId, resolvedThreadId) : String(chatId),
      },
      parentPeer,
    });
    const mediaLocalRoots = getAgentScopedMediaLocalRoots(cfg, route.agentId);
    const tableMode = resolveMarkdownTableMode({
      cfg,
      channel: "telegram",
      accountId: route.accountId,
    });
    const chunkMode = resolveChunkMode(cfg, "telegram", route.accountId);
    return { chatId, threadSpec, route, mediaLocalRoots, tableMode, chunkMode };
  };
  const buildCommandDeliveryBaseOptions = (params: {
    chatId: string | number;
    mediaLocalRoots?: readonly string[];
    threadSpec: ReturnType<typeof resolveTelegramThreadSpec>;
    tableMode: ReturnType<typeof resolveMarkdownTableMode>;
    chunkMode: ReturnType<typeof resolveChunkMode>;
  }) => ({
    chatId: String(params.chatId),
    token: opts.token,
    runtime,
    bot,
    mediaLocalRoots: params.mediaLocalRoots,
    replyToMode,
    textLimit,
    thread: params.threadSpec,
    tableMode: params.tableMode,
    chunkMode: params.chunkMode,
    linkPreview: telegramCfg.linkPreview,
  });

>>>>>>> b6a9741ba (refactor(telegram): simplify send/dispatch/target handling (#17819))
  if (commandsToRegister.length > 0 || pluginCatalog.commands.length > 0) {
>>>>>>> f537bd179 (fix(telegram): exclude plugin commands from setMyCommands when native=false (openclaw#15164) thanks @Glucksberg)
    if (typeof (bot as unknown as { command?: unknown }).command !== "function") {
      logVerbose("telegram: bot.command unavailable; skipping native handlers");
    } else {
      for (const command of nativeCommands) {
        bot.command(command.name, async (ctx: TelegramNativeCommandContext) => {
          const msg = ctx.message;
          if (!msg) {
            return;
          }
          if (shouldSkipUpdate(ctx)) {
            return;
          }
          const auth = await resolveTelegramCommandAuth({
            msg,
            bot,
            cfg,
            accountId,
            telegramCfg,
            allowFrom,
            groupAllowFrom,
            useAccessGroups,
            resolveGroupPolicy,
            resolveTelegramGroupConfig,
            requireAuth: true,
          });
          if (!auth) {
            return;
          }
          const {
            chatId,
            isGroup,
            isForum,
            resolvedThreadId,
            senderId,
            senderUsername,
            groupConfig,
            topicConfig,
            commandAuthorized,
          } = auth;
<<<<<<< HEAD
          const messageThreadId = (msg as { message_thread_id?: number }).message_thread_id;
          const threadIdForSend = isGroup ? resolvedThreadId : messageThreadId;
=======
          const { threadSpec, route, mediaLocalRoots, tableMode, chunkMode } =
            resolveCommandRuntimeContext({
              msg,
              isGroup,
              isForum,
              resolvedThreadId,
            });
          const deliveryBaseOptions = buildCommandDeliveryBaseOptions({
            chatId,
            mediaLocalRoots,
            threadSpec,
            tableMode,
            chunkMode,
          });
          const threadParams = buildTelegramThreadParams(threadSpec) ?? {};
>>>>>>> b6a9741ba (refactor(telegram): simplify send/dispatch/target handling (#17819))

          const commandDefinition = findCommandByNativeName(command.name, "telegram");
          const rawText = ctx.match?.trim() ?? "";
          const commandArgs = commandDefinition
            ? parseCommandArgs(commandDefinition, rawText)
            : rawText
              ? ({ raw: rawText } satisfies CommandArgs)
              : undefined;
          const prompt = commandDefinition
            ? buildCommandTextFromArgs(commandDefinition, commandArgs)
            : rawText
              ? `/${command.name} ${rawText}`
              : `/${command.name}`;
          const menu = commandDefinition
            ? resolveCommandArgMenu({
                command: commandDefinition,
                args: commandArgs,
                cfg,
              })
            : null;
          if (menu && commandDefinition) {
            const title =
              menu.title ??
              `Choose ${menu.arg.description || menu.arg.name} for /${commandDefinition.nativeName ?? commandDefinition.key}.`;
            const rows: Array<Array<{ text: string; callback_data: string }>> = [];
            for (let i = 0; i < menu.choices.length; i += 2) {
              const slice = menu.choices.slice(i, i + 2);
              rows.push(
                slice.map((choice) => {
                  const args: CommandArgs = {
                    values: { [menu.arg.name]: choice.value },
                  };
                  return {
                    text: choice.label,
                    callback_data: buildCommandTextFromArgs(commandDefinition, args),
                  };
                }),
              );
            }
            const replyMarkup = buildInlineKeyboard(rows);
            await withTelegramApiErrorLogging({
              operation: "sendMessage",
              runtime,
              fn: () =>
                bot.api.sendMessage(chatId, title, {
                  ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
                  ...(threadIdForSend != null ? { message_thread_id: threadIdForSend } : {}),
                }),
            });
            return;
          }
<<<<<<< HEAD
          const parentPeer = buildTelegramParentPeer({ isGroup, resolvedThreadId, chatId });
          const route = resolveAgentRoute({
            cfg,
            channel: "telegram",
            accountId,
            peer: {
              kind: isGroup ? "group" : "direct",
              id: isGroup ? buildTelegramGroupPeerId(chatId, resolvedThreadId) : String(chatId),
            },
            parentPeer,
          });
=======
>>>>>>> b6a9741ba (refactor(telegram): simplify send/dispatch/target handling (#17819))
          const baseSessionKey = route.sessionKey;
          // DMs: use raw messageThreadId for thread sessions (not resolvedThreadId which is for forums)
          const dmThreadId = !isGroup ? messageThreadId : undefined;
          const threadKeys =
            dmThreadId != null
              ? resolveThreadSessionKeys({
                  baseSessionKey,
                  threadId: String(dmThreadId),
                })
              : null;
          const sessionKey = threadKeys?.sessionKey ?? baseSessionKey;
          const skillFilter = firstDefined(topicConfig?.skills, groupConfig?.skills);
          const systemPromptParts = [
            groupConfig?.systemPrompt?.trim() || null,
            topicConfig?.systemPrompt?.trim() || null,
          ].filter((entry): entry is string => Boolean(entry));
          const groupSystemPrompt =
            systemPromptParts.length > 0 ? systemPromptParts.join("\n\n") : undefined;
          const conversationLabel = isGroup
            ? msg.chat.title
              ? `${msg.chat.title} id:${chatId}`
              : `group:${chatId}`
            : (buildSenderName(msg) ?? String(senderId || chatId));
          const ctxPayload = finalizeInboundContext({
            Body: prompt,
            BodyForAgent: prompt,
            RawBody: prompt,
            CommandBody: prompt,
            CommandArgs: commandArgs,
            From: isGroup ? buildTelegramGroupFrom(chatId, resolvedThreadId) : `telegram:${chatId}`,
            To: `slash:${senderId || chatId}`,
            ChatType: isGroup ? "group" : "direct",
            ConversationLabel: conversationLabel,
            GroupSubject: isGroup ? (msg.chat.title ?? undefined) : undefined,
            GroupSystemPrompt: isGroup ? groupSystemPrompt : undefined,
            SenderName: buildSenderName(msg),
            SenderId: senderId || undefined,
            SenderUsername: senderUsername || undefined,
            Surface: "telegram",
            MessageSid: String(msg.message_id),
            Timestamp: msg.date ? msg.date * 1000 : undefined,
            WasMentioned: true,
            CommandAuthorized: commandAuthorized,
            CommandSource: "native" as const,
            SessionKey: `telegram:slash:${senderId || chatId}`,
            AccountId: route.accountId,
            CommandTargetSessionKey: sessionKey,
            MessageThreadId: threadIdForSend,
            IsForum: isForum,
            // Originating context for sub-agent announce routing
            OriginatingChannel: "telegram" as const,
            OriginatingTo: `telegram:${chatId}`,
          });

          const disableBlockStreaming =
            typeof telegramCfg.blockStreaming === "boolean"
              ? !telegramCfg.blockStreaming
              : undefined;

<<<<<<< HEAD
=======
          const deliveryState = {
            delivered: false,
            skippedNonSilent: 0,
          };

          const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
            cfg,
            agentId: route.agentId,
            channel: "telegram",
            accountId: route.accountId,
          });

>>>>>>> 5d82c8231 (feat: per-channel responsePrefix override (#9001))
          await dispatchReplyWithBufferedBlockDispatcher({
            ctx: ctxPayload,
            cfg,
            dispatcherOptions: {
<<<<<<< HEAD
              responsePrefix: resolveEffectiveMessagesConfig(cfg, route.agentId).responsePrefix,
              deliver: async (payload, info) => {
                await deliverReplies({
=======
              ...prefixOptions,
              deliver: async (payload, _info) => {
                const result = await deliverReplies({
>>>>>>> 5d82c8231 (feat: per-channel responsePrefix override (#9001))
                  replies: [payload],
<<<<<<< HEAD
                  chatId: String(chatId),
                  token: opts.token,
                  runtime,
                  bot,
                  replyToMode,
                  textLimit,
                  messageThreadId: threadIdForSend,
                  tableMode,
                  chunkMode,
                  linkPreview: telegramCfg.linkPreview,
                  notifyEmptyResponse: info.kind === "final",
=======
                  ...deliveryBaseOptions,
>>>>>>> b6a9741ba (refactor(telegram): simplify send/dispatch/target handling (#17819))
                });
<<<<<<< HEAD
=======
                if (result.delivered) {
                  deliveryState.delivered = true;
                }
              },
              onSkip: (_payload, info) => {
                if (info.reason !== "silent") {
                  deliveryState.skippedNonSilent += 1;
                }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
              },
              onError: (err, info) => {
                runtime.error?.(danger(`telegram slash ${info.kind} reply failed: ${String(err)}`));
              },
            },
            replyOptions: {
              skillFilter,
              disableBlockStreaming,
              onModelSelected,
            },
          });
<<<<<<< HEAD
=======
          if (!deliveryState.delivered && deliveryState.skippedNonSilent > 0) {
            await deliverReplies({
              replies: [{ text: EMPTY_RESPONSE_FALLBACK }],
              ...deliveryBaseOptions,
            });
          }
>>>>>>> b6a9741ba (refactor(telegram): simplify send/dispatch/target handling (#17819))
        });
      }

      for (const pluginCommand of pluginCatalog.commands) {
        bot.command(pluginCommand.command, async (ctx: TelegramNativeCommandContext) => {
          const msg = ctx.message;
          if (!msg) {
            return;
          }
          if (shouldSkipUpdate(ctx)) {
            return;
          }
          const chatId = msg.chat.id;
          const rawText = ctx.match?.trim() ?? "";
          const commandBody = `/${pluginCommand.command}${rawText ? ` ${rawText}` : ""}`;
          const match = matchPluginCommand(commandBody);
          if (!match) {
            await withTelegramApiErrorLogging({
              operation: "sendMessage",
              runtime,
              fn: () => bot.api.sendMessage(chatId, "Command not found."),
            });
            return;
          }
          const auth = await resolveTelegramCommandAuth({
            msg,
            bot,
            cfg,
            accountId,
            telegramCfg,
            allowFrom,
            groupAllowFrom,
            useAccessGroups,
            resolveGroupPolicy,
            resolveTelegramGroupConfig,
            requireAuth: match.command.requireAuth !== false,
          });
          if (!auth) {
            return;
          }
<<<<<<< HEAD
          const { resolvedThreadId, senderId, commandAuthorized, isGroup } = auth;
          const messageThreadId = (msg as { message_thread_id?: number }).message_thread_id;
<<<<<<< HEAD
          const threadIdForSend = isGroup ? resolvedThreadId : messageThreadId;
=======
          const threadSpec = resolveTelegramThreadSpec({
            isGroup,
            isForum,
            messageThreadId,
=======
          const { senderId, commandAuthorized, isGroup, isForum, resolvedThreadId } = auth;
          const { threadSpec, mediaLocalRoots, tableMode, chunkMode } =
            resolveCommandRuntimeContext({
              msg,
              isGroup,
              isForum,
              resolvedThreadId,
            });
          const deliveryBaseOptions = buildCommandDeliveryBaseOptions({
            chatId,
            mediaLocalRoots,
            threadSpec,
            tableMode,
            chunkMode,
>>>>>>> b6a9741ba (refactor(telegram): simplify send/dispatch/target handling (#17819))
          });
          const from = isGroup
            ? buildTelegramGroupFrom(chatId, threadSpec.id)
            : `telegram:${chatId}`;
          const to = `telegram:${chatId}`;
>>>>>>> 730f86dd5 (Gateway/Plugins: device pairing + phone control plugins (#11755))

          const result = await executePluginCommand({
            command: match.command,
            args: match.args,
            senderId,
            channel: "telegram",
            isAuthorizedSender: commandAuthorized,
            commandBody,
            config: cfg,
            from,
            to,
            accountId,
            messageThreadId: threadSpec.id,
          });
<<<<<<< HEAD
          const tableMode = resolveMarkdownTableMode({
            cfg,
            channel: "telegram",
            accountId,
          });
          const chunkMode = resolveChunkMode(cfg, "telegram", accountId);

          await deliverReplies({
            replies: [result],
            chatId: String(chatId),
            token: opts.token,
            runtime,
            bot,
            replyToMode,
            textLimit,
            messageThreadId: threadIdForSend,
            tableMode,
            chunkMode,
            linkPreview: telegramCfg.linkPreview,
=======

          await deliverReplies({
            replies: [result],
            ...deliveryBaseOptions,
>>>>>>> b6a9741ba (refactor(telegram): simplify send/dispatch/target handling (#17819))
          });
        });
      }
    }
  } else if (nativeDisabledExplicit) {
    withTelegramApiErrorLogging({
      operation: "setMyCommands",
      runtime,
      fn: () => bot.api.setMyCommands([]),
    }).catch(() => {});
  }
};
