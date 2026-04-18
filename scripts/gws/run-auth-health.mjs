import { spawnSync } from "node:child_process";

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function extractLastJsonObject(value) {
  const normalized = stripAnsi(value).trim();
  const lastBrace = normalized.lastIndexOf("}");
  if (lastBrace === -1) {
    return null;
  }

  for (
    let index = normalized.lastIndexOf("{", lastBrace);
    index >= 0;
    index = normalized.lastIndexOf("{", index - 1)
  ) {
    const candidate = normalized.slice(index, lastBrace + 1).trim();
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue scanning for an earlier opening brace until a full JSON object parses.
    }
  }
  return null;
}

function fail(message, details = {}) {
  process.stderr.write(`${message}\n`);
  if (Object.keys(details).length > 0) {
    process.stderr.write(`${JSON.stringify(details)}\n`);
  }
  process.exit(1);
}

const subjectIndex = process.argv.indexOf("--subject");
const subject =
  subjectIndex >= 0 && typeof process.argv[subjectIndex + 1] === "string"
    ? process.argv[subjectIndex + 1].trim()
    : "";

if (!subject) {
  fail("Missing required --subject for GWS auth-health runner.");
}

const runnerCwd = (process.env.OPENCLAW_APP_CWD ?? "").trim() || process.cwd();
const child = spawnSync(process.execPath, ["dist/entry.js", "gws", "auth-health", "--subject", subject], {
  cwd: runnerCwd,
  encoding: "utf8",
  env: process.env,
  timeout: 30_000,
});

if (child.error) {
  fail("Failed to execute openclaw gws auth-health.", {
    subject,
    cwd: runnerCwd,
    error: child.error.message,
    signal: child.signal ?? null,
  });
}

if (child.status !== 0) {
  if (child.stdout) {
    process.stderr.write(child.stdout);
  }
  if (child.stderr) {
    process.stderr.write(child.stderr);
  }
  if (child.signal) {
    process.stderr.write(`auth-health probe terminated by signal: ${child.signal}\n`);
  }
  process.exit(child.status ?? 1);
}

const payload = extractLastJsonObject(child.stdout ?? "");
if (!payload) {
  fail("Failed to parse JSON payload from openclaw gws auth-health output.", {
    subject,
    stdoutPreview: (child.stdout ?? "").slice(-4000),
    stderrPreview: (child.stderr ?? "").slice(-4000),
  });
}

process.stdout.write(`${JSON.stringify(payload)}\n`);
