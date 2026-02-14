import { clearActiveProgressLine } from "./progress-line.js";

const RESET_SEQUENCE = "\x1b[0m\x1b[?25h\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?2004l";

<<<<<<< HEAD
=======
type RestoreTerminalStateOptions = {
  /**
   * Resumes paused stdin after restoring terminal mode.
   * Keep this off when the process should exit immediately after cleanup.
   *
   * Default: false (safer for "cleanup then exit" call sites).
   */
  resumeStdin?: boolean;

  /**
   * Alias for resumeStdin. Prefer this name to make the behavior explicit.
   *
   * Default: false.
   */
  resumeStdinIfPaused?: boolean;
};

>>>>>>> 994bcbf67 (refactor: clarify restoreTerminalState stdin resume option)
function reportRestoreFailure(scope: string, err: unknown, reason?: string): void {
  const suffix = reason ? ` (${reason})` : "";
  const message = `[terminal] restore ${scope} failed${suffix}: ${String(err)}`;
  try {
    process.stderr.write(`${message}\n`);
  } catch (writeErr) {
    try {
      console.error(`[terminal] restore reporting failed${suffix}: ${String(writeErr)}`);
    } catch (consoleErr) {
      throw consoleErr;
    }
  }
}

<<<<<<< HEAD
export function restoreTerminalState(reason?: string): void {
=======
export function restoreTerminalState(
  reason?: string,
  options: RestoreTerminalStateOptions = {},
): void {
  // Docker TTY note: resuming stdin can keep a container process alive even
  // after the wizard is "done" (stdin_open: true), making installers appear hung.
  const resumeStdin = options.resumeStdinIfPaused ?? options.resumeStdin ?? false;
>>>>>>> 994bcbf67 (refactor: clarify restoreTerminalState stdin resume option)
  try {
    clearActiveProgressLine();
  } catch (err) {
    reportRestoreFailure("progress line", err, reason);
  }

  const stdin = process.stdin;
  if (stdin.isTTY && typeof stdin.setRawMode === "function") {
    try {
      stdin.setRawMode(false);
    } catch (err) {
      reportRestoreFailure("raw mode", err, reason);
    }
  }

  if (process.stdout.isTTY) {
    try {
      process.stdout.write(RESET_SEQUENCE);
    } catch (err) {
      reportRestoreFailure("stdout reset", err, reason);
    }
  }
}
