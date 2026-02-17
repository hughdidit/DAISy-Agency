import { afterEach, expect, test } from "vitest";
<<<<<<< HEAD

import { createExecTool } from "./bash-tools.exec";
import { resetProcessRegistryForTests } from "./bash-process-registry";
=======
import { resetProcessRegistryForTests } from "./bash-process-registry.js";
import { createExecTool } from "./bash-tools.exec.js";
>>>>>>> 2e375a549 (chore: Fix types in tests 32/N.)

afterEach(() => {
  resetProcessRegistryForTests();
});

test("exec supports pty output", async () => {
  const tool = createExecTool({ allowBackground: false });
  const result = await tool.execute("toolcall", {
    command: 'node -e "process.stdout.write(String.fromCharCode(111,107))"',
    pty: true,
  });

  expect(result.details.status).toBe("completed");
  const text = result.content?.[0]?.text ?? "";
  expect(text).toContain("ok");
});
