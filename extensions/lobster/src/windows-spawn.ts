import {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "openclaw/plugin-sdk";

type SpawnTarget = {
  command: string;
  argv: string[];
  windowsHide?: boolean;
};

export function resolveWindowsLobsterSpawn(
  execPath: string,
  argv: string[],
  env: NodeJS.ProcessEnv,
): SpawnTarget {
  const candidate = resolveWindowsSpawnProgramCandidate({
    command: execPath,
    env,
    packageName: "lobster",
  });
  const program = applyWindowsSpawnProgramPolicy({
    candidate,
    allowShellFallback: false,
  });
  const resolved = materializeWindowsSpawnProgram(program, argv);
  if (resolved.shell) {
    throw new Error("lobster wrapper resolved to shell fallback unexpectedly");
  }
<<<<<<< HEAD

  const scriptPath =
    resolveLobsterScriptFromCmdShim(resolvedExecPath) ??
    resolveLobsterScriptFromPackageJson(resolvedExecPath);
  if (!scriptPath) {
    throw new Error(
      `lobsterPath resolved to ${path.basename(resolvedExecPath)} wrapper, but no Node entrypoint could be resolved without shell execution. Configure pluginConfig.lobsterPath to lobster.exe.`,
    );
  }

  const entryExt = path.extname(scriptPath).toLowerCase();
  if (entryExt === ".exe") {
    return { command: scriptPath, argv, windowsHide: true };
  }
  return { command: process.execPath, argv: [scriptPath, ...argv], windowsHide: true };
=======
  return {
    command: resolved.command,
    argv: resolved.argv,
    windowsHide: resolved.windowsHide,
  };
>>>>>>> 12c125702 (fix(acpx): share windows wrapper resolver and add strict hardening mode)
}
