import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD

import { afterEach, describe, expect, it, vi } from "vitest";

import type { MoltbotConfig } from "../src/config/config.js";
import type { MsgContext } from "../src/auto-reply/templating.js";
=======
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MsgContext } from "../src/auto-reply/templating.js";
import type { OpenClawConfig } from "../src/config/config.js";
import { resolvePreferredOpenClawTmpDir } from "../src/infra/tmp-openclaw-dir.js";
import { applyMediaUnderstanding } from "../src/media-understanding/apply.js";
import { clearMediaUnderstandingBinaryCacheForTests } from "../src/media-understanding/runner.js";
>>>>>>> fdfc34fa1 (perf(test): stabilize e2e harness and reduce flaky gateway coverage)

const makeTempDir = async (prefix: string) => {
  const baseDir = resolvePreferredOpenClawTmpDir();
  await fs.mkdir(baseDir, { recursive: true });
  return await fs.mkdtemp(path.join(baseDir, prefix));
};

const writeExecutable = async (dir: string, name: string, content: string) => {
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, content, { mode: 0o755 });
  return filePath;
};

const makeTempMedia = async (ext: string) => {
  const dir = await makeTempDir("moltbot-media-e2e-");
  const filePath = path.join(dir, `sample${ext}`);
  await fs.writeFile(filePath, "audio");
  return { dir, filePath };
};

const envSnapshot = () => ({
  PATH: process.env.PATH,
  SHERPA_ONNX_MODEL_DIR: process.env.SHERPA_ONNX_MODEL_DIR,
  WHISPER_CPP_MODEL: process.env.WHISPER_CPP_MODEL,
});

const restoreEnv = (snapshot: ReturnType<typeof envSnapshot>) => {
  process.env.PATH = snapshot.PATH;
  process.env.SHERPA_ONNX_MODEL_DIR = snapshot.SHERPA_ONNX_MODEL_DIR;
  process.env.WHISPER_CPP_MODEL = snapshot.WHISPER_CPP_MODEL;
};

const withEnvSnapshot = async <T>(run: () => Promise<T>): Promise<T> => {
  const snapshot = envSnapshot();
  try {
    return await run();
  } finally {
    restoreEnv(snapshot);
  }
};

const createTrackedTempDir = async (tempPaths: string[], prefix: string) => {
  const dir = await makeTempDir(prefix);
  tempPaths.push(dir);
  return dir;
};

const createTrackedTempMedia = async (tempPaths: string[], ext: string) => {
  const media = await makeTempMedia(ext);
  tempPaths.push(media.dir);
  return media.filePath;
};

describe("media understanding auto-detect (e2e)", () => {
  let tempPaths: string[] = [];

  beforeEach(() => {
    clearMediaUnderstandingBinaryCacheForTests();
  });

  afterEach(async () => {
    for (const p of tempPaths) {
      await fs.rm(p, { recursive: true, force: true }).catch(() => {});
    }
    tempPaths = [];
  });

  it("uses sherpa-onnx-offline when available", async () => {
<<<<<<< HEAD
    const snapshot = envSnapshot();
    try {
      const binDir = await makeTempDir("moltbot-bin-sherpa-");
      const modelDir = await makeTempDir("moltbot-sherpa-model-");
      tempPaths.push(binDir, modelDir);
=======
    await withEnvSnapshot(async () => {
      const binDir = await createTrackedTempDir(tempPaths, "openclaw-bin-sherpa-");
      const modelDir = await createTrackedTempDir(tempPaths, "openclaw-sherpa-model-");
>>>>>>> a20c77325 (test(media): dedupe auto-e2e temp/env setup and cover no-binary path)

      await fs.writeFile(path.join(modelDir, "tokens.txt"), "a");
      await fs.writeFile(path.join(modelDir, "encoder.onnx"), "a");
      await fs.writeFile(path.join(modelDir, "decoder.onnx"), "a");
      await fs.writeFile(path.join(modelDir, "joiner.onnx"), "a");

      await writeExecutable(
        binDir,
        "sherpa-onnx-offline",
        `#!/usr/bin/env bash\necho "{\\"text\\":\\"sherpa ok\\"}"\n`,
      );

      process.env.PATH = `${binDir}:/usr/bin:/bin`;
      process.env.SHERPA_ONNX_MODEL_DIR = modelDir;

      const filePath = await createTrackedTempMedia(tempPaths, ".wav");

      const ctx: MsgContext = {
        Body: "<media:audio>",
        MediaPath: filePath,
        MediaType: "audio/wav",
      };
      const cfg: MoltbotConfig = { tools: { media: { audio: {} } } };

      await applyMediaUnderstanding({ ctx, cfg });

      expect(ctx.Transcript).toBe("sherpa ok");
    });
  });

  it("uses whisper-cli when sherpa is missing", async () => {
<<<<<<< HEAD
    const snapshot = envSnapshot();
    try {
      const binDir = await makeTempDir("moltbot-bin-whispercpp-");
      const modelDir = await makeTempDir("moltbot-whispercpp-model-");
      tempPaths.push(binDir, modelDir);
=======
    await withEnvSnapshot(async () => {
      const binDir = await createTrackedTempDir(tempPaths, "openclaw-bin-whispercpp-");
      const modelDir = await createTrackedTempDir(tempPaths, "openclaw-whispercpp-model-");
>>>>>>> a20c77325 (test(media): dedupe auto-e2e temp/env setup and cover no-binary path)

      const modelPath = path.join(modelDir, "tiny.bin");
      await fs.writeFile(modelPath, "model");

      await writeExecutable(
        binDir,
        "whisper-cli",
        "#!/usr/bin/env bash\n" +
          'out=""\n' +
          'prev=""\n' +
          'for arg in "$@"; do\n' +
          '  if [ "$prev" = "-of" ]; then out="$arg"; break; fi\n' +
          '  prev="$arg"\n' +
          "done\n" +
          'if [ -n "$out" ]; then echo \'whisper cpp ok\' > "${out}.txt"; fi\n',
      );

      process.env.PATH = `${binDir}:/usr/bin:/bin`;
      process.env.WHISPER_CPP_MODEL = modelPath;

      const filePath = await createTrackedTempMedia(tempPaths, ".wav");

      const ctx: MsgContext = {
        Body: "<media:audio>",
        MediaPath: filePath,
        MediaType: "audio/wav",
      };
      const cfg: MoltbotConfig = { tools: { media: { audio: {} } } };

      await applyMediaUnderstanding({ ctx, cfg });

      expect(ctx.Transcript).toBe("whisper cpp ok");
    });
  });

  it("uses gemini CLI for images when available", async () => {
<<<<<<< HEAD
    const snapshot = envSnapshot();
    try {
      const binDir = await makeTempDir("moltbot-bin-gemini-");
      tempPaths.push(binDir);
=======
    await withEnvSnapshot(async () => {
      const binDir = await createTrackedTempDir(tempPaths, "openclaw-bin-gemini-");
>>>>>>> a20c77325 (test(media): dedupe auto-e2e temp/env setup and cover no-binary path)

      await writeExecutable(
        binDir,
        "gemini",
        `#!/usr/bin/env bash\necho '{"response":"gemini ok"}'\n`,
      );

      process.env.PATH = `${binDir}:/usr/bin:/bin`;

      const filePath = await createTrackedTempMedia(tempPaths, ".png");

      const ctx: MsgContext = {
        Body: "<media:image>",
        MediaPath: filePath,
        MediaType: "image/png",
      };
      const cfg: MoltbotConfig = { tools: { media: { image: {} } } };

      await applyMediaUnderstanding({ ctx, cfg });

      expect(ctx.Body).toContain("gemini ok");
    });
  });

  it("skips auto-detect when no supported binaries are available", async () => {
    await withEnvSnapshot(async () => {
      const emptyBinDir = await createTrackedTempDir(tempPaths, "openclaw-bin-empty-");
      process.env.PATH = emptyBinDir;
      delete process.env.SHERPA_ONNX_MODEL_DIR;
      delete process.env.WHISPER_CPP_MODEL;

      const filePath = await createTrackedTempMedia(tempPaths, ".wav");
      const ctx: MsgContext = {
        Body: "<media:audio>",
        MediaPath: filePath,
        MediaType: "audio/wav",
      };
      const cfg: OpenClawConfig = { tools: { media: { audio: {} } } };

      await applyMediaUnderstanding({ ctx, cfg });

      expect(ctx.Transcript).toBeUndefined();
      expect(ctx.Body).toBe("<media:audio>");
    });
  });
});
