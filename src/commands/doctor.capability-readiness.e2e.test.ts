import { beforeAll, describe, expect, it } from "vitest";
import {
  collectCommandCapabilitySnapshot,
  createDoctorRuntime,
  mockDoctorConfigSnapshot,
  note,
} from "./doctor.e2e-harness.js";
import { createCapabilitySnapshotFixture } from "./capability-readiness.test-helpers.js";
import "./doctor.fast-path-mocks.js";

let doctorCommand: typeof import("./doctor.js").doctorCommand;

describe("doctor command capability readiness", () => {
  beforeAll(async () => {
    ({ doctorCommand } = await import("./doctor.js"));
  });

  it("prints resolver-backed capability class counts and normalized findings", async () => {
    mockDoctorConfigSnapshot({
      config: {
        agents: {
          defaults: {
            workspace: "/tmp/workspace",
            sandbox: {
              mode: "all",
              scope: "session",
            },
          },
        },
      },
    });
    collectCommandCapabilitySnapshot.mockReturnValue(createCapabilitySnapshotFixture());
    note.mockClear();

    await doctorCommand(createDoctorRuntime(), {
      nonInteractive: true,
      workspaceSuggestions: false,
    });

    const readinessNote = note.mock.calls.find((call) => call[1] === "Capability readiness");
    expect(readinessNote).toBeTruthy();
    const message = String(readinessNote?.[0] ?? "");
    expect(message).toContain("sandbox-local: 1");
    expect(message).toContain("gateway-brokered: 1");
    expect(message).toContain("remote-node-assisted: 1");
    expect(message).toContain("configured-but-blocked: 2");
    expect(message).toContain("unsupported-in-current-runtime: 1");
    expect(message).toContain("policy-block");
    expect(message).toContain("config-gap");
    expect(message).toContain("projection-defect");
    expect(message).toContain("remote-assisted-availability");
    expect(message).toContain("gateway-brokered-availability");
  });
});
