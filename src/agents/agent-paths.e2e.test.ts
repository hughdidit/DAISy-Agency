import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD

import { afterEach, describe, expect, it } from "vitest";

import { resolveMoltbotAgentDir } from "./agent-paths.js";

describe("resolveMoltbotAgentDir", () => {
  const previousStateDir = process.env.CLAWDBOT_STATE_DIR;
  const previousAgentDir = process.env.CLAWDBOT_AGENT_DIR;
  const previousPiAgentDir = process.env.PI_CODING_AGENT_DIR;
=======
import { afterEach, describe, expect, it } from "vitest";
=======
import { describe, expect, it } from "vitest";
>>>>>>> a418c6db0 (test(agents): dedupe agent-path fixtures and cover env override precedence)
import { withEnv } from "../test-utils/env.js";
import { resolveOpenClawAgentDir } from "./agent-paths.js";

describe("resolveOpenClawAgentDir", () => {
<<<<<<< HEAD
<<<<<<< HEAD
  const env = captureEnv(["OPENCLAW_STATE_DIR", "OPENCLAW_AGENT_DIR", "PI_CODING_AGENT_DIR"]);
>>>>>>> aabe4d9b4 (refactor(test): reuse env snapshot helper)
=======
>>>>>>> c41d1070b (refactor(test): use env helper in agent paths e2e)
  let tempStateDir: string | null = null;

  afterEach(async () => {
    if (tempStateDir) {
      await fs.rm(tempStateDir, { recursive: true, force: true });
      tempStateDir = null;
    }
<<<<<<< HEAD
<<<<<<< HEAD
    if (previousStateDir === undefined) {
      delete process.env.CLAWDBOT_STATE_DIR;
    } else {
      process.env.CLAWDBOT_STATE_DIR = previousStateDir;
    }
    if (previousAgentDir === undefined) {
      delete process.env.CLAWDBOT_AGENT_DIR;
    } else {
      process.env.CLAWDBOT_AGENT_DIR = previousAgentDir;
    }
    if (previousPiAgentDir === undefined) {
      delete process.env.PI_CODING_AGENT_DIR;
    } else {
      process.env.PI_CODING_AGENT_DIR = previousPiAgentDir;
    }
=======
    env.restore();
>>>>>>> aabe4d9b4 (refactor(test): reuse env snapshot helper)
  });

  it("defaults to the multi-agent path when no overrides are set", async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-agent-"));
    process.env.CLAWDBOT_STATE_DIR = tempStateDir;
    delete process.env.CLAWDBOT_AGENT_DIR;
    delete process.env.PI_CODING_AGENT_DIR;

    const resolved = resolveMoltbotAgentDir();

    expect(resolved).toBe(path.join(tempStateDir, "agents", "main", "agent"));
  });

  it("honors CLAWDBOT_AGENT_DIR overrides", async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-agent-"));
    const override = path.join(tempStateDir, "agent");
    process.env.CLAWDBOT_AGENT_DIR = override;
    delete process.env.PI_CODING_AGENT_DIR;

    const resolved = resolveMoltbotAgentDir();

    expect(resolved).toBe(path.resolve(override));
=======
  });
=======
  const withTempStateDir = async (run: (stateDir: string) => void) => {
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-agent-"));
    try {
      run(stateDir);
    } finally {
      await fs.rm(stateDir, { recursive: true, force: true });
    }
  };
>>>>>>> a418c6db0 (test(agents): dedupe agent-path fixtures and cover env override precedence)

  it("defaults to the multi-agent path when no overrides are set", async () => {
    await withTempStateDir((stateDir) => {
      withEnv(
        {
          OPENCLAW_STATE_DIR: stateDir,
          OPENCLAW_AGENT_DIR: undefined,
          PI_CODING_AGENT_DIR: undefined,
        },
        () => {
          const resolved = resolveOpenClawAgentDir();
          expect(resolved).toBe(path.join(stateDir, "agents", "main", "agent"));
        },
      );
    });
  });

  it("honors OPENCLAW_AGENT_DIR overrides", async () => {
<<<<<<< HEAD
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-agent-"));
    const stateDir = tempStateDir;
    if (!stateDir) {
      throw new Error("expected temp state dir");
    }
    const override = path.join(stateDir, "agent");
    withEnv(
      {
        OPENCLAW_STATE_DIR: undefined,
        OPENCLAW_AGENT_DIR: override,
        PI_CODING_AGENT_DIR: undefined,
      },
      () => {
        const resolved = resolveOpenClawAgentDir();
        expect(resolved).toBe(path.resolve(override));
      },
    );
>>>>>>> c41d1070b (refactor(test): use env helper in agent paths e2e)
=======
    await withTempStateDir((stateDir) => {
      const override = path.join(stateDir, "agent");
      withEnv(
        {
          OPENCLAW_STATE_DIR: undefined,
          OPENCLAW_AGENT_DIR: override,
          PI_CODING_AGENT_DIR: undefined,
        },
        () => {
          const resolved = resolveOpenClawAgentDir();
          expect(resolved).toBe(path.resolve(override));
        },
      );
    });
  });

  it("honors PI_CODING_AGENT_DIR when OPENCLAW_AGENT_DIR is unset", async () => {
    await withTempStateDir((stateDir) => {
      const override = path.join(stateDir, "pi-agent");
      withEnv(
        {
          OPENCLAW_STATE_DIR: undefined,
          OPENCLAW_AGENT_DIR: undefined,
          PI_CODING_AGENT_DIR: override,
        },
        () => {
          const resolved = resolveOpenClawAgentDir();
          expect(resolved).toBe(path.resolve(override));
        },
      );
    });
  });

  it("prefers OPENCLAW_AGENT_DIR over PI_CODING_AGENT_DIR when both are set", async () => {
    await withTempStateDir((stateDir) => {
      const primaryOverride = path.join(stateDir, "primary-agent");
      const fallbackOverride = path.join(stateDir, "fallback-agent");
      withEnv(
        {
          OPENCLAW_STATE_DIR: undefined,
          OPENCLAW_AGENT_DIR: primaryOverride,
          PI_CODING_AGENT_DIR: fallbackOverride,
        },
        () => {
          const resolved = resolveOpenClawAgentDir();
          expect(resolved).toBe(path.resolve(primaryOverride));
        },
      );
    });
>>>>>>> a418c6db0 (test(agents): dedupe agent-path fixtures and cover env override precedence)
  });
});
