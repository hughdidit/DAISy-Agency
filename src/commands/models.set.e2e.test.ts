import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const readConfigFileSnapshot = vi.fn();
const writeConfigFile = vi.fn().mockResolvedValue(undefined);
const loadConfig = vi.fn().mockReturnValue({});

vi.mock("../config/config.js", () => ({
  CONFIG_PATH: "/tmp/moltbot.json",
  readConfigFileSnapshot,
  writeConfigFile,
  loadConfig,
}));

function mockConfigSnapshot(config: Record<string, unknown> = {}) {
  readConfigFileSnapshot.mockResolvedValue({
    path: "/tmp/openclaw.json",
    exists: true,
    raw: "{}",
    parsed: {},
    valid: true,
    config,
    issues: [],
    legacyIssues: [],
  });
}

function makeRuntime() {
  return { log: vi.fn(), error: vi.fn(), exit: vi.fn() };
}

function getWrittenConfig() {
  return writeConfigFile.mock.calls[0]?.[0] as Record<string, unknown>;
}

function expectWrittenPrimaryModel(model: string) {
  expect(writeConfigFile).toHaveBeenCalledTimes(1);
  const written = getWrittenConfig();
  expect(written.agents).toEqual({
    defaults: {
      model: { primary: model },
      models: { [model]: {} },
    },
  });
}

let modelsSetCommand: typeof import("./models/set.js").modelsSetCommand;
let modelsFallbacksAddCommand: typeof import("./models/fallbacks.js").modelsFallbacksAddCommand;

describe("models set + fallbacks", () => {
  beforeAll(async () => {
    ({ modelsSetCommand } = await import("./models/set.js"));
    ({ modelsFallbacksAddCommand } = await import("./models/fallbacks.js"));
  });

  beforeEach(() => {
    readConfigFileSnapshot.mockReset();
    writeConfigFile.mockClear();
  });

  it("normalizes z.ai provider in models set", async () => {
<<<<<<< HEAD
    readConfigFileSnapshot.mockResolvedValue({
      path: "/tmp/moltbot.json",
      exists: true,
      raw: "{}",
      parsed: {},
      valid: true,
      config: {},
      issues: [],
      legacyIssues: [],
    });

    const runtime = { log: vi.fn(), error: vi.fn(), exit: vi.fn() };
=======
    mockConfigSnapshot({});
    const runtime = makeRuntime();
<<<<<<< HEAD
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    const { modelsSetCommand } = await import("./models/set.js");
=======
>>>>>>> 861718e4d (test: group remaining suite cleanups)

    await modelsSetCommand("z.ai/glm-4.7", runtime);

    expectWrittenPrimaryModel("zai/glm-4.7");
  });

  it("normalizes z-ai provider in models fallbacks add", async () => {
<<<<<<< HEAD
    readConfigFileSnapshot.mockResolvedValue({
      path: "/tmp/moltbot.json",
      exists: true,
      raw: "{}",
      parsed: {},
      valid: true,
      config: { agents: { defaults: { model: { fallbacks: [] } } } },
      issues: [],
      legacyIssues: [],
    });

    const runtime = { log: vi.fn(), error: vi.fn(), exit: vi.fn() };
=======
    mockConfigSnapshot({ agents: { defaults: { model: { fallbacks: [] } } } });
    const runtime = makeRuntime();
<<<<<<< HEAD
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    const { modelsFallbacksAddCommand } = await import("./models/fallbacks.js");
=======
>>>>>>> 861718e4d (test: group remaining suite cleanups)

    await modelsFallbacksAddCommand("z-ai/glm-4.7", runtime);

    expect(writeConfigFile).toHaveBeenCalledTimes(1);
    const written = getWrittenConfig();
    expect(written.agents).toEqual({
      defaults: {
        model: { fallbacks: ["zai/glm-4.7"] },
        models: { "zai/glm-4.7": {} },
      },
    });
  });

  it("normalizes provider casing in models set", async () => {
<<<<<<< HEAD
    readConfigFileSnapshot.mockResolvedValue({
      path: "/tmp/moltbot.json",
      exists: true,
      raw: "{}",
      parsed: {},
      valid: true,
      config: {},
      issues: [],
      legacyIssues: [],
    });

    const runtime = { log: vi.fn(), error: vi.fn(), exit: vi.fn() };
=======
    mockConfigSnapshot({});
    const runtime = makeRuntime();
<<<<<<< HEAD
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    const { modelsSetCommand } = await import("./models/set.js");
=======
>>>>>>> 861718e4d (test: group remaining suite cleanups)

    await modelsSetCommand("Z.AI/glm-4.7", runtime);

    expectWrittenPrimaryModel("zai/glm-4.7");
  });
});
