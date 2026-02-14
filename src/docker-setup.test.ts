import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

type DockerSetupSandbox = {
  rootDir: string;
  scriptPath: string;
  logPath: string;
  binDir: string;
};

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

async function createDockerSetupSandbox(): Promise<DockerSetupSandbox> {
  const rootDir = await mkdtemp(join(tmpdir(), "openclaw-docker-setup-"));
  const scriptPath = join(rootDir, "docker-setup.sh");
  const dockerfilePath = join(rootDir, "Dockerfile");
  const composePath = join(rootDir, "docker-compose.yml");
  const binDir = join(rootDir, "bin");
  const logPath = join(rootDir, "docker-stub.log");

  await copyFile(join(repoRoot, "docker-setup.sh"), scriptPath);
  await chmod(scriptPath, 0o755);
  await writeFile(dockerfilePath, "FROM scratch\n");
  await writeFile(
    composePath,
    "services:\n  openclaw-gateway:\n    image: noop\n  openclaw-cli:\n    image: noop\n",
  );
  await writeDockerStub(binDir, logPath);

  return { rootDir, scriptPath, logPath, binDir };
}

function createEnv(
  sandbox: DockerSetupSandbox,
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${sandbox.binDir}:${process.env.PATH ?? ""}`,
    DOCKER_STUB_LOG: sandbox.logPath,
    OPENCLAW_GATEWAY_TOKEN: "test-token",
    OPENCLAW_CONFIG_DIR: join(sandbox.rootDir, "config"),
    OPENCLAW_WORKSPACE_DIR: join(sandbox.rootDir, "openclaw"),
    ...overrides,
  };
}

function resolveBashForCompatCheck(): string | null {
  for (const candidate of ["/bin/bash", "bash"]) {
    const probe = spawnSync(candidate, ["-c", "exit 0"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) {
      return candidate;
    }
  }

  return null;
}

describe("docker-setup.sh", () => {
  let sandbox: DockerSetupSandbox | null = null;

  beforeAll(async () => {
    sandbox = await createDockerSetupSandbox();
  });

  afterAll(async () => {
    if (!sandbox) {
      return;
    }
    await rm(sandbox.rootDir, { recursive: true, force: true });
    sandbox = null;
  });

  it("handles env defaults, home-volume mounts, and apt build args", async () => {
    if (!sandbox) {
      throw new Error("sandbox missing");
    }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
      CLAWDBOT_GATEWAY_TOKEN: "test-token",
      CLAWDBOT_CONFIG_DIR: join(rootDir, "config"),
      CLAWDBOT_WORKSPACE_DIR: join(rootDir, "clawd"),
    };
    delete env.CLAWDBOT_DOCKER_APT_PACKAGES;
    delete env.CLAWDBOT_EXTRA_MOUNTS;
    delete env.CLAWDBOT_HOME_VOLUME;

    const result = spawnSync("bash", [scriptPath], {
      cwd: rootDir,
=======
    const result = spawnSync("bash", [sandbox.scriptPath], {
      cwd: sandbox.rootDir,
>>>>>>> 6731c6a1c (fix(docker): support Bash 3.2 in docker-setup.sh (#9441))
      env,
=======
    const defaultsResult = spawnSync("bash", [sandbox.scriptPath], {
      cwd: sandbox.rootDir,
      env: createEnv(sandbox, {
        OPENCLAW_DOCKER_APT_PACKAGES: undefined,
        OPENCLAW_EXTRA_MOUNTS: undefined,
        OPENCLAW_HOME_VOLUME: undefined,
      }),
<<<<<<< HEAD
>>>>>>> 59d2d89fe (perf(test): collapse docker setup sandbox churn)
      encoding: "utf8",
=======
      stdio: ["ignore", "ignore", "pipe"],
>>>>>>> ad5e7b968 (perf(test): speed up docker-setup suite)
    });
    expect(defaultsResult.status).toBe(0);
    const defaultsEnvFile = await readFile(join(sandbox.rootDir, ".env"), "utf8");
    expect(defaultsEnvFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=");
    expect(defaultsEnvFile).toContain("OPENCLAW_EXTRA_MOUNTS=");
    expect(defaultsEnvFile).toContain("OPENCLAW_HOME_VOLUME=");

<<<<<<< HEAD
<<<<<<< HEAD
    expect(result.status).toBe(0);

<<<<<<< HEAD
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
=======
    const envFile = await readFile(join(sandbox.rootDir, ".env"), "utf8");
    expect(envFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=");
    expect(envFile).toContain("OPENCLAW_EXTRA_MOUNTS=");
    expect(envFile).toContain("OPENCLAW_HOME_VOLUME=");
  });

  it("supports a home volume when extra mounts are empty", async () => {
    const sandbox = await createDockerSetupSandbox();
    const env = createEnv(sandbox, {
      OPENCLAW_EXTRA_MOUNTS: "",
      OPENCLAW_HOME_VOLUME: "openclaw-home",
    });
>>>>>>> 6731c6a1c (fix(docker): support Bash 3.2 in docker-setup.sh (#9441))

    const result = spawnSync("bash", [sandbox.scriptPath], {
=======
    const homeVolumeResult = spawnSync("bash", [sandbox.scriptPath], {
>>>>>>> 59d2d89fe (perf(test): collapse docker setup sandbox churn)
=======
    await writeFile(sandbox.logPath, "");
    const aptAndHomeVolumeResult = spawnSync("bash", [sandbox.scriptPath], {
>>>>>>> 72e9364ba (perf(test): speed up hot test files)
=======
    const result = spawnSync("bash", [sandbox.scriptPath], {
>>>>>>> e9294ff92 (perf(test): speed up docker-setup and web media fallback)
      cwd: sandbox.rootDir,
      env: createEnv(sandbox, {
        OPENCLAW_DOCKER_APT_PACKAGES: "ffmpeg build-essential",
        OPENCLAW_EXTRA_MOUNTS: undefined,
        OPENCLAW_HOME_VOLUME: "openclaw-home",
      }),
      stdio: ["ignore", "ignore", "pipe"],
    });
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

    expect(result.status).toBe(0);

<<<<<<< HEAD
    const envFile = await readFile(join(rootDir, ".env"), "utf8");
    expect(envFile).toContain("CLAWDBOT_DOCKER_APT_PACKAGES=ffmpeg build-essential");

    const log = await readFile(logPath, "utf8");
    expect(log).toContain("--build-arg CLAWDBOT_DOCKER_APT_PACKAGES=ffmpeg build-essential");
=======
=======
    expect(homeVolumeResult.status).toBe(0);
>>>>>>> 59d2d89fe (perf(test): collapse docker setup sandbox churn)
=======
    expect(aptAndHomeVolumeResult.status).toBe(0);
    const aptEnvFile = await readFile(join(sandbox.rootDir, ".env"), "utf8");
    expect(aptEnvFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
>>>>>>> 72e9364ba (perf(test): speed up hot test files)
=======
    expect(result.status).toBe(0);
    const envFile = await readFile(join(sandbox.rootDir, ".env"), "utf8");
    expect(envFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
    expect(envFile).toContain("OPENCLAW_EXTRA_MOUNTS=");
    expect(envFile).toContain("OPENCLAW_HOME_VOLUME=openclaw-home");
>>>>>>> e9294ff92 (perf(test): speed up docker-setup and web media fallback)
    const extraCompose = await readFile(join(sandbox.rootDir, "docker-compose.extra.yml"), "utf8");
    expect(extraCompose).toContain("openclaw-home:/home/node");
    expect(extraCompose).toContain("volumes:");
    expect(extraCompose).toContain("openclaw-home:");
    const log = await readFile(sandbox.logPath, "utf8");
    expect(log).toContain("--build-arg OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
  });

  it("avoids associative arrays so the script remains Bash 3.2-compatible", async () => {
    const script = await readFile(join(repoRoot, "docker-setup.sh"), "utf8");
    expect(script).not.toMatch(/^\s*declare -A\b/m);

    const systemBash = resolveBashForCompatCheck();
    if (!systemBash) {
      return;
    }

    const assocCheck = spawnSync(systemBash, ["-c", "declare -A _t=()"], {
      encoding: "utf8",
    });
    if (assocCheck.status === 0 || assocCheck.status === null) {
      // Skip runtime check when system bash supports associative arrays
      // (not Bash 3.2) or when /bin/bash is unavailable (e.g. Windows).
      return;
    }

    const syntaxCheck = spawnSync(systemBash, ["-n", join(repoRoot, "docker-setup.sh")], {
      encoding: "utf8",
    });

    expect(syntaxCheck.status).toBe(0);
    expect(syntaxCheck.stderr).not.toContain("declare: -A: invalid option");
  });

<<<<<<< HEAD
  it("plumbs OPENCLAW_DOCKER_APT_PACKAGES into .env and docker build args", async () => {
    const sandbox = await createDockerSetupSandbox();
    const env = createEnv(sandbox, {
      OPENCLAW_DOCKER_APT_PACKAGES: "ffmpeg build-essential",
      OPENCLAW_EXTRA_MOUNTS: "",
      OPENCLAW_HOME_VOLUME: "",
    });

    const result = spawnSync("bash", [sandbox.scriptPath], {
      cwd: sandbox.rootDir,
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);

    const envFile = await readFile(join(sandbox.rootDir, ".env"), "utf8");
    expect(envFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");

    const log = await readFile(sandbox.logPath, "utf8");
    expect(log).toContain("--build-arg OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
>>>>>>> 6731c6a1c (fix(docker): support Bash 3.2 in docker-setup.sh (#9441))
  });

=======
>>>>>>> 59d2d89fe (perf(test): collapse docker setup sandbox churn)
  it("keeps docker-compose gateway command in sync", async () => {
    const compose = await readFile(join(repoRoot, "docker-compose.yml"), "utf8");
    expect(compose).not.toContain("gateway-daemon");
    expect(compose).toContain('"gateway"');
  });
});
