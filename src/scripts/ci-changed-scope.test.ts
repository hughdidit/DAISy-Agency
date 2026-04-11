import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const { detectChangedScope, listChangedPaths } =
  (await import("../../scripts/ci-changed-scope.mjs")) as unknown as {
    detectChangedScope: (paths: string[]) => {
      runNode: boolean;
      runIos: boolean;
      runAndroid: boolean;
    };
    listChangedPaths: (base: string, head?: string) => string[];
  };

const markerPaths: string[] = [];

afterEach(() => {
  for (const markerPath of markerPaths) {
    try {
      fs.unlinkSync(markerPath);
    } catch {}
  }
  markerPaths.length = 0;
});

describe("detectChangedScope", () => {
  it("fails safe when no paths are provided", () => {
    expect(detectChangedScope([])).toEqual({
      runNode: true,
      runIos: true,
      runAndroid: true,
    });
  });

  it("keeps all lanes off for docs-only changes", () => {
    expect(detectChangedScope(["docs/ci.md", "README.md"])).toEqual({
      runNode: false,
      runIos: false,
      runAndroid: false,
    });
  });

  it("enables node lane for node-relevant files", () => {
    expect(detectChangedScope(["src/plugins/runtime/index.ts"])).toEqual({
      runNode: true,
      runIos: false,
      runAndroid: false,
    });
  });

  it("keeps node lane off for native-only changes", () => {
    expect(detectChangedScope(["apps/ios/Sources/Foo.swift"])).toEqual({
      runNode: false,
      runIos: true,
      runAndroid: false,
    });
    expect(detectChangedScope(["apps/android/app/src/main/java/Foo.kt"])).toEqual({
      runNode: false,
      runIos: false,
      runAndroid: true,
    });
    expect(detectChangedScope(["apps/macos/Sources/Foo.swift"])).toEqual({
      runNode: false,
      runIos: false,
      runAndroid: false,
    });
    expect(detectChangedScope(["apps/shared/OpenClawKit/Sources/Foo.swift"])).toEqual({
      runNode: false,
      runIos: true,
      runAndroid: true,
    });
    expect(detectChangedScope(["Swabble/Sources/SwabbleKit/Foo.swift"])).toEqual({
      runNode: false,
      runIos: true,
      runAndroid: false,
    });
  });

  it("treats shared generated protocol changes as Apple mobile changes", () => {
    expect(
      detectChangedScope(["apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift"]),
    ).toEqual({
      runNode: false,
      runIos: true,
      runAndroid: true,
    });
  });

  it("keeps macOS-only generated protocol changes out of supported mobile lanes", () => {
    expect(detectChangedScope(["apps/macos/Sources/OpenClawProtocol/GatewayModels.swift"])).toEqual(
      {
        runNode: false,
        runIos: false,
        runAndroid: false,
      },
    );
  });

  it("enables node lane for non-native non-doc files by fallback", () => {
    expect(detectChangedScope(["README.md"])).toEqual({
      runNode: false,
      runIos: false,
      runAndroid: false,
    });

    expect(detectChangedScope(["assets/icon.png"])).toEqual({
      runNode: true,
      runIos: false,
      runAndroid: false,
    });
  });

  it("enables node lane for non-runtime GitHub metadata files", () => {
    expect(detectChangedScope([".github/labeler.yml"])).toEqual({
      runNode: true,
      runIos: false,
      runAndroid: false,
    });
  });

  it("treats base and head as literal git args", () => {
    const markerPath = path.join(
      os.tmpdir(),
      `openclaw-ci-changed-scope-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`,
    );
    markerPaths.push(markerPath);

    const injectedBase =
      process.platform === "win32"
        ? `HEAD & echo injected > "${markerPath}" & rem`
        : `HEAD; touch "${markerPath}" #`;

    expect(() => listChangedPaths(injectedBase, "HEAD")).toThrow();
    expect(fs.existsSync(markerPath)).toBe(false);
  });
});
