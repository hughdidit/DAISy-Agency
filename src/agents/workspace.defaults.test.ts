import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("DEFAULT_AGENT_WORKSPACE_DIR", () => {
  it("uses OPENCLAW_HOME at module import time", async () => {
    const home = path.join(path.sep, "srv", "openclaw-home");
    vi.stubEnv("OPENCLAW_HOME", home);
    vi.stubEnv("HOME", path.join(path.sep, "home", "other"));
    vi.resetModules();

    const mod = await import("./workspace.js");
<<<<<<< HEAD
    expect(mod.DEFAULT_AGENT_WORKSPACE_DIR).toBe("/srv/openclaw-home/.openclaw/workspace");
=======
    expect(mod.DEFAULT_AGENT_WORKSPACE_DIR).toBe(
      path.join(path.resolve(home), ".openclaw", "workspace"),
    );
>>>>>>> 53a1ac36f (test: normalize paths in OPENCLAW_HOME tests for cross-platform support (#12212))
  });
});
