import { beforeEach, describe, expect, it } from "vitest";
import {
  __testing as threadBindingsTesting,
  createThreadBindingManager,
  getThreadBindingManager,
} from "./thread-bindings.js";

<<<<<<< HEAD
=======
type ThreadBindingsModule = {
  getThreadBindingManager: typeof getThreadBindingManager;
};

async function loadThreadBindingsViaAlternateLoader(): Promise<ThreadBindingsModule> {
  const fallbackPath = "./thread-bindings.ts?vitest-loader-fallback";
  return (await import(/* @vite-ignore */ fallbackPath)) as ThreadBindingsModule;
}

>>>>>>> 83597572d (test: speed up thread-bindings shared-state loader test)
describe("thread binding manager state", () => {
  beforeEach(() => {
    threadBindingsTesting.resetThreadBindingsForTests();
  });

<<<<<<< HEAD
  it("shares managers between ESM and Jiti-loaded module instances", () => {
    const jiti = createJiti(import.meta.url, {
      interopDefault: true,
    });
    const viaJiti = jiti("./thread-bindings.ts") as {
      getThreadBindingManager: typeof getThreadBindingManager;
    };
=======
  it("shares managers between ESM and alternate-loaded module instances", async () => {
    const viaJiti = await loadThreadBindingsViaAlternateLoader();
>>>>>>> 83597572d (test: speed up thread-bindings shared-state loader test)

    createThreadBindingManager({
      accountId: "work",
      persist: false,
      enableSweeper: false,
    });

    expect(getThreadBindingManager("work")).not.toBeNull();
    expect(viaJiti.getThreadBindingManager("work")).not.toBeNull();
  });
});
