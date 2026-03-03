export type SecurityPathCanonicalization = {
  path: string;
  malformedEncoding: boolean;
  rawNormalizedPath: string;
};

function normalizePathSeparators(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed.length <= 1) {
    return collapsed;
  }
  return collapsed.replace(/\/+$/, "");
}

function normalizeProtectedPrefix(prefix: string): string {
  return normalizePathSeparators(prefix.toLowerCase()) || "/";
}

function prefixMatch(pathname: string, prefix: string): boolean {
  return (
    pathname === prefix ||
    pathname.startsWith(`${prefix}/`) ||
    // Fail closed when malformed %-encoding follows the protected prefix.
    pathname.startsWith(`${prefix}%`)
  );
}

export function canonicalizePathForSecurity(pathname: string): SecurityPathCanonicalization {
  let decoded = pathname;
  let malformedEncoding = false;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    malformedEncoding = true;
  }
  return {
    path: normalizePathSeparators(decoded.toLowerCase()) || "/",
    malformedEncoding,
    rawNormalizedPath: normalizePathSeparators(pathname.toLowerCase()) || "/",
  };
}

const normalizedPrefixesCache = new WeakMap<readonly string[], readonly string[]>();

function getNormalizedPrefixes(prefixes: readonly string[]): readonly string[] {
  const cached = normalizedPrefixesCache.get(prefixes);
  if (cached) {
    return cached;
  }
  const normalized = prefixes.map(normalizeProtectedPrefix);
  normalizedPrefixesCache.set(prefixes, normalized);
  return normalized;
}

export function isPathProtectedByPrefixes(pathname: string, prefixes: readonly string[]): boolean {
  const canonical = canonicalizePathForSecurity(pathname);
  const normalizedPrefixes = prefixes.map(normalizeProtectedPrefix);
  if (normalizedPrefixes.some((prefix) => prefixMatch(canonical.path, prefix))) {
    return true;
  }
  if (!canonical.malformedEncoding) {
    return false;
  }
  return normalizedPrefixes.some((prefix) => prefixMatch(canonical.rawNormalizedPath, prefix));
}

export const PROTECTED_PLUGIN_ROUTE_PREFIXES = ["/api/channels"] as const;

export function isProtectedPluginRoutePath(pathname: string): boolean {
  return isPathProtectedByPrefixes(pathname, PROTECTED_PLUGIN_ROUTE_PREFIXES);
}
