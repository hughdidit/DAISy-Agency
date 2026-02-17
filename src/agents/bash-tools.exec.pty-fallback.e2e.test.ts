import { afterEach, expect, test, vi } from "vitest";
<<<<<<< HEAD

import { resetProcessRegistryForTests } from "./bash-process-registry";
import { createExecTool } from "./bash-tools.exec";
=======
import { resetProcessRegistryForTests } from "./bash-process-registry.js";
import { createExecTool } from "./bash-tools.exec.js";
>>>>>>> 2e375a549 (chore: Fix types in tests 32/N.)

vi.mock("@lydell/node-pty", () => ({
  spawn: () => {
    const err = new Error("spawn EBADF");
    (err as NodeJS.ErrnoException).code = "EBADF";
    throw err;
  },
}));

afterEach(() => {
  resetProcessRegistryForTests();
  vi.clearAllMocks();
});

test("exec falls back when PTY spawn fails", async () => {
  const tool = createExecTool({ allowBackground: false });
  const result = await tool.execute("toolcall", {
    command: "printf ok",
    pty: true,
  });

  expect(result.details.status).toBe("completed");
  const text = result.content?.[0]?.text ?? "";
  expect(text).toContain("ok");
  expect(text).toContain("PTY spawn failed");
});
