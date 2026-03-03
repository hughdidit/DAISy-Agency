import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type PackageJson = {
  name?: string;
  version?: string;
  devDependencies?: Record<string, string>;
};

const root = resolve(".");
const rootPackagePath = resolve("package.json");
const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8")) as PackageJson;
const targetVersion = rootPackage.version;

if (!targetVersion) {
  throw new Error("Root package.json missing version.");
}

const extensionsDir = resolve("extensions");
const dirs = readdirSync(extensionsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());

const updated: string[] = [];
const changelogged: string[] = [];
const skipped: string[] = [];

function ensureChangelogEntry(changelogPath: string, version: string): boolean {
  if (!existsSync(changelogPath)) return false;
  const content = readFileSync(changelogPath, "utf8");
  if (content.includes(`## ${version}`)) return false;
  const entry = `## ${version}\n\n### Changes\n- Version alignment with core OpenClaw release numbers.\n\n`;
  if (content.startsWith("# Changelog\n\n")) {
    const next = content.replace("# Changelog\n\n", `# Changelog\n\n${entry}`);
    writeFileSync(changelogPath, next);
    return true;
  }
  const next = `# Changelog\n\n${entry}${content.trimStart()}`;
  writeFileSync(changelogPath, `${next}\n`);
  return true;
}

function stripWorkspaceOpenclawDevDependency(pkg: PackageJson): boolean {
  const devDeps = pkg.devDependencies;
  if (!devDeps || devDeps.openclaw !== "workspace:*") {
    return false;
  }
  delete devDeps.openclaw;
  if (Object.keys(devDeps).length === 0) {
    delete pkg.devDependencies;
  }
  return true;
}

console.log(
  `Synced plugin versions to ${targetVersion}. Updated: ${updated.length}. Changelogged: ${changelogged.length}. Skipped: ${skipped.length}.`
);
