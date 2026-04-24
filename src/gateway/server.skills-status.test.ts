import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import AjvPkg from "ajv";
import { describe, expect, it, vi } from "vitest";
import { writeSkill } from "../agents/skills.e2e-test-helpers.js";
import type { SkillStatusReport } from "../agents/skills-status.js";
import { withEnvAsync } from "../test-utils/env.js";
import {
  CAPABILITY_PARITY_GATEWAY_SKILL_SUBJECTS,
  filterCapabilityParityRows,
  normalizeSkillStatusParityRows,
} from "../test-utils/capability-readiness-parity.js";
import { SkillsStatusResultSchema } from "./protocol/schema/agents-models-skills.js";
import { connectOk, installGatewayTestHooks, rpcReq } from "./test-helpers.js";
import { withServer } from "./test-with-server.js";

vi.mock("../infra/skills-remote.js", () => ({
  getRemoteSkillEligibility: () => ({
    platforms: ["darwin"],
    hasBin: (bin: string) => bin === "xcodebuild",
    hasAnyBin: () => false,
    note: "Remote macOS node available.",
  }),
}));

installGatewayTestHooks({ scope: "suite" });

function createAjv() {
  return new (AjvPkg as unknown as new (opts?: object) => import("ajv").default)({
    allErrors: true,
    strict: false,
  });
}

describe("gateway skills.status", () => {
  it("uses the default agent when agentId is omitted, supports explicit agents, and redacts secrets", async () => {
    await withEnvAsync(
      { OPENCLAW_BUNDLED_SKILLS_DIR: path.join(process.cwd(), "skills") },
      async () => {
        const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-skills-status-"));
        try {
          const alphaWorkspace = path.join(tempRoot, "alpha");
          const betaWorkspace = path.join(tempRoot, "beta");
          await fs.mkdir(alphaWorkspace, { recursive: true });
          await fs.mkdir(betaWorkspace, { recursive: true });

          const secret = "discord-token-secret-abc";
          const { writeConfigFile } = await import("../config/config.js");
          await writeConfigFile({
            session: { mainKey: "main-test" },
            agents: {
              list: [
                { id: "alpha", workspace: alphaWorkspace, default: true },
                { id: "beta", workspace: betaWorkspace },
              ],
            },
            channels: {
              discord: {
                token: secret,
              },
            },
          });

          await withServer(async (ws) => {
            await connectOk(ws, { token: "secret", scopes: ["operator.read"] });
            const defaultRes = await rpcReq<{
              workspaceDir?: string;
              skills?: Array<{
                name?: string;
                skillKey?: string;
                install?: unknown[];
                missing?: Record<string, unknown>;
                capabilityClass?: string;
                capability?: { capabilityClass?: string };
                remoteSatisfied?: unknown;
                configChecks?: Array<
                  { path?: string; satisfied?: boolean } & Record<string, unknown>
                >;
              }>;
            }>(ws, "skills.status", {});

            expect(defaultRes.ok).toBe(true);
            expect(defaultRes.payload?.workspaceDir).toBe(alphaWorkspace);
            expect(JSON.stringify(defaultRes.payload)).not.toContain(secret);

            const explicitRes = await rpcReq<{
              workspaceDir?: string;
              skills?: Array<{ name?: string; capabilityClass?: string }>;
            }>(ws, "skills.status", { agentId: "beta" });

            expect(explicitRes.ok).toBe(true);
            expect(explicitRes.payload?.workspaceDir).toBe(betaWorkspace);

            const discord = defaultRes.payload?.skills?.find((s) => s.name === "discord");
            expect(discord).toBeTruthy();
            expect(discord?.capabilityClass).toBe("sandbox-local");
            expect(discord?.capability?.capabilityClass).toBe("sandbox-local");
            expect(discord?.remoteSatisfied).toBeNull();
            const check = discord?.configChecks?.find((c) => c.path === "channels.discord.token");
            expect(check).toBeTruthy();
            expect(check?.satisfied).toBe(true);
            expect(check && "value" in check).toBe(false);
            expect(discord?.skillKey).toBeTruthy();
            expect(discord?.install).toBeTruthy();
            expect(discord?.missing).toBeTruthy();

            expect(createAjv().compile(SkillsStatusResultSchema)(defaultRes.payload)).toBe(true);
          });
        } finally {
          await fs.rm(tempRoot, { recursive: true, force: true });
        }
      },
    );
  });

  it("rejects unknown agent ids", async () => {
    const { writeConfigFile } = await import("../config/config.js");
    await writeConfigFile({
      session: { mainKey: "main-test" },
    });

    await withServer(async (ws) => {
      await connectOk(ws, { token: "secret", scopes: ["operator.read"] });
      const res = await rpcReq(ws, "skills.status", { agentId: "does-not-exist" });

      expect(res.ok).toBe(false);
      expect(res.error?.message ?? "").toContain("unknown agent id");
    });
  });

  it("keeps gateway skill readiness aligned with the shared parity matrix", async () => {
    await withEnvAsync(
      {
        OPENCLAW_BUNDLED_SKILLS_DIR: path.join(process.cwd(), "skills"),
        MISSING_GATEWAY_TEST_ENV: undefined,
      },
      async () => {
        const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-skills-parity-"));
        try {
          const workspaceDir = path.join(tempRoot, "agent");
          await writeSkill({
            dir: path.join(workspaceDir, "skills", "local-skill"),
            name: "local-skill",
            description: "Local skill",
          });
          await writeSkill({
            dir: path.join(workspaceDir, "skills", "remote-mac-skill"),
            name: "remote-mac-skill",
            description: "Remote macOS skill",
            metadata: '{"openclaw":{"os":["darwin"],"requires":{"bins":["xcodebuild"]}}}',
          });
          await writeSkill({
            dir: path.join(workspaceDir, "skills", "env-blocked-skill"),
            name: "env-blocked-skill",
            description: "Env blocked skill",
            metadata:
              '{"openclaw":{"requires":{"env":["MISSING_GATEWAY_TEST_ENV"]},"primaryEnv":"MISSING_GATEWAY_TEST_ENV"}}',
          });
          await writeSkill({
            dir: path.join(workspaceDir, "skills", "unsupported-runtime-skill"),
            name: "unsupported-runtime-skill",
            description: "Unsupported runtime skill",
            metadata: '{"openclaw":{"os":["never-supported-sbx207"]}}',
          });

          const { writeConfigFile } = await import("../config/config.js");
          await writeConfigFile({
            session: { mainKey: "main-test" },
            agents: {
              list: [{ id: "main", workspace: workspaceDir, default: true }],
            },
          });

          await withServer(async (ws) => {
            await connectOk(ws, { token: "secret", scopes: ["operator.read"] });
            const res = await rpcReq<SkillStatusReport>(ws, "skills.status", {});

            expect(res.ok).toBe(true);
            expect(res.payload?.workspaceDir).toBe(workspaceDir);
            expect(createAjv().compile(SkillsStatusResultSchema)(res.payload)).toBe(true);
            const paritySkills: SkillStatusReport["skills"] =
              res.payload?.skills?.filter((skill) =>
                CAPABILITY_PARITY_GATEWAY_SKILL_SUBJECTS.includes(
                  skill.name as (typeof CAPABILITY_PARITY_GATEWAY_SKILL_SUBJECTS)[number],
                ),
              ) ?? [];
            expect(normalizeSkillStatusParityRows(paritySkills)).toEqual(
              filterCapabilityParityRows(CAPABILITY_PARITY_GATEWAY_SKILL_SUBJECTS),
            );
          });
        } finally {
          await fs.rm(tempRoot, { recursive: true, force: true });
        }
      },
    );
  });
});
