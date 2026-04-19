import { describe, expect, it } from "vitest";
import {
  runOpenClawDoctorReadonlyLauncher,
  validateOpenClawDoctorReadonlyLauncher,
} from "../skills/openclaw-doctor/scripts/openclaw-doctor-readonly.mjs";

describe("openclaw-doctor readonly launcher", () => {
  it("rejects unsupported commands", () => {
    expect(() =>
      validateOpenClawDoctorReadonlyLauncher({
        args: ["doctor", "--repair"],
      }),
    ).toThrow("Unsupported openclaw-doctor readonly launcher command");
  });

  it("runs triage through the fixed readonly command sequence", () => {
    const calls: string[][] = [];
    const status = runOpenClawDoctorReadonlyLauncher(
      {
        args: ["triage"],
        env: {
          OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
          OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
          OPENCLAW_READONLY_WORKSPACE_DIR: "/workspace",
        },
      },
      {
        binaryPath: "/usr/local/bin/openclaw-readonly",
        pathExists: () => true,
        spawnSyncImpl: (_bin, args) => {
          calls.push(args);
          return { status: 0, stdout: `ok ${args.join(" ")}`, stderr: "" };
        },
      },
    );

    expect(status).toBe(0);
    expect(calls).toEqual([
      ["status"],
      ["sandbox", "explain"],
      ["skills", "list"],
      ["skills", "check"],
    ]);
  });

  it("fails closed when readonly mounts are missing", () => {
    expect(() =>
      runOpenClawDoctorReadonlyLauncher(
        {
          args: ["status"],
          env: {
            OPENCLAW_READONLY_CONFIG_PATH: "/missing/openclaw.json",
            OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
          },
        },
        {
          binaryPath: "/usr/local/bin/openclaw-readonly",
          pathExists: (targetPath) => targetPath !== "/missing/openclaw.json",
          spawnSyncImpl: () => ({ status: 0, stdout: "", stderr: "" }),
        },
      ),
    ).toThrow("Missing readonly config mount");
  });
});
