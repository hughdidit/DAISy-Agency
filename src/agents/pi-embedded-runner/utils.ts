import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { ReasoningLevel, ThinkLevel } from "../../auto-reply/thinking.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../../config/config.js";
import type { ExecToolDefaults } from "../bash-tools.js";
=======
>>>>>>> 3b5a9c14d (Fix: Preserve Per-Agent Exec Override After Session Compaction (#15833))

export function mapThinkingLevel(level?: ThinkLevel): ThinkingLevel {
  // pi-agent-core supports "xhigh"; Moltbot enables it for specific models.
  if (!level) return "off";
  return level;
}

<<<<<<< HEAD
export function resolveExecToolDefaults(config?: MoltbotConfig): ExecToolDefaults | undefined {
  const tools = config?.tools;
  if (!tools?.exec) return undefined;
  return tools.exec;
}

=======
>>>>>>> 3b5a9c14d (Fix: Preserve Per-Agent Exec Override After Session Compaction (#15833))
export function describeUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    const serialized = JSON.stringify(error);
    return serialized ?? "Unknown error";
  } catch {
    return "Unknown error";
  }
}

export type { ReasoningLevel, ThinkLevel };
