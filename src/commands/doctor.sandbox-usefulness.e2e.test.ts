import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  createDoctorRuntime,
  mockDoctorConfigSnapshot,
  note,
  collectCommandCapabilitySnapshot,
} from "./doctor.e2e-harness.js";
import {
  createCapabilitySnapshotFixture,
  createEmptyCapabilitySnapshotFixture,
} from "./capability-readiness.test-helpers.js";
import "./doctor.fast-path-mocks.js";

vi.doUnmock("./doctor-sandbox.js");
vi.doUnmock("./doctor-workspace-status.js");

let doctorCommand: typeof import("./doctor.js").doctorCommand;

describe("doctor command sandbox usefulness", () => {
  beforeAll(async () => {
    ({ doctorCommand } = await import("./doctor.js"));
  });

  it("prints sandbox usefulness alongside the capability readiness section", async () => {
    mockDoctorConfigSnapshot({
      config: {
        agents: {
          defaults: {
            workspace: "/tmp/workspace",
            sandbox: {
              mode: "all",
              scope: "session",
              profile: "coding-base",
              docker: {
                image: "ghcr.io/example/custom-sandbox:latest",
              },
            },
          },
        },
      },
    });

    collectCommandCapabilitySnapshot.mockImplementation((params?: { mode?: string }) =>
      params?.mode === "readonly-sandbox"
        ? createEmptyCapabilitySnapshotFixture()
        : createCapabilitySnapshotFixture(),
    );
    note.mockClear();

    await doctorCommand(createDoctorRuntime(), {
      nonInteractive: true,
      workspaceSuggestions: false,
    });

    const usefulnessNote = note.mock.calls.find((call) => call[1] === "Sandbox usefulness");
    expect(usefulnessNote).toBeTruthy();
    expect(String(usefulnessNote?.[0] ?? "")).toContain("Custom image outside declared support");

    const readinessNote = note.mock.calls.find((call) => call[1] === "Capability readiness");
    expect(readinessNote).toBeTruthy();
    expect(String(readinessNote?.[0] ?? "")).toContain("unsupported-in-current-runtime");
  });
});
