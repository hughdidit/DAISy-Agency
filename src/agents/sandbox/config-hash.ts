<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import crypto from "node:crypto";
<<<<<<< HEAD

import type { SandboxDockerConfig, SandboxWorkspaceAccess } from "./types.js";
=======
import type { SandboxBrowserConfig, SandboxDockerConfig, SandboxWorkspaceAccess } from "./types.js";
>>>>>>> 1f1fc095a (refactor(sandbox): auto-recreate browser container on config changes (#16254))
=======
import type { SandboxBrowserConfig, SandboxDockerConfig, SandboxWorkspaceAccess } from "./types.js";
import { hashTextSha256 } from "./hash.js";
>>>>>>> d1fca442b (refactor(sandbox): centralize sha256 helpers)
=======
import { hashTextSha256 } from "./hash.js";
import type { SandboxBrowserConfig, SandboxDockerConfig, SandboxWorkspaceAccess } from "./types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { SandboxBrowserConfig, SandboxDockerConfig, SandboxWorkspaceAccess } from "./types.js";
import { hashTextSha256 } from "./hash.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { hashTextSha256 } from "./hash.js";
import type { SandboxBrowserConfig, SandboxDockerConfig, SandboxWorkspaceAccess } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { SandboxBrowserConfig, SandboxDockerConfig, SandboxWorkspaceAccess } from "./types.js";
import { hashTextSha256 } from "./hash.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { hashTextSha256 } from "./hash.js";
import type { SandboxBrowserConfig, SandboxDockerConfig, SandboxWorkspaceAccess } from "./types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

type SandboxHashInput = {
  docker: SandboxDockerConfig;
  workspaceAccess: SandboxWorkspaceAccess;
  workspaceDir: string;
  agentWorkspaceDir: string;
};

type SandboxBrowserHashInput = {
  docker: SandboxDockerConfig;
  browser: Pick<
    SandboxBrowserConfig,
    "cdpPort" | "vncPort" | "noVncPort" | "headless" | "enableNoVnc"
  >;
  workspaceAccess: SandboxWorkspaceAccess;
  workspaceDir: string;
  agentWorkspaceDir: string;
};

function normalizeForHash(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeForHash).filter((item): item is unknown => item !== undefined);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).toSorted(([a], [b]) => a.localeCompare(b));
    const normalized: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      const next = normalizeForHash(entryValue);
      if (next !== undefined) {
        normalized[key] = next;
      }
    }
    return normalized;
  }
  return value;
}

export function computeSandboxConfigHash(input: SandboxHashInput): string {
  return computeHash(input);
}

export function computeSandboxBrowserConfigHash(input: SandboxBrowserHashInput): string {
  return computeHash(input);
}

function computeHash(input: unknown): string {
  const payload = normalizeForHash(input);
  const raw = JSON.stringify(payload);
<<<<<<< HEAD
  return crypto.createHash("sha1").update(raw).digest("hex");
=======
  return hashTextSha256(raw);
>>>>>>> d1fca442b (refactor(sandbox): centralize sha256 helpers)
}
