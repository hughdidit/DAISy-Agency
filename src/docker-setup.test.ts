import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
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
  const env: NodeJS.ProcessEnv = {
    PATH: `${sandbox.binDir}:${process.env.PATH ?? ""}`,
    HOME: process.env.HOME ?? sandbox.rootDir,
    LANG: process.env.LANG,
    LC_ALL: process.env.LC_ALL,
    TMPDIR: process.env.TMPDIR,
    DOCKER_STUB_LOG: sandbox.logPath,
    OPENCLAW_GATEWAY_TOKEN: "test-token",
    OPENCLAW_CONFIG_DIR: join(sandbox.rootDir, "config"),
    OPENCLAW_WORKSPACE_DIR: join(sandbox.rootDir, "openclaw"),
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
  return env;
}

function requireSandbox(sandbox: DockerSetupSandbox | null): DockerSetupSandbox {
  if (!sandbox) {
    throw new Error("sandbox missing");
  }
  return sandbox;
}

function runDockerSetup(
  sandbox: DockerSetupSandbox,
  overrides: Record<string, string | undefined> = {},
) {
  return spawnSync("bash", [sandbox.scriptPath], {
    cwd: sandbox.rootDir,
    env: createEnv(sandbox, overrides),
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
  });
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
    const activeSandbox = requireSandbox(sandbox);

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const rootDir = await mkdtemp(join(tmpdir(), "openclaw-docker-setup-"));
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
      "services:\n  openclaw-gateway:\n    image: noop\n  openclaw-cli:\n    image: noop\n",
    );
    await writeDockerStub(binDir, logPath);

    const env = {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      DOCKER_STUB_LOG: logPath,
      OPENCLAW_GATEWAY_TOKEN: "test-token",
      OPENCLAW_CONFIG_DIR: join(rootDir, "config"),
      OPENCLAW_WORKSPACE_DIR: join(rootDir, "clawd"),
    };
    delete env.OPENCLAW_DOCKER_APT_PACKAGES;
    delete env.OPENCLAW_EXTRA_MOUNTS;
    delete env.OPENCLAW_HOME_VOLUME;

    const result = spawnSync("bash", [scriptPath], {
      cwd: rootDir,
      env,
=======
    const defaultsResult = spawnSync("bash", [sandbox.scriptPath], {
      cwd: sandbox.rootDir,
      env: createEnv(sandbox, {
        OPENCLAW_DOCKER_APT_PACKAGES: undefined,
        OPENCLAW_EXTRA_MOUNTS: undefined,
        OPENCLAW_HOME_VOLUME: undefined,
      }),
>>>>>>> 59d2d89fe (perf(test): collapse docker setup sandbox churn)
      encoding: "utf8",
    });
    expect(defaultsResult.status).toBe(0);
    const defaultsEnvFile = await readFile(join(sandbox.rootDir, ".env"), "utf8");
    expect(defaultsEnvFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=");
    expect(defaultsEnvFile).toContain("OPENCLAW_EXTRA_MOUNTS=");
    expect(defaultsEnvFile).toContain("OPENCLAW_HOME_VOLUME=");

<<<<<<< HEAD
    expect(result.status).toBe(0);

<<<<<<< HEAD
    const envFile = await readFile(join(rootDir, ".env"), "utf8");
    expect(envFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=");
    expect(envFile).toContain("OPENCLAW_EXTRA_MOUNTS=");
    expect(envFile).toContain("OPENCLAW_HOME_VOLUME=");
  });

  it("plumbs OPENCLAW_DOCKER_APT_PACKAGES into .env and docker build args", async () => {
    const assocCheck = spawnSync("bash", ["-c", "declare -A _t=()"], {
      encoding: "utf8",
    });
    if (assocCheck.status !== 0) {
      return;
    }

    const rootDir = await mkdtemp(join(tmpdir(), "openclaw-docker-setup-"));
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
      "services:\n  openclaw-gateway:\n    image: noop\n  openclaw-cli:\n    image: noop\n",
    );
    await writeDockerStub(binDir, logPath);

    const env = {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      DOCKER_STUB_LOG: logPath,
      OPENCLAW_DOCKER_APT_PACKAGES: "ffmpeg build-essential",
      OPENCLAW_GATEWAY_TOKEN: "test-token",
      OPENCLAW_CONFIG_DIR: join(rootDir, "config"),
      OPENCLAW_WORKSPACE_DIR: join(rootDir, "clawd"),
      OPENCLAW_EXTRA_MOUNTS: "",
      OPENCLAW_HOME_VOLUME: "",
    };

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
=======
    const result = runDockerSetup(activeSandbox, {
      OPENCLAW_DOCKER_APT_PACKAGES: "ffmpeg build-essential",
      OPENCLAW_EXTRA_MOUNTS: undefined,
      OPENCLAW_HOME_VOLUME: "openclaw-home",
>>>>>>> 9f2b25426 (test(core): increase coverage for sessions, auth choice, and model listing)
    });
<<<<<<< HEAD
<<<<<<< HEAD

    expect(result.status).toBe(0);

<<<<<<< HEAD
    const envFile = await readFile(join(rootDir, ".env"), "utf8");
    expect(envFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");

    const log = await readFile(logPath, "utf8");
    expect(log).toContain("--build-arg OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
=======
    expect(aptAndHomeVolumeResult.status).toBe(0);
    const aptEnvFile = await readFile(join(sandbox.rootDir, ".env"), "utf8");
    expect(aptEnvFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
>>>>>>> 72e9364ba (perf(test): speed up hot test files)
=======
    expect(result.status).toBe(0);
    const envFile = await readFile(join(activeSandbox.rootDir, ".env"), "utf8");
    expect(envFile).toContain("OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
    expect(envFile).toContain("OPENCLAW_EXTRA_MOUNTS=");
    expect(envFile).toContain("OPENCLAW_HOME_VOLUME=openclaw-home");
>>>>>>> e9294ff92 (perf(test): speed up docker-setup and web media fallback)
    const extraCompose = await readFile(join(sandbox.rootDir, "docker-compose.extra.yml"), "utf8");
    expect(extraCompose).toContain("openclaw-home:/home/node");
    expect(extraCompose).toContain("volumes:");
    expect(extraCompose).toContain("openclaw-home:");
    const log = await readFile(activeSandbox.logPath, "utf8");
    expect(log).toContain("--build-arg OPENCLAW_DOCKER_APT_PACKAGES=ffmpeg build-essential");
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

  it("precreates agent data dirs to avoid EACCES in container", async () => {
    const activeSandbox = requireSandbox(sandbox);
    const configDir = join(activeSandbox.rootDir, "config-agent-dirs");
    const workspaceDir = join(activeSandbox.rootDir, "workspace-agent-dirs");

    const result = runDockerSetup(activeSandbox, {
      OPENCLAW_CONFIG_DIR: configDir,
      OPENCLAW_WORKSPACE_DIR: workspaceDir,
    });

    expect(result.status).toBe(0);
    const agentDirStat = await stat(join(configDir, "agents", "main", "agent"));
    expect(agentDirStat.isDirectory()).toBe(true);
    const sessionsDirStat = await stat(join(configDir, "agents", "main", "sessions"));
    expect(sessionsDirStat.isDirectory()).toBe(true);

    // Verify that a root-user chown step runs before onboarding.
    const log = await readFile(activeSandbox.logPath, "utf8");
    const chownIdx = log.indexOf("--user root");
    const onboardIdx = log.indexOf("onboard");
    expect(chownIdx).toBeGreaterThanOrEqual(0);
    expect(onboardIdx).toBeGreaterThan(chownIdx);
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

  it("keeps docker-compose gateway command in sync", async () => {
    const compose = await readFile(join(repoRoot, "docker-compose.yml"), "utf8");
    expect(compose).not.toContain("gateway-daemon");
    expect(compose).toContain('"gateway"');
  });
});
