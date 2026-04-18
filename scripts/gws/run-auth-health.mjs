import { spawnSync } from "node:child_process";

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function extractLastJsonObject(value) {
  const normalized = stripAnsi(value).trim();
  for (let index = normalized.lastIndexOf("{"); index >= 0; index = normalized.lastIndexOf("{", index - 1)) {
    const candidate = normalized.slice(index).trim();
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

const child = spawnSync(process.execPath, ["dist/entry.js", "gws", "auth-health", "--subject", subject], {
  cwd: "/app",
  encoding: "utf8",
  env: process.env,
});

if (child.status !== 0) {
  if (child.stdout) {
    process.stderr.write(child.stdout);
  }
  if (child.stderr) {
    process.stderr.write(child.stderr);
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
