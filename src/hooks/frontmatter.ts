<<<<<<< HEAD
import JSON5 from "json5";

import { LEGACY_MANIFEST_KEY } from "../compat/legacy-names.js";
import { parseFrontmatterBlock } from "../markdown/frontmatter.js";
import { parseBooleanValue } from "../utils/boolean.js";
=======
>>>>>>> ece55b468 (refactor(shared): dedupe frontmatter parsing)
import type {
  MoltbotHookMetadata,
  HookEntry,
  HookInstallSpec,
  HookInvocationPolicy,
  ParsedHookFrontmatter,
} from "./types.js";
<<<<<<< HEAD
=======
import { parseFrontmatterBlock } from "../markdown/frontmatter.js";
import {
  getFrontmatterString,
  normalizeStringList,
  parseOpenClawManifestInstallBase,
  parseFrontmatterBool,
  resolveOpenClawManifestBlock,
  resolveOpenClawManifestInstall,
  resolveOpenClawManifestOs,
  resolveOpenClawManifestRequires,
} from "../shared/frontmatter.js";
>>>>>>> ece55b468 (refactor(shared): dedupe frontmatter parsing)

export function parseFrontmatter(content: string): ParsedHookFrontmatter {
  return parseFrontmatterBlock(content);
}

function parseInstallSpec(input: unknown): HookInstallSpec | undefined {
  const parsed = parseOpenClawManifestInstallBase(input, ["bundled", "npm", "git"]);
  if (!parsed) {
    return undefined;
  }
  const { raw } = parsed;
  const spec: HookInstallSpec = {
    kind: parsed.kind as HookInstallSpec["kind"],
  };

  if (parsed.id) {
    spec.id = parsed.id;
  }
  if (parsed.label) {
    spec.label = parsed.label;
  }
  if (parsed.bins) {
    spec.bins = parsed.bins;
  }
  if (typeof raw.package === "string") {
    spec.package = raw.package;
  }
  if (typeof raw.repository === "string") {
    spec.repository = raw.repository;
  }

  return spec;
}

<<<<<<< HEAD
function getFrontmatterValue(frontmatter: ParsedHookFrontmatter, key: string): string | undefined {
  const raw = frontmatter[key];
  return typeof raw === "string" ? raw : undefined;
}

function parseFrontmatterBool(value: string | undefined, fallback: boolean): boolean {
  const parsed = parseBooleanValue(value);
  return parsed === undefined ? fallback : parsed;
}

export function resolveMoltbotMetadata(
  frontmatter: ParsedHookFrontmatter,
): MoltbotHookMetadata | undefined {
  const raw = getFrontmatterValue(frontmatter, "metadata");
  if (!raw) {
    return undefined;
  }
  try {
<<<<<<< HEAD
    const parsed = JSON5.parse(raw) as { moltbot?: unknown } & Partial<
      Record<typeof LEGACY_MANIFEST_KEY, unknown>
    >;
=======
    const parsed = JSON5.parse(raw);
<<<<<<< HEAD
>>>>>>> 15792b153 (chore: Enable more lint rules, disable some that trigger a lot. Will clean up later.)
    if (!parsed || typeof parsed !== "object") return undefined;
    const metadataRaw = parsed.moltbot ?? parsed[LEGACY_MANIFEST_KEY];
    if (!metadataRaw || typeof metadataRaw !== "object") return undefined;
=======
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    const metadataRawCandidates = [MANIFEST_KEY, ...LEGACY_MANIFEST_KEYS];
    let metadataRaw: unknown;
    for (const key of metadataRawCandidates) {
      const candidate = parsed[key];
      if (candidate && typeof candidate === "object") {
        metadataRaw = candidate;
        break;
      }
    }
    if (!metadataRaw || typeof metadataRaw !== "object") {
      return undefined;
    }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
    const metadataObj = metadataRaw as Record<string, unknown>;
    const requiresRaw =
      typeof metadataObj.requires === "object" && metadataObj.requires !== null
        ? (metadataObj.requires as Record<string, unknown>)
        : undefined;
    const installRaw = Array.isArray(metadataObj.install) ? (metadataObj.install as unknown[]) : [];
    const install = installRaw
      .map((entry) => parseInstallSpec(entry))
      .filter((entry): entry is HookInstallSpec => Boolean(entry));
    const osRaw = normalizeStringList(metadataObj.os);
    const eventsRaw = normalizeStringList(metadataObj.events);
    return {
      always: typeof metadataObj.always === "boolean" ? metadataObj.always : undefined,
      emoji: typeof metadataObj.emoji === "string" ? metadataObj.emoji : undefined,
      homepage: typeof metadataObj.homepage === "string" ? metadataObj.homepage : undefined,
      hookKey: typeof metadataObj.hookKey === "string" ? metadataObj.hookKey : undefined,
      export: typeof metadataObj.export === "string" ? metadataObj.export : undefined,
      os: osRaw.length > 0 ? osRaw : undefined,
      events: eventsRaw.length > 0 ? eventsRaw : [],
      requires: requiresRaw
        ? {
            bins: normalizeStringList(requiresRaw.bins),
            anyBins: normalizeStringList(requiresRaw.anyBins),
            env: normalizeStringList(requiresRaw.env),
            config: normalizeStringList(requiresRaw.config),
          }
        : undefined,
      install: install.length > 0 ? install : undefined,
    };
  } catch {
=======
export function resolveOpenClawMetadata(
  frontmatter: ParsedHookFrontmatter,
): OpenClawHookMetadata | undefined {
  const metadataObj = resolveOpenClawManifestBlock({ frontmatter });
  if (!metadataObj) {
>>>>>>> ece55b468 (refactor(shared): dedupe frontmatter parsing)
    return undefined;
  }
  const requires = resolveOpenClawManifestRequires(metadataObj);
  const install = resolveOpenClawManifestInstall(metadataObj, parseInstallSpec);
  const osRaw = resolveOpenClawManifestOs(metadataObj);
  const eventsRaw = normalizeStringList(metadataObj.events);
  return {
    always: typeof metadataObj.always === "boolean" ? metadataObj.always : undefined,
    emoji: typeof metadataObj.emoji === "string" ? metadataObj.emoji : undefined,
    homepage: typeof metadataObj.homepage === "string" ? metadataObj.homepage : undefined,
    hookKey: typeof metadataObj.hookKey === "string" ? metadataObj.hookKey : undefined,
    export: typeof metadataObj.export === "string" ? metadataObj.export : undefined,
    os: osRaw.length > 0 ? osRaw : undefined,
    events: eventsRaw.length > 0 ? eventsRaw : [],
    requires: requires,
    install: install.length > 0 ? install : undefined,
  };
}

export function resolveHookInvocationPolicy(
  frontmatter: ParsedHookFrontmatter,
): HookInvocationPolicy {
  return {
    enabled: parseFrontmatterBool(getFrontmatterString(frontmatter, "enabled"), true),
  };
}

export function resolveHookKey(hookName: string, entry?: HookEntry): string {
  return entry?.metadata?.hookKey ?? hookName;
}
