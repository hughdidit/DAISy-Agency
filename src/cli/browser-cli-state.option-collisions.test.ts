import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserParentOpts } from "./browser-cli-shared.js";
import { registerBrowserStateCommands } from "./browser-cli-state.js";

const mocks = vi.hoisted(() => ({
  callBrowserRequest: vi.fn(
    async (
      _opts: BrowserParentOpts,
      _params: {
        method: "GET" | "POST" | "DELETE";
        path: string;
        query?: Record<string, string | number | boolean | undefined>;
        body?: unknown;
      },
      _extra?: { timeoutMs?: number; progress?: boolean },
    ) => ({ ok: true }),
  ),
  runBrowserResizeWithOutput: vi.fn(async (_params: unknown) => {}),
  runtime: {
    log: vi.fn(),
    error: vi.fn(),
    exit: vi.fn(),
  },
}));

vi.mock("./browser-cli-shared.js", () => ({
  callBrowserRequest: (
    opts: BrowserParentOpts,
    params: {
      method: "GET" | "POST" | "DELETE";
      path: string;
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
    },
    extra?: { timeoutMs?: number; progress?: boolean },
  ) => mocks.callBrowserRequest(opts, params, extra),
}));

vi.mock("./browser-cli-resize.js", () => ({
  runBrowserResizeWithOutput: (params: unknown) => mocks.runBrowserResizeWithOutput(params),
}));

vi.mock("../runtime.js", () => ({
  defaultRuntime: mocks.runtime,
}));

describe("browser state option collisions", () => {
  const createBrowserProgram = () => {
    const program = new Command();
    const browser = program
      .command("browser")
      .option("--browser-profile <name>", "Browser profile")
      .option("--json", "Output JSON", false);
    const parentOpts = (cmd: Command) => cmd.parent?.opts?.() as BrowserParentOpts;
    registerBrowserStateCommands(browser, parentOpts);
    return program;
  };

  const getLastRequest = () => {
    const call = mocks.callBrowserRequest.mock.calls.at(-1);
    expect(call).toBeDefined();
    if (!call) {
      throw new Error("expected browser request call");
    }
    return call[1] as { body?: Record<string, unknown> };
  };

  const runBrowserCommand = async (argv: string[]) => {
    const program = createBrowserProgram();
    await program.parseAsync(["browser", ...argv], { from: "user" });
    return getLastRequest();
  };

  beforeEach(() => {
    mocks.callBrowserRequest.mockClear();
    mocks.runBrowserResizeWithOutput.mockClear();
    mocks.runtime.log.mockClear();
    mocks.runtime.error.mockClear();
    mocks.runtime.exit.mockClear();
  });

  it("forwards parent-captured --target-id on `browser cookies set`", async () => {
    const request = await runBrowserCommand([
      "cookies",
      "set",
      "session",
      "abc",
      "--url",
      "https://example.com",
      "--target-id",
      "tab-1",
    ]);

<<<<<<< HEAD
    await program.parseAsync(
      [
        "browser",
        "cookies",
        "set",
        "session",
        "abc",
        "--url",
        "https://example.com",
        "--target-id",
        "tab-1",
      ],
      { from: "user" },
    );

<<<<<<< HEAD
    const call = mocks.callBrowserRequest.mock.calls.at(-1);
    expect(call).toBeDefined();
    if (!call) {
      throw new Error("Expected callBrowserRequest to be called");
    }
    const request = call[1] as { body?: { targetId?: string } };
=======
    const request = getLastRequest() as { body?: { targetId?: string } };
>>>>>>> 148116048 (test(cli): dedupe browser state command setup)
    expect(request.body?.targetId).toBe("tab-1");
  });

  it("accepts legacy parent `--json` by parsing payload via positional headers fallback", async () => {
    const program = createBrowserProgram();

    await program.parseAsync(["browser", "set", "headers", "--json", '{"x-auth":"ok"}'], {
      from: "user",
    });

<<<<<<< HEAD
    const call = mocks.callBrowserRequest.mock.calls.at(-1);
    expect(call).toBeDefined();
    if (!call) {
      throw new Error("Expected callBrowserRequest to be called");
    }
    const request = call[1] as { body?: { headers?: Record<string, string> } };
=======
    const request = getLastRequest() as { body?: { headers?: Record<string, string> } };
>>>>>>> 148116048 (test(cli): dedupe browser state command setup)
=======
    expect((request as { body?: { targetId?: string } }).body?.targetId).toBe("tab-1");
  });

  it("accepts legacy parent `--json` by parsing payload via positional headers fallback", async () => {
    const request = (await runBrowserCommand(["set", "headers", "--json", '{"x-auth":"ok"}'])) as {
      body?: { headers?: Record<string, string> };
    };
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
    expect(request.body?.headers).toEqual({ "x-auth": "ok" });
  });
});
