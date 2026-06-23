export type SandboxFirstAcceptanceStatus = "passed" | "failed" | "skipped";

export interface SandboxFirstAcceptanceSummaryEntry {
  scenarioId: string;
  manualChecklistId: string;
  status: SandboxFirstAcceptanceStatus;
  required: boolean;
  failureClass: string | null;
  reason: string | null;
  artifacts: string[];
  automatedScope: string;
  operationalContext?: string;
  expectedOutcome?: string;
  manualRemainder?: string;
}

export interface SandboxFirstAcceptanceScenarioSummaryParams {
  scenarioId: string;
  manualChecklistId: string;
  status: SandboxFirstAcceptanceStatus;
  required: boolean;
  failureClass?: string | null;
  reason?: string | null;
  artifacts?: string[];
  automatedScope: string;
  operationalContext?: string;
  expectedOutcome?: string;
  manualRemainder?: string;
}

export interface SandboxFirstAcceptanceScenario {
  scenarioId: string;
  manualChecklistId: string;
  required: boolean;
  automatedScope: string;
  primaryFailureClass: string;
  operationalContext?: string;
  expectedOutcome?: string;
  manualRemainder?: string;
}

export interface SandboxFirstAcceptanceReadonlyDiagnosticsInput {
  statusText: string;
  sandboxExplainText: string;
  skillsCheckText: string;
}

export interface SandboxFirstAcceptancePluginDescriptor {
  id?: string | null;
  status?: string | null;
}

export interface SandboxFirstAcceptanceIntegrationPathSelection {
  kind: "gws" | "memory-mongodb" | "none";
  pluginId: string | null;
  reason?: string | null;
}

export interface SandboxFirstAcceptanceCommandContext {
  container?: string;
  runSsh?: (command: string) => string;
  runSshCapture?: (command: string) => SandboxFirstAcceptanceCommandResult;
  dockerExecBash?: (command: string) => string;
  dockerExecBashCapture?: (command: string) => SandboxFirstAcceptanceCommandResult;
  dockerExecSh?: (command: string) => string;
  dockerExecShCapture?: (command: string) => SandboxFirstAcceptanceCommandResult;
}

export interface SandboxFirstAcceptanceCommandResult {
  ok: boolean;
  command: string | null;
  args: string[];
  status: number | null;
  stdout: string;
  stderr: string;
  errorMessage: string | null;
}

export interface SandboxFirstAcceptanceRunParams {
  artifactRoot?: string;
  env?: NodeJS.ProcessEnv;
  commandContext?: SandboxFirstAcceptanceCommandContext;
  log?: (message: string) => void;
  now?: () => Date;
}

export interface SandboxFirstAcceptanceRunResult {
  summaryPath: string | null;
  hasRequiredFailure: boolean;
  results: SandboxFirstAcceptanceSummaryEntry[];
}

export const SANDBOX_FIRST_ACCEPTANCE_SCENARIOS: readonly SandboxFirstAcceptanceScenario[];

export function buildScenarioSummaryEntry(
  params: SandboxFirstAcceptanceScenarioSummaryParams,
): SandboxFirstAcceptanceSummaryEntry;

export function selectIntegrationPath(params: {
  pluginsPayload?: {
    plugins?: SandboxFirstAcceptancePluginDescriptor[];
  } | null;
  memoryPluginSlot?: string | null;
}): SandboxFirstAcceptanceIntegrationPathSelection;

export function analyzeReadonlyDiagnostics(
  params: SandboxFirstAcceptanceReadonlyDiagnosticsInput,
): string[];

export function isValidAgentCronRunSessionKey(value: unknown): boolean;

export function runScenarioSet(params: {
  runtime: {
    artifactRoot: string;
    acceptanceRoot: string;
  };
  scenarios: SandboxFirstAcceptanceScenario[];
  log: (message: string) => void;
  runScenario: (ctx: unknown) => Promise<unknown>;
}): Promise<SandboxFirstAcceptanceSummaryEntry[]>;

export function runSandboxFirstAcceptance(
  params?: SandboxFirstAcceptanceRunParams,
): Promise<SandboxFirstAcceptanceRunResult>;
