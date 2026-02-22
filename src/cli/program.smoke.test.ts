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
  runTui,
  runtime,
  setupCommand,
} from "./program.test-mocks.js";

installBaseProgramMocks();
installSmokeProgramMocks();
>>>>>>> af784b9a8 (refactor(test): share cli program e2e mocks)

vi.mock("./config-cli.js", () => ({
  registerConfigCli: (program: {
    command: (name: string) => { action: (fn: () => unknown) => void };
  }) => {
    program.command("config").action(() => configureCommand({}, runtime));
  },
  runConfigGet: vi.fn(),
  runConfigUnset: vi.fn(),
}));

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

  it("runs message command with required options", async () => {
    await expect(
      runProgram(["message", "send", "--target", "+1", "--message", "hi"]),
    ).rejects.toThrow("exit");
    expect(messageCommand).toHaveBeenCalled();
  });

  it("registers memory + status commands", () => {
    const program = createProgram();
    const names = program.commands.map((command) => command.name());
    expect(names).toContain("memory");
    expect(names).toContain("status");
  });

  it("runs tui with explicit timeout override", async () => {
    await runProgram(["tui", "--timeout-ms", "45000"]);
    expect(runTui).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 45000 }));
  });

  it("warns and ignores invalid tui timeout override", async () => {
    await runProgram(["tui", "--timeout-ms", "nope"]);
    expect(runtime.error).toHaveBeenCalledWith('warning: invalid --timeout-ms "nope"; ignoring');
    expect(runTui).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: undefined }));
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

  it("passes representative auth flags to onboard", async () => {
    await runProgram([
      "onboard",
      "--non-interactive",
      "--auth-choice",
      "openrouter-api-key",
      "--openrouter-api-key",
      "sk-openrouter-test",
    ]);

    expect(onboardCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        nonInteractive: true,
        authChoice: "openrouter-api-key",
        openrouterApiKey: "sk-openrouter-test",
      }),
      runtime,
    );
  });
});
