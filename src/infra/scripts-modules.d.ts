declare module "../../scripts/watch-node.mjs" {
  export function runWatchMain(params?: {
    spawn?: (
      cmd: string,
      args: string[],
      options: unknown,
    ) => { on: (event: "exit", cb: (code: number | null, signal: string | null) => void) => void };
    process?: NodeJS.Process;
    cwd?: string;
    args?: string[];
    env?: NodeJS.ProcessEnv;
    now?: () => number;
  }): Promise<number>;
}

declare module "../../scripts/ci-changed-scope.mjs" {
  export function detectChangedScope(paths: string[]): {
    runNode: boolean;
    runIos: boolean;
    runAndroid: boolean;
  };
}

declare module "../skills/openclaw-doctor/scripts/openclaw-doctor-readonly.mjs" {
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
}
