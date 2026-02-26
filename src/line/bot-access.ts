<<<<<<< HEAD
=======
import {
  firstDefined,
  isSenderIdAllowed,
  mergeDmAllowFromSources,
} from "../channels/allow-from.js";

>>>>>>> 8bdda7a65 (fix(security): keep DM pairing allowlists out of group auth)
export type NormalizedAllowFrom = {
  entries: string[];
  hasWildcard: boolean;
  hasEntries: boolean;
};

function normalizeAllowEntry(value: string | number): string {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (trimmed === "*") return "*";
  return trimmed.replace(/^line:(?:user:)?/i, "");
}

export const normalizeAllowFrom = (list?: Array<string | number>): NormalizedAllowFrom => {
  const entries = (list ?? []).map((value) => normalizeAllowEntry(value)).filter(Boolean);
  const hasWildcard = entries.includes("*");
  return {
    entries,
    hasWildcard,
    hasEntries: entries.length > 0,
  };
};

export const normalizeDmAllowFromWithStore = (params: {
  allowFrom?: Array<string | number>;
  storeAllowFrom?: string[];
<<<<<<< HEAD
}): NormalizedAllowFrom => {
  const combined = [...(params.allowFrom ?? []), ...(params.storeAllowFrom ?? [])];
  return normalizeAllowFrom(combined);
};

export const firstDefined = <T>(...values: Array<T | undefined>) => {
  for (const value of values) {
    if (typeof value !== "undefined") return value;
  }
  return undefined;
};
=======
  dmPolicy?: string;
}): NormalizedAllowFrom => normalizeAllowFrom(mergeDmAllowFromSources(params));
>>>>>>> 8bdda7a65 (fix(security): keep DM pairing allowlists out of group auth)

export const isSenderAllowed = (params: {
  allow: NormalizedAllowFrom;
  senderId?: string;
}): boolean => {
  const { allow, senderId } = params;
  if (!allow.hasEntries) return false;
  if (allow.hasWildcard) return true;
  if (!senderId) return false;
  return allow.entries.includes(senderId);
};
