import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

async function writeDockerStub(binDir: string, logPath: string) {
  const stub = `#!/usr/bin/env bash
set -euo pipefail
log="$DOCKER_STUB_LOG"
if [[ "\${1:-}" == "compose" && "\${2:-}" == "version" ]]; then
  exit 0
fi
if [[ "\${1:-}" == "build" ]]; then
  echo "build $*" >>"$log"
  exit 0
fi
if [[ "\${1:-}" == "compose" ]]; then
  echo "compose $*" >>"$log"
  exit 0
fi
echo "unknown $*" >>"$log"
exit 0
`;

  await mkdir(binDir, { recursive: true });
  await writeFile(join(binDir, "docker"), stub, { mode: 0o755 });
  await writeFile(logPath, "");
}

describe("docker-setup.sh", () => {
  it("handles unset optional env vars under strict mode", async () => {
    const assocCheck = spawnSync("bash", ["-c", "declare -A _t=()"], {
      encoding: "utf8",
    });
    if (assocCheck.status !== 0) {
      return;
    }

    const rootDir = await mkdtemp(join(tmpdir(), "moltbot-docker-setup-"));
    const scriptPath = join(rootDir, "docker-setup.sh");
    const dockerfilePath = join(rootDir, "Dockerfile");
    const composePath = join(rootDir, "docker-compose.yml");
    const binDir = join(rootDir, "bin");
    const logPath = join(rootDir, "docker-stub.log");

<<<<<<< HEAD
=======
    const result = runDockerSetup(activeSandbox, {
      OPENCLAW_DOCKER_APT_PACKAGES: "ffmpeg build-essential",
      OPENCLAW_EXTRA_MOUNTS: undefined,
      OPENCLAW_HOME_VOLUME: "openclaw-home",
    });
    expect(result.status).toBe(0);
    const envFile = await readFile(join(activeSandbox.rootDir, ".env"), "utf8");
    expect(envFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
    expect(envFile).toContain("OPENCLAW_EXTRA_MOUNTS=");
    expect(envFile).toContain("OPENCLAW_HOME_VOLUME=openclaw-home");
    const extraCompose = await readFile(
      join(activeSandbox.rootDir, "docker-compose.extra.yml"),
      "utf8",
    );
    expect(extraCompose).toContain("openclaw-home:/home/node");
    expect(extraCompose).toContain("volumes:");
    expect(extraCompose).toContain("openclaw-home:");
    const log = await readFile(activeSandbox.logPath, "utf8");
    expect(log).toContain("--build-arg OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
    expect(log).toContain("run --rm openclaw-cli onboard --mode local --no-install-daemon");
    expect(log).toContain("run --rm openclaw-cli config set gateway.mode local");
    expect(log).toContain("run --rm openclaw-cli config set gateway.bind lan");
  });

  it("precreates config identity dir for CLI device auth writes", async () => {
    const activeSandbox = requireSandbox(sandbox);
    const configDir = join(activeSandbox.rootDir, "config-identity");
    const workspaceDir = join(activeSandbox.rootDir, "workspace-identity");

    const result = runDockerSetup(activeSandbox, {
      OPENCLAW_CONFIG_DIR: configDir,
      OPENCLAW_WORKSPACE_DIR: workspaceDir,
    });

    expect(result.status).toBe(0);
    const identityDirStat = await stat(join(configDir, "identity"));
    expect(identityDirStat.isDirectory()).toBe(true);
  });

  it("reuses existing config token when OPENCLAW_GATEWAY_TOKEN is unset", async () => {
    const activeSandbox = requireSandbox(sandbox);
    const configDir = join(activeSandbox.rootDir, "config-token-reuse");
    const workspaceDir = join(activeSandbox.rootDir, "workspace-token-reuse");
    await mkdir(configDir, { recursive: true });
    await writeFile(
      join(configDir, "openclaw.json"),
      JSON.stringify({ gateway: { auth: { mode: "token", token: "config-token-123" } } }),
    );

    const result = runDockerSetup(activeSandbox, {
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_CONFIG_DIR: configDir,
      OPENCLAW_WORKSPACE_DIR: workspaceDir,
    });

    expect(result.status).toBe(0);
    const envFile = await readFile(join(activeSandbox.rootDir, ".env"), "utf8");
    expect(envFile).toContain("OPENCLAW_GATEWAY_TOKEN=config-token-123");
  });

  it("rejects injected multiline OPENCLAW_EXTRA_MOUNTS values", async () => {
    const activeSandbox = requireSandbox(sandbox);

    const result = runDockerSetup(activeSandbox, {
      OPENCLAW_EXTRA_MOUNTS: "/tmp:/tmp\n  evil-service:\n    image: alpine",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("OPENCLAW_EXTRA_MOUNTS cannot contain control characters");
  });

  it("rejects invalid OPENCLAW_EXTRA_MOUNTS mount format", async () => {
    const activeSandbox = requireSandbox(sandbox);

    const result = runDockerSetup(activeSandbox, {
      OPENCLAW_EXTRA_MOUNTS: "bad mount spec",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Invalid mount format");
  });

  it("rejects invalid OPENCLAW_HOME_VOLUME names", async () => {
    const activeSandbox = requireSandbox(sandbox);

    const result = runDockerSetup(activeSandbox, {
      OPENCLAW_HOME_VOLUME: "bad name",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("OPENCLAW_HOME_VOLUME must match");
  });

  it("avoids associative arrays so the script remains Bash 3.2-compatible", async () => {
>>>>>>> 35976da7a (fix: harden Docker/GCP onboarding flow (#26253) (thanks @pandego))
    const script = await readFile(join(repoRoot, "docker-setup.sh"), "utf8");
    await writeFile(scriptPath, script, { mode: 0o755 });
    await writeFile(dockerfilePath, "FROM scratch\n");
    await writeFile(
      composePath,
      "services:\n  moltbot-gateway:\n    image: noop\n  moltbot-cli:\n    image: noop\n",
    );
    await writeDockerStub(binDir, logPath);

    const env = {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      DOCKER_STUB_LOG: logPath,
      CLAWDBOT_GATEWAY_TOKEN: "test-token",
      CLAWDBOT_CONFIG_DIR: join(rootDir, "config"),
      CLAWDBOT_WORKSPACE_DIR: join(rootDir, "clawd"),
    };
    delete env.CLAWDBOT_DOCKER_APT_PACKAGES;
    delete env.CLAWDBOT_EXTRA_MOUNTS;
    delete env.CLAWDBOT_HOME_VOLUME;

    const result = spawnSync("bash", [scriptPath], {
      cwd: rootDir,
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);

    const envFile = await readFile(join(rootDir, ".env"), "utf8");
    expect(envFile).toContain("CLAWDBOT_DOCKER_APT_PACKAGES=");
    expect(envFile).toContain("CLAWDBOT_EXTRA_MOUNTS=");
    expect(envFile).toContain("CLAWDBOT_HOME_VOLUME=");
  });

  it("plumbs CLAWDBOT_DOCKER_APT_PACKAGES into .env and docker build args", async () => {
    const assocCheck = spawnSync("bash", ["-c", "declare -A _t=()"], {
      encoding: "utf8",
    });
    if (assocCheck.status !== 0) {
      return;
    }

    const rootDir = await mkdtemp(join(tmpdir(), "moltbot-docker-setup-"));
    const scriptPath = join(rootDir, "docker-setup.sh");
    const dockerfilePath = join(rootDir, "Dockerfile");
    const composePath = join(rootDir, "docker-compose.yml");
    const binDir = join(rootDir, "bin");
    const logPath = join(rootDir, "docker-stub.log");

    const script = await readFile(join(repoRoot, "docker-setup.sh"), "utf8");
    await writeFile(scriptPath, script, { mode: 0o755 });
    await writeFile(dockerfilePath, "FROM scratch\n");
    await writeFile(
      composePath,
      "services:\n  moltbot-gateway:\n    image: noop\n  moltbot-cli:\n    image: noop\n",
    );
    await writeDockerStub(binDir, logPath);

    const env = {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      DOCKER_STUB_LOG: logPath,
      CLAWDBOT_DOCKER_APT_PACKAGES: "ffmpeg build-essential",
      CLAWDBOT_GATEWAY_TOKEN: "test-token",
      CLAWDBOT_CONFIG_DIR: join(rootDir, "config"),
      CLAWDBOT_WORKSPACE_DIR: join(rootDir, "clawd"),
      CLAWDBOT_EXTRA_MOUNTS: "",
      CLAWDBOT_HOME_VOLUME: "",
    };

    const result = spawnSync("bash", [scriptPath], {
      cwd: rootDir,
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);

    const envFile = await readFile(join(rootDir, ".env"), "utf8");
    expect(envFile).toContain("CLAWDBOT_DOCKER_APT_PACKAGES=ffmpeg build-essential");

    const log = await readFile(logPath, "utf8");
    expect(log).toContain("--build-arg CLAWDBOT_DOCKER_APT_PACKAGES=ffmpeg build-essential");
  });

  it("keeps docker-compose gateway command in sync", async () => {
    const compose = await readFile(join(repoRoot, "docker-compose.yml"), "utf8");
    expect(compose).not.toContain("gateway-daemon");
    expect(compose).toContain('"gateway"');
  });

  it("keeps docker-compose CLI network namespace settings in sync", async () => {
    const compose = await readFile(join(repoRoot, "docker-compose.yml"), "utf8");
    expect(compose).toContain('network_mode: "service:openclaw-gateway"');
    expect(compose).toContain("depends_on:\n      - openclaw-gateway");
  });
});
