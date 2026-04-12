#!/usr/bin/env node

import module from "node:module";
import { pathToFileURL } from "node:url";

const MIN_NODE_MAJOR = 22;
const MIN_NODE_MINOR = 12;
const MIN_NODE_VERSION = `${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}`;
const RUNTIME_ROOT = "/opt/daisy/openclaw-readonly";

const parseNodeVersion = (rawVersion) => {
  const [majorRaw = "0", minorRaw = "0"] = rawVersion.split(".");
  return {
    major: Number(majorRaw),
    minor: Number(minorRaw),
  };
};

const isSupportedNodeVersion = (version) =>
  version.major > MIN_NODE_MAJOR ||
  (version.major === MIN_NODE_MAJOR && version.minor >= MIN_NODE_MINOR);

const ensureSupportedNodeVersion = () => {
  if (isSupportedNodeVersion(parseNodeVersion(process.versions.node))) {
    return;
  }

  process.stderr.write(
    `openclaw-readonly: Node.js v${MIN_NODE_VERSION}+ is required (current: v${process.versions.node}).\n`,
  );
  process.exit(1);
};

ensureSupportedNodeVersion();

if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // Ignore errors.
  }
}

process.env.OPENCLAW_BUNDLED_SKILLS_DIR ||= `${RUNTIME_ROOT}/skills`;

const tryImport = async (specifier) => {
  const expectedUrl = pathToFileURL(specifier).href;
  try {
    const imported = await import(specifier);
    return imported;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ERR_MODULE_NOT_FOUND" &&
      "url" in error &&
      error.url === expectedUrl
    ) {
      return null;
    }
    throw error;
  }
};

const importedRuntime =
  (await tryImport(`${RUNTIME_ROOT}/dist/openclaw-readonly.js`)) ??
  (await tryImport(`${RUNTIME_ROOT}/dist/openclaw-readonly.mjs`));

if (!importedRuntime) {
  throw new Error(
    "openclaw-readonly: missing dist/openclaw-readonly.(m)js in the sandbox image.",
  );
}

if (typeof importedRuntime.runOpenClawReadonly !== "function") {
  throw new Error(
    "openclaw-readonly: dist runtime does not export runOpenClawReadonly().",
  );
}

await importedRuntime.runOpenClawReadonly();
