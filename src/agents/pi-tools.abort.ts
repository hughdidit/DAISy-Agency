import type { AnyAgentTool } from "./pi-tools.types.js";

function throwAbortError(): never {
  const err = new Error("Aborted");
  err.name = "AbortError";
  throw err;
}

<<<<<<< HEAD
=======
/**
 * Checks if an object is a valid AbortSignal using structural typing.
 * This is more reliable than `instanceof` across different realms (VM, iframe, etc.)
 * where the AbortSignal constructor may differ.
 */
function isAbortSignal(obj: unknown): obj is AbortSignal {
  return obj instanceof AbortSignal;
}

>>>>>>> 5fb8f779c (fix: validate AbortSignal instances before calling AbortSignal.any() (#7277) (thanks @Elarwei001))
function combineAbortSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
<<<<<<< HEAD
  if (!a && !b) return undefined;
  if (a && !b) return a;
  if (b && !a) return b;
  if (a?.aborted) return a;
  if (b?.aborted) return b;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([a as AbortSignal, b as AbortSignal]);
=======
  if (!a && !b) {
    return undefined;
  }
  if (a && !b) {
    return a;
  }
  if (b && !a) {
    return b;
  }
  if (a?.aborted) {
    return a;
  }
  if (b?.aborted) {
    return b;
  }
  if (
    typeof AbortSignal.any === "function" &&
    a instanceof AbortSignal &&
    b instanceof AbortSignal
  ) {
    return AbortSignal.any([a, b]);
>>>>>>> a63ec41a7 (fix: validate AbortSignal instances before calling AbortSignal.any())
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  a?.addEventListener("abort", onAbort, { once: true });
  b?.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

export function wrapToolWithAbortSignal(
  tool: AnyAgentTool,
  abortSignal?: AbortSignal,
): AnyAgentTool {
  if (!abortSignal) return tool;
  const execute = tool.execute;
  if (!execute) return tool;
  return {
    ...tool,
    execute: async (toolCallId, params, signal, onUpdate) => {
      const combined = combineAbortSignals(signal, abortSignal);
      if (combined?.aborted) throwAbortError();
      return await execute(toolCallId, params, combined, onUpdate);
    },
  };
}
