import type { VoiceCallConfig } from "../config.js";
import type { VoiceCallProvider } from "../providers/base.js";
import type { CallId, CallRecord } from "../types.js";

export type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
};

export const defaultLogger: Logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

/**
 * Strip control characters from untrusted values before logging
 * to prevent log injection (forged log entries via newlines/tabs).
 */
export function sanitizeLogValue(value: string): string {
  return value.replace(/[\r\n\t]/g, " ");
}

export type TranscriptWaiter = {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
};

export type CallManagerContext = {
  activeCalls: Map<CallId, CallRecord>;
  providerCallIdMap: Map<string, CallId>;
  processedEventIds: Set<string>;
  provider: VoiceCallProvider | null;
  config: VoiceCallConfig;
  storePath: string;
  webhookUrl: string | null;
  transcriptWaiters: Map<CallId, TranscriptWaiter>;
  maxDurationTimers: Map<CallId, NodeJS.Timeout>;
  logger: Logger;
};
