import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { assertSandboxPath } from "../sandbox-paths.js";
import type { SandboxFsBridge } from "../sandbox/fs-bridge.js";
import { resolveWorkspaceRoot } from "../workspace-dir.js";
import {
  GENERATED_IMAGES_DIRNAME,
  type SavedGeneratedImage,
  type ValidatedGeneratedImage,
} from "./image-generate.types.js";

type ImageGenerateSandboxConfig = {
  root: string;
  bridge: SandboxFsBridge;
};

function formatTimestampSlug(date: Date): string {
  const iso = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return iso;
}

function buildBaseName(params: { date: Date; requestFingerprint: string; bytes: Buffer }): string {
  const hash = crypto
    .createHash("sha256")
    .update(params.requestFingerprint)
    .update("\n")
    .update(params.bytes)
    .digest("hex")
    .slice(0, 12);
  return `${formatTimestampSlug(params.date)}-${hash}`;
}

async function writeGeneratedImageSandboxed(params: {
  sandbox: ImageGenerateSandboxConfig;
  relativeFilePath: string;
  validated: ValidatedGeneratedImage;
}): Promise<string> {
  const resolved = params.sandbox.bridge.resolvePath({
    filePath: params.relativeFilePath,
    cwd: params.sandbox.root,
  });
  await assertSandboxPath({
    filePath: resolved.hostPath,
    cwd: params.sandbox.root,
    root: params.sandbox.root,
  });
  await params.sandbox.bridge.writeFile({
    filePath: params.relativeFilePath,
    cwd: params.sandbox.root,
    data: params.validated.bytes,
    mkdir: true,
    exclusive: true,
  });
  return resolved.hostPath;
}

export async function saveGeneratedImage(params: {
  workspaceDir?: string;
  sandbox?: ImageGenerateSandboxConfig;
  validated: ValidatedGeneratedImage;
  requestFingerprint: string;
  now?: Date;
}): Promise<SavedGeneratedImage> {
  const workspaceRoot = resolveWorkspaceRoot(params.sandbox?.root ?? params.workspaceDir);
  const outputDir = path.join(workspaceRoot, GENERATED_IMAGES_DIRNAME);
  const baseName = buildBaseName({
    date: params.now ?? new Date(),
    requestFingerprint: params.requestFingerprint,
    bytes: params.validated.bytes,
  });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${String(attempt).padStart(2, "0")}`;
    const fileName = `${baseName}${suffix}${params.validated.extension}`;
    const localPath = path.join(outputDir, fileName);

    if (params.sandbox) {
      const relativeFilePath = path.join(GENERATED_IMAGES_DIRNAME, fileName);
      try {
        const savedPath = await writeGeneratedImageSandboxed({
          sandbox: params.sandbox,
          relativeFilePath,
          validated: params.validated,
        });
        return {
          localPath: savedPath,
          fileName,
          mimeType: params.validated.mimeType,
          sizeBytes: params.validated.sizeBytes,
          width: params.validated.width,
          height: params.validated.height,
        };
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError?.code === "EEXIST") {
          continue;
        }
        throw error;
      }
    }

    await fs.mkdir(outputDir, { recursive: true });
    try {
      const handle = await fs.open(localPath, "wx");
      try {
        await handle.writeFile(params.validated.bytes);
      } finally {
        await handle.close();
      }
      return {
        localPath,
        fileName,
        mimeType: params.validated.mimeType,
        sizeBytes: params.validated.sizeBytes,
        width: params.validated.width,
        height: params.validated.height,
      };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError?.code === "EEXIST") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to allocate a unique generated image filename.");
}
