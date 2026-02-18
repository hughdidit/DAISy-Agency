<<<<<<< HEAD
import { logVerbose } from "../../globals.js";
=======
import fs from "node:fs/promises";
import type {
  CommandHandler,
  CommandHandlerResult,
  HandleCommandsParams,
} from "./commands-types.js";
import { logVerbose } from "../../globals.js";
import { createInternalHookEvent, triggerInternalHook } from "../../hooks/internal-hooks.js";
import { getGlobalHookRunner } from "../../plugins/hook-runner-global.js";
>>>>>>> ab71fdf82 (Plugin API: compaction/reset hooks, bootstrap file globs, memory plugin status (#13287))
import { resolveSendPolicy } from "../../sessions/send-policy.js";
import { shouldHandleTextCommands } from "../commands-registry.js";
import { createInternalHookEvent, triggerInternalHook } from "../../hooks/internal-hooks.js";
import { routeReply } from "./route-reply.js";
import { handleBashCommand } from "./commands-bash.js";
import { handleCompactCommand } from "./commands-compact.js";
import { handleConfigCommand, handleDebugCommand } from "./commands-config.js";
import {
  handleCommandsListCommand,
  handleContextCommand,
  handleExportSessionCommand,
  handleHelpCommand,
  handleStatusCommand,
  handleWhoamiCommand,
} from "./commands-info.js";
<<<<<<< HEAD
<<<<<<< HEAD
import { handleAllowlistCommand } from "./commands-allowlist.js";
import { handleApproveCommand } from "./commands-approve.js";
import { handleSubagentsCommand } from "./commands-subagents.js";
=======
import { handleMeshCommand } from "./commands-mesh.js";
>>>>>>> 16e59b26a (Add mesh auto-planning with chat command UX and hardened auth/session behavior)
=======
>>>>>>> 01672a8f2 (Revert "Add mesh auto-planning with chat command UX and hardened auth/session behavior")
import { handleModelsCommand } from "./commands-models.js";
<<<<<<< HEAD
=======
import { handlePluginCommand } from "./commands-plugin.js";
<<<<<<< HEAD
import { handlePTTCommand } from "./commands-ptt.js";
<<<<<<< HEAD
>>>>>>> b7aac92ac (Gateway: add PTT chat + nodes CLI)
import { handleTtsCommands } from "./commands-tts.js";
=======
>>>>>>> 6cd3bc3a4 (iOS: improve gateway auto-connect and voice permissions)
=======
>>>>>>> 4ab814fd5 (Revert "iOS: wire node services and tests")
import {
  handleAbortTrigger,
  handleActivationCommand,
  handleRestartCommand,
  handleSendPolicyCommand,
  handleStopCommand,
  handleUsageCommand,
} from "./commands-session.js";
<<<<<<< HEAD
import { handlePluginCommand } from "./commands-plugin.js";
import type {
  CommandHandler,
  CommandHandlerResult,
  HandleCommandsParams,
} from "./commands-types.js";
=======
import { handleSubagentsCommand } from "./commands-subagents.js";
import { handleTtsCommands } from "./commands-tts.js";
import { routeReply } from "./route-reply.js";
>>>>>>> b7aac92ac (Gateway: add PTT chat + nodes CLI)

const HANDLERS: CommandHandler[] = [
  // Plugin commands are processed first, before built-in commands
  handlePluginCommand,
  handleBashCommand,
  handleActivationCommand,
  handleSendPolicyCommand,
  handleUsageCommand,
  handleRestartCommand,
  handleTtsCommands,
  handleHelpCommand,
  handleCommandsListCommand,
  handleStatusCommand,
  handleAllowlistCommand,
  handleApproveCommand,
  handleContextCommand,
  handleWhoamiCommand,
  handleSubagentsCommand,
  handleConfigCommand,
  handleDebugCommand,
  handleModelsCommand,
  handleStopCommand,
  handleCompactCommand,
  handleAbortTrigger,
];

export async function handleCommands(params: HandleCommandsParams): Promise<CommandHandlerResult> {
<<<<<<< HEAD
=======
  if (HANDLERS === null) {
    HANDLERS = [
      // Plugin commands are processed first, before built-in commands
      handlePluginCommand,
      handleBashCommand,
      handleActivationCommand,
      handleSendPolicyCommand,
      handleUsageCommand,
      handleRestartCommand,
      handleTtsCommands,
      handleHelpCommand,
      handleCommandsListCommand,
      handleStatusCommand,
      handleAllowlistCommand,
      handleApproveCommand,
      handleContextCommand,
      handleExportSessionCommand,
      handleWhoamiCommand,
      handleSubagentsCommand,
      handleConfigCommand,
      handleDebugCommand,
      handleModelsCommand,
      handleStopCommand,
      handleCompactCommand,
      handleAbortTrigger,
    ];
  }
>>>>>>> b7aac92ac (Gateway: add PTT chat + nodes CLI)
  const resetMatch = params.command.commandBodyNormalized.match(/^\/(new|reset)(?:\s|$)/);
  const resetRequested = Boolean(resetMatch);
  if (resetRequested && !params.command.isAuthorizedSender) {
    logVerbose(
      `Ignoring /reset from unauthorized sender: ${params.command.senderId || "<unknown>"}`,
    );
    return { shouldContinue: false };
  }

  // Trigger internal hook for reset/new commands
  if (resetRequested && params.command.isAuthorizedSender) {
    const commandAction = resetMatch?.[1] ?? "new";
    const hookEvent = createInternalHookEvent("command", commandAction, params.sessionKey ?? "", {
      sessionEntry: params.sessionEntry,
      previousSessionEntry: params.previousSessionEntry,
      commandSource: params.command.surface,
      senderId: params.command.senderId,
      cfg: params.cfg, // Pass config for LLM slug generation
    });
    await triggerInternalHook(hookEvent);

    // Send hook messages immediately if present
    if (hookEvent.messages.length > 0) {
      // Use OriginatingChannel/To if available, otherwise fall back to command channel/from
      // oxlint-disable-next-line typescript/no-explicit-any
      const channel = params.ctx.OriginatingChannel || (params.command.channel as any);
      // For replies, use 'from' (the sender) not 'to' (which might be the bot itself)
      const to = params.ctx.OriginatingTo || params.command.from || params.command.to;

      if (channel && to) {
        const hookReply = { text: hookEvent.messages.join("\n\n") };
        await routeReply({
          payload: hookReply,
          channel: channel,
          to: to,
          sessionKey: params.sessionKey,
          accountId: params.ctx.AccountId,
          threadId: params.ctx.MessageThreadId,
          cfg: params.cfg,
        });
      }
    }

    // Fire before_reset plugin hook — extract memories before session history is lost
    const hookRunner = getGlobalHookRunner();
    if (hookRunner?.hasHooks("before_reset")) {
      const prevEntry = params.previousSessionEntry;
      const sessionFile = prevEntry?.sessionFile;
      // Fire-and-forget: read old session messages and run hook
      void (async () => {
        try {
          const messages: unknown[] = [];
          if (sessionFile) {
            const content = await fs.readFile(sessionFile, "utf-8");
            for (const line of content.split("\n")) {
              if (!line.trim()) {
                continue;
              }
              try {
                const entry = JSON.parse(line);
                if (entry.type === "message" && entry.message) {
                  messages.push(entry.message);
                }
              } catch {
                // skip malformed lines
              }
            }
          } else {
            logVerbose("before_reset: no session file available, firing hook with empty messages");
          }
          await hookRunner.runBeforeReset(
            { sessionFile, messages, reason: commandAction },
            {
              agentId: params.sessionKey?.split(":")[0] ?? "main",
              sessionKey: params.sessionKey,
              sessionId: prevEntry?.sessionId,
              workspaceDir: params.workspaceDir,
            },
          );
        } catch (err: unknown) {
          logVerbose(`before_reset hook failed: ${String(err)}`);
        }
      })();
    }
  }

  const allowTextCommands = shouldHandleTextCommands({
    cfg: params.cfg,
    surface: params.command.surface,
    commandSource: params.ctx.CommandSource,
  });

  for (const handler of HANDLERS) {
    const result = await handler(params, allowTextCommands);
    if (result) {
      return result;
    }
  }

  const sendPolicy = resolveSendPolicy({
    cfg: params.cfg,
    entry: params.sessionEntry,
    sessionKey: params.sessionKey,
    channel: params.sessionEntry?.channel ?? params.command.channel,
    chatType: params.sessionEntry?.chatType,
  });
  if (sendPolicy === "deny") {
    logVerbose(`Send blocked by policy for session ${params.sessionKey ?? "unknown"}`);
    return { shouldContinue: false };
  }

  return { shouldContinue: true };
}
