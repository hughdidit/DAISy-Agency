import { describe, expect, it } from "vitest";
import { mountApp, registerAppMountHooks } from "./test-helpers/app-mount.ts";

registerAppMountHooks();

describe("app update rendering", () => {
  it("does not show upstream update prompts in the DAISy dashboard", async () => {
    const app = mountApp("/overview");
    app.connected = true;
    app.updateAvailable = {
      currentVersion: "2026.3.2",
      latestVersion: "2026.6.10",
      channel: "latest",
    };

    await app.updateComplete;

    expect(app.querySelector(".update-banner")).toBeNull();
    expect(app.querySelector('[role="alert"]')).toBeNull();
    expect(app.querySelector(".topbar-status .statusDot.warn")).toBeNull();
    const buttonLabels = Array.from(app.querySelectorAll("button")).map((button) =>
      button.textContent?.trim(),
    );
    expect(buttonLabels).not.toContain("Update now");
  });
});
