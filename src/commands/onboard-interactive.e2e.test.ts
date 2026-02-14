import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeEnv } from "../runtime.js";

const mocks = vi.hoisted(() => ({
  createClackPrompter: vi.fn(),
  runOnboardingWizard: vi.fn(),
  restoreTerminalState: vi.fn(),
}));

vi.mock("../wizard/clack-prompter.js", () => ({
  createClackPrompter: mocks.createClackPrompter,
}));

vi.mock("../wizard/onboarding.js", () => ({
  runOnboardingWizard: mocks.runOnboardingWizard,
}));

vi.mock("../terminal/restore.js", () => ({
  restoreTerminalState: mocks.restoreTerminalState,
}));

import { WizardCancelledError } from "../wizard/prompts.js";
import { runInteractiveOnboarding } from "./onboard-interactive.js";

const runtime: RuntimeEnv = {
  log: vi.fn(),
  error: vi.fn(),
  exit: vi.fn(),
};

describe("runInteractiveOnboarding", () => {
  beforeEach(() => {
    mocks.createClackPrompter.mockReset();
    mocks.runOnboardingWizard.mockReset();
    mocks.restoreTerminalState.mockReset();
    runtime.log.mockClear();
    runtime.error.mockClear();
    runtime.exit.mockClear();

    mocks.createClackPrompter.mockReturnValue({});
  });

  it("exits with code 1 when the wizard is cancelled", async () => {
    mocks.runOnboardingWizard.mockRejectedValue(new WizardCancelledError());

    await runInteractiveOnboarding({} as never, runtime);

    expect(runtime.exit).toHaveBeenCalledWith(1);
<<<<<<< HEAD
    expect(mocks.restoreTerminalState).toHaveBeenCalledWith("onboarding finish");
=======
    expect(mocks.restoreTerminalState).toHaveBeenCalledWith("onboarding finish", {
      resumeStdinIfPaused: false,
    });
>>>>>>> 994bcbf67 (refactor: clarify restoreTerminalState stdin resume option)
  });

  it("rethrows non-cancel errors", async () => {
    const err = new Error("boom");
    mocks.runOnboardingWizard.mockRejectedValue(err);

    await expect(runInteractiveOnboarding({} as never, runtime)).rejects.toThrow("boom");

    expect(runtime.exit).not.toHaveBeenCalled();
<<<<<<< HEAD
    expect(mocks.restoreTerminalState).toHaveBeenCalledWith("onboarding finish");
=======
    expect(mocks.restoreTerminalState).toHaveBeenCalledWith("onboarding finish", {
      resumeStdinIfPaused: false,
    });
>>>>>>> 994bcbf67 (refactor: clarify restoreTerminalState stdin resume option)
  });
});
