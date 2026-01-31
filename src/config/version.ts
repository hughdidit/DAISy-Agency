export type MoltbotVersion = {
  major: number;
  minor: number;
  patch: number;
  revision: number;
};

const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-(\d+))?/;

<<<<<<< HEAD
export function parseMoltbotVersion(raw: string | null | undefined): MoltbotVersion | null {
  if (!raw) return null;
=======
export function parseOpenClawVersion(raw: string | null | undefined): OpenClawVersion | null {
  if (!raw) {
    return null;
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  const match = raw.trim().match(VERSION_RE);
  if (!match) {
    return null;
  }
  const [, major, minor, patch, revision] = match;
  return {
    major: Number.parseInt(major, 10),
    minor: Number.parseInt(minor, 10),
    patch: Number.parseInt(patch, 10),
    revision: revision ? Number.parseInt(revision, 10) : 0,
  };
}

export function compareMoltbotVersions(
  a: string | null | undefined,
  b: string | null | undefined,
): number | null {
<<<<<<< HEAD
  const parsedA = parseMoltbotVersion(a);
  const parsedB = parseMoltbotVersion(b);
  if (!parsedA || !parsedB) return null;
  if (parsedA.major !== parsedB.major) return parsedA.major < parsedB.major ? -1 : 1;
  if (parsedA.minor !== parsedB.minor) return parsedA.minor < parsedB.minor ? -1 : 1;
  if (parsedA.patch !== parsedB.patch) return parsedA.patch < parsedB.patch ? -1 : 1;
  if (parsedA.revision !== parsedB.revision) return parsedA.revision < parsedB.revision ? -1 : 1;
=======
  const parsedA = parseOpenClawVersion(a);
  const parsedB = parseOpenClawVersion(b);
  if (!parsedA || !parsedB) {
    return null;
  }
  if (parsedA.major !== parsedB.major) {
    return parsedA.major < parsedB.major ? -1 : 1;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor < parsedB.minor ? -1 : 1;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch < parsedB.patch ? -1 : 1;
  }
  if (parsedA.revision !== parsedB.revision) {
    return parsedA.revision < parsedB.revision ? -1 : 1;
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  return 0;
}
