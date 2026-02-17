import fs from "node:fs";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
import type { CallMode, VoiceCallConfig } from "./config.js";
import type { VoiceCallProvider } from "./providers/base.js";
import { isAllowlistedCaller, normalizePhoneNumber } from "./allowlist.js";
import {
  type CallId,
  type CallRecord,
  CallRecordSchema,
  type CallState,
  type NormalizedEvent,
  type OutboundCallOptions,
  TerminalStates,
  type TranscriptEntry,
} from "./types.js";
=======
import type { VoiceCallConfig } from "./config.js";
import type { CallManagerContext } from "./manager/context.js";
import type { VoiceCallProvider } from "./providers/base.js";
import type { CallId, CallRecord, NormalizedEvent, OutboundCallOptions } from "./types.js";
import { processEvent as processManagerEvent } from "./manager/events.js";
import { getCallByProviderCallId as getCallByProviderCallIdFromMaps } from "./manager/lookup.js";
import {
  continueCall as continueCallWithContext,
  endCall as endCallWithContext,
  initiateCall as initiateCallWithContext,
  speak as speakWithContext,
  speakInitialMessage as speakInitialMessageWithContext,
} from "./manager/outbound.js";
import { getCallHistoryFromStore, loadActiveCallsFromStore } from "./manager/store.js";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 89574f30c (refactor(voice-call): split manager into facade and context slices)
=======
import type { VoiceCallProvider } from "./providers/base.js";
import type { CallId, CallRecord, NormalizedEvent, OutboundCallOptions } from "./types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
import { resolveUserPath } from "./utils.js";

function resolveDefaultStoreBase(config: VoiceCallConfig, storePath?: string): string {
  const rawOverride = storePath?.trim() || config.store?.trim();
  if (rawOverride) {
    return resolveUserPath(rawOverride);
  }
  const preferred = path.join(os.homedir(), ".openclaw", "voice-calls");
  const candidates = [preferred].map((dir) => resolveUserPath(dir));
  const existing =
    candidates.find((dir) => {
      try {
        return fs.existsSync(path.join(dir, "calls.jsonl")) || fs.existsSync(dir);
      } catch {
        return false;
      }
    }) ?? resolveUserPath(preferred);
  return existing;
}

/**
 * Manages voice calls: state ownership and delegation to manager helper modules.
 */
export class CallManager {
  private activeCalls = new Map<CallId, CallRecord>();
  private providerCallIdMap = new Map<string, CallId>();
  private processedEventIds = new Set<string>();
  private provider: VoiceCallProvider | null = null;
  private config: VoiceCallConfig;
  private storePath: string;
  private webhookUrl: string | null = null;
  private transcriptWaiters = new Map<
    CallId,
    {
      resolve: (text: string) => void;
      reject: (err: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private maxDurationTimers = new Map<CallId, NodeJS.Timeout>();

  constructor(config: VoiceCallConfig, storePath?: string) {
    this.config = config;
    this.storePath = resolveDefaultStoreBase(config, storePath);
  }

  /**
   * Initialize the call manager with a provider.
   */
  initialize(provider: VoiceCallProvider, webhookUrl: string): void {
    this.provider = provider;
    this.webhookUrl = webhookUrl;

    fs.mkdirSync(this.storePath, { recursive: true });

    const persisted = loadActiveCallsFromStore(this.storePath);
    this.activeCalls = persisted.activeCalls;
    this.providerCallIdMap = persisted.providerCallIdMap;
    this.processedEventIds = persisted.processedEventIds;
    this.rejectedProviderCallIds = persisted.rejectedProviderCallIds;
  }

  /**
   * Get the current provider.
   */
  getProvider(): VoiceCallProvider | null {
    return this.provider;
  }

  /**
   * Initiate an outbound call.
   */
  async initiateCall(
    to: string,
    sessionKey?: string,
    options?: OutboundCallOptions | string,
  ): Promise<{ callId: CallId; success: boolean; error?: string }> {
    return initiateCallWithContext(this.getContext(), to, sessionKey, options);
  }

  /**
   * Speak to user in an active call.
   */
  async speak(callId: CallId, text: string): Promise<{ success: boolean; error?: string }> {
    return speakWithContext(this.getContext(), callId, text);
  }

  /**
   * Speak the initial message for a call (called when media stream connects).
   */
  async speakInitialMessage(providerCallId: string): Promise<void> {
<<<<<<< HEAD
    const call = this.getCallByProviderCallId(providerCallId);
    if (!call) {
      console.warn(`[voice-call] speakInitialMessage: no call found for ${providerCallId}`);
      return;
    }

    const initialMessage = call.metadata?.initialMessage as string | undefined;
    const mode = (call.metadata?.mode as CallMode) ?? "conversation";

    if (!initialMessage) {
      console.log(`[voice-call] speakInitialMessage: no initial message for ${call.callId}`);
      return;
    }

    // Clear the initial message so we don't speak it again
    if (call.metadata) {
      delete call.metadata.initialMessage;
      this.persistCallRecord(call);
    }

    console.log(`[voice-call] Speaking initial message for call ${call.callId} (mode: ${mode})`);
    const result = await this.speak(call.callId, initialMessage);
    if (!result.success) {
      console.warn(`[voice-call] Failed to speak initial message: ${result.error}`);
      return;
    }

    // In notify mode, auto-hangup after delay
    if (mode === "notify") {
      const delaySec = this.config.outbound.notifyHangupDelaySec;
      console.log(`[voice-call] Notify mode: auto-hangup in ${delaySec}s for call ${call.callId}`);
      setTimeout(async () => {
        const currentCall = this.getCall(call.callId);
        if (currentCall && !TerminalStates.has(currentCall.state)) {
          console.log(`[voice-call] Notify mode: hanging up call ${call.callId}`);
          await this.endCall(call.callId);
        }
      }, delaySec * 1000);
    }
  }

  /**
   * Start max duration timer for a call.
   * Auto-hangup when maxDurationSeconds is reached.
   */
  private startMaxDurationTimer(callId: CallId): void {
    // Clear any existing timer
    this.clearMaxDurationTimer(callId);

    const maxDurationMs = this.config.maxDurationSeconds * 1000;
    console.log(
      `[voice-call] Starting max duration timer (${this.config.maxDurationSeconds}s) for call ${callId}`,
    );

    const timer = setTimeout(async () => {
      this.maxDurationTimers.delete(callId);
      const call = this.getCall(callId);
      if (call && !TerminalStates.has(call.state)) {
        console.log(
          `[voice-call] Max duration reached (${this.config.maxDurationSeconds}s), ending call ${callId}`,
        );
        call.endReason = "timeout";
        this.persistCallRecord(call);
        await this.endCall(callId);
      }
    }, maxDurationMs);

    this.maxDurationTimers.set(callId, timer);
  }

  /**
   * Clear max duration timer for a call.
   */
  private clearMaxDurationTimer(callId: CallId): void {
    const timer = this.maxDurationTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.maxDurationTimers.delete(callId);
    }
  }

  private clearTranscriptWaiter(callId: CallId): void {
    const waiter = this.transcriptWaiters.get(callId);
    if (!waiter) {
      return;
    }
    clearTimeout(waiter.timeout);
    this.transcriptWaiters.delete(callId);
  }

  private rejectTranscriptWaiter(callId: CallId, reason: string): void {
    const waiter = this.transcriptWaiters.get(callId);
    if (!waiter) {
      return;
    }
    this.clearTranscriptWaiter(callId);
    waiter.reject(new Error(reason));
  }

  private resolveTranscriptWaiter(callId: CallId, transcript: string): void {
    const waiter = this.transcriptWaiters.get(callId);
    if (!waiter) {
      return;
    }
    this.clearTranscriptWaiter(callId);
    waiter.resolve(transcript);
  }

  private waitForFinalTranscript(callId: CallId): Promise<string> {
    // Only allow one in-flight waiter per call.
    this.rejectTranscriptWaiter(callId, "Transcript waiter replaced");

    const timeoutMs = this.config.transcriptTimeoutMs;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.transcriptWaiters.delete(callId);
        reject(new Error(`Timed out waiting for transcript after ${timeoutMs}ms`));
      }, timeoutMs);

      this.transcriptWaiters.set(callId, { resolve, reject, timeout });
    });
=======
    return speakInitialMessageWithContext(this.getContext(), providerCallId);
>>>>>>> 89574f30c (refactor(voice-call): split manager into facade and context slices)
  }

  /**
   * Continue call: speak prompt, then wait for user's final transcript.
   */
  async continueCall(
    callId: CallId,
    prompt: string,
  ): Promise<{ success: boolean; transcript?: string; error?: string }> {
    return continueCallWithContext(this.getContext(), callId, prompt);
  }

  /**
   * End an active call.
   */
  async endCall(callId: CallId): Promise<{ success: boolean; error?: string }> {
    return endCallWithContext(this.getContext(), callId);
  }

<<<<<<< HEAD
  /**
   * Check if an inbound call should be accepted based on policy.
   */
  private shouldAcceptInbound(from: string | undefined): boolean {
    const { inboundPolicy: policy, allowFrom } = this.config;

    switch (policy) {
      case "disabled":
        console.log("[voice-call] Inbound call rejected: policy is disabled");
        return false;

      case "open":
        console.log("[voice-call] Inbound call accepted: policy is open");
        return true;

      case "allowlist":
      case "pairing": {
        const normalized = normalizePhoneNumber(from);
        if (!normalized) {
          console.log("[voice-call] Inbound call rejected: missing caller ID");
          return false;
        }
        const allowed = isAllowlistedCaller(normalized, allowFrom);
        const status = allowed ? "accepted" : "rejected";
        console.log(
          `[voice-call] Inbound call ${status}: ${from} ${allowed ? "is in" : "not in"} allowlist`,
        );
        return allowed;
      }

      default:
        return false;
    }
  }

  /**
   * Create a call record for an inbound call.
   */
  private createInboundCall(providerCallId: string, from: string, to: string): CallRecord {
    const callId = crypto.randomUUID();

    const callRecord: CallRecord = {
      callId,
      providerCallId,
      provider: this.provider?.name || "twilio",
      direction: "inbound",
      state: "ringing",
      from,
      to,
      startedAt: Date.now(),
      transcript: [],
      processedEventIds: [],
      metadata: {
        initialMessage: this.config.inboundGreeting || "Hello! How can I help you today?",
=======
  private getContext(): CallManagerContext {
    return {
      activeCalls: this.activeCalls,
      providerCallIdMap: this.providerCallIdMap,
      processedEventIds: this.processedEventIds,
      rejectedProviderCallIds: this.rejectedProviderCallIds,
      provider: this.provider,
      config: this.config,
      storePath: this.storePath,
      webhookUrl: this.webhookUrl,
      transcriptWaiters: this.transcriptWaiters,
      maxDurationTimers: this.maxDurationTimers,
      onCallAnswered: (call) => {
        this.maybeSpeakInitialMessageOnAnswered(call);
>>>>>>> 89574f30c (refactor(voice-call): split manager into facade and context slices)
      },
    };

    this.activeCalls.set(callId, callRecord);
    this.providerCallIdMap.set(providerCallId, callId); // Map providerCallId to internal callId
    this.persistCallRecord(callRecord);

    console.log(`[voice-call] Created inbound call record: ${callId} from ${from}`);
    return callRecord;
  }

  /**
   * Look up a call by either internal callId or providerCallId.
   */
  private findCall(callIdOrProviderCallId: string): CallRecord | undefined {
    // Try direct lookup by internal callId
    const directCall = this.activeCalls.get(callIdOrProviderCallId);
    if (directCall) {
      return directCall;
    }

    // Try lookup by providerCallId
    return this.getCallByProviderCallId(callIdOrProviderCallId);
  }

  /**
   * Process a webhook event.
   */
  processEvent(event: NormalizedEvent): void {
    // Idempotency check
    if (this.processedEventIds.has(event.id)) {
      return;
    }
    this.processedEventIds.add(event.id);

    let call = this.findCall(event.callId);

    // Handle inbound calls - create record if it doesn't exist
    if (!call && event.direction === "inbound" && event.providerCallId) {
      // Check if we should accept this inbound call
      if (!this.shouldAcceptInbound(event.from)) {
        void this.rejectInboundCall(event);
        return;
      }

      // Create a new call record for this inbound call
      call = this.createInboundCall(
        event.providerCallId,
        event.from || "unknown",
        event.to || this.config.fromNumber || "unknown",
      );

      // Update the event's callId to use our internal ID
      event.callId = call.callId;
    }

    if (!call) {
      // Still no call record - ignore event
      return;
    }

    // Update provider call ID if we got it
    if (event.providerCallId && event.providerCallId !== call.providerCallId) {
      const previousProviderCallId = call.providerCallId;
      call.providerCallId = event.providerCallId;
      this.providerCallIdMap.set(event.providerCallId, call.callId);
      if (previousProviderCallId) {
        const mapped = this.providerCallIdMap.get(previousProviderCallId);
        if (mapped === call.callId) {
          this.providerCallIdMap.delete(previousProviderCallId);
        }
      }
    }

    // Track processed event
    call.processedEventIds.push(event.id);

    // Process event based on type
    switch (event.type) {
      case "call.initiated":
        this.transitionState(call, "initiated");
        break;

      case "call.ringing":
        this.transitionState(call, "ringing");
        break;

      case "call.answered":
        call.answeredAt = event.timestamp;
        this.transitionState(call, "answered");
        // Start max duration timer when call is answered
        this.startMaxDurationTimer(call.callId);
        // Best-effort: speak initial message (for inbound greetings and outbound
        // conversation mode) once the call is answered.
        this.maybeSpeakInitialMessageOnAnswered(call);
        break;

      case "call.active":
        this.transitionState(call, "active");
        break;

      case "call.speaking":
        this.transitionState(call, "speaking");
        break;

      case "call.speech":
        if (event.isFinal) {
          this.addTranscriptEntry(call, "user", event.transcript);
          this.resolveTranscriptWaiter(call.callId, event.transcript);
        }
        this.transitionState(call, "listening");
        break;

      case "call.ended":
        call.endedAt = event.timestamp;
        call.endReason = event.reason;
        this.transitionState(call, event.reason as CallState);
        this.clearMaxDurationTimer(call.callId);
        this.rejectTranscriptWaiter(call.callId, `Call ended: ${event.reason}`);
        this.activeCalls.delete(call.callId);
        if (call.providerCallId) {
          this.providerCallIdMap.delete(call.providerCallId);
        }
        break;

      case "call.error":
        if (!event.retryable) {
          call.endedAt = event.timestamp;
          call.endReason = "error";
          this.transitionState(call, "error");
          this.clearMaxDurationTimer(call.callId);
          this.rejectTranscriptWaiter(call.callId, `Call error: ${event.error}`);
          this.activeCalls.delete(call.callId);
          if (call.providerCallId) {
            this.providerCallIdMap.delete(call.providerCallId);
          }
        }
        break;
    }

    this.persistCallRecord(call);
  }

  private async rejectInboundCall(event: NormalizedEvent): Promise<void> {
    if (!this.provider || !event.providerCallId) {
      return;
    }
    const callId = event.callId || event.providerCallId;
    try {
      await this.provider.hangupCall({
        callId,
        providerCallId: event.providerCallId,
        reason: "hangup-bot",
      });
    } catch (err) {
      console.warn(
        `[voice-call] Failed to reject inbound call ${event.providerCallId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  private maybeSpeakInitialMessageOnAnswered(call: CallRecord): void {
    const initialMessage =
      typeof call.metadata?.initialMessage === "string" ? call.metadata.initialMessage.trim() : "";

    if (!initialMessage) {
      return;
    }

    if (!this.provider || !call.providerCallId) {
      return;
    }

    // Twilio has provider-specific state for speaking (<Say> fallback) and can
    // fail for inbound calls; keep existing Twilio behavior unchanged.
    if (this.provider.name === "twilio") {
      return;
    }

    void this.speakInitialMessage(call.providerCallId);
  }

  /**
   * Get an active call by ID.
   */
  getCall(callId: CallId): CallRecord | undefined {
    return this.activeCalls.get(callId);
  }

  /**
   * Get an active call by provider call ID (e.g., Twilio CallSid).
   */
  getCallByProviderCallId(providerCallId: string): CallRecord | undefined {
    return getCallByProviderCallIdFromMaps({
      activeCalls: this.activeCalls,
      providerCallIdMap: this.providerCallIdMap,
      providerCallId,
    });
  }

  /**
   * Get all active calls.
   */
  getActiveCalls(): CallRecord[] {
    return Array.from(this.activeCalls.values());
  }

  /**
   * Get call history (from persisted logs).
   */
  async getCallHistory(limit = 50): Promise<CallRecord[]> {
<<<<<<< HEAD
    const logPath = path.join(this.storePath, "calls.jsonl");

    try {
      await fsp.access(logPath);
    } catch {
      return [];
    }

    const content = await fsp.readFile(logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const calls: CallRecord[] = [];

    // Parse last N lines
    for (const line of lines.slice(-limit)) {
      try {
        const parsed = CallRecordSchema.parse(JSON.parse(line));
        calls.push(parsed);
      } catch {
        // Skip invalid lines
      }
    }

    return calls;
  }

  // States that can cycle during multi-turn conversations
  private static readonly ConversationStates = new Set<CallState>(["speaking", "listening"]);

  // Non-terminal state order for monotonic transitions
  private static readonly StateOrder: readonly CallState[] = [
    "initiated",
    "ringing",
    "answered",
    "active",
    "speaking",
    "listening",
  ];

  /**
   * Transition call state with monotonic enforcement.
   */
  private transitionState(call: CallRecord, newState: CallState): void {
    // No-op for same state or already terminal
    if (call.state === newState || TerminalStates.has(call.state)) {
      return;
    }

    // Terminal states can always be reached from non-terminal
    if (TerminalStates.has(newState)) {
      call.state = newState;
      return;
    }

    // Allow cycling between speaking and listening (multi-turn conversations)
    if (
      CallManager.ConversationStates.has(call.state) &&
      CallManager.ConversationStates.has(newState)
    ) {
      call.state = newState;
      return;
    }

    // Only allow forward transitions in state order
    const currentIndex = CallManager.StateOrder.indexOf(call.state);
    const newIndex = CallManager.StateOrder.indexOf(newState);

    if (newIndex > currentIndex) {
      call.state = newState;
    }
  }

  /**
   * Add an entry to the call transcript.
   */
  private addTranscriptEntry(call: CallRecord, speaker: "bot" | "user", text: string): void {
    const entry: TranscriptEntry = {
      timestamp: Date.now(),
      speaker,
      text,
      isFinal: true,
    };
    call.transcript.push(entry);
  }

  /**
   * Persist a call record to disk (fire-and-forget async).
   */
  private persistCallRecord(call: CallRecord): void {
    const logPath = path.join(this.storePath, "calls.jsonl");
    const line = `${JSON.stringify(call)}\n`;
    // Fire-and-forget async write to avoid blocking event loop
    fsp.appendFile(logPath, line).catch((err) => {
      console.error("[voice-call] Failed to persist call record:", err);
    });
  }

  /**
   * Load active calls from persistence (for crash recovery).
   * Uses streaming to handle large log files efficiently.
   */
  private loadActiveCalls(): void {
    const logPath = path.join(this.storePath, "calls.jsonl");
    if (!fs.existsSync(logPath)) {
      return;
    }

    // Read file synchronously and parse lines
    const content = fs.readFileSync(logPath, "utf-8");
    const lines = content.split("\n");

    // Build map of latest state per call
    const callMap = new Map<CallId, CallRecord>();

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        const call = CallRecordSchema.parse(JSON.parse(line));
        callMap.set(call.callId, call);
      } catch {
        // Skip invalid lines
      }
    }

    // Only keep non-terminal calls
    for (const [callId, call] of callMap) {
      if (!TerminalStates.has(call.state)) {
        this.activeCalls.set(callId, call);
        // Populate providerCallId mapping for lookups
        if (call.providerCallId) {
          this.providerCallIdMap.set(call.providerCallId, callId);
        }
        // Populate processed event IDs
        for (const eventId of call.processedEventIds) {
          this.processedEventIds.add(eventId);
        }
      }
    }
  }

  /**
   * Generate TwiML for notify mode (speak message and hang up).
   */
  private generateNotifyTwiml(message: string, voice: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
=======
    return getCallHistoryFromStore(this.storePath, limit);
>>>>>>> 89574f30c (refactor(voice-call): split manager into facade and context slices)
  }
}
