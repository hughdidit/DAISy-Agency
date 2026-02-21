import { beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD

const messageCommand = vi.fn();
const statusCommand = vi.fn();
const configureCommand = vi.fn();
const configureCommandWithSections = vi.fn();
const setupCommand = vi.fn();
const onboardCommand = vi.fn();
const callGateway = vi.fn();
const runChannelLogin = vi.fn();
const runChannelLogout = vi.fn();
const runTui = vi.fn();

const runtime = {
  log: vi.fn(),
  error: vi.fn(),
  exit: vi.fn(() => {
    throw new Error("exit");
  }),
};

vi.mock("./plugin-registry.js", () => ({
  ensurePluginRegistryLoaded: () => undefined,
}));

vi.mock("../commands/message.js", () => ({ messageCommand }));
vi.mock("../commands/status.js", () => ({ statusCommand }));
vi.mock("../commands/configure.js", () => ({
  CONFIGURE_WIZARD_SECTIONS: [
    "workspace",
    "model",
    "web",
    "gateway",
    "daemon",
    "channels",
    "skills",
    "health",
  ],
  configureCommand,
  configureCommandWithSections,
}));
vi.mock("../commands/setup.js", () => ({ setupCommand }));
vi.mock("../commands/onboard.js", () => ({ onboardCommand }));
<<<<<<< HEAD
=======
vi.mock("../commands/doctor-config-flow.js", () => ({
  loadAndMaybeMigrateDoctorConfig,
}));
>>>>>>> 661279cbf (feat: adding support for Together ai provider (#10304))
vi.mock("../runtime.js", () => ({ defaultRuntime: runtime }));
vi.mock("./channel-auth.js", () => ({ runChannelLogin, runChannelLogout }));
vi.mock("../tui/tui.js", () => ({ runTui }));
vi.mock("../gateway/call.js", () => ({
  callGateway,
  randomIdempotencyKey: () => "idem-test",
  buildGatewayConnectionDetails: () => ({
    url: "ws://127.0.0.1:1234",
    urlSource: "test",
    message: "Gateway target: ws://127.0.0.1:1234",
  }),
}));
vi.mock("./deps.js", () => ({ createDefaultDeps: () => ({}) }));
vi.mock("./preaction.js", () => ({ registerPreActionHooks: () => {} }));
=======
import {
  configureCommand,
  ensureConfigReady,
  installBaseProgramMocks,
  installSmokeProgramMocks,
  messageCommand,
  onboardCommand,
  runChannelLogin,
  runChannelLogout,
  runTui,
  runtime,
  setupCommand,
  statusCommand,
} from "./program.test-mocks.js";

installBaseProgramMocks();
installSmokeProgramMocks();
>>>>>>> af784b9a8 (refactor(test): share cli program e2e mocks)

const { buildProgram } = await import("./program.js");

describe("cli program (smoke)", () => {
  function createProgram() {
    return buildProgram();
  }

  async function runProgram(argv: string[]) {
    const program = createProgram();
    await program.parseAsync(argv, { from: "user" });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    runTui.mockResolvedValue(undefined);
  });

  it.each([
    {
      label: "runs message with required options",
      argv: ["message", "send", "--target", "+1", "--message", "hi"],
    },
    {
      label: "runs message react with signal author fields",
      argv: [
        "message",
        "react",
        "--channel",
        "signal",
        "--target",
        "signal:group:abc123",
        "--message-id",
        "1737630212345",
        "--emoji",
        "✅",
        "--target-author-uuid",
        "123e4567-e89b-12d3-a456-426614174000",
      ],
    },
  ])("message command: $label", async ({ argv }) => {
    await expect(runProgram(argv)).rejects.toThrow("exit");
    expect(messageCommand).toHaveBeenCalled();
  });

  it("runs status command", async () => {
    await runProgram(["status"]);
    expect(statusCommand).toHaveBeenCalled();
  });

  it("registers memory command", () => {
    const program = createProgram();
    const names = program.commands.map((command) => command.name());
    expect(names).toContain("memory");
  });

  it.each([
    {
      label: "runs tui without overriding timeout",
      argv: ["tui"],
      expectedTimeoutMs: undefined,
      expectedWarning: undefined,
    },
    {
      label: "runs tui with explicit timeout override",
      argv: ["tui", "--timeout-ms", "45000"],
      expectedTimeoutMs: 45000,
      expectedWarning: undefined,
    },
    {
      label: "warns and ignores invalid tui timeout override",
      argv: ["tui", "--timeout-ms", "nope"],
      expectedTimeoutMs: undefined,
      expectedWarning: 'warning: invalid --timeout-ms "nope"; ignoring',
    },
  ])("tui command: $label", async ({ argv, expectedTimeoutMs, expectedWarning }) => {
    await runProgram(argv);
    if (expectedWarning) {
      expect(runtime.error).toHaveBeenCalledWith(expectedWarning);
    }
    expect(runTui).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: expectedTimeoutMs }));
  });

  it("runs config alias as configure", async () => {
    await runProgram(["config"]);
    expect(configureCommand).toHaveBeenCalled();
  });

  it.each([
    {
      label: "runs setup without wizard flags",
      argv: ["setup"],
      expectSetupCalled: true,
      expectOnboardCalled: false,
    },
    {
      label: "runs setup wizard when wizard flags are present",
      argv: ["setup", "--remote-url", "ws://example"],
      expectSetupCalled: false,
      expectOnboardCalled: true,
    },
  ])("setup command: $label", async ({ argv, expectSetupCalled, expectOnboardCalled }) => {
    await runProgram(argv);
    expect(setupCommand).toHaveBeenCalledTimes(expectSetupCalled ? 1 : 0);
    expect(onboardCommand).toHaveBeenCalledTimes(expectOnboardCalled ? 1 : 0);
  });

  it("passes auth api keys to onboard", async () => {
    const cases = [
      {
        authChoice: "opencode-zen",
        flag: "--opencode-zen-api-key",
        key: "sk-opencode-zen-test",
        field: "opencodeZenApiKey",
      },
      {
        authChoice: "openrouter-api-key",
        flag: "--openrouter-api-key",
        key: "sk-openrouter-test",
        field: "openrouterApiKey",
      },
      {
        authChoice: "moonshot-api-key",
        flag: "--moonshot-api-key",
        key: "sk-moonshot-test",
        field: "moonshotApiKey",
      },
      {
        authChoice: "together-api-key",
        flag: "--together-api-key",
        key: "sk-together-test",
        field: "togetherApiKey",
      },
      {
        authChoice: "moonshot-api-key-cn",
        flag: "--moonshot-api-key",
        key: "sk-moonshot-cn-test",
        field: "moonshotApiKey",
      },
      {
        authChoice: "kimi-code-api-key",
        flag: "--kimi-code-api-key",
        key: "sk-kimi-code-test",
        field: "kimiCodeApiKey",
      },
      {
        authChoice: "synthetic-api-key",
        flag: "--synthetic-api-key",
        key: "sk-synthetic-test",
        field: "syntheticApiKey",
      },
      {
        authChoice: "zai-api-key",
        flag: "--zai-api-key",
        key: "sk-zai-test",
        field: "zaiApiKey",
      },
    ] as const;

    for (const entry of cases) {
      await runProgram([
        "onboard",
        "--non-interactive",
        "--auth-choice",
        entry.authChoice,
        entry.flag,
        entry.key,
      ]);
      expect(onboardCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          nonInteractive: true,
          authChoice: entry.authChoice,
          [entry.field]: entry.key,
        }),
        runtime,
      );
      onboardCommand.mockClear();
    }
  });

  it("passes custom provider flags to onboard", async () => {
    await runProgram([
      "onboard",
      "--non-interactive",
      "--auth-choice",
      "custom-api-key",
      "--custom-base-url",
      "https://llm.example.com/v1",
      "--custom-api-key",
      "sk-custom-test",
      "--custom-model-id",
      "foo-large",
      "--custom-provider-id",
      "my-custom",
      "--custom-compatibility",
      "anthropic",
    ]);

    expect(onboardCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        nonInteractive: true,
        authChoice: "custom-api-key",
        customBaseUrl: "https://llm.example.com/v1",
        customApiKey: "sk-custom-test",
        customModelId: "foo-large",
        customProviderId: "my-custom",
        customCompatibility: "anthropic",
      }),
      runtime,
    );
  });

  it.each([
    {
      label: "runs channels login",
      argv: ["channels", "login", "--account", "work"],
      expectCall: () =>
        expect(runChannelLogin).toHaveBeenCalledWith(
          { channel: undefined, account: "work", verbose: false },
          runtime,
        ),
    },
    {
      label: "runs channels logout",
      argv: ["channels", "logout", "--account", "work"],
      expectCall: () =>
        expect(runChannelLogout).toHaveBeenCalledWith(
          { channel: undefined, account: "work" },
          runtime,
        ),
    },
  ])("channels command: $label", async ({ argv, expectCall }) => {
    await runProgram(argv);
    expectCall();
  });
});
