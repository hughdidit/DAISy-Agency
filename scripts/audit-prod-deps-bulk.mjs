#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BULK_ADVISORY_ENDPOINT = "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";
const BULK_ADVISORY_TIMEOUT_MS = 30_000;
const SEVERITY_ORDER = ["low", "moderate", "high", "critical"];
const DEFAULT_LEVEL = "high";
const PNPM_BIN = "pnpm";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WINDOWS_PNPM_PS1 =
  process.platform === "win32" && process.env.APPDATA
    ? resolve(process.env.APPDATA, "npm", "pnpm.ps1")
    : undefined;
const TEMPORARY_ADVISORY_ALLOWLIST = [
  {
    packageName: "axios",
    sourceUrl: "https://github.com/advisories/GHSA-pjwm-pj3p-43mv",
    expiresOn: "2026-06-14",
    reason: "No axios release outside the vulnerable <1.16.0 range is available on npm.",
  },
  {
    packageName: "axios",
    sourceUrl: "https://github.com/advisories/GHSA-35jp-ww65-95wh",
    expiresOn: "2026-06-14",
    reason: "No axios release outside the vulnerable <1.16.0 range is available on npm.",
  },
];
const PATCHED_ADVISORY_ALLOWLIST = [
  {
    packageName: "@mariozechner/pi-coding-agent",
    sourceUrl: "https://github.com/advisories/GHSA-jfgx-wxx8-mp94",
    patchFile: "patches/@mariozechner__pi-coding-agent@0.55.3.patch",
    reason:
      "DAISy patches temporary extension installs to use a private randomized temp root with 0700 permissions.",
  },
];

function printUsage() {
  console.log(
    "Usage: node scripts/audit-prod-deps-bulk.mjs [--level <low|moderate|high|critical>]",
  );
}

/**
 * @param {string[]} argv
 * @returns {{level: string, help: boolean}}
 */
function parseArgs(argv) {
  let level = DEFAULT_LEVEL;
  let help = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--level") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("Missing value for --level.");
      }
      level = String(next).toLowerCase();
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { level, help };
}

/**
 * @param {Map<string, Set<string>>} versionsByPackage
 * @param {string} packageName
 * @param {unknown} version
 */
function addVersion(versionsByPackage, packageName, version) {
  if (typeof version !== "string" || version.length === 0) {
    return;
  }
  const bucket = versionsByPackage.get(packageName);
  if (bucket) {
    bucket.add(version);
    return;
  }
  versionsByPackage.set(packageName, new Set([version]));
}

/**
 * @param {unknown} node
 * @param {Map<string, Set<string>>} versionsByPackage
 */
function walkDependencyNode(node, versionsByPackage) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return;
  }
  const record = /** @type {Record<string, unknown>} */ (node);
  const dependencies = record.dependencies;
  if (!dependencies || typeof dependencies !== "object" || Array.isArray(dependencies)) {
    return;
  }

  for (const [packageName, depNode] of Object.entries(dependencies)) {
    if (!depNode || typeof depNode !== "object" || Array.isArray(depNode)) {
      continue;
    }
    const depRecord = /** @type {Record<string, unknown>} */ (depNode);
    addVersion(versionsByPackage, packageName, depRecord.version);
    walkDependencyNode(depNode, versionsByPackage);
  }
}

/**
 * @returns {Record<string, string[]>}
 */
function collectProdDependencyVersions() {
  let rawJson;
  const pnpmExecOptions = {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  };
  const runPnpm = (args) => {
    if (WINDOWS_PNPM_PS1 && existsSync(WINDOWS_PNPM_PS1)) {
      return execFileSync(
        "powershell.exe",
        ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", WINDOWS_PNPM_PS1, ...args],
        pnpmExecOptions,
      );
    }
    return execFileSync(PNPM_BIN, args, pnpmExecOptions);
  };
  try {
    rawJson = runPnpm(["list", "--prod", "--json", "--depth=Infinity", "--lockfile-only"]);
  } catch {
    // Fallback for pnpm versions that do not support --lockfile-only on list.
    rawJson = runPnpm(["list", "--prod", "--json", "--depth=Infinity"]);
  }
  const parsed = JSON.parse(rawJson);
  const roots = Array.isArray(parsed) ? parsed : [parsed];
  const versionsByPackage = new Map();

  for (const root of roots) {
    walkDependencyNode(root, versionsByPackage);
  }

  return Object.fromEntries(
    [...versionsByPackage.entries()]
      .map(([packageName, versions]) => [
        packageName,
        [...versions].toSorted((a, b) => a.localeCompare(b)),
      ])
      .toSorted((a, b) => a[0].localeCompare(b[0])),
  );
}

/**
 * @param {Record<string, string[]>} payload
 * @returns {Promise<Record<string, unknown>>}
 */
async function fetchBulkAdvisories(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BULK_ADVISORY_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(BULK_ADVISORY_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Bulk advisory endpoint request timed out after ${BULK_ADVISORY_TIMEOUT_MS}ms.`,
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Bulk advisory endpoint request failed with status ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Bulk advisory endpoint returned an unexpected payload shape.");
  }
  return /** @type {Record<string, unknown>} */ (parsed);
}

/**
 * @param {unknown} entry
 * @returns {Array<Record<string, unknown>>}
 */
function normalizeAdvisoryList(entry) {
  if (Array.isArray(entry)) {
    return entry.filter((item) => item && typeof item === "object");
  }
  if (entry && typeof entry === "object") {
    return Object.values(entry).filter((item) => item && typeof item === "object");
  }
  return [];
}

/**
 * @param {string} severity
 * @returns {number}
 */
function severityRank(severity) {
  return SEVERITY_ORDER.indexOf(severity);
}

/**
 * @param {string} severity
 * @returns {string}
 */
function severityIcon(severity) {
  if (severity === "critical") {
    return "[critical]";
  }
  if (severity === "high") {
    return "[high]";
  }
  if (severity === "moderate") {
    return "[moderate]";
  }
  if (severity === "low") {
    return "[low]";
  }
  return "[unknown]";
}

/**
 * @param {{expiresOn: string}} entry
 * @param {Date} now
 */
function isAllowlistEntryActive(entry, now = new Date()) {
  const expiresAt = Date.parse(`${entry.expiresOn}T23:59:59.999Z`);
  return Number.isFinite(expiresAt) && now.getTime() <= expiresAt;
}

/**
 * @param {AdvisoryFinding} finding
 * @param {Date} now
 */
function findTemporaryAllowlistEntry(finding, now = new Date()) {
  return TEMPORARY_ADVISORY_ALLOWLIST.find(
    (entry) =>
      entry.packageName === finding.packageName &&
      entry.sourceUrl === finding.sourceUrl &&
      isAllowlistEntryActive(entry, now),
  );
}

/**
 * @param {AdvisoryFinding} finding
 */
function findPatchedAllowlistEntry(finding) {
  return PATCHED_ADVISORY_ALLOWLIST.find(
    (entry) =>
      entry.packageName === finding.packageName &&
      entry.sourceUrl === finding.sourceUrl &&
      existsSync(resolve(REPO_ROOT, entry.patchFile)),
  );
}

/**
 * @typedef {{
 *   packageName: string;
 *   severity: string;
 *   title: string;
 *   vulnerableVersions: string;
 *   sourceUrl: string;
 * }} AdvisoryFinding
 */

/**
 * @param {Record<string, unknown>} advisoriesByPackage
 * @returns {{findings: AdvisoryFinding[], bySeverity: Record<string, number>}}
 */
function extractFindings(advisoriesByPackage) {
  /** @type {AdvisoryFinding[]} */
  const findings = [];
  /** @type {Record<string, number>} */
  const bySeverity = {
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    unknown: 0,
  };

  for (const [packageName, advisoryEntry] of Object.entries(advisoriesByPackage)) {
    const normalized = normalizeAdvisoryList(advisoryEntry);
    for (const advisory of normalized) {
      const severityRaw = advisory.severity;
      const severity = typeof severityRaw === "string" ? severityRaw.toLowerCase() : "unknown";
      const title =
        typeof advisory.title === "string" && advisory.title.length > 0
          ? advisory.title
          : "untitled advisory";
      const vulnerableVersions =
        typeof advisory.vulnerable_versions === "string" && advisory.vulnerable_versions.length > 0
          ? advisory.vulnerable_versions
          : "unknown";
      const sourceUrl =
        typeof advisory.url === "string" && advisory.url.length > 0 ? advisory.url : "n/a";

      if (!(severity in bySeverity)) {
        bySeverity.unknown += 1;
      } else {
        bySeverity[severity] += 1;
      }

      findings.push({
        packageName,
        severity,
        title,
        vulnerableVersions,
        sourceUrl,
      });
    }
  }

  const sortedFindings = findings.toSorted((a, b) => {
    const severityDiff = severityRank(b.severity) - severityRank(a.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return a.packageName.localeCompare(b.packageName);
  });

  return { findings: sortedFindings, bySeverity };
}

async function main() {
  const { level, help } = parseArgs(process.argv.slice(2));
  if (help) {
    printUsage();
    process.exit(0);
  }

  if (!SEVERITY_ORDER.includes(level)) {
    throw new Error(`Invalid --level "${level}". Expected one of: ${SEVERITY_ORDER.join(", ")}`);
  }

  const threshold = severityRank(level);
  const dependencyPayload = collectProdDependencyVersions();
  const packageCount = Object.keys(dependencyPayload).length;
  console.log(`Collected ${packageCount} unique production packages from pnpm dependency graph.`);
  if (packageCount === 0) {
    throw new Error("Collected zero production packages from pnpm dependency graph.");
  }

  const advisoriesByPackage = await fetchBulkAdvisories(dependencyPayload);
  const { findings, bySeverity } = extractFindings(advisoriesByPackage);
  if (findings.length === 0) {
    console.log("No advisories returned by npm bulk advisory endpoint.");
    return;
  }

  const suppressed = findings
    .map((finding) => ({
      finding,
      patchedAllowlist: findPatchedAllowlistEntry(finding),
      temporaryAllowlist: findTemporaryAllowlistEntry(finding),
    }))
    .filter((entry) => entry.patchedAllowlist || entry.temporaryAllowlist);
  for (const entry of suppressed) {
    if (entry.temporaryAllowlist) {
      console.warn(
        `Temporarily allowing ${entry.finding.packageName} advisory ${entry.finding.sourceUrl} until ${entry.temporaryAllowlist.expiresOn}: ${entry.temporaryAllowlist.reason}`,
      );
    }
    if (entry.patchedAllowlist) {
      console.warn(
        `Allowing patched ${entry.finding.packageName} advisory ${entry.finding.sourceUrl} via ${entry.patchedAllowlist.patchFile}: ${entry.patchedAllowlist.reason}`,
      );
    }
  }

  const matching = findings.filter(
    (finding) =>
      severityRank(finding.severity) >= threshold &&
      !findTemporaryAllowlistEntry(finding) &&
      !findPatchedAllowlistEntry(finding),
  );
  console.log(
    `Advisory totals: low=${bySeverity.low}, moderate=${bySeverity.moderate}, high=${bySeverity.high}, critical=${bySeverity.critical}, unknown=${bySeverity.unknown}.`,
  );
  if (matching.length === 0) {
    console.log(`No advisories at or above "${level}" severity.`);
    return;
  }

  console.error(
    `${matching.length} advisories at or above "${level}" severity from npm bulk advisory endpoint:`,
  );
  for (const finding of matching) {
    console.error(
      `${severityIcon(finding.severity)} ${finding.packageName} ${finding.vulnerableVersions} - ${finding.title} (${finding.sourceUrl})`,
    );
  }
  process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Bulk advisory audit failed: ${message}`);
  process.exit(1);
});
