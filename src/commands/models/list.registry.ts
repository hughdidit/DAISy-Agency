import type { Api, Model } from "@mariozechner/pi-ai";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { discoverAuthStorage, discoverModels } from "@mariozechner/pi-coding-agent";

import { resolveMoltbotAgentDir } from "../../agents/agent-paths.js";
import type { AuthProfileStore } from "../../agents/auth-profiles.js";
<<<<<<< HEAD
=======
import type { ModelRegistry } from "../../agents/pi-model-discovery.js";
import type { OpenClawConfig } from "../../config/config.js";
import type { ModelRow } from "./list.types.js";
import { resolveOpenClawAgentDir } from "../../agents/agent-paths.js";
>>>>>>> a0cbf9002 (fix(models): antigravity opus 4.6 availability follow-up (#12845))
=======
import { resolveOpenClawAgentDir } from "../../agents/agent-paths.js";
import type { AuthProfileStore } from "../../agents/auth-profiles.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { AuthProfileStore } from "../../agents/auth-profiles.js";
=======
import type { AuthProfileStore } from "../../agents/auth-profiles.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { ModelRegistry } from "../../agents/pi-model-discovery.js";
import type { OpenClawConfig } from "../../config/config.js";
import type { ModelRow } from "./list.types.js";
import { resolveOpenClawAgentDir } from "../../agents/agent-paths.js";
<<<<<<< HEAD
>>>>>>> ed11e93cf (chore(format))
=======
import { resolveOpenClawAgentDir } from "../../agents/agent-paths.js";
import type { AuthProfileStore } from "../../agents/auth-profiles.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { resolveOpenClawAgentDir } from "../../agents/agent-paths.js";
import type { AuthProfileStore } from "../../agents/auth-profiles.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { listProfilesForProvider } from "../../agents/auth-profiles.js";
import {
  getCustomProviderApiKey,
  resolveAwsSdkEnvVarName,
  resolveEnvApiKey,
} from "../../agents/model-auth.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { ensureMoltbotModelsJson } from "../../agents/models-config.js";
import type { MoltbotConfig } from "../../config/config.js";
import type { ModelRow } from "./list.types.js";
=======
=======
import { resolveForwardCompatModel } from "../../agents/model-forward-compat.js";
>>>>>>> a0cbf9002 (fix(models): antigravity opus 4.6 availability follow-up (#12845))
=======
import {
  ANTIGRAVITY_OPUS_46_FORWARD_COMPAT_CANDIDATES,
  resolveForwardCompatModel,
} from "../../agents/model-forward-compat.js";
>>>>>>> cf2524b8b (refactor(models): share auth helpers and forward-compat list fallbacks)
import { ensureOpenClawModelsJson } from "../../agents/models-config.js";
import { ensurePiAuthJsonFromAuthProfiles } from "../../agents/pi-auth-json.js";
import type { ModelRegistry } from "../../agents/pi-model-discovery.js";
import { discoverAuthStorage, discoverModels } from "../../agents/pi-model-discovery.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 07faab6ac (openai-codex: bridge OAuth profiles into pi auth.json for model discovery (#15184))
=======
=======
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import {
  formatErrorWithStack,
  MODEL_AVAILABILITY_UNAVAILABLE_CODE,
  shouldFallbackToAuthHeuristics,
} from "./list.errors.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> a0cbf9002 (fix(models): antigravity opus 4.6 availability follow-up (#12845))
import { modelKey } from "./shared.js";
=======
import type { ModelRow } from "./list.types.js";
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { ModelRow } from "./list.types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { ModelRow } from "./list.types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { isLocalBaseUrl, modelKey } from "./shared.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)

const isLocalBaseUrl = (baseUrl: string) => {
  try {
    const url = new URL(baseUrl);
    const host = url.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
};
=======
import { isLocalBaseUrl, modelKey } from "./shared.js";
>>>>>>> cf2524b8b (refactor(models): share auth helpers and forward-compat list fallbacks)

<<<<<<< HEAD
<<<<<<< HEAD
const hasAuthForProvider = (provider: string, cfg: MoltbotConfig, authStore: AuthProfileStore) => {
  if (listProfilesForProvider(authStore, provider).length > 0) return true;
  if (provider === "amazon-bedrock" && resolveAwsSdkEnvVarName()) return true;
  if (resolveEnvApiKey(provider)) return true;
  if (getCustomProviderApiKey(cfg, provider)) return true;
=======
const hasAuthForProvider = (provider: string, cfg: OpenClawConfig, authStore: AuthProfileStore) => {
=======
const hasAuthForProvider = (
  provider: string,
  cfg?: OpenClawConfig,
  authStore?: AuthProfileStore,
) => {
  if (!cfg || !authStore) {
    return false;
  }
>>>>>>> a0cbf9002 (fix(models): antigravity opus 4.6 availability follow-up (#12845))
  if (listProfilesForProvider(authStore, provider).length > 0) {
    return true;
  }
  if (provider === "amazon-bedrock" && resolveAwsSdkEnvVarName()) {
    return true;
  }
  if (resolveEnvApiKey(provider)) {
    return true;
  }
  if (getCustomProviderApiKey(cfg, provider)) {
    return true;
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  return false;
};

<<<<<<< HEAD
<<<<<<< HEAD
export async function loadModelRegistry(cfg: MoltbotConfig) {
  await ensureMoltbotModelsJson(cfg);
  const agentDir = resolveMoltbotAgentDir();
=======
export async function loadModelRegistry(cfg: OpenClawConfig) {
  await ensureOpenClawModelsJson(cfg);
  const agentDir = resolveOpenClawAgentDir();
  await ensurePiAuthJsonFromAuthProfiles(agentDir);
>>>>>>> 07faab6ac (openai-codex: bridge OAuth profiles into pi auth.json for model discovery (#15184))
=======
function createAvailabilityUnavailableError(message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = MODEL_AVAILABILITY_UNAVAILABLE_CODE;
  return err;
}

function normalizeAvailabilityError(err: unknown): Error {
  if (shouldFallbackToAuthHeuristics(err) && err instanceof Error) {
    return err;
  }
  return createAvailabilityUnavailableError(
    `Model availability unavailable: getAvailable() failed.\n${formatErrorWithStack(err)}`,
  );
}

function validateAvailableModels(availableModels: unknown): Model<Api>[] {
  if (!Array.isArray(availableModels)) {
    throw createAvailabilityUnavailableError(
      "Model availability unavailable: getAvailable() returned a non-array value.",
    );
  }

  for (const model of availableModels) {
    if (
      !model ||
      typeof model !== "object" ||
      typeof (model as { provider?: unknown }).provider !== "string" ||
      typeof (model as { id?: unknown }).id !== "string"
    ) {
      throw createAvailabilityUnavailableError(
        "Model availability unavailable: getAvailable() returned invalid model entries.",
      );
    }
  }

  return availableModels as Model<Api>[];
}

function loadAvailableModels(registry: ModelRegistry): Model<Api>[] {
  let availableModels: unknown;
  try {
    availableModels = registry.getAvailable();
  } catch (err) {
    throw normalizeAvailabilityError(err);
  }
  try {
    return validateAvailableModels(availableModels);
  } catch (err) {
    throw normalizeAvailabilityError(err);
  }
}

export async function loadModelRegistry(cfg: OpenClawConfig) {
  await ensureOpenClawModelsJson(cfg);
  const agentDir = resolveOpenClawAgentDir();
<<<<<<< HEAD
>>>>>>> a0cbf9002 (fix(models): antigravity opus 4.6 availability follow-up (#12845))
=======
  await ensurePiAuthJsonFromAuthProfiles(agentDir);
>>>>>>> 4ca75bed5 (fix(models): sync auth-profiles before availability checks)
  const authStorage = discoverAuthStorage(agentDir);
  const registry = discoverModels(authStorage, agentDir);
  const appended = appendAntigravityForwardCompatModels(registry.getAll(), registry);
  const models = appended.models;
  const synthesizedForwardCompat = appended.synthesizedForwardCompat;
  let availableKeys: Set<string> | undefined;
  let availabilityErrorMessage: string | undefined;

  try {
    const availableModels = loadAvailableModels(registry);
    availableKeys = new Set(availableModels.map((model) => modelKey(model.provider, model.id)));
    for (const synthesized of synthesizedForwardCompat) {
      if (hasAvailableTemplate(availableKeys, synthesized.templatePrefixes)) {
        availableKeys.add(synthesized.key);
      }
    }
  } catch (err) {
    if (!shouldFallbackToAuthHeuristics(err)) {
      throw err;
    }

    // Some providers can report model-level availability as unavailable.
    // Fall back to provider-level auth heuristics when availability is undefined.
    availableKeys = undefined;
    if (!availabilityErrorMessage) {
      availabilityErrorMessage = formatErrorWithStack(err);
    }
  }
  return { registry, models, availableKeys, availabilityErrorMessage };
}

type SynthesizedForwardCompat = {
  key: string;
  templatePrefixes: readonly string[];
};

function appendAntigravityForwardCompatModels(
  models: Model<Api>[],
  modelRegistry: ModelRegistry,
): { models: Model<Api>[]; synthesizedForwardCompat: SynthesizedForwardCompat[] } {
  const nextModels = [...models];
  const synthesizedForwardCompat: SynthesizedForwardCompat[] = [];

  for (const candidate of ANTIGRAVITY_OPUS_46_FORWARD_COMPAT_CANDIDATES) {
    const key = modelKey("google-antigravity", candidate.id);
    const hasForwardCompat = nextModels.some((model) => modelKey(model.provider, model.id) === key);
    if (hasForwardCompat) {
      continue;
    }

    const fallback = resolveForwardCompatModel("google-antigravity", candidate.id, modelRegistry);
    if (!fallback) {
      continue;
    }

    nextModels.push(fallback);
    synthesizedForwardCompat.push({
      key,
      templatePrefixes: candidate.templatePrefixes,
    });
  }

  return { models: nextModels, synthesizedForwardCompat };
}

function hasAvailableTemplate(
  availableKeys: Set<string>,
  templatePrefixes: readonly string[],
): boolean {
  for (const key of availableKeys) {
    if (templatePrefixes.some((prefix) => key.startsWith(prefix))) {
      return true;
    }
  }
  return false;
}

export function toModelRow(params: {
  model?: Model<Api>;
  key: string;
  tags: string[];
  aliases?: string[];
  availableKeys?: Set<string>;
  cfg?: MoltbotConfig;
  authStore?: AuthProfileStore;
}): ModelRow {
  const { model, key, tags, aliases = [], availableKeys, cfg, authStore } = params;
  if (!model) {
    return {
      key,
      name: key,
      input: "-",
      contextWindow: null,
      local: null,
      available: null,
      tags: [...tags, "missing"],
      missing: true,
    };
  }

  const input = model.input.join("+") || "text";
  const local = isLocalBaseUrl(model.baseUrl);
  // Prefer model-level registry availability when present.
  // Fall back to provider-level auth heuristics only if registry availability isn't available.
  const available =
    availableKeys !== undefined
      ? availableKeys.has(modelKey(model.provider, model.id))
      : cfg && authStore
        ? hasAuthForProvider(model.provider, cfg, authStore)
        : false;
  const aliasTags = aliases.length > 0 ? [`alias:${aliases.join(",")}`] : [];
  const mergedTags = new Set(tags);
  if (aliasTags.length > 0) {
    for (const tag of mergedTags) {
      if (tag === "alias" || tag.startsWith("alias:")) {
        mergedTags.delete(tag);
      }
    }
    for (const tag of aliasTags) {
      mergedTags.add(tag);
    }
  }

  return {
    key,
    name: model.name || model.id,
    input,
    contextWindow: model.contextWindow ?? null,
    local,
    available,
    tags: Array.from(mergedTags),
    missing: false,
  };
}
