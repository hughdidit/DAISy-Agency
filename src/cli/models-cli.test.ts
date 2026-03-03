<<<<<<< HEAD
import { describe, expect, it, vi } from "vitest";
=======
import { Command } from "commander";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runRegisteredCli } from "../test-utils/command-runner.js";
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)

const githubCopilotLoginCommand = vi.fn();

vi.mock("../commands/models.js", async () => {
  const actual =
    await vi.importActual<typeof import("../commands/models.js")>("../commands/models.js");

  return {
    ...actual,
    githubCopilotLoginCommand,
  };
});

describe("models cli", () => {
<<<<<<< HEAD
  it("registers github-copilot login command", { timeout: 60_000 }, async () => {
    const { Command } = await import("commander");
    const { registerModelsCli } = await import("./models-cli.js");

  let registerModelsCli: (typeof import("./models-cli.js"))["registerModelsCli"];

  beforeAll(async () => {
    // Load once; vi.mock above ensures command handlers are already mocked.
    ({ registerModelsCli } = await import("./models-cli.js"));
  });

  beforeEach(() => {
    githubCopilotLoginCommand.mockClear();
    modelsStatusCommand.mockClear();
  });

  function createProgram() {
>>>>>>> e211b7547 (perf(test): reuse imports in models cli suite)
    const program = new Command();
    registerModelsCli(program);
    return program;
  }

  async function runModelsCommand(args: string[]) {
    await runRegisteredCli({
      register: registerModelsCli as (program: Command) => void,
      argv: args,
    });
  }

  it("registers github-copilot login command", async () => {
    const program = createProgram();
    const models = program.commands.find((cmd) => cmd.name() === "models");
    expect(models).toBeTruthy();

    const auth = models?.commands.find((cmd) => cmd.name() === "auth");
    expect(auth).toBeTruthy();

    const login = auth?.commands.find((cmd) => cmd.name() === "login-github-copilot");
    expect(login).toBeTruthy();

    await program.parseAsync(["models", "auth", "login-github-copilot", "--yes"], {
      from: "user",
    });

    expect(githubCopilotLoginCommand).toHaveBeenCalledTimes(1);
    expect(githubCopilotLoginCommand).toHaveBeenCalledWith(
      expect.objectContaining({ yes: true }),
      expect.any(Object),
    );
  });

  it.each([
    { label: "status flag", args: ["models", "status", "--agent", "poe"] },
    { label: "parent flag", args: ["models", "--agent", "poe", "status"] },
  ])("passes --agent to models status ($label)", async ({ args }) => {
    await runModelsCommand(args);
    expect(modelsStatusCommand).toHaveBeenCalledWith(
      expect.objectContaining({ agent: "poe" }),
      expect.any(Object),
    );
  });

  it("shows help for models auth without error exit", async () => {
    const program = new Command();
    program.exitOverride();
    program.configureOutput({
      writeOut: () => {},
      writeErr: () => {},
    });
    registerModelsCli(program);

    try {
      await program.parseAsync(["models", "auth"], { from: "user" });
      expect.fail("expected help to exit");
    } catch (err) {
      const error = err as { exitCode?: number };
      expect(error.exitCode).toBe(0);
    }
  });
});
