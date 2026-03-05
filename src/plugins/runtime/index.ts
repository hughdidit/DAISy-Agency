import { createRequire } from "node:module";
import { resolveStateDir } from "../../config/paths.js";
import { transcribeAudioFile } from "../../media-understanding/transcribe-audio.js";
import { textToSpeechTelephony } from "../../tts/tts.js";
import { createRuntimeChannel } from "./runtime-channel.js";
import { createRuntimeConfig } from "./runtime-config.js";
import { createRuntimeEvents } from "./runtime-events.js";
import { createRuntimeLogging } from "./runtime-logging.js";
import { createRuntimeMedia } from "./runtime-media.js";
import { createRuntimeSystem } from "./runtime-system.js";
import { createRuntimeTools } from "./runtime-tools.js";
import type { PluginRuntime } from "./types.js";

let cachedVersion: string | null = null;

function resolveVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../../../package.json") as { version?: string };
    cachedVersion = pkg.version ?? "unknown";
    return cachedVersion;
  } catch {
    cachedVersion = "unknown";
    return cachedVersion;
  }
}

const sendMessageWhatsAppLazy: PluginRuntime["channel"]["whatsapp"]["sendMessageWhatsApp"] = async (
  ...args
) => {
  const { sendMessageWhatsApp } = await loadWebOutbound();
  return sendMessageWhatsApp(...args);
};

const sendPollWhatsAppLazy: PluginRuntime["channel"]["whatsapp"]["sendPollWhatsApp"] = async (
  ...args
) => {
  const { sendPollWhatsApp } = await loadWebOutbound();
  return sendPollWhatsApp(...args);
};

const loginWebLazy: PluginRuntime["channel"]["whatsapp"]["loginWeb"] = async (...args) => {
  const { loginWeb } = await loadWebLogin();
  return loginWeb(...args);
};

const startWebLoginWithQrLazy: PluginRuntime["channel"]["whatsapp"]["startWebLoginWithQr"] = async (
  ...args
) => {
  const { startWebLoginWithQr } = await loadWebLoginQr();
  return startWebLoginWithQr(...args);
};

const waitForWebLoginLazy: PluginRuntime["channel"]["whatsapp"]["waitForWebLogin"] = async (
  ...args
) => {
  const { waitForWebLogin } = await loadWebLoginQr();
  return waitForWebLogin(...args);
};

const monitorWebChannelLazy: PluginRuntime["channel"]["whatsapp"]["monitorWebChannel"] = async (
  ...args
) => {
  const { monitorWebChannel } = await loadWebChannel();
  return monitorWebChannel(...args);
};

const handleWhatsAppActionLazy: PluginRuntime["channel"]["whatsapp"]["handleWhatsAppAction"] =
  async (...args) => {
    const { handleWhatsAppAction } = await loadWhatsAppActions();
    return handleWhatsAppAction(...args);
  };

let webOutboundPromise: Promise<typeof import("../../web/outbound.js")> | null = null;
let webLoginPromise: Promise<typeof import("../../web/login.js")> | null = null;
let webLoginQrPromise: Promise<typeof import("../../web/login-qr.js")> | null = null;
let webChannelPromise: Promise<typeof import("../../channels/web/index.js")> | null = null;
let whatsappActionsPromise: Promise<
  typeof import("../../agents/tools/whatsapp-actions.js")
> | null = null;

function loadWebOutbound() {
  webOutboundPromise ??= import("../../web/outbound.js");
  return webOutboundPromise;
}

function loadWebLogin() {
  webLoginPromise ??= import("../../web/login.js");
  return webLoginPromise;
}

function loadWebLoginQr() {
  webLoginQrPromise ??= import("../../web/login-qr.js");
  return webLoginQrPromise;
}

function loadWebChannel() {
  webChannelPromise ??= import("../../channels/web/index.js");
  return webChannelPromise;
}

function loadWhatsAppActions() {
  whatsappActionsPromise ??= import("../../agents/tools/whatsapp-actions.js");
  return whatsappActionsPromise;
}

export function createPluginRuntime(): PluginRuntime {
  const runtime = {
    version: resolveVersion(),
    config: createRuntimeConfig(),
    system: createRuntimeSystem(),
    media: createRuntimeMedia(),
    tts: { textToSpeechTelephony },
    stt: { transcribeAudioFile },
    tools: createRuntimeTools(),
    channel: createRuntimeChannel(),
    events: createRuntimeEvents(),
    logging: createRuntimeLogging(),
    state: { resolveStateDir },
  } satisfies PluginRuntime;

  return runtime;
}

export type { PluginRuntime } from "./types.js";
