#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isValidGwsBindingSubject } from "../../scripts/gws/subject-selection.mjs";

export const SANDBOX_FIRST_ACCEPTANCE_SCENARIOS = Object.freeze([
  {
    scenarioId: "sbx-401-02-runtime-profile-sanity",
    manualChecklistId: "SBX-401-02",
    required: true,
    automatedScope: "full",
    primaryFailureClass: "runtime-profile-mismatch",
  },
  {
    scenarioId: "sbx-401-03-readonly-diagnostics",
    manualChecklistId: "SBX-401-03",
    required: true,
    automatedScope: "full",
    primaryFailureClass: "readonly-runtime-gap",
  },
  {
    scenarioId: "sbx-401-04-readiness-snapshot",
    manualChecklistId: "SBX-401-04",
    required: true,
    automatedScope: "full",
    primaryFailureClass: "readiness-reporting-gap",
  },
  {
    scenarioId: "sbx-401-05-integration-path",
    manualChecklistId: "SBX-401-05",
    required: true,
    automatedScope: "full when GWS or memory-mongodb is configured; otherwise skipped with reason",
    primaryFailureClass: "integration-config-gap",
  },
  {
    scenarioId: "sbx-401-08-isolated-cron",
    manualChecklistId: "SBX-401-08",
    required: true,
    automatedScope: "isolated execution only; chat delivery remains manual",
    primaryFailureClass: "scheduler-gap",
  },
  {
    scenarioId: "sbx-404-01-direct-session-runtime",
    manualChecklistId: "SBX-404-01",
    required: true,
    automatedScope: "direct session sandbox runtime truth; chat transcript remains manual",
    primaryFailureClass: "unsandboxed-session-gap",
    operationalContext: "direct-session",
    expectedOutcome: "pass",
    manualRemainder: "Live direct-chat transcript and screenshot evidence.",
  },
  {
    scenarioId: "sbx-404-02-group-session-runtime",
    manualChecklistId: "SBX-404-02",
    required: true,
    automatedScope: "group/channel session sandbox runtime truth and channel observability",
    primaryFailureClass: "unsandboxed-session-gap",
    operationalContext: "group-session",
    expectedOutcome: "pass",
    manualRemainder: "Live group/channel activation and transcript evidence.",
  },
  {
    scenarioId: "sbx-404-03-subagent-sandbox-inheritance",
    manualChecklistId: "SBX-404-03",
    required: true,
    automatedScope: "subagent child session runtime truth; spawn lifecycle remains unit-covered",
    primaryFailureClass: "sandbox-inheritance-gap",
    operationalContext: "subagent-session",
    expectedOutcome: "pass",
    manualRemainder: "Live requester-facing spawn acknowledgement and completion announcement.",
  },
  {
    scenarioId: "sbx-404-04-cron-isolation-and-subagent-model",
    manualChecklistId: "SBX-404-04",
    required: true,
    automatedScope: "isolated cron execution, run session key, and run history metadata",
    primaryFailureClass: "scheduler-gap",
    operationalContext: "cron-isolated-session",
    expectedOutcome: "pass",
    manualRemainder: "Delivery-target screenshot when announce delivery is part of the rollout.",
  },
  {
    scenarioId: "sbx-404-05-host-only-blocks",
    manualChecklistId: "SBX-404-05",
    required: true,
    automatedScope: "expected blocked host-only ACP spawn from sandboxed requester",
    primaryFailureClass: "unsupported-host-only-behavior",
    operationalContext: "host-only-exception",
    expectedOutcome: "blocked",
    manualRemainder: "None for ACP policy block baseline.",
  },
]);

const ANSI_ESCAPE_PREFIX = String.fromCharCode(0x1b);
const ANSI_ESCAPE_PATTERN = new RegExp(`${ANSI_ESCAPE_PREFIX}\\[[0-9;?]*[ -/]*[@-~]`, "g");
const AGENT_CRON_RUN_SESSION_KEY_PATTERN = /^agent:[a-z0-9][a-z0-9_-]{0,63}:cron:[^:]+:run:[^:]+$/;
const DEFAULT_CRON_PROMPT =
  "Report the current sandbox mode, runtime profile, and whether openclaw-readonly is supported. Do not mutate anything.";
const DEFAULT_ACCEPTANCE_CRON_MODEL = "openai/gpt-5.4-nano";
const DEFAULT_ACCEPTANCE_CRON_THINKING = "low";
const DEFAULT_ACCEPTANCE_CRON_TIMEOUT_SECONDS = "60";
const DEFAULT_ACCEPTANCE_CRON_POLL_TIMEOUT_SECONDS = 180;
const ACCEPTANCE_CRON_POLL_INTERVAL_MS = 1_000;
const ACCEPTANCE_CRON_RETRY_POLL_MAX_INTERVAL_MS = 5_000;
const ACCEPTANCE_CRON_TRANSIENT_ERROR_PATTERN =
  /(rate[_ ]limit|too many requests|429|resource has been exhausted|cloudflare|network|econnreset|econnrefused|fetch failed|socket|timeout|etimedout|\b5\d{2}\b)/i;

export class ExecError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ExecError";
    this.command = details.command ?? null;
    this.args = details.args ?? [];
    this.status = details.status ?? null;
    this.signal = details.signal ?? null;
    this.stdout = details.stdout ?? "";
    this.stderr = details.stderr ?? "";
  }
}

export class ScenarioError extends Error {
  constructor(failureClass, reason) {
    super(reason);
    this.name = "ScenarioError";
    this.failureClass = failureClass;
  }
}

function serializeScenarioError(error) {
  return {
    name: typeof error?.name === "string" ? error.name : "Error",
    message: typeof error?.message === "string" ? error.message : String(error),
    command: typeof error?.command === "string" ? error.command : null,
    args: Array.isArray(error?.args) ? error.args.map((value) => String(value)) : [],
    status: typeof error?.status === "number" ? error.status : null,
    signal: typeof error?.signal === "string" ? error.signal : null,
    stdout: typeof error?.stdout === "string" ? error.stdout : "",
    stderr: typeof error?.stderr === "string" ? error.stderr : "",
  };
}

function stripAnsi(value) {
  return String(value ?? "").replace(ANSI_ESCAPE_PATTERN, "");
}

export function extractLastJsonValue(value) {
  const normalized = stripAnsi(value).trim();
  if (!normalized) {
    return null;
  }

  const startIndexes = [];
  for (let index = 0; index < normalized.length; index += 1) {
    const ch = normalized[index];
    if (ch === "{" || ch === "[") {
      startIndexes.push(index);
    }
  }

  for (let index = startIndexes.length - 1; index >= 0; index -= 1) {
    const start = startIndexes[index];
    const candidate = normalized.slice(start).trim();
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep scanning for the last complete JSON value.
    }
  }

  return null;
}

export function isValidAgentCronRunSessionKey(value) {
  return typeof value === "string" && AGENT_CRON_RUN_SESSION_KEY_PATTERN.test(value.trim());
}

function isAgentCronRunSessionKeyForJob(value, jobId) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return isValidAgentCronRunSessionKey(trimmed) && trimmed.includes(`:cron:${jobId}:run:`);
}

function resolveCronBaseSessionKey(runSessionKey) {
  const trimmed = typeof runSessionKey === "string" ? runSessionKey.trim() : "";
  const marker = ":run:";
  const markerIndex = trimmed.lastIndexOf(marker);
  if (markerIndex <= 0) {
    return "";
  }
  return trimmed.slice(0, markerIndex);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function assertNonEmptyString(value, message, failureClass = "runtime-profile-mismatch") {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ScenarioError(failureClass, message);
  }
  return value.trim();
}

function assertSandboxedSessionExplain(payload, params) {
  if (payload?.sessionKey !== params.sessionKey) {
    throw new ScenarioError(
      params.failureClass,
      `sandbox explain returned sessionKey=${String(payload?.sessionKey ?? "<empty>")} for ${params.sessionKey}`,
    );
  }
  if (payload?.sandbox?.mode !== "all") {
    throw new ScenarioError(
      params.failureClass,
      `sandbox explain reported sandbox.mode=${String(payload?.sandbox?.mode ?? "<empty>")} for ${params.sessionKey}`,
    );
  }
  if (payload?.sandbox?.sessionIsSandboxed !== true) {
    throw new ScenarioError(
      params.failureClass,
      `sandbox explain did not mark ${params.sessionKey} as sandboxed`,
    );
  }
  assertNonEmptyString(
    payload?.sandbox?.profile,
    `sandbox explain did not report an effective runtime profile for ${params.sessionKey}`,
    params.failureClass,
  );
}

function spawnCommandCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.error) {
    return {
      ok: false,
      command,
      args,
      status: typeof result.status === "number" ? result.status : null,
      signal: null,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      errorMessage: `Failed to execute ${command}: ${result.error.message}`,
    };
  }

  if (result.status !== 0) {
    const status = typeof result.status === "number" ? result.status : null;
    const signal = typeof result.signal === "string" ? result.signal : null;
    const exitReason = signal ? `signal ${signal}` : `status ${String(status)}`;
    return {
      ok: false,
      command,
      args,
      status,
      signal,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      errorMessage: `${command} exited with ${exitReason}`,
    };
  }

  return {
    ok: true,
    command,
    args,
    status: 0,
    signal: null,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    errorMessage: null,
  };
}

function spawnCommand(command, args, options = {}) {
  const result = spawnCommandCapture(command, args, options);
  if (!result.ok) {
    throw new ExecError(result.errorMessage ?? `${command} failed`, result);
  }
  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function captureFromThrownError(error, fallbackCommand = null) {
  return {
    ok: false,
    command: typeof error?.command === "string" ? error.command : fallbackCommand,
    args: Array.isArray(error?.args) ? error.args.map((value) => String(value)) : [],
    status: typeof error?.status === "number" ? error.status : null,
    signal: typeof error?.signal === "string" ? error.signal : null,
    stdout: typeof error?.stdout === "string" ? error.stdout : "",
    stderr: typeof error?.stderr === "string" ? error.stderr : "",
    errorMessage: typeof error?.message === "string" ? error.message : String(error),
  };
}

function captureDockerExecBash(ctx, command) {
  if (typeof ctx.dockerExecBashCapture === "function") {
    return ctx.dockerExecBashCapture(command);
  }

  try {
    return {
      ok: true,
      command,
      args: [],
      status: 0,
      signal: null,
      stdout: ctx.dockerExecBash(command),
      stderr: "",
      errorMessage: null,
    };
  } catch (error) {
    return captureFromThrownError(error, command);
  }
}

function combineCommandOutput(result) {
  const stdout = result?.stdout ?? "";
  const stderr = result?.stderr ?? "";
  if (stdout && stderr) {
    return stdout.endsWith("\n") ? `${stdout}${stderr}` : `${stdout}\n${stderr}`;
  }
  return stdout || stderr;
}

function createGceCommandContext(env) {
  const container = env.VERIFY_GCE_CONTAINER || "openclaw-gateway";
  const gcloudBaseArgs = [
    "compute",
    "ssh",
    env.GCE_INSTANCE_NAME,
    "--project",
    env.GCP_PROJECT_ID,
    "--zone",
    env.GCP_ZONE,
    "--tunnel-through-iap",
    "--quiet",
  ];

  const runSsh = (command) => {
    const response = spawnCommand("gcloud", [...gcloudBaseArgs, "--command", command], {
      env,
    });
    return response.stdout;
  };

  const runSshCapture = (command) =>
    spawnCommandCapture("gcloud", [...gcloudBaseArgs, "--command", command], {
      env,
    });

  const dockerExecBash = (command) =>
    runSsh(`sudo docker exec ${shellQuote(container)} bash -lc ${shellQuote(command)}`);

  const dockerExecBashCapture = (command) =>
    runSshCapture(`sudo docker exec ${shellQuote(container)} bash -lc ${shellQuote(command)}`);

  const dockerExecSh = (command) =>
    runSsh(`sudo docker exec ${shellQuote(container)} sh -lc ${shellQuote(command)}`);

  const dockerExecShCapture = (command) =>
    runSshCapture(`sudo docker exec ${shellQuote(container)} sh -lc ${shellQuote(command)}`);

  return {
    container,
    runSsh,
    runSshCapture,
    dockerExecBash,
    dockerExecBashCapture,
    dockerExecSh,
    dockerExecShCapture,
  };
}

async function ensureCleanDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

export function buildScenarioSummaryEntry(params) {
  return {
    scenarioId: params.scenarioId,
    manualChecklistId: params.manualChecklistId,
    status: params.status,
    required: Boolean(params.required),
    failureClass: params.failureClass ?? null,
    reason: params.reason ?? null,
    artifacts: Array.isArray(params.artifacts) ? params.artifacts : [],
    automatedScope: params.automatedScope,
    ...(params.operationalContext ? { operationalContext: params.operationalContext } : {}),
    ...(params.expectedOutcome ? { expectedOutcome: params.expectedOutcome } : {}),
    ...(params.manualRemainder ? { manualRemainder: params.manualRemainder } : {}),
  };
}

export function selectIntegrationPath(params) {
  const pluginIds = loadedPluginIdsFrom(params.pluginsPayload);

  if (pluginIds.has("gws-toolkit-phase1")) {
    return { kind: "gws", reason: "gws-toolkit-phase1 is loaded in staging" };
  }

  if (
    pluginIds.has("memory-mongodb") &&
    typeof params.memoryPluginSlot === "string" &&
    params.memoryPluginSlot.trim() === "memory-mongodb"
  ) {
    return { kind: "memory-mongodb", reason: 'status.memoryPlugin.slot is "memory-mongodb"' };
  }

  return {
    kind: "none",
    reason:
      "Neither gws-toolkit-phase1 nor memory-mongodb is active for staging acceptance automation.",
  };
}

function loadedPluginIdsFrom(pluginsPayload) {
  return new Set(
    ((pluginsPayload?.plugins ?? []).filter((entry) => entry?.status === "loaded") ?? []).map(
      (entry) => entry.id,
    ),
  );
}

export function analyzeReadonlyDiagnostics(params) {
  const issues = [];
  const statusText = stripAnsi(params.statusText).toLowerCase();
  const sandboxExplainText = stripAnsi(params.sandboxExplainText).toLowerCase();
  const skillsCheckText = stripAnsi(params.skillsCheckText).toLowerCase();

  if (statusText.includes("gateway unreachable")) {
    issues.push("readonly status regressed to a gateway unreachable false negative");
  }
  if (
    !statusText.includes("host-loopback gateway probe is unsupported") &&
    !statusText.includes("probe unsupported from readonly sandbox")
  ) {
    issues.push("readonly status lost the expected probe unsupported marker");
  }
  if (!sandboxExplainText.includes("mode:") && !sandboxExplainText.includes("effective sandbox")) {
    issues.push("readonly sandbox explain output is missing sandbox mode details");
  }
  if (!skillsCheckText.includes("skills status check")) {
    issues.push("readonly skills check output is missing the skills status summary");
  }

  return issues;
}

function resolveRepoRoot(params) {
  if (params.repoRoot) {
    return params.repoRoot;
  }
  const scriptFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(scriptFile), "..", "..");
}

function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

function createRuntimeContext(params = {}) {
  const env = params.env ?? process.env;
  const artifactRoot =
    params.artifactRoot ??
    path.resolve(
      env.VERIFY_ARTIFACT_DIR || path.join(resolveRepoRoot(params), ".artifacts", "verify"),
    );
  const acceptanceRoot = path.join(artifactRoot, "sandbox-first-acceptance");
  const commandContext = params.commandContext ?? createGceCommandContext(env);

  return {
    env,
    artifactRoot,
    acceptanceRoot,
    log: params.log ?? ((message) => console.log(message)),
    now: params.now ?? (() => new Date()),
    ...commandContext,
  };
}

async function createScenarioContext(runtime, meta) {
  const scenarioDir = path.join(runtime.acceptanceRoot, meta.scenarioId);
  await ensureCleanDir(scenarioDir);
  const artifacts = [];

  return {
    ...runtime,
    ...meta,
    scenarioDir,
    async writeArtifactText(name, content) {
      const filePath = path.join(scenarioDir, name);
      await fs.writeFile(filePath, content, "utf8");
      const relativePath = path.relative(runtime.artifactRoot, filePath).split(path.sep).join("/");
      artifacts.push(relativePath);
      return relativePath;
    },
    async writeArtifactJson(name, payload) {
      const filePath = path.join(scenarioDir, name);
      await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      const relativePath = path.relative(runtime.artifactRoot, filePath).split(path.sep).join("/");
      artifacts.push(relativePath);
      return relativePath;
    },
    listArtifacts() {
      return [...artifacts];
    },
  };
}

function parseJsonOrThrow(raw, failureClass, message) {
  const parsed = extractLastJsonValue(raw);
  if (parsed === null) {
    throw new ScenarioError(failureClass, message);
  }
  return parsed;
}

async function cleanupAcceptanceCronArtifacts(ctx, params = {}) {
  const cleanupParams = params && typeof params === "object" ? params : {};
  const outputs = [];
  const jobId =
    typeof cleanupParams.jobId === "string" && cleanupParams.jobId.trim()
      ? cleanupParams.jobId.trim()
      : "";
  const runSessionKey =
    typeof cleanupParams.runSessionKey === "string" && cleanupParams.runSessionKey.trim()
      ? cleanupParams.runSessionKey.trim()
      : "";
  const baseSessionKey = resolveCronBaseSessionKey(runSessionKey);

  // Staging verify runs without an interactive approver. Record the cleanup intent
  // without issuing gateway deletion methods that require sensitive-action approval.
  if (jobId) {
    outputs.push({
      action: "cron.rm",
      key: jobId,
      skipped: true,
      reason: "sensitive-delete-approval-required",
    });
  }

  if (runSessionKey) {
    outputs.push({
      action: "sessions.delete.run",
      key: runSessionKey,
      skipped: true,
      reason: "sensitive-delete-approval-required",
      options: {
        deleteTranscript: true,
        emitLifecycleHooks: false,
      },
    });
  }

  if (baseSessionKey) {
    outputs.push({
      action: "sessions.delete.base",
      key: baseSessionKey,
      skipped: true,
      reason: "sensitive-delete-approval-required",
      options: {
        deleteTranscript: true,
        emitLifecycleHooks: false,
      },
    });
  }

  await ctx.writeArtifactJson("cron-cleanup.json", {
    jobId: jobId || null,
    runSessionKey: runSessionKey || null,
    baseSessionKey: baseSessionKey || null,
    outputs,
    errors: [],
  });

  return { errors: [] };
}

function assertCronAddSelfDeletes(addPayload, message) {
  if (addPayload?.deleteAfterRun === false) {
    throw new ScenarioError("scheduler-gap", message);
  }
}

function envString(ctx, key) {
  const env = ctx?.env && typeof ctx.env === "object" ? ctx.env : {};
  return typeof env[key] === "string" || typeof env[key] === "number"
    ? String(env[key]).trim()
    : "";
}

function acceptanceCronAgentTurnFlags(ctx, envModelKeys = []) {
  const model =
    envModelKeys.map((key) => envString(ctx, key)).find(Boolean) ||
    envString(ctx, "SBX_CRON_MODEL") ||
    DEFAULT_ACCEPTANCE_CRON_MODEL;
  const thinking = envString(ctx, "SBX_CRON_THINKING") || DEFAULT_ACCEPTANCE_CRON_THINKING;
  const timeoutSeconds =
    envString(ctx, "SBX_CRON_TIMEOUT_SECONDS") || DEFAULT_ACCEPTANCE_CRON_TIMEOUT_SECONDS;
  return [
    `--model ${shellQuote(model)}`,
    `--thinking ${shellQuote(thinking)}`,
    `--timeout-seconds ${shellQuote(timeoutSeconds)}`,
    "--light-context",
  ].join(" ");
}

function resolveGatewayConfigHostPath(credentialsPath) {
  const mountRoot = "/home/node/.openclaw";
  const normalized = path.posix.normalize(credentialsPath);
  if (!normalized.startsWith(`${mountRoot}/`)) {
    throw new ScenarioError(
      "secret-or-route-gap",
      `Google Workspace credentialsFile is outside the mounted config root: ${credentialsPath || "<empty>"}`,
    );
  }

  const relativePath = path.posix.relative(mountRoot, normalized);
  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.posix.isAbsolute(relativePath) ||
    !/^[A-Za-z0-9._/@+-]+$/.test(relativePath)
  ) {
    throw new ScenarioError(
      "secret-or-route-gap",
      `Google Workspace credentialsFile escapes the mounted config root: ${credentialsPath || "<empty>"}`,
    );
  }

  return path.posix.join("/opt/DAISy/config", relativePath);
}

function areCapabilityCountsEqual(left, right) {
  const leftKeys = Object.keys(left).toSorted();
  const rightKeys = Object.keys(right).toSorted();
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (let index = 0; index < leftKeys.length; index += 1) {
    if (leftKeys[index] !== rightKeys[index]) {
      return false;
    }
    if (left[leftKeys[index]] !== right[rightKeys[index]]) {
      return false;
    }
  }
  return true;
}

async function readCredentialSourceType(ctx, credentialsPath) {
  const classifierScript = `
    const fs = require("node:fs");
    const filePath = process.argv[1];
    let classified = "credentials_file_unknown";
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (parsed.type === "service_account") {
        classified = "service_account_json";
      } else if (parsed.type === "authorized_user") {
        classified = "authorized_user";
      } else if (
        typeof parsed.refresh_token === "string" ||
        typeof parsed.client_id === "string" ||
        typeof parsed.client_secret === "string"
      ) {
        classified = "headless_oauth_export";
      }
    } catch {}
    process.stdout.write(classified);
  `.trim();
  return stripAnsi(
    ctx.dockerExecBash(
      `cd /app && node -e ${shellQuote(classifierScript)} ${shellQuote(credentialsPath)}`,
    ),
  ).trim();
}

async function runRuntimeProfileSanityScenario(ctx) {
  const statusRaw = ctx.dockerExecBash("cd /app && node dist/index.js status --json");
  await ctx.writeArtifactText("status.json", statusRaw);
  const statusPayload = parseJsonOrThrow(
    statusRaw,
    "capability-consistency-gap",
    "status --json did not return a parseable JSON payload",
  );

  const sandboxExplainRaw = ctx.dockerExecBash(
    "cd /app && node dist/index.js sandbox explain --json",
  );
  await ctx.writeArtifactText("sandbox-explain.json", sandboxExplainRaw);
  const sandboxExplainPayload = parseJsonOrThrow(
    sandboxExplainRaw,
    "capability-consistency-gap",
    "sandbox explain --json did not return a parseable JSON payload",
  );

  const doctorResult = captureDockerExecBash(
    ctx,
    "cd /app && node dist/index.js doctor --non-interactive",
  );
  const doctorText = combineCommandOutput(doctorResult);
  await ctx.writeArtifactText("doctor.txt", doctorText);
  if (!doctorText.trim()) {
    throw new ScenarioError(
      "doctor-usefulness-gap",
      doctorResult.errorMessage
        ? `doctor produced no inspectable output: ${doctorResult.errorMessage}`
        : "doctor produced no inspectable output",
    );
  }

  if ((sandboxExplainPayload?.sandbox?.mode ?? "off") === "off") {
    throw new ScenarioError(
      "runtime-profile-mismatch",
      "sandbox explain reported sandbox.mode=off instead of a sandbox-first runtime",
    );
  }

  assertNonEmptyString(
    sandboxExplainPayload?.sandbox?.profile,
    "sandbox explain did not report an effective runtime profile",
  );

  const statusCounts = statusPayload?.capabilities?.counts?.byClass;
  const explainCounts = sandboxExplainPayload?.capabilities?.counts?.byClass;
  if (
    !statusCounts ||
    !explainCounts ||
    typeof statusCounts !== "object" ||
    typeof explainCounts !== "object"
  ) {
    throw new ScenarioError(
      "capability-consistency-gap",
      "status and sandbox explain did not both expose capability-class counts",
    );
  }

  if (!areCapabilityCountsEqual(statusCounts, explainCounts)) {
    throw new ScenarioError(
      "capability-consistency-gap",
      "status and sandbox explain disagreed on capability-class counts",
    );
  }

  if (/agents\.defaults\.sandbox\.mode=off|sandbox\.mode=off/i.test(stripAnsi(doctorText))) {
    throw new ScenarioError(
      "doctor-usefulness-gap",
      "doctor suggested disabling sandboxing instead of preserving the sandbox-first path",
    );
  }
}

function classifyReadonlyFailure(error) {
  const combined = stripAnsi(
    `${error?.stdout ?? ""}\n${error?.stderr ?? ""}\n${error?.message ?? ""}`,
  );
  if (/missing readonly config mount|projection/i.test(combined)) {
    return new ScenarioError(
      "projection-defect",
      "readonly diagnostics reported a projection or mount defect",
    );
  }
  if (
    /openclaw-readonly" is not on path|readonly runtime command|openclaw-readonly: not found|executable file not found in \$path/i.test(
      combined,
    )
  ) {
    return new ScenarioError(
      "readonly-runtime-gap",
      "openclaw-readonly is missing from the deployed sandbox runtime",
    );
  }
  return new ScenarioError(
    "readonly-runtime-gap",
    "readonly diagnostics failed to execute inside the deployed runtime",
  );
}

async function runReadonlyDiagnosticsScenario(ctx) {
  const sandboxExplainRaw = ctx.dockerExecBash(
    "cd /app && node dist/index.js sandbox explain --json",
  );
  await ctx.writeArtifactText("gateway-sandbox-explain.json", sandboxExplainRaw);
  const sandboxExplainPayload = parseJsonOrThrow(
    sandboxExplainRaw,
    "readonly-runtime-gap",
    "sandbox explain --json did not return a parseable JSON payload for readonly diagnostics",
  );
  const sandboxImageRaw = sandboxExplainPayload?.sandbox?.docker?.image;
  const sandboxImage = typeof sandboxImageRaw === "string" ? sandboxImageRaw.trim() : "";
  if (!sandboxImage) {
    throw new ScenarioError(
      "readonly-runtime-gap",
      "sandbox explain did not report the deployed sandbox image",
    );
  }

  const runReadonlyCommand = (args) => {
    const readonlySubcommand = args.map((arg) =>
      assertNonEmptyString(arg, "invalid readonly subcommand token"),
    );
    const script = `
      set -euo pipefail
      tmp_dir="$(mktemp -d /tmp/sbx-402-readonly.XXXXXX)"
      cleanup() {
        rm -rf "$tmp_dir"
      }
      trap cleanup EXIT
      mkdir -p "$tmp_dir/state" "$tmp_dir/workspace"
      sudo docker exec ${shellQuote(ctx.container)} bash -lc 'cat "\${OPENCLAW_CONFIG_PATH:?}"' > "$tmp_dir/openclaw.json"
      sudo docker run --rm --network none \
        -v "$tmp_dir/openclaw.json:/readonly/openclaw.json:ro" \
        -v "$tmp_dir/state:/readonly/state:ro" \
        -v "$tmp_dir/workspace:/agent:ro" \
        -e OPENCLAW_READONLY_CONFIG_PATH=/readonly/openclaw.json \
        -e OPENCLAW_READONLY_STATE_DIR=/readonly/state \
        -e OPENCLAW_READONLY_AGENT_ID=main \
        -e OPENCLAW_READONLY_WORKSPACE_DIR=/agent \
        ${shellQuote(sandboxImage)} openclaw-readonly ${readonlySubcommand.join(" ")}
    `.trim();
    return ctx.runSsh(`bash -lc ${shellQuote(script)}`);
  };

  let readonlyStatus;
  let readonlyExplain;
  let readonlySkills;
  try {
    readonlyStatus = runReadonlyCommand(["status"]);
    readonlyExplain = runReadonlyCommand(["sandbox", "explain"]);
    readonlySkills = runReadonlyCommand(["skills", "check"]);
  } catch (error) {
    throw classifyReadonlyFailure(error);
  }

  await ctx.writeArtifactText("readonly-status.txt", readonlyStatus);
  await ctx.writeArtifactText("readonly-sandbox-explain.txt", readonlyExplain);
  await ctx.writeArtifactText("readonly-skills-check.txt", readonlySkills);

  const issues = analyzeReadonlyDiagnostics({
    statusText: readonlyStatus,
    sandboxExplainText: readonlyExplain,
    skillsCheckText: readonlySkills,
  });

  if (issues.length > 0) {
    throw new ScenarioError("truthfulness-gap", issues[0]);
  }
}

async function runReadinessSnapshotScenario(ctx) {
  const skillsCheckRaw = ctx.dockerExecBash("cd /app && node dist/index.js skills check --json");
  await ctx.writeArtifactText("skills-check.json", skillsCheckRaw);
  const skillsCheckPayload = parseJsonOrThrow(
    skillsCheckRaw,
    "readiness-reporting-gap",
    "skills check --json did not return a parseable JSON payload",
  );

  const skillInfoRaw = ctx.dockerExecBash(
    "cd /app && node dist/index.js skills info openclaw-readonly --json",
  );
  await ctx.writeArtifactText("skills-info-openclaw-readonly.json", skillInfoRaw);
  const skillInfoPayload = parseJsonOrThrow(
    skillInfoRaw,
    "sandbox-contract-gap",
    "skills info openclaw-readonly --json did not return a parseable JSON payload",
  );

  if (
    !skillsCheckPayload?.summary ||
    typeof skillsCheckPayload.summary.blocked !== "number" ||
    typeof skillsCheckPayload.summary.missingRequirements !== "number"
  ) {
    throw new ScenarioError(
      "readiness-reporting-gap",
      "skills check did not expose blocked and missingRequirements summary fields",
    );
  }

  if (skillInfoPayload?.name !== "openclaw-readonly") {
    throw new ScenarioError(
      "sandbox-contract-gap",
      "openclaw-readonly is missing from skills info",
    );
  }
  if (skillInfoPayload?.eligible !== true) {
    throw new ScenarioError(
      "sandbox-contract-gap",
      "openclaw-readonly is no longer eligible in the deployed sandbox-first runtime",
    );
  }

  const description = String(skillInfoPayload?.description ?? "");
  if (!/sandbox-safe/i.test(description) || !/read-only/i.test(description)) {
    throw new ScenarioError(
      "sandbox-contract-gap",
      "openclaw-readonly is no longer described as a sandbox-safe read-only diagnostic path",
    );
  }
}

function validateGwsAuthHealthPayload(subject, payload) {
  if (payload?.ok !== true) {
    return false;
  }
  if (payload?.data?.route?.bindingSubject !== subject) {
    return false;
  }
  if (payload?.data?.authHealth?.tokenValid !== true) {
    return false;
  }
  if (
    typeof payload?.data?.authHealth?.tokenError === "string" &&
    payload.data.authHealth.tokenError
  ) {
    return false;
  }
  return true;
}

async function runGwsIntegrationScenario(ctx) {
  const delegateRaw = ctx.dockerExecBash("cd /app && node scripts/gws/select-delegate-subject.mjs");
  await ctx.writeArtifactText("gws-delegate-subjects.json", delegateRaw);
  const delegatePayload = parseJsonOrThrow(
    delegateRaw,
    "delegated-capability-gap",
    "select-delegate-subject did not return a parseable JSON payload",
  );

  const baselineSubject =
    typeof delegatePayload.baselineSubject === "string"
      ? delegatePayload.baselineSubject.trim()
      : "";
  if (!isValidGwsBindingSubject(baselineSubject)) {
    throw new ScenarioError(
      "secret-or-route-gap",
      "No configured GWS baseline binding subject was available for auth-health verification",
    );
  }

  const delegateSubjects = Array.isArray(delegatePayload.delegateSubjects)
    ? delegatePayload.delegateSubjects
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(isValidGwsBindingSubject)
    : [];
  if (delegateSubjects.length === 0) {
    throw new ScenarioError(
      "delegated-capability-gap",
      "No additional non-baseline GWS binding subject candidates were available for delegated auth-health verification",
    );
  }

  const activeRouteRaw = ctx.dockerExecBash(
    `cd /app && node scripts/gws/inspect-active-route.mjs --subject ${shellQuote(baselineSubject)}`,
  );
  await ctx.writeArtifactText("gws-active-route.json", activeRouteRaw);
  const activeRoute = parseJsonOrThrow(
    activeRouteRaw,
    "secret-or-route-gap",
    "inspect-active-route did not return a parseable JSON payload",
  );

  if (activeRoute.impersonationConfigured === true && activeRoute.impersonationMissing === true) {
    throw new ScenarioError(
      "secret-or-route-gap",
      "Google Workspace impersonation is configured but unresolved in staging",
    );
  }

  const impersonatedUser =
    typeof activeRoute.impersonatedUser === "string" ? activeRoute.impersonatedUser.trim() : "";
  if (impersonatedUser && !/^[A-Za-z0-9_.@+-]+$/.test(impersonatedUser)) {
    throw new ScenarioError(
      "secret-or-route-gap",
      "Google Workspace impersonatedUser contains unsafe characters",
    );
  }

  if (activeRoute.mode === "credentials_file") {
    const credentialsPath =
      typeof activeRoute.credentialsFile === "string" ? activeRoute.credentialsFile.trim() : "";
    const hostPath = resolveGatewayConfigHostPath(credentialsPath);
    const hostPathProbeScript = `if [ -f ${shellQuote(
      hostPath,
    )} ]; then stat -c "present(size=%s)" ${shellQuote(hostPath)}; else echo missing; fi`;
    const hostStatus = stripAnsi(ctx.runSsh(`sudo -n sh -c ${shellQuote(hostPathProbeScript)}`))
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .at(-1);

    if (hostStatus === "missing") {
      throw new ScenarioError(
        "secret-or-route-gap",
        `gws-toolkit-phase1 requires credentials_file mode, but ${hostPath} is missing on staging`,
      );
    }

    const gwsAuthCommand = [
      "set -euo pipefail",
      `export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=${shellQuote(credentialsPath)}`,
      impersonatedUser
        ? `export GOOGLE_WORKSPACE_CLI_IMPERSONATED_USER=${shellQuote(impersonatedUser)}`
        : null,
      "gws auth status | jq -c .",
    ]
      .filter(Boolean)
      .join("; ");
    const gwsAuthRaw = ctx.dockerExecBash(gwsAuthCommand);
    await ctx.writeArtifactText("gws-auth-status.json", gwsAuthRaw);
    const gwsAuth = parseJsonOrThrow(
      gwsAuthRaw,
      "secret-or-route-gap",
      "gws auth status did not return a parseable JSON payload",
    );
    const credentialSourceType = await readCredentialSourceType(ctx, credentialsPath);
    await ctx.writeArtifactJson("gws-credential-source.json", {
      credentialsPath,
      credentialSourceType,
    });

    if (gwsAuth.plain_credentials_exists !== true) {
      throw new ScenarioError(
        "secret-or-route-gap",
        "Google Workspace credentials file is not visible to gws inside the deployed container",
      );
    }

    const tokenError = typeof gwsAuth.token_error === "string" ? gwsAuth.token_error : "";
    if (tokenError) {
      throw new ScenarioError(
        "secret-or-route-gap",
        `Google Workspace credentials are present but invalid: ${tokenError}`,
      );
    }

    if (gwsAuth.token_valid !== true) {
      const omittedTokenValid =
        !Object.prototype.hasOwnProperty.call(gwsAuth, "token_valid") &&
        credentialSourceType === "service_account_json" &&
        gwsAuth.plain_credentials_exists === true &&
        tokenError === "";
      if (!omittedTokenValid) {
        throw new ScenarioError(
          "secret-or-route-gap",
          "Google Workspace credentials are present but gws auth status is not healthy",
        );
      }
    }
  }

  const baselineRaw = ctx.dockerExecBash(
    `cd /app && node scripts/gws/run-auth-health.mjs --subject ${shellQuote(baselineSubject)}`,
  );
  await ctx.writeArtifactText("gws-auth-health-baseline.json", baselineRaw);
  const baselinePayload = parseJsonOrThrow(
    baselineRaw,
    "secret-or-route-gap",
    `run-auth-health for ${baselineSubject} did not return a parseable JSON payload`,
  );
  if (!validateGwsAuthHealthPayload(baselineSubject, baselinePayload)) {
    throw new ScenarioError(
      "secret-or-route-gap",
      `Auth-health baseline checks failed for ${baselineSubject}`,
    );
  }
  if (baselinePayload?.data?.authHealth?.credentialSourceType !== "service_account_json") {
    throw new ScenarioError(
      "secret-or-route-gap",
      `Auth-health credential source drifted from service_account_json for ${baselineSubject}`,
    );
  }
  if (
    baselinePayload?.data?.authHealth?.serviceAccountPolicyEnforced !== true ||
    baselinePayload?.data?.authHealth?.serviceAccountPolicyCompliant !== true
  ) {
    throw new ScenarioError(
      "secret-or-route-gap",
      `Auth-health service-account policy gate failed for ${baselineSubject}`,
    );
  }

  let delegatedPayload = null;
  let delegatedSubject = null;
  for (const subject of delegateSubjects) {
    try {
      const delegatedRaw = ctx.dockerExecBash(
        `cd /app && node scripts/gws/run-auth-health.mjs --subject ${shellQuote(subject)}`,
      );
      const parsed = parseJsonOrThrow(
        delegatedRaw,
        "delegated-capability-gap",
        `run-auth-health for ${subject} did not return a parseable JSON payload`,
      );
      if (!validateGwsAuthHealthPayload(subject, parsed)) {
        continue;
      }
      if (parsed?.data?.authHealth?.credentialSourceType !== "service_account_json") {
        continue;
      }
      if (
        parsed?.data?.authHealth?.serviceAccountPolicyEnforced !== true ||
        parsed?.data?.authHealth?.serviceAccountPolicyCompliant !== true
      ) {
        continue;
      }
      delegatedPayload = parsed;
      delegatedSubject = subject;
      await ctx.writeArtifactJson("gws-auth-health-delegated.json", parsed);
      break;
    } catch {
      // Try the next delegated subject candidate.
    }
  }

  if (!delegatedPayload || !delegatedSubject) {
    throw new ScenarioError(
      "delegated-capability-gap",
      "No delegated GWS binding subject passed service-account auth-health policy gates",
    );
  }
}

async function runMemoryIntegrationScenario(ctx) {
  const memoryStatusRaw = ctx.dockerExecBash(
    "cd /app && node dist/index.js memory status --deep --agent main --json",
  );
  await ctx.writeArtifactText("memory-status-main.json", memoryStatusRaw);
  const memoryPayload = parseJsonOrThrow(
    memoryStatusRaw,
    "memory-plugin-gap",
    "memory status --deep --json did not return a parseable JSON payload",
  );

  const first = Array.isArray(memoryPayload) ? memoryPayload[0] : null;
  if (!first || typeof first !== "object") {
    throw new ScenarioError(
      "memory-plugin-gap",
      "memory status did not return a main-agent result",
    );
  }
  if (typeof first.status?.provider !== "string" || first.status.provider.trim() === "") {
    throw new ScenarioError("memory-plugin-gap", "memory status did not report an active provider");
  }
  if (typeof first.indexError === "string" && first.indexError.trim() !== "") {
    throw new ScenarioError(
      "memory-plugin-gap",
      `memory status reported indexError: ${first.indexError}`,
    );
  }
  if (first.embeddingProbe && first.embeddingProbe.ok === false) {
    const detail =
      typeof first.embeddingProbe.error === "string" && first.embeddingProbe.error
        ? first.embeddingProbe.error
        : "embedding probe failed";
    throw new ScenarioError(
      "memory-plugin-gap",
      `memory status reported embedding probe failure: ${detail}`,
    );
  }
}

async function runIntegrationPathScenario(ctx) {
  const pluginsRaw = ctx.dockerExecBash("cd /app && node dist/index.js plugins list --json");
  await ctx.writeArtifactText("plugins-list.json", pluginsRaw);
  const pluginsPayload = parseJsonOrThrow(
    pluginsRaw,
    "integration-config-gap",
    "plugins list --json did not return a parseable JSON payload",
  );

  let selection = selectIntegrationPath({
    pluginsPayload,
    memoryPluginSlot: null,
  });
  const loadedPluginIds = loadedPluginIdsFrom(pluginsPayload);

  if (selection.kind === "none" && loadedPluginIds.has("memory-mongodb")) {
    const statusRaw = ctx.dockerExecBash("cd /app && node dist/index.js status --json");
    await ctx.writeArtifactText("status.json", statusRaw);
    const statusPayload = parseJsonOrThrow(
      statusRaw,
      "integration-config-gap",
      "status --json did not return a parseable JSON payload for integration-path selection",
    );

    selection = selectIntegrationPath({
      pluginsPayload,
      memoryPluginSlot: statusPayload?.memoryPlugin?.slot ?? null,
    });
  }

  if (selection.kind === "none") {
    return {
      status: "skipped",
      reason: selection.reason,
    };
  }

  await ctx.writeArtifactJson("integration-selection.json", selection);

  if (selection.kind === "gws") {
    await runGwsIntegrationScenario(ctx);
    return { status: "passed" };
  }

  await runMemoryIntegrationScenario(ctx);
  return { status: "passed" };
}

function acceptanceCronPollTimeoutMs(ctx) {
  const configured = Number(envString(ctx, "SBX_CRON_POLL_TIMEOUT_SECONDS"));
  return Number.isFinite(configured) && configured > 0
    ? configured * 1_000
    : DEFAULT_ACCEPTANCE_CRON_POLL_TIMEOUT_SECONDS * 1_000;
}

function isRetryableAcceptanceCronEntry(entry) {
  if (entry?.action !== "finished" || entry?.status !== "error") {
    return false;
  }
  const error = typeof entry.error === "string" ? entry.error : "";
  const nextRunAtMs = typeof entry.nextRunAtMs === "number" ? entry.nextRunAtMs : Number.NaN;
  return (
    ACCEPTANCE_CRON_TRANSIENT_ERROR_PATTERN.test(error) &&
    Number.isFinite(nextRunAtMs) &&
    nextRunAtMs > 0
  );
}

function acceptanceCronPollDelayMs(entry) {
  const nextRunAtMs = typeof entry?.nextRunAtMs === "number" ? entry.nextRunAtMs : Number.NaN;
  if (Number.isFinite(nextRunAtMs) && nextRunAtMs > 0) {
    const untilRetry = Math.max(nextRunAtMs - Date.now() + ACCEPTANCE_CRON_POLL_INTERVAL_MS, 0);
    return Math.min(
      Math.max(untilRetry, ACCEPTANCE_CRON_POLL_INTERVAL_MS),
      ACCEPTANCE_CRON_RETRY_POLL_MAX_INTERVAL_MS,
    );
  }
  return ACCEPTANCE_CRON_POLL_INTERVAL_MS;
}

async function acceptanceCronPollWait(ctx, ms) {
  if (typeof ctx.wait === "function") {
    await ctx.wait(ms);
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollForCronEntry(ctx, jobId) {
  const deadlineMs = Date.now() + acceptanceCronPollTimeoutMs(ctx);
  let lastObserved = null;

  while (Date.now() <= deadlineMs) {
    const runsRaw = ctx.dockerExecBash(
      `cd /app && node dist/index.js cron runs --id ${shellQuote(jobId)} --limit 20`,
    );
    await ctx.writeArtifactText("cron-runs.json", runsRaw);
    const runsPayload = extractLastJsonValue(runsRaw);
    const entries = Array.isArray(runsPayload?.entries) ? runsPayload.entries : [];
    const last = entries.at(-1);
    if (last) {
      lastObserved = last;
      if (!isRetryableAcceptanceCronEntry(last)) {
        return { runsPayload, last };
      }
    }
    const delayMs = last ? acceptanceCronPollDelayMs(last) : ACCEPTANCE_CRON_POLL_INTERVAL_MS;
    await acceptanceCronPollWait(ctx, Math.min(delayMs, Math.max(deadlineMs - Date.now(), 0)));
  }

  if (lastObserved) {
    throw new ScenarioError(
      "sandbox-runtime-gap",
      `cron acceptance job did not reach a terminal non-retry state within ${Math.round(
        acceptanceCronPollTimeoutMs(ctx) / 1_000,
      )} seconds after last status ${String(lastObserved.status ?? "<empty>")}`,
    );
  }
  throw new ScenarioError(
    "scheduler-gap",
    "cron runs did not record any entries for the acceptance job",
  );
}

export async function runIsolatedCronScenario(ctx) {
  const runAt = new Date(ctx.now().getTime() + 20 * 60 * 1000).toISOString();
  const jobName = `SBX-401 sandbox-first acceptance ${ctx.now().toISOString()}`;
  let jobId = "";
  let runSessionKey = "";

  try {
    const addRaw = ctx.dockerExecBash(
      `cd /app && node dist/index.js cron add --name ${shellQuote(jobName)} --at ${shellQuote(
        runAt,
      )} --session isolated --message ${shellQuote(
        DEFAULT_CRON_PROMPT,
      )} ${acceptanceCronAgentTurnFlags(ctx, ["SBX401_CRON_MODEL"])} --no-deliver`,
    );
    await ctx.writeArtifactText("cron-add.json", addRaw);
    const addPayload = parseJsonOrThrow(
      addRaw,
      "scheduler-gap",
      "cron add did not return a parseable JSON payload",
    );
    jobId = typeof addPayload?.id === "string" && addPayload.id.trim() ? addPayload.id.trim() : "";
    if (!jobId) {
      throw new ScenarioError("scheduler-gap", "cron add did not return a job id");
    }
    assertCronAddSelfDeletes(
      addPayload,
      "cron add reported deleteAfterRun=false; refusing to skip destructive cleanup for a persistent acceptance job",
    );

    const runRaw = ctx.dockerExecBash(
      `cd /app && node dist/index.js cron run ${shellQuote(jobId)}`,
    );
    await ctx.writeArtifactText("cron-run.json", runRaw);
    const runPayload = parseJsonOrThrow(
      runRaw,
      "scheduler-gap",
      "cron run did not return a parseable JSON payload",
    );
    if (runPayload?.ok !== true || runPayload?.ran !== true) {
      throw new ScenarioError(
        "scheduler-gap",
        "cron run did not execute the isolated acceptance job",
      );
    }

    const { last } = await pollForCronEntry(ctx, jobId);
    if (last?.action !== "finished") {
      throw new ScenarioError("scheduler-gap", "cron run history did not record a finished event");
    }
    if (last?.status !== "ok") {
      throw new ScenarioError(
        "sandbox-runtime-gap",
        `isolated cron acceptance job finished with status ${String(last?.status ?? "<empty>")}`,
      );
    }
    if (last?.deliveryStatus !== "not-requested") {
      throw new ScenarioError(
        "delivery-gap",
        `isolated cron acceptance job unexpectedly attempted delivery (${String(
          last?.deliveryStatus ?? "<empty>",
        )})`,
      );
    }
    runSessionKey = typeof last?.sessionKey === "string" ? last.sessionKey.trim() : "";
    if (!isAgentCronRunSessionKeyForJob(runSessionKey, jobId)) {
      throw new ScenarioError(
        "scheduler-gap",
        `isolated cron run did not expose the expected agent-scoped per-run session key for ${jobId}, got ${runSessionKey || "<empty>"}`,
      );
    }
  } finally {
    if (jobId || runSessionKey) {
      await cleanupAcceptanceCronArtifacts(ctx, { jobId, runSessionKey });
    }
  }
}

async function runSandboxExplainForSession(ctx, params) {
  const explainRaw = ctx.dockerExecBash(
    `cd /app && node dist/index.js sandbox explain --session ${shellQuote(params.sessionKey)} --json`,
  );
  await ctx.writeArtifactText(params.artifactName, explainRaw);
  const explainPayload = parseJsonOrThrow(
    explainRaw,
    params.failureClass,
    `sandbox explain --session ${params.sessionKey} did not return a parseable JSON payload`,
  );
  assertSandboxedSessionExplain(explainPayload, {
    sessionKey: params.sessionKey,
    failureClass: params.failureClass,
  });
  return explainPayload;
}

async function runDirectSessionRuntimeScenario(ctx) {
  const sessionKey = ctx.env.SBX404_DIRECT_SESSION_KEY?.trim() || "agent:main:main";
  const payload = await runSandboxExplainForSession(ctx, {
    sessionKey,
    artifactName: "direct-session-sandbox-explain.json",
    failureClass: "unsandboxed-session-gap",
  });
  await ctx.writeArtifactJson("direct-session-runtime.json", {
    operationalContext: "direct-session",
    sessionKey,
    agentId: payload.agentId,
    runtimeProfile: payload.sandbox.profile,
    expectedOutcome: "pass",
  });
}

async function runGroupSessionRuntimeScenario(ctx) {
  const sessionKey =
    ctx.env.SBX404_GROUP_SESSION_KEY?.trim() || "agent:main:discord:group:sbx-404-validation";
  const payload = await runSandboxExplainForSession(ctx, {
    sessionKey,
    artifactName: "group-session-sandbox-explain.json",
    failureClass: "unsandboxed-session-gap",
  });
  const observedChannel =
    typeof payload?.elevated?.channel === "string" ? payload.elevated.channel.trim() : "";
  if (!observedChannel) {
    throw new ScenarioError(
      "session-routing-gap",
      `sandbox explain did not expose an operator-visible channel for ${sessionKey}`,
    );
  }
  await ctx.writeArtifactJson("group-session-observability.json", {
    operationalContext: "group-session",
    sessionKey,
    observedChannel,
    runtimeProfile: payload.sandbox.profile,
    expectedOutcome: "pass",
  });
}

async function runSubagentSandboxInheritanceScenario(ctx) {
  const sessionKey =
    ctx.env.SBX404_SUBAGENT_SESSION_KEY?.trim() || "agent:main:subagent:sbx-404-validation";
  if (!sessionKey.includes(":subagent:")) {
    throw new ScenarioError(
      "sandbox-inheritance-gap",
      `SBX404_SUBAGENT_SESSION_KEY must be a subagent session key, got ${sessionKey}`,
    );
  }
  const payload = await runSandboxExplainForSession(ctx, {
    sessionKey,
    artifactName: "subagent-session-sandbox-explain.json",
    failureClass: "sandbox-inheritance-gap",
  });
  await ctx.writeArtifactJson("subagent-runtime-metadata.json", {
    operationalContext: "subagent-session",
    childSessionKey: sessionKey,
    lane: "subagent",
    runtimeProfile: payload.sandbox.profile,
    expectedOutcome: "pass",
  });
}

export async function runCronIsolationAndSubagentModelScenario(ctx) {
  const now = ctx.now();
  const runAt = new Date(now.getTime() + 20 * 60 * 1000).toISOString();
  const jobName = `SBX-404 cron isolation ${now.toISOString()}`;
  let jobId = "";
  let runSessionKey = "";

  try {
    const addRaw = ctx.dockerExecBash(
      [
        "cd /app && node dist/index.js cron add",
        `--name ${shellQuote(jobName)}`,
        `--at ${shellQuote(runAt)}`,
        "--session isolated",
        `--message ${shellQuote(DEFAULT_CRON_PROMPT)}`,
        acceptanceCronAgentTurnFlags(ctx, ["SBX404_CRON_MODEL"]),
        "--no-deliver",
      ]
        .filter(Boolean)
        .join(" "),
    );
    await ctx.writeArtifactText("cron-add.json", addRaw);
    const addPayload = parseJsonOrThrow(
      addRaw,
      "scheduler-gap",
      "SBX-404 cron add did not return a parseable JSON payload",
    );
    jobId = typeof addPayload?.id === "string" && addPayload.id.trim() ? addPayload.id.trim() : "";
    if (!jobId) {
      throw new ScenarioError("scheduler-gap", "SBX-404 cron add did not return a job id");
    }
    assertCronAddSelfDeletes(
      addPayload,
      "SBX-404 cron add reported deleteAfterRun=false; refusing to skip destructive cleanup for a persistent acceptance job",
    );

    const runRaw = ctx.dockerExecBash(
      `cd /app && node dist/index.js cron run ${shellQuote(jobId)}`,
    );
    await ctx.writeArtifactText("cron-run.json", runRaw);
    const runPayload = parseJsonOrThrow(
      runRaw,
      "scheduler-gap",
      "SBX-404 cron run did not return a parseable JSON payload",
    );
    if (runPayload?.ok !== true || runPayload?.ran !== true) {
      throw new ScenarioError(
        "scheduler-gap",
        "SBX-404 cron run did not execute the isolated validation job",
      );
    }

    const { last } = await pollForCronEntry(ctx, jobId);
    if (last?.action !== "finished") {
      throw new ScenarioError(
        "scheduler-gap",
        "SBX-404 cron run history did not record a finished event",
      );
    }
    if (last?.status !== "ok") {
      throw new ScenarioError(
        "sandbox-runtime-gap",
        `SBX-404 isolated cron job finished with status ${String(last?.status ?? "<empty>")}`,
      );
    }
    if (last?.deliveryStatus !== "not-requested") {
      throw new ScenarioError(
        "delivery-gap",
        `SBX-404 isolated cron job unexpectedly attempted delivery (${String(
          last?.deliveryStatus ?? "<empty>",
        )})`,
      );
    }
    runSessionKey = typeof last?.sessionKey === "string" ? last.sessionKey.trim() : "";
    if (!isAgentCronRunSessionKeyForJob(runSessionKey, jobId)) {
      throw new ScenarioError(
        "scheduler-gap",
        `SBX-404 isolated cron run did not expose the expected agent-scoped per-run session key for ${jobId}, got ${runSessionKey || "<empty>"}`,
      );
    }
    await ctx.writeArtifactJson("cron-isolation-metadata.json", {
      operationalContext: "cron-isolated-session",
      jobId,
      sessionKey: runSessionKey,
      model: typeof last?.model === "string" ? last.model : null,
      provider: typeof last?.provider === "string" ? last.provider : null,
      expectedOutcome: "pass",
    });
  } finally {
    if (jobId || runSessionKey) {
      await cleanupAcceptanceCronArtifacts(ctx, { jobId, runSessionKey });
    }
  }
}

async function runHostOnlyBlocksScenario(ctx) {
  const probeScript = `
    try {
      const { spawnAcpDirect } = await import("./dist/agents/acp-spawn.js");
      const result = await spawnAcpDirect(
        { task: "SBX-404 host-only block probe", agentId: "codex" },
        { agentSessionKey: "agent:main:subagent:sbx-404-parent", sandboxed: true },
      );
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.log(JSON.stringify({
        status: "error",
        error: error?.message ?? String(error),
        stack: error?.stack ?? null,
      }, null, 2));
    }
  `.trim();
  const command = `
    set -euo pipefail
    tmp_dir="$(mktemp -d /tmp/sbx-404-host-only.XXXXXX)"
    cleanup() { rm -rf "$tmp_dir"; }
    trap cleanup EXIT
    printf '%s\\n' '{"acp":{"enabled":true},"agents":{"defaults":{"sandbox":{"mode":"all"}}}}' > "$tmp_dir/openclaw.json"
    cd /app
    OPENCLAW_CONFIG_PATH="$tmp_dir/openclaw.json" node --input-type=module -e ${shellQuote(
      probeScript,
    )}
  `.trim();
  const raw = ctx.dockerExecBash(command);
  await ctx.writeArtifactText("host-only-acp-spawn-result.json", raw);
  const payload = parseJsonOrThrow(
    raw,
    "unsupported-host-only-behavior",
    "ACP host-only block probe did not return a parseable JSON payload",
  );
  const error = typeof payload?.error === "string" ? payload.error : "";
  if (payload?.status !== "forbidden") {
    throw new ScenarioError(
      "unsupported-host-only-behavior",
      `ACP host-only block probe returned status ${String(payload?.status ?? "<empty>")}`,
    );
  }
  if (
    !error.includes("Sandbox blocked break-glass host-only operation") ||
    !error.includes("break-glass host authority")
  ) {
    throw new ScenarioError(
      "unsupported-host-only-behavior",
      "ACP host-only block probe did not include the expected sandbox host-only failure text",
    );
  }
  await ctx.writeArtifactJson("host-only-block-metadata.json", {
    operationalContext: "host-only-exception",
    expectedOutcome: "blocked",
    status: payload.status,
    failureClass: "unsupported-host-only-behavior",
  });
}

export async function runScenarioSet(params) {
  const results = [];
  await fs.mkdir(params.runtime.acceptanceRoot, { recursive: true });

  for (const meta of params.scenarios) {
    params.log(`Running ${meta.manualChecklistId} (${meta.scenarioId})...`);
    const ctx = await createScenarioContext(params.runtime, meta);
    try {
      const outcome = await params.runScenario(ctx);
      const status = outcome?.status ?? "passed";
      results.push(
        buildScenarioSummaryEntry({
          ...meta,
          status,
          failureClass: outcome?.failureClass ?? null,
          reason: outcome?.reason ?? null,
          artifacts: ctx.listArtifacts(),
        }),
      );
    } catch (error) {
      const failureClass =
        error?.failureClass ?? meta.primaryFailureClass ?? "runtime-profile-mismatch";
      const reason =
        typeof error?.message === "string" && error.message
          ? error.message
          : `Scenario ${meta.scenarioId} failed`;
      try {
        await ctx.writeArtifactJson("scenario-error.json", {
          failureClass,
          reason,
          error: serializeScenarioError(error),
        });
      } catch (artifactError) {
        params.log(
          `Warning: failed to write scenario-error.json for ${meta.scenarioId}: ${
            artifactError instanceof Error ? artifactError.message : String(artifactError)
          }`,
        );
      }
      results.push(
        buildScenarioSummaryEntry({
          ...meta,
          status: "failed",
          failureClass,
          reason,
          artifacts: ctx.listArtifacts(),
        }),
      );
    }
  }

  return results;
}

function printSummary(log, results) {
  log("Sandbox-first acceptance summary:");
  for (const result of results) {
    const label =
      result.status === "passed" ? "PASS" : result.status === "skipped" ? "SKIP" : "FAIL";
    const failure = result.failureClass ? ` [${result.failureClass}]` : "";
    const reason = result.reason ? ` - ${result.reason}` : "";
    log(`  ${label} ${result.manualChecklistId} ${result.scenarioId}${failure}${reason}`);
  }
}

export async function runSandboxFirstAcceptance(params = {}) {
  const runtime = createRuntimeContext(params);
  const env = runtime.env;
  if ((env.VERIFY_ENV || "").trim() !== "staging") {
    runtime.log(
      `VERIFY_ENV=${env.VERIFY_ENV || "<unset>"}; skipping sandbox-first acceptance automation.`,
    );
    return {
      results: [],
      summaryPath: null,
      hasRequiredFailure: false,
    };
  }

  if (!env.GCE_INSTANCE_NAME || !env.GCP_PROJECT_ID || !env.GCP_ZONE) {
    throw new Error(
      "GCE_INSTANCE_NAME, GCP_PROJECT_ID, and GCP_ZONE are required for sandbox-first acceptance automation.",
    );
  }

  await fs.mkdir(runtime.acceptanceRoot, { recursive: true });
  const scenarioHandlers = new Map([
    ["sbx-401-02-runtime-profile-sanity", runRuntimeProfileSanityScenario],
    ["sbx-401-03-readonly-diagnostics", runReadonlyDiagnosticsScenario],
    ["sbx-401-04-readiness-snapshot", runReadinessSnapshotScenario],
    ["sbx-401-05-integration-path", runIntegrationPathScenario],
    ["sbx-401-08-isolated-cron", runIsolatedCronScenario],
    ["sbx-404-01-direct-session-runtime", runDirectSessionRuntimeScenario],
    ["sbx-404-02-group-session-runtime", runGroupSessionRuntimeScenario],
    ["sbx-404-03-subagent-sandbox-inheritance", runSubagentSandboxInheritanceScenario],
    ["sbx-404-04-cron-isolation-and-subagent-model", runCronIsolationAndSubagentModelScenario],
    ["sbx-404-05-host-only-blocks", runHostOnlyBlocksScenario],
  ]);

  const results = await runScenarioSet({
    runtime,
    scenarios: SANDBOX_FIRST_ACCEPTANCE_SCENARIOS,
    log: runtime.log,
    runScenario: async (ctx) => {
      const handler = scenarioHandlers.get(ctx.scenarioId);
      if (!handler) {
        throw new ScenarioError(
          "runtime-profile-mismatch",
          `No scenario handler registered for ${ctx.scenarioId}`,
        );
      }
      return await handler(ctx);
    },
  });

  const summaryPath = path.join(runtime.acceptanceRoot, "sandbox-first-acceptance-summary.json");
  await fs.writeFile(summaryPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  printSummary(runtime.log, results);

  const hasRequiredFailure = results.some(
    (result) => result.required && result.status === "failed",
  );
  return {
    results,
    summaryPath,
    hasRequiredFailure,
  };
}

async function main() {
  try {
    const result = await runSandboxFirstAcceptance();
    if (result.hasRequiredFailure) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
  }
}

if (isMainModule()) {
  await main();
}
