import { Type } from "@sinclair/typebox";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
import type { OpenClawConfig } from "../../config/config.js";
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
import type { AnyAgentTool } from "./common.js";
import { SILENT_REPLY_TOKEN } from "../../auto-reply/tokens.js";
>>>>>>> 553d17f8a (refactor(agents): use silent token constant in prompts)
=======
import { SILENT_REPLY_TOKEN } from "../../auto-reply/tokens.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { loadConfig } from "../../config/config.js";
import type { MoltbotConfig } from "../../config/config.js";
=======
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> ed11e93cf (chore(format))
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
import { textToSpeech } from "../../tts/tts.js";
<<<<<<< HEAD
=======
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import type { AnyAgentTool } from "./common.js";
import { SILENT_REPLY_TOKEN } from "../../auto-reply/tokens.js";
=======
import { SILENT_REPLY_TOKEN } from "../../auto-reply/tokens.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
import { loadConfig } from "../../config/config.js";
import { textToSpeech } from "../../tts/tts.js";
=======
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
import type { AnyAgentTool } from "./common.js";
import { SILENT_REPLY_TOKEN } from "../../auto-reply/tokens.js";
=======
import { SILENT_REPLY_TOKEN } from "../../auto-reply/tokens.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { loadConfig } from "../../config/config.js";
import { textToSpeech } from "../../tts/tts.js";
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
import type { AnyAgentTool } from "./common.js";
import { readStringParam } from "./common.js";

const TtsToolSchema = Type.Object({
  text: Type.String({ description: "Text to convert to speech." }),
  channel: Type.Optional(
    Type.String({ description: "Optional channel id to pick output format (e.g. telegram)." }),
  ),
});

export function createTtsTool(opts?: {
  config?: MoltbotConfig;
  agentChannel?: GatewayMessageChannel;
}): AnyAgentTool {
  return {
    label: "TTS",
    name: "tts",
    description: `Convert text to speech. Audio is delivered automatically from the tool result — reply with ${SILENT_REPLY_TOKEN} after a successful call to avoid duplicate messages.`,
    parameters: TtsToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const text = readStringParam(params, "text", { required: true });
      const channel = readStringParam(params, "channel");
      const cfg = opts?.config ?? loadConfig();
      const result = await textToSpeech({
        text,
        cfg,
        channel: channel ?? opts?.agentChannel,
      });

      if (result.success && result.audioPath) {
        const lines: string[] = [];
        // Tag Telegram Opus output as a voice bubble instead of a file attachment.
        if (result.voiceCompatible) {
          lines.push("[[audio_as_voice]]");
        }
        lines.push(`MEDIA:${result.audioPath}`);
        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details: { audioPath: result.audioPath, provider: result.provider },
        };
      }

      return {
        content: [
          {
            type: "text",
            text: result.error ?? "TTS conversion failed",
          },
        ],
        details: { error: result.error },
      };
    },
  };
}
