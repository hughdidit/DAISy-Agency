import type { AgentMessage } from "@mariozechner/pi-agent-core";
<<<<<<< HEAD
import type { Api, AssistantMessage, ImageContent, Model } from "@mariozechner/pi-ai";
import type { discoverAuthStorage, discoverModels } from "@mariozechner/pi-coding-agent";

import type { ReasoningLevel, ThinkLevel, VerboseLevel } from "../../../auto-reply/thinking.js";
import type { MoltbotConfig } from "../../../config/config.js";
import type { AgentStreamParams } from "../../../commands/agent/types.js";
import type { ExecElevatedDefaults, ExecToolDefaults } from "../../bash-tools.js";
import type { MessagingToolSend } from "../../pi-embedded-messaging.js";
import type { BlockReplyChunking, ToolResultFormat } from "../../pi-embedded-subscribe.js";
import type { SkillSnapshot } from "../../skills.js";
import type { SessionSystemPromptReport } from "../../../config/sessions/types.js";
import type { ClientToolDefinition } from "./params.js";

type AuthStorage = ReturnType<typeof discoverAuthStorage>;
type ModelRegistry = ReturnType<typeof discoverModels>;

export type EmbeddedRunAttemptParams = {
  sessionId: string;
  sessionKey?: string;
  messageChannel?: string;
  messageProvider?: string;
  agentAccountId?: string;
  messageTo?: string;
  messageThreadId?: string | number;
  /** Group id for channel-level tool policy resolution. */
  groupId?: string | null;
  /** Group channel label (e.g. #general) for channel-level tool policy resolution. */
  groupChannel?: string | null;
  /** Group space label (e.g. guild/team id) for channel-level tool policy resolution. */
  groupSpace?: string | null;
  /** Parent session key for subagent policy inheritance. */
  spawnedBy?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  senderUsername?: string | null;
  senderE164?: string | null;
  currentChannelId?: string;
  currentThreadTs?: string;
  replyToMode?: "off" | "first" | "all";
  hasRepliedRef?: { value: boolean };
  sessionFile: string;
  workspaceDir: string;
  agentDir?: string;
  config?: MoltbotConfig;
  skillsSnapshot?: SkillSnapshot;
  prompt: string;
  images?: ImageContent[];
  /** Optional client-provided tools (OpenResponses hosted tools). */
  clientTools?: ClientToolDefinition[];
  /** Disable built-in tools for this run (LLM-only mode). */
  disableTools?: boolean;
=======
import type { Api, AssistantMessage, Model } from "@mariozechner/pi-ai";
import type { ThinkLevel } from "../../../auto-reply/thinking.js";
import type { SessionSystemPromptReport } from "../../../config/sessions/types.js";
import type { MessagingToolSend } from "../../pi-embedded-messaging.js";
import type { AuthStorage, ModelRegistry } from "../../pi-model-discovery.js";
import type { NormalizedUsage } from "../../usage.js";
import type { RunEmbeddedPiAgentParams } from "./params.js";

type EmbeddedRunAttemptBase = Omit<
  RunEmbeddedPiAgentParams,
  "provider" | "model" | "authProfileId" | "authProfileIdSource" | "thinkLevel" | "lane" | "enqueue"
>;

export type EmbeddedRunAttemptParams = EmbeddedRunAttemptBase & {
>>>>>>> 0dbe087ef (refactor(pi-embedded-runner): dedupe attempt params)
  provider: string;
  modelId: string;
  model: Model<Api>;
  authStorage: AuthStorage;
  modelRegistry: ModelRegistry;
  thinkLevel: ThinkLevel;
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  verboseLevel?: VerboseLevel;
  reasoningLevel?: ReasoningLevel;
  toolResultFormat?: ToolResultFormat;
  execOverrides?: Pick<ExecToolDefaults, "host" | "security" | "ask" | "node">;
  bashElevated?: ExecElevatedDefaults;
  timeoutMs: number;
  runId: string;
  abortSignal?: AbortSignal;
  shouldEmitToolResult?: () => boolean;
  shouldEmitToolOutput?: () => boolean;
  onPartialReply?: (payload: { text?: string; mediaUrls?: string[] }) => void | Promise<void>;
  onAssistantMessageStart?: () => void | Promise<void>;
  onBlockReply?: (payload: {
    text?: string;
    mediaUrls?: string[];
    audioAsVoice?: boolean;
    replyToId?: string;
    replyToTag?: boolean;
    replyToCurrent?: boolean;
  }) => void | Promise<void>;
  onBlockReplyFlush?: () => void | Promise<void>;
  blockReplyBreak?: "text_end" | "message_end";
  blockReplyChunking?: BlockReplyChunking;
  onReasoningStream?: (payload: { text?: string; mediaUrls?: string[] }) => void | Promise<void>;
  onToolResult?: (payload: { text?: string; mediaUrls?: string[] }) => void | Promise<void>;
  onAgentEvent?: (evt: { stream: string; data: Record<string, unknown> }) => void;
  /** Require explicit message tool targets (no implicit last-route sends). */
  requireExplicitMessageTarget?: boolean;
  /** If true, omit the message tool from the tool list. */
  disableMessageTool?: boolean;
  extraSystemPrompt?: string;
  streamParams?: AgentStreamParams;
  ownerNumbers?: string[];
  enforceFinalTag?: boolean;
=======
>>>>>>> 0dbe087ef (refactor(pi-embedded-runner): dedupe attempt params)
=======
  /** Pre-computed hook result from run.ts to avoid double-firing before_agent_start. */
  earlyHookResult?: PluginHookBeforeAgentStartResult;
>>>>>>> b90eb5152 (feat(plugins): add modelOverride/providerOverride to before_agent_start hook)
=======
>>>>>>> 0c1c34c95 (refactor(plugins): split before-agent hooks by model and prompt phases)
};

export type EmbeddedRunAttemptResult = {
  aborted: boolean;
  timedOut: boolean;
  /** True if the timeout occurred while compaction was in progress or pending. */
  timedOutDuringCompaction: boolean;
  promptError: unknown;
  sessionIdUsed: string;
  systemPromptReport?: SessionSystemPromptReport;
  messagesSnapshot: AgentMessage[];
  assistantTexts: string[];
  toolMetas: Array<{ toolName: string; meta?: string }>;
  lastAssistant: AssistantMessage | undefined;
  lastToolError?: { toolName: string; meta?: string; error?: string };
  didSendViaMessagingTool: boolean;
  messagingToolSentTexts: string[];
  messagingToolSentMediaUrls: string[];
  messagingToolSentTargets: MessagingToolSend[];
  successfulCronAdds?: number;
  cloudCodeAssistFormatError: boolean;
  /** Client tool call detected (OpenResponses hosted tools). */
  clientToolCall?: { name: string; params: Record<string, unknown> };
};
