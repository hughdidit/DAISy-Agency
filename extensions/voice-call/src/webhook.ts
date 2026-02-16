import { spawn } from "node:child_process";
import http from "node:http";
import { URL } from "node:url";

import type { VoiceCallConfig } from "./config.js";
import type { CoreConfig } from "./core-bridge.js";
import type { CallManager } from "./manager.js";
import type { Logger } from "./manager/context.js";
import { defaultLogger } from "./manager/context.js";
import type { MediaStreamConfig } from "./media-stream.js";
import { MediaStreamHandler } from "./media-stream.js";
import type { VoiceCallProvider } from "./providers/base.js";
import { OpenAIRealtimeSTTProvider } from "./providers/stt-openai-realtime.js";
import type { TwilioProvider } from "./providers/twilio.js";
import type { NormalizedEvent, WebhookContext } from "./types.js";
<<<<<<< HEAD
=======

const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;
>>>>>>> 90ef2d6bd (chore: Update formatting.)

/**
 * HTTP server for receiving voice call webhooks from providers.
 * Supports WebSocket upgrades for media streams when streaming is enabled.
 */
export class VoiceCallWebhookServer {
  private server: http.Server | null = null;
  private config: VoiceCallConfig;
  private manager: CallManager;
  private provider: VoiceCallProvider;
  private coreConfig: CoreConfig | null;
<<<<<<< HEAD
  private readonly logger: Logger;
=======
  private staleCallReaperInterval: ReturnType<typeof setInterval> | null = null;
>>>>>>> 390c503b5 (feat(voice-call): add configurable stale call reaper)

  /** Media stream handler for bidirectional audio (when streaming enabled) */
  private mediaStreamHandler: MediaStreamHandler | null = null;

  constructor(
    config: VoiceCallConfig,
    manager: CallManager,
    provider: VoiceCallProvider,
    coreConfig?: CoreConfig,
    logger?: Logger,
  ) {
    this.config = config;
    this.manager = manager;
    this.provider = provider;
    this.coreConfig = coreConfig ?? null;
    this.logger = logger ?? defaultLogger;

    // Initialize media stream handler if streaming is enabled
    if (config.streaming?.enabled) {
      this.initializeMediaStreaming();
    }
  }

  /**
   * Get the media stream handler (for wiring to provider).
   */
  getMediaStreamHandler(): MediaStreamHandler | null {
    return this.mediaStreamHandler;
  }

  /**
   * Initialize media streaming with OpenAI Realtime STT.
   */
  private initializeMediaStreaming(): void {
    const apiKey = this.config.streaming?.openaiApiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
<<<<<<< HEAD
      this.logger.warn(
        "[voice-call] Streaming enabled but no OpenAI API key found",
      );
=======
      console.warn("[voice-call] Streaming enabled but no OpenAI API key found");
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
      return;
    }

    const sttProvider = new OpenAIRealtimeSTTProvider({
      apiKey,
      model: this.config.streaming?.sttModel,
      silenceDurationMs: this.config.streaming?.silenceDurationMs,
      vadThreshold: this.config.streaming?.vadThreshold,
    }, this.logger);

    const streamConfig: MediaStreamConfig = {
      sttProvider,
      onTranscript: (providerCallId, transcript) => {
<<<<<<< HEAD
        this.logger.info(
          `[voice-call] Transcript for ${providerCallId}: ${transcript}`,
        );
=======
        console.log(`[voice-call] Transcript for ${providerCallId}: ${transcript}`);
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)

        // Clear TTS queue on barge-in (user started speaking, interrupt current playback)
        if (this.provider.name === "twilio") {
          (this.provider as TwilioProvider).clearTtsQueue(providerCallId);
        }

        // Look up our internal call ID from the provider call ID
        const call = this.manager.getCallByProviderCallId(providerCallId);
        if (!call) {
<<<<<<< HEAD
          this.logger.warn(
            `[voice-call] No active call found for provider ID: ${providerCallId}`,
          );
=======
          console.warn(`[voice-call] No active call found for provider ID: ${providerCallId}`);
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
          return;
        }

        // Create a speech event and process it through the manager
        const event: NormalizedEvent = {
          id: `stream-transcript-${Date.now()}`,
          type: "call.speech",
          callId: call.callId,
          providerCallId,
          timestamp: Date.now(),
          transcript,
          isFinal: true,
        };
        this.manager.processEvent(event);

        // Auto-respond in conversation mode (inbound always, outbound if mode is conversation)
        const callMode = call.metadata?.mode as string | undefined;
        const shouldRespond = call.direction === "inbound" || callMode === "conversation";
        if (shouldRespond) {
          this.handleInboundResponse(call.callId, transcript).catch(async (err) => {
            this.logger.warn(`[voice-call] Failed to auto-respond: ${err}`);
            try {
              await this.manager.endCall(call.callId);
            } catch {
              // Best-effort cleanup
            }
          });
        }
      },
      onSpeechStart: (providerCallId) => {
        if (this.provider.name === "twilio") {
          (this.provider as TwilioProvider).clearTtsQueue(providerCallId);
        }
      },
      onPartialTranscript: (callId, partial) => {
        this.logger.debug(`[voice-call] Partial for ${callId}: ${partial}`);
      },
      onConnect: (callId, streamSid) => {
<<<<<<< HEAD
        this.logger.info(
          `[voice-call] Media stream connected: ${callId} -> ${streamSid}`,
        );
=======
        console.log(`[voice-call] Media stream connected: ${callId} -> ${streamSid}`);
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
        // Register stream with provider for TTS routing
        if (this.provider.name === "twilio") {
          (this.provider as TwilioProvider).registerCallStream(callId, streamSid);
        }

<<<<<<< HEAD
        // Speak initial message if one was provided when call was initiated
        // Use setTimeout to allow stream setup to complete
        setTimeout(() => {
          this.manager.speakInitialMessage(callId).catch((err) => {
            this.logger.warn(`[voice-call] Failed to speak initial message: ${err}`);
          });
        }, 500);
=======
        // Try instant cached greeting for inbound calls (pre-generated at startup)
        const cachedAudio =
          this.provider.name === "twilio"
            ? (this.provider as TwilioProvider).getCachedGreetingAudio()
            : null;
        const call = this.manager.getCallByProviderCallId(callId);
        if (cachedAudio && call?.metadata?.initialMessage && call.direction === "inbound") {
          console.log(`[voice-call] Playing cached greeting (${cachedAudio.length} bytes)`);
          delete call.metadata.initialMessage; // prevent re-speaking via fallback
          const handler = this.mediaStreamHandler!;
          const CHUNK_SIZE = 160;
          const CHUNK_DELAY_MS = 20;
          void (async () => {
            const { chunkAudio } = await import("./telephony-audio.js");
            await handler.queueTts(streamSid, async (signal) => {
              for (const chunk of chunkAudio(cachedAudio, CHUNK_SIZE)) {
                if (signal.aborted) break;
                handler.sendAudio(streamSid, chunk);
                await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
              }
              if (!signal.aborted) {
                handler.sendMark(streamSid, `greeting-${Date.now()}`);
              }
            });
          })().catch((err) =>
            console.warn("[voice-call] Cached greeting playback failed:", err),
          );
        } else {
          // Fallback: original path with reduced delay
          setTimeout(() => {
            this.manager.speakInitialMessage(callId).catch((err) => {
              console.warn(`[voice-call] Failed to speak initial message:`, err);
            });
          }, 100);
        }
>>>>>>> 2c6db5755 (feat(voice-call): pre-cache inbound greeting for instant playback)
      },
      onDisconnect: (callId) => {
<<<<<<< HEAD
        this.logger.info(`[voice-call] Media stream disconnected: ${callId}`);
=======
        console.log(`[voice-call] Media stream disconnected: ${callId}`);
        // Auto-end call when media stream disconnects to prevent stuck calls.
        // Without this, calls can remain active indefinitely after the stream closes.
        const disconnectedCall = this.manager.getCallByProviderCallId(callId);
        if (disconnectedCall) {
          console.log(`[voice-call] Auto-ending call ${disconnectedCall.callId} on stream disconnect`);
          void this.manager.endCall(disconnectedCall.callId).catch(() => {});
        }
>>>>>>> 3eec5e54b (fix(voice-call): auto-end call when media stream disconnects)
        if (this.provider.name === "twilio") {
          (this.provider as TwilioProvider).unregisterCallStream(callId);
        }
      },
    };

    this.mediaStreamHandler = new MediaStreamHandler(streamConfig, this.logger);
    this.logger.info("[voice-call] Media streaming initialized");
  }

  /**
   * Start the webhook server.
   */
  async start(): Promise<string> {
    const { port, bind, path: webhookPath } = this.config.serve;
    const streamPath = this.config.streaming?.streamPath || "/voice/stream";

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res, webhookPath).catch((err) => {
          this.logger.error(`[voice-call] Webhook error: ${err}`);
          res.statusCode = 500;
          res.end("Internal Server Error");
        });
      });

      // Handle WebSocket upgrades for media streams
      if (this.mediaStreamHandler) {
        this.server.on("upgrade", (request, socket, head) => {
          const url = new URL(request.url || "/", `http://${request.headers.host}`);

          if (url.pathname === streamPath) {
            this.logger.info("[voice-call] WebSocket upgrade for media stream");
            this.mediaStreamHandler?.handleUpgrade(request, socket, head);
          } else {
            socket.destroy();
          }
        });
      }

      this.server.on("error", reject);

      this.server.listen(port, bind, () => {
        const url = `http://${bind}:${port}${webhookPath}`;
        this.logger.info(`[voice-call] Webhook server listening on ${url}`);
        if (this.mediaStreamHandler) {
<<<<<<< HEAD
          this.logger.info(
            `[voice-call] Media stream WebSocket on ws://${bind}:${port}${streamPath}`,
          );
=======
          console.log(`[voice-call] Media stream WebSocket on ws://${bind}:${port}${streamPath}`);
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
        }
        resolve(url);

        // Start the stale call reaper if configured
        this.startStaleCallReaper();
      });
    });
  }

  /**
   * Start a periodic reaper that ends calls older than the configured threshold.
   * Catches calls stuck in unexpected states (e.g., notify-mode calls that never
   * receive a terminal webhook from the provider).
   */
  private startStaleCallReaper(): void {
    const maxAgeSeconds = this.config.staleCallReaperSeconds;
    if (!maxAgeSeconds || maxAgeSeconds <= 0) {
      return;
    }

    const CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds
    const maxAgeMs = maxAgeSeconds * 1000;

    this.staleCallReaperInterval = setInterval(() => {
      const now = Date.now();
      for (const call of this.manager.getActiveCalls()) {
        const age = now - call.startedAt;
        if (age > maxAgeMs) {
          console.log(
            `[voice-call] Reaping stale call ${call.callId} (age: ${Math.round(age / 1000)}s, state: ${call.state})`,
          );
          void this.manager.endCall(call.callId).catch(() => {});
        }
      }
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stop the webhook server.
   */
  async stop(): Promise<void> {
    if (this.staleCallReaperInterval) {
      clearInterval(this.staleCallReaperInterval);
      this.staleCallReaperInterval = null;
    }
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP request.
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    webhookPath: string,
  ): Promise<void> {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    // Check path
    if (!url.pathname.startsWith(webhookPath)) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }

    // Only accept POST
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    // Read body
    const body = await this.readBody(req);

    // Build webhook context
    const ctx: WebhookContext = {
      headers: req.headers as Record<string, string | string[] | undefined>,
      rawBody: body,
      url: `http://${req.headers.host}${req.url}`,
      method: "POST",
      query: Object.fromEntries(url.searchParams),
      remoteAddress: req.socket.remoteAddress ?? undefined,
    };

    // Verify signature
    const verification = this.provider.verifyWebhook(ctx);
    if (!verification.ok) {
<<<<<<< HEAD
      this.logger.warn(
        `[voice-call] Webhook verification failed: ${verification.reason}`,
      );
=======
      console.warn(`[voice-call] Webhook verification failed: ${verification.reason}`);
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
      res.statusCode = 401;
      res.end("Unauthorized");
      return;
    }

    // Parse events
    const result = this.provider.parseWebhookEvent(ctx);

    // Process each event
    for (const event of result.events) {
      try {
        await this.manager.processEvent(event);
      } catch (err) {
<<<<<<< HEAD
        this.logger.error(
          `[voice-call] Error processing event ${event.type}: ${err}`,
        );
=======
        console.error(`[voice-call] Error processing event ${event.type}:`, err);
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
      }
    }

    // Send response
    res.statusCode = result.statusCode || 200;

    if (result.providerResponseHeaders) {
      for (const [key, value] of Object.entries(result.providerResponseHeaders)) {
        res.setHeader(key, value);
      }
    }

    res.end(result.providerResponseBody || "OK");
  }

  /**
   * Read request body as string.
   */
  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      req.on("error", reject);
    });
  }

  /**
   * Handle auto-response for inbound calls using the agent system.
   * Supports tool calling for richer voice interactions.
   */
<<<<<<< HEAD
  private async handleInboundResponse(
    callId: string,
    userMessage: string,
  ): Promise<void> {
    this.logger.info(
      `[voice-call] Auto-responding to inbound call ${callId}: "${userMessage}"`,
    );
=======
  private async handleInboundResponse(callId: string, userMessage: string): Promise<void> {
    console.log(`[voice-call] Auto-responding to inbound call ${callId}: "${userMessage}"`);
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)

    // Get call context for conversation history
    const call = this.manager.getCall(callId);
    if (!call) {
      this.logger.warn(`[voice-call] Call ${callId} not found for auto-response`);
      return;
    }

    if (!this.coreConfig) {
      this.logger.warn("[voice-call] Core config missing; skipping auto-response");
      return;
    }

    try {
      const { generateVoiceResponse } = await import("./response-generator.js");

      const result = await generateVoiceResponse({
        voiceConfig: this.config,
        coreConfig: this.coreConfig,
        callId,
        from: call.from,
        transcript: call.transcript,
        userMessage,
      });

      if (result.error) {
<<<<<<< HEAD
        this.logger.error(
          `[voice-call] Response generation error: ${result.error}`,
        );
        try {
          await this.manager.endCall(callId);
        } catch {
          // Best-effort cleanup
        }
=======
        console.error(`[voice-call] Response generation error: ${result.error}`);
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
        return;
      }

      if (result.text) {
        this.logger.info(`[voice-call] AI response: "${result.text}"`);
        await this.manager.speak(callId, result.text);
      }
    } catch (err) {
      this.logger.error(`[voice-call] Auto-response error: ${err}`);
      try {
        await this.manager.endCall(callId);
      } catch {
        // Best-effort cleanup
      }
    }
  }
}

/**
 * Resolve the current machine's Tailscale DNS name.
 */
export type TailscaleSelfInfo = {
  dnsName: string | null;
  nodeId: string | null;
};

/**
 * Run a tailscale command with timeout, collecting stdout.
 */
function runTailscaleCommand(
  args: string[],
  timeoutMs = 2500,
): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn("tailscale", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    proc.stdout.on("data", (data) => {
      stdout += data;
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ code: -1, stdout: "" });
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout });
    });
  });
}

export async function getTailscaleSelfInfo(): Promise<TailscaleSelfInfo | null> {
  const { code, stdout } = await runTailscaleCommand(["status", "--json"]);
  if (code !== 0) {
    return null;
  }

  try {
    const status = JSON.parse(stdout);
    return {
      dnsName: status.Self?.DNSName?.replace(/\.$/, "") || null,
      nodeId: status.Self?.ID || null,
    };
  } catch {
    return null;
  }
}

export async function getTailscaleDnsName(): Promise<string | null> {
  const info = await getTailscaleSelfInfo();
  return info?.dnsName ?? null;
}

export async function setupTailscaleExposureRoute(opts: {
  mode: "serve" | "funnel";
  path: string;
  localUrl: string;
}): Promise<string | null> {
  const dnsName = await getTailscaleDnsName();
  if (!dnsName) {
    console.warn("[voice-call] Could not get Tailscale DNS name"); // standalone util, no logger available
    return null;
  }

  const { code } = await runTailscaleCommand([
    opts.mode,
    "--bg",
    "--yes",
    "--set-path",
    opts.path,
    opts.localUrl,
  ]);

  if (code === 0) {
    const publicUrl = `https://${dnsName}${opts.path}`;
    console.log(`[voice-call] Tailscale ${opts.mode} active: ${publicUrl}`); // standalone util
    return publicUrl;
  }

  console.warn(`[voice-call] Tailscale ${opts.mode} failed`); // standalone util
  return null;
}

export async function cleanupTailscaleExposureRoute(opts: {
  mode: "serve" | "funnel";
  path: string;
}): Promise<void> {
  await runTailscaleCommand([opts.mode, "off", opts.path]);
}

/**
 * Setup Tailscale serve/funnel for the webhook server.
 * This is a helper that shells out to `tailscale serve` or `tailscale funnel`.
 */
export async function setupTailscaleExposure(config: VoiceCallConfig): Promise<string | null> {
  if (config.tailscale.mode === "off") {
    return null;
  }

  const mode = config.tailscale.mode === "funnel" ? "funnel" : "serve";
  // Include the path suffix so tailscale forwards to the correct endpoint
  // (tailscale strips the mount path prefix when proxying)
  const localUrl = `http://127.0.0.1:${config.serve.port}${config.serve.path}`;
  return setupTailscaleExposureRoute({
    mode,
    path: config.tailscale.path,
    localUrl,
  });
}

/**
 * Cleanup Tailscale serve/funnel.
 */
export async function cleanupTailscaleExposure(config: VoiceCallConfig): Promise<void> {
  if (config.tailscale.mode === "off") {
    return;
  }

  const mode = config.tailscale.mode === "funnel" ? "funnel" : "serve";
  await cleanupTailscaleExposureRoute({ mode, path: config.tailscale.path });
}
