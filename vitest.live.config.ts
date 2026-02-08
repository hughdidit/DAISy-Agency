import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

const baseTest = (baseConfig as { test?: { exclude?: string[] } }).test ?? {};
const exclude = (baseTest.exclude ?? []).filter((p) => p !== "**/*.live.test.ts");

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseTest,
    maxWorkers: 1,
    include: ["src/**/*.live.test.ts"],
<<<<<<< HEAD
    setupFiles: ["test/setup.ts"],
    exclude: [
      "dist/**",
      "apps/macos/**",
      "apps/macos/.build/**",
      "**/vendor/**",
      "dist/Moltbot.app/**",
    ],
=======
    exclude,
>>>>>>> eb3e9c649 (chore: fix vitest standalone configs and update package description (#11865))
  },
});
