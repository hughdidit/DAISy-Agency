export function validateOpenClawDoctorReadonlyLauncher(params?: {
  args?: string[];
  env?: NodeJS.ProcessEnv;
  pathExists?: (targetPath: string) => boolean;
  binaryPath?: string;
  platform?: NodeJS.Platform;
}): {
  args: string[];
  mode: "triage" | "single";
};

export function runOpenClawDoctorReadonlyLauncher(
  params?: {
    args?: string[];
    env?: NodeJS.ProcessEnv;
  },
  deps?: {
    pathExists?: (targetPath: string) => boolean;
    binaryPath?: string;
    platform?: NodeJS.Platform;
    spawnSyncImpl?: (
      bin: string,
      args: string[],
      options: { env: NodeJS.ProcessEnv; encoding: "utf8" },
    ) => {
      status?: number | null;
      stdout?: string | Buffer | null;
      stderr?: string | Buffer | null;
      error?: Error;
    };
  },
): number;
