import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const dockerfilePath = join(repoRoot, "Dockerfile.sandbox");

describe("Dockerfile.sandbox", () => {
  it("installs the openclaw-readonly runtime wrapper into the sandbox image", async () => {
    const dockerfile = await readFile(dockerfilePath, "utf8");
    expect(dockerfile).toContain(
      "COPY scripts/docker/openclaw-readonly-wrapper.mjs /usr/local/bin/openclaw-readonly",
    );
    expect(dockerfile).toContain(
      "COPY --from=openclaw-readonly-build /build/dist /opt/daisy/openclaw-readonly/dist",
    );
    expect(dockerfile).toContain('"allow\\":[\\"read\\",\\"exec\\"]');
    expect(dockerfile).toContain('"network\\":\\"none\\"');
    expect(dockerfile).toContain("/usr/local/bin/openclaw-readonly skills list \\");
    expect(dockerfile).toContain(">/tmp/openclaw-readonly-smoke/skills-list.txt");
    expect(dockerfile).toContain("2>/tmp/openclaw-readonly-smoke/skills-list.err");
    expect(dockerfile).toContain("cat /tmp/openclaw-readonly-smoke/skills-list.err >&2");
    expect(dockerfile.match(/OPENCLAW_READONLY_AGENT_ID=main/g)).toHaveLength(2);
    expect(dockerfile).toContain(
      'grep -q "Sandbox-safe OpenClaw diagnostics" /tmp/openclaw-readonly-smoke/skills-list.txt',
    );
    expect(dockerfile).toContain("/usr/local/bin/openclaw-readonly sandbox explain \\");
    expect(dockerfile).toContain(">/tmp/openclaw-readonly-smoke/sandbox-explain.txt");
    expect(dockerfile).toContain("2>/tmp/openclaw-readonly-smoke/sandbox-explain.err");
    expect(dockerfile).toContain("cat /tmp/openclaw-readonly-smoke/sandbox-explain.err >&2");
    expect(dockerfile).toContain(
      'grep -q "mode:" /tmp/openclaw-readonly-smoke/sandbox-explain.txt',
    );
    expect(dockerfile).toContain("RUN bash -o pipefail -lc");
    expect(dockerfile).toContain("rm -rf /tmp/openclaw-readonly-smoke");
  });

  it("does not expose the generic openclaw CLI in the sandbox image", async () => {
    const dockerfile = await readFile(dockerfilePath, "utf8");
    expect(dockerfile).not.toMatch(/\/usr\/local\/bin\/openclaw(\s|$)/);
    expect(dockerfile).not.toContain("openclaw-wrapper.mjs");
  });
});
