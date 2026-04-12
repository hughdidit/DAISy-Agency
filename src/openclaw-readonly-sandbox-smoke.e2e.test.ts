import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isTruthyEnvValue } from "./infra/env.js";

const DOCKER_SMOKE = isTruthyEnvValue(process.env.OPENCLAW_DOCKER_SMOKE);
const imageTag = `openclaw-readonly-smoke:${process.pid}`;
const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("openclaw-readonly sandbox smoke", () => {
  let tempRoot = "";

  beforeAll(
    async () => {
      if (!DOCKER_SMOKE) {
        return;
      }

      tempRoot = await mkdtemp(path.join(os.tmpdir(), "openclaw-readonly-smoke-"));
      const configDir = path.join(tempRoot, "config");
      const stateDir = path.join(tempRoot, "state");
      const workspaceDir = path.join(tempRoot, "workspace");

      await mkdir(configDir, { recursive: true });
      await mkdir(stateDir, { recursive: true });
      await mkdir(workspaceDir, { recursive: true });
      await writeFile(
        path.join(configDir, "openclaw.json"),
        JSON.stringify(
          {
            agents: {
              list: [{ id: "main", skills: ["openclaw-readonly"] }],
              defaults: {
                sandbox: {
                  mode: "all",
                  scope: "agent",
                  workspaceAccess: "ro",
                  workspaceRoot: "/tmp/openclaw-readonly-sandbox",
                  docker: {
                    network: "none",
                  },
                },
              },
            },
            tools: {
              sandbox: {
                tools: {
                  allow: ["read", "exec"],
                },
              },
              elevated: {
                enabled: false,
              },
            },
          },
          null,
          2,
        ),
      );

      const build = spawnSync(
        "docker",
        ["build", "-t", imageTag, "-f", "Dockerfile.sandbox", "."],
        {
          cwd: repoRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      expect(build.status, build.stderr || build.stdout).toBe(0);
    },
    15 * 60 * 1000,
  );

  afterAll(async () => {
    if (DOCKER_SMOKE) {
      spawnSync("docker", ["image", "rm", "-f", imageTag], {
        encoding: "utf8",
        stdio: ["ignore", "ignore", "ignore"],
      });
    }
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it.skipIf(!DOCKER_SMOKE)(
    "runs skills list and sandbox explain read-only inside the sandbox image",
    async () => {
      const configPath = path.join(tempRoot, "config", "openclaw.json");
      const stateDir = path.join(tempRoot, "state");
      const workspaceDir = path.join(tempRoot, "workspace");

      const skillsList = spawnSync(
        "docker",
        [
          "run",
          "--rm",
          "--network",
          "none",
          "-v",
          `${configPath}:/readonly/openclaw.json:ro`,
          "-v",
          `${stateDir}:/readonly/state:ro`,
          "-v",
          `${workspaceDir}:/agent:ro`,
          "-e",
          "OPENCLAW_READONLY_CONFIG_PATH=/readonly/openclaw.json",
          "-e",
          "OPENCLAW_READONLY_STATE_DIR=/readonly/state",
          "-e",
          "OPENCLAW_READONLY_AGENT_ID=main",
          "-e",
          "OPENCLAW_READONLY_WORKSPACE_DIR=/agent",
          imageTag,
          "openclaw-readonly",
          "skills",
          "list",
        ],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      expect(skillsList.status, skillsList.stderr || skillsList.stdout).toBe(0);
      expect(skillsList.stdout).toContain("openclaw-readonly");

      const sandboxExplain = spawnSync(
        "docker",
        [
          "run",
          "--rm",
          "--network",
          "none",
          "-v",
          `${configPath}:/readonly/openclaw.json:ro`,
          "-v",
          `${stateDir}:/readonly/state:ro`,
          "-e",
          "OPENCLAW_READONLY_CONFIG_PATH=/readonly/openclaw.json",
          "-e",
          "OPENCLAW_READONLY_STATE_DIR=/readonly/state",
          "-e",
          "OPENCLAW_READONLY_AGENT_ID=main",
          imageTag,
          "openclaw-readonly",
          "sandbox",
          "explain",
        ],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      expect(sandboxExplain.status, sandboxExplain.stderr || sandboxExplain.stdout).toBe(0);
      expect(sandboxExplain.stdout).toContain("mode:");
    },
    10 * 60 * 1000,
  );
});
