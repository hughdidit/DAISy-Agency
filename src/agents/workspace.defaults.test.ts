import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveDefaultAgentWorkspaceDir } from "./workspace.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DEFAULT_AGENT_WORKSPACE_DIR", () => {
  it("uses OPENCLAW_HOME when resolving the default workspace dir", () => {
    const home = path.join(path.sep, "srv", "openclaw-home");
    vi.stubEnv("OPENCLAW_HOME", home);
    vi.stubEnv("HOME", path.join(path.sep, "home", "other"));

    const mod = await import("./workspace.js");
<<<<<<< HEAD
    expect(mod.DEFAULT_AGENT_WORKSPACE_DIR).toBe("/srv/openclaw-home/.openclaw/workspace");
      path.join(path.resolve(home), ".openclaw", "workspace"),
    );
>>>>>>> 53a1ac36f (test: normalize paths in OPENCLAW_HOME tests for cross-platform support (#12212))
  });
});
