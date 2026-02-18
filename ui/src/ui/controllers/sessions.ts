<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { GatewayBrowserClient } from "../gateway";
import { toNumber } from "../format";
import type { SessionsListResult } from "../types";
=======
import type { GatewayBrowserClient } from "../gateway.ts";
import type { SessionsListResult } from "../types.ts";
import { toNumber } from "../format.ts";
>>>>>>> 6e09c1142 (chore: Switch to `NodeNext` for `module`/`moduleResolution` in `ui`.)
=======
import { toNumber } from "../format.ts";
import type { GatewayBrowserClient } from "../gateway.ts";
import type { SessionsListResult } from "../types.ts";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { toNumber } from "../format.ts";
import type { GatewayBrowserClient } from "../gateway.ts";
import type { SessionsListResult } from "../types.ts";
>>>>>>> 6b8c0bc69 (chore: Format files.)
=======
import type { GatewayBrowserClient } from "../gateway.ts";
import type { SessionsListResult } from "../types.ts";
import { toNumber } from "../format.ts";
>>>>>>> ed11e93cf (chore(format))
=======
import { toNumber } from "../format.ts";
import type { GatewayBrowserClient } from "../gateway.ts";
import type { SessionsListResult } from "../types.ts";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { GatewayBrowserClient } from "../gateway.ts";
import type { SessionsListResult } from "../types.ts";
import { toNumber } from "../format.ts";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)

export type SessionsState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  sessionsLoading: boolean;
  sessionsResult: SessionsListResult | null;
  sessionsError: string | null;
  sessionsFilterActive: string;
  sessionsFilterLimit: string;
  sessionsIncludeGlobal: boolean;
  sessionsIncludeUnknown: boolean;
};

export async function loadSessions(
  state: SessionsState,
  overrides?: {
    activeMinutes?: number;
    limit?: number;
    includeGlobal?: boolean;
    includeUnknown?: boolean;
  },
) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.sessionsLoading) {
    return;
  }
  state.sessionsLoading = true;
  state.sessionsError = null;
  try {
    const includeGlobal = overrides?.includeGlobal ?? state.sessionsIncludeGlobal;
    const includeUnknown = overrides?.includeUnknown ?? state.sessionsIncludeUnknown;
    const activeMinutes = overrides?.activeMinutes ?? toNumber(state.sessionsFilterActive, 0);
    const limit = overrides?.limit ?? toNumber(state.sessionsFilterLimit, 0);
    const params: Record<string, unknown> = {
      includeGlobal,
      includeUnknown,
    };
    if (activeMinutes > 0) {
      params.activeMinutes = activeMinutes;
    }
    if (limit > 0) {
      params.limit = limit;
    }
    const res = await state.client.request<SessionsListResult | undefined>("sessions.list", params);
    if (res) {
      state.sessionsResult = res;
    }
  } catch (err) {
    state.sessionsError = String(err);
  } finally {
    state.sessionsLoading = false;
  }
}

export async function patchSession(
  state: SessionsState,
  key: string,
  patch: {
    label?: string | null;
    thinkingLevel?: string | null;
    verboseLevel?: string | null;
    reasoningLevel?: string | null;
  },
) {
  if (!state.client || !state.connected) {
    return;
  }
  const params: Record<string, unknown> = { key };
  if ("label" in patch) {
    params.label = patch.label;
  }
  if ("thinkingLevel" in patch) {
    params.thinkingLevel = patch.thinkingLevel;
  }
  if ("verboseLevel" in patch) {
    params.verboseLevel = patch.verboseLevel;
  }
  if ("reasoningLevel" in patch) {
    params.reasoningLevel = patch.reasoningLevel;
  }
  try {
    await state.client.request("sessions.patch", params);
    await loadSessions(state);
  } catch (err) {
    state.sessionsError = String(err);
  }
}

export async function deleteSession(state: SessionsState, key: string) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.sessionsLoading) {
    return;
  }
  const confirmed = window.confirm(
    `Delete session "${key}"?\n\nDeletes the session entry and archives its transcript.`,
  );
  if (!confirmed) {
    return;
  }
  state.sessionsLoading = true;
  state.sessionsError = null;
  try {
    await state.client.request("sessions.delete", { key, deleteTranscript: true });
  } catch (err) {
    state.sessionsError = String(err);
  } finally {
    state.sessionsLoading = false;
  }
}
