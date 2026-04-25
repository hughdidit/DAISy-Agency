#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SANDBOX_FIRST_ACCEPTANCE_SCENARIOS = Object.freeze([
  {
    scenarioId: "sbx-401-02-runtime-profile-sanity",
    manualChecklistId: "SBX-401-02",
    required: true,
    automatedScope: "full",
  },
  {
    scenarioId: "sbx-401-03-readonly-diagnostics",
    manualChecklistId: "SBX-401-03",
    required: true,
    automatedScope: "full",
  },
  {
    scenarioId: "sbx-401-04-readiness-snapshot",
    manualChecklistId: "SBX-401-04",
    required: true,
    automatedScope: "full",
  },
  {
    scenarioId: "sbx-401-05-integration-path",
    manualChecklistId: "SBX-401-05",
    required: true,
    automatedScope: "full when GWS or memory-mongodb is configured; otherwise skipped with reason",
  },
  {
    scenarioId: "sbx-401-08-isolated-cron",
    manualChecklistId: "SBX-401-08",
    required: true,
    automatedScope: "isolated execution only; chat delivery remains manual",
  },
]);

const ANSI_ESCAPE_PATTERN = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const DEFAULT_CRON_PROMPT =
  "Report the current sandbox mode, runtime profile, and whether openclaw-readonly is supported. Do not mutate anything.";

export class ExecError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ExecError";
    this.command = details.command ?? null;
    this.args = details.args ?? [];
    this.status = details.status ?? null;
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

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function assertNonEmptyString(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ScenarioError("runtime-profile-mismatch", message);
  }
  return value.trim();
}

function spawnCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.error) {
    throw new ExecError(`Failed to execute ${command}: ${result.error.message}`, {
      command,
      args,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }

  if (result.status !== 0) {
    throw new ExecError(`${command} exited with status ${result.status}`, {
      command,
      args,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
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

  const dockerExecBash = (command) =>
    runSsh(`sudo docker exec ${shellQuote(container)} bash -lc ${shellQuote(command)}`);

  const dockerExecSh = (command) =>
    runSsh(`sudo docker exec ${shellQuote(container)} sh -lc ${shellQuote(command)}`);

  return {
    container,
    runSsh,
    dockerExecBash,
    dockerExecSh,
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
  };
}

export function selectIntegrationPath(params) {
  const pluginIds = new Set(
    (
      (params.pluginsPayload?.plugins ?? []).filter((entry) => entry?.status === "loaded") ?? []
    ).map((entry) => entry.id),
  );

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

export function analyzeReadonlyDiagnostics(params) {
  const issues = [];
  const statusText = stripAnsi(params.statusText).toLowerCase();
  const sandboxExplainText = stripAnsi(params.sandboxExplainText).toLowerCase();
  const skillsCheckText = stripAnsi(params.skillsCheckText).toLowerCase();

  if (statusText.includes("gateway unreachable")) {
    issues.push("readonly status regressed to a gateway unreachable false negative");
  }
  if (!statusText.includes("probe unsupported from readonly sandbox")) {
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

  const doctorText = ctx.dockerExecBash("cd /app && node dist/index.js doctor --non-interactive");
  await ctx.writeArtifactText("doctor.txt", doctorText);

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

  if (JSON.stringify(statusCounts) !== JSON.stringify(explainCounts)) {
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
  if (/openclaw-readonly\" is not on path|readonly runtime command/i.test(combined)) {
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
  let readonlyStatus;
  let readonlyExplain;
  let readonlySkills;
  try {
    readonlyStatus = ctx.dockerExecBash(
      "cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs status",
    );
    readonlyExplain = ctx.dockerExecBash(
      "cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs sandbox explain",
    );
    readonlySkills = ctx.dockerExecBash(
      "cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs skills check",
    );
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
  const activeRouteRaw = ctx.dockerExecBash("cd /app && node scripts/gws/inspect-active-route.mjs");
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
    if (!credentialsPath.startsWith("/home/node/.openclaw/")) {
      throw new ScenarioError(
        "secret-or-route-gap",
        `Google Workspace credentialsFile is outside the mounted config root: ${credentialsPath || "<empty>"}`,
      );
    }

    const hostPath = `/opt/DAISy/config${credentialsPath.slice("/home/node/.openclaw".length)}`;
    const hostStatus = stripAnsi(
      ctx.runSsh(
        `sudo -n sh -c 'if [ -f ${shellQuote(hostPath)} ]; then stat -c "present(size=%s)" ${shellQuote(
          hostPath,
        )}; else echo missing; fi'`,
      ),
    )
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
        gwsAuth.has_refresh_token === false &&
        gwsAuth.type === "service_account";
      if (!omittedTokenValid) {
        throw new ScenarioError(
          "secret-or-route-gap",
          "Google Workspace credentials are present but gws auth status is not healthy",
        );
      }
    }
  }

  const delegateRaw = ctx.dockerExecBash("cd /app && node scripts/gws/select-delegate-subject.mjs");
  await ctx.writeArtifactText("gws-delegate-subjects.json", delegateRaw);
  const delegatePayload = parseJsonOrThrow(
    delegateRaw,
    "delegated-capability-gap",
    "select-delegate-subject did not return a parseable JSON payload",
  );

  const delegateSubjects = Array.isArray(delegatePayload.delegateSubjects)
    ? delegatePayload.delegateSubjects
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => /^(agent|subagent):[A-Za-z0-9._-]+$/.test(value))
    : [];
  if (delegateSubjects.length === 0) {
    throw new ScenarioError(
      "delegated-capability-gap",
      "No delegated GWS binding subject candidates were available for auth-health verification",
    );
  }

  const mainRaw = ctx.dockerExecBash(
    "cd /app && node scripts/gws/run-auth-health.mjs --subject agent:main",
  );
  await ctx.writeArtifactText("gws-auth-health-agent-main.json", mainRaw);
  const mainPayload = parseJsonOrThrow(
    mainRaw,
    "secret-or-route-gap",
    "run-auth-health for agent:main did not return a parseable JSON payload",
  );
  if (!validateGwsAuthHealthPayload("agent:main", mainPayload)) {
    throw new ScenarioError(
      "secret-or-route-gap",
      "Auth-health baseline checks failed for agent:main",
    );
  }
  if (mainPayload?.data?.authHealth?.credentialSourceType !== "service_account_json") {
    throw new ScenarioError(
      "secret-or-route-gap",
      "Auth-health credential source drifted from service_account_json for agent:main",
    );
  }
  if (
    mainPayload?.data?.authHealth?.serviceAccountPolicyEnforced !== true ||
    mainPayload?.data?.authHealth?.serviceAccountPolicyCompliant !== true
  ) {
    throw new ScenarioError(
      "secret-or-route-gap",
      "Auth-health service-account policy gate failed for agent:main",
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

  const statusRaw = ctx.dockerExecBash("cd /app && node dist/index.js status --json");
  await ctx.writeArtifactText("status.json", statusRaw);
  const statusPayload = parseJsonOrThrow(
    statusRaw,
    "integration-config-gap",
    "status --json did not return a parseable JSON payload for integration-path selection",
  );

  const selection = selectIntegrationPath({
    pluginsPayload,
    memoryPluginSlot: statusPayload?.memoryPlugin?.slot ?? null,
  });

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

async function pollForCronEntry(ctx, jobId) {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const runsRaw = ctx.dockerExecBash(
      `cd /app && node dist/index.js cron runs --id ${shellQuote(jobId)} --limit 20`,
    );
    await ctx.writeArtifactText("cron-runs.json", runsRaw);
    const runsPayload = extractLastJsonValue(runsRaw);
    const entries = Array.isArray(runsPayload?.entries) ? runsPayload.entries : [];
    const last = entries.at(-1);
    if (last) {
      return { runsPayload, last };
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new ScenarioError(
    "scheduler-gap",
    "cron runs did not record any entries for the acceptance job",
  );
}

export async function runIsolatedCronScenario(ctx) {
  const runAt = new Date(ctx.now().getTime() + 20 * 60 * 1000).toISOString();
  const jobName = `SBX-402 sandbox-first acceptance ${ctx.now().toISOString()}`;
  let jobId = "";

  try {
    const addRaw = ctx.dockerExecBash(
      `cd /app && node dist/index.js cron add --name ${shellQuote(jobName)} --at ${shellQuote(
        runAt,
      )} --session isolated --message ${shellQuote(DEFAULT_CRON_PROMPT)} --no-deliver --delete-after-run`,
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
  } finally {
    if (jobId) {
      try {
        const cleanupRaw = ctx.dockerExecBash(
          `cd /app && node dist/index.js cron rm ${shellQuote(jobId)} --json`,
        );
        await ctx.writeArtifactText("cron-cleanup.json", cleanupRaw);
      } catch (error) {
        await ctx.writeArtifactText(
          "cron-cleanup-error.txt",
          `${error?.message ?? "cleanup failed"}\n${error?.stdout ?? ""}\n${error?.stderr ?? ""}`.trim(),
        );
      }
    }
  }
}

export async function runScenarioSet(params) {
  const results = [];
  await fs.mkdir(params.acceptanceRoot, { recursive: true });

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
      const failureClass = error?.failureClass ?? "runtime-profile-mismatch";
      const reason =
        typeof error?.message === "string" && error.message
          ? error.message
          : `Scenario ${meta.scenarioId} failed`;
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
    [SANDBOX_FIRST_ACCEPTANCE_SCENARIOS[0].scenarioId, runRuntimeProfileSanityScenario],
    [SANDBOX_FIRST_ACCEPTANCE_SCENARIOS[1].scenarioId, runReadonlyDiagnosticsScenario],
    [SANDBOX_FIRST_ACCEPTANCE_SCENARIOS[2].scenarioId, runReadinessSnapshotScenario],
    [SANDBOX_FIRST_ACCEPTANCE_SCENARIOS[3].scenarioId, runIntegrationPathScenario],
    [SANDBOX_FIRST_ACCEPTANCE_SCENARIOS[4].scenarioId, runIsolatedCronScenario],
  ]);

  const results = await runScenarioSet({
    runtime,
    acceptanceRoot: runtime.acceptanceRoot,
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
