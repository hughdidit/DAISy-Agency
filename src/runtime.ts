import { clearActiveProgressLine } from "./terminal/progress-line.js";

export type RuntimeEnv = {
  log: typeof console.log;
  error: typeof console.error;
  exit: (code: number) => never;
};

export const defaultRuntime: RuntimeEnv = {
  log: (...args: Parameters<typeof console.log>) => {
    clearActiveProgressLine();
    console.log(...args);
  },
  error: (...args: Parameters<typeof console.error>) => {
    clearActiveProgressLine();
    console.error(...args);
  },
  exit: (code) => {
<<<<<<< HEAD
=======
    restoreTerminalState("runtime exit", { resumeStdin: false });
>>>>>>> a042b32d2 (fix: Docker installation keeps hanging on MacOS (#12972))
    process.exit(code);
    throw new Error("unreachable"); // satisfies tests when mocked
  },
};
