import type { EventEmitter } from "node:events";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { logVerbose } from "../globals.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { RuntimeEnv } from "../runtime.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { logVerbose } from "../globals.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { RuntimeEnv } from "../runtime.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { logVerbose } from "../globals.js";
import type { RuntimeEnv } from "../runtime.js";

type GatewayEmitter = Pick<EventEmitter, "on" | "removeListener">;

const INFO_DEBUG_MARKERS = [
  "WebSocket connection closed",
  "Reconnecting with backoff",
  "Attempting resume with backoff",
];

const shouldPromoteGatewayDebug = (message: string) =>
  INFO_DEBUG_MARKERS.some((marker) => message.includes(marker));

const formatGatewayMetrics = (metrics: unknown) => {
  if (metrics === null || metrics === undefined) {
    return String(metrics);
  }
  if (typeof metrics === "string") {
    return metrics;
  }
  if (typeof metrics === "number" || typeof metrics === "boolean" || typeof metrics === "bigint") {
    return String(metrics);
  }
  try {
    return JSON.stringify(metrics);
  } catch {
    return "[unserializable metrics]";
  }
};

export function attachDiscordGatewayLogging(params: {
  emitter?: GatewayEmitter;
  runtime: RuntimeEnv;
}) {
  const { emitter, runtime } = params;
  if (!emitter) {
    return () => {};
  }

  const onGatewayDebug = (msg: unknown) => {
    const message = String(msg);
    logVerbose(`discord gateway: ${message}`);
    if (shouldPromoteGatewayDebug(message)) {
      runtime.log?.(`discord gateway: ${message}`);
    }
  };

  const onGatewayWarning = (warning: unknown) => {
    logVerbose(`discord gateway warning: ${String(warning)}`);
  };

  const onGatewayMetrics = (metrics: unknown) => {
    logVerbose(`discord gateway metrics: ${formatGatewayMetrics(metrics)}`);
  };

  emitter.on("debug", onGatewayDebug);
  emitter.on("warning", onGatewayWarning);
  emitter.on("metrics", onGatewayMetrics);

  return () => {
    emitter.removeListener("debug", onGatewayDebug);
    emitter.removeListener("warning", onGatewayWarning);
    emitter.removeListener("metrics", onGatewayMetrics);
  };
}
