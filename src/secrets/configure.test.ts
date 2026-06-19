import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.hoisted(() => vi.fn());
const textMock = vi.hoisted(() => vi.fn());
const runSecretsApplyMock = vi.hoisted(() => vi.fn());
const createSecretsConfigIOMock = vi.hoisted(() => vi.fn());
const readJsonObjectIfExistsMock = vi.hoisted(() => vi.fn());

vi.mock("@clack/prompts", () => ({
  confirm: vi.fn(),
  select: (...args: unknown[]) => selectMock(...args),
  text: (...args: unknown[]) => textMock(...args),
}));

vi.mock("./apply.js", () => ({
  runSecretsApply: (...args: unknown[]) => runSecretsApplyMock(...args),
}));

vi.mock("./config-io.js", () => ({
  createSecretsConfigIO: (...args: unknown[]) => createSecretsConfigIOMock(...args),
}));

vi.mock("./storage-scan.js", () => ({
  readJsonObjectIfExists: (...args: unknown[]) => readJsonObjectIfExistsMock(...args),
}));

const { runSecretsConfigureInteractive } = await import("./configure.js");

describe("runSecretsConfigureInteractive", () => {
  beforeEach(() => {
    selectMock.mockReset();
    textMock.mockReset();
    runSecretsApplyMock.mockReset();
    createSecretsConfigIOMock.mockReset();
    readJsonObjectIfExistsMock.mockReset();
  });

  it("does not load auth-profiles when running providers-only", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    });

    selectMock.mockResolvedValue("continue");
    createSecretsConfigIOMock.mockReturnValue({
      readConfigFileSnapshotForWrite: async () => ({
        snapshot: {
          valid: true,
          config: {},
          resolved: {},
        },
      }),
    });
    readJsonObjectIfExistsMock.mockReturnValue({
      error: "boom",
      value: null,
    });

    await expect(runSecretsConfigureInteractive({ providersOnly: true })).rejects.toThrow(
      "No secrets changes were selected.",
    );
    expect(readJsonObjectIfExistsMock).not.toHaveBeenCalled();
  });

  it("can add a Google Secret Manager provider interactively", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    });

    selectMock
      .mockResolvedValueOnce("add")
      .mockResolvedValueOnce("gcpSecretManager")
      .mockResolvedValueOnce("continue");
    textMock
      .mockResolvedValueOnce("daisy-production")
      .mockResolvedValueOnce("daisy-auth-491616")
      .mockResolvedValueOnce("latest")
      .mockResolvedValueOnce("anthropic-api-key,gws-service-account-json")
      .mockResolvedValueOnce(
        "projects/daisy-auth-491616/secrets/openai-api-key/versions/latest",
      )
      .mockResolvedValueOnce("5000")
      .mockResolvedValueOnce("1048576");
    createSecretsConfigIOMock.mockReturnValue({
      readConfigFileSnapshotForWrite: async () => ({
        snapshot: {
          valid: true,
          config: {},
          resolved: {},
        },
      }),
    });
    runSecretsApplyMock.mockResolvedValue({ changedFiles: [], warnings: [] });

    const result = await runSecretsConfigureInteractive({ providersOnly: true });

    expect(result.plan.providerUpserts?.["daisy-production"]).toEqual({
      source: "gcpSecretManager",
      projectId: "daisy-auth-491616",
      version: "latest",
      allowedSecrets: ["anthropic-api-key", "gws-service-account-json"],
      allowedResourceNames: [
        "projects/daisy-auth-491616/secrets/openai-api-key/versions/latest",
      ],
      timeoutMs: 5000,
      maxBytes: 1048576,
    });
    expect(runSecretsApplyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({
          providerUpserts: expect.objectContaining({
            "daisy-production": expect.objectContaining({
              source: "gcpSecretManager",
            }),
          }),
        }),
        write: false,
      }),
    );
  });
});
