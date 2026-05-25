import { buildDriveReadCommand } from "../command-builder.js";
import { writeDriveBytesToWorkspace } from "../direct-google.js";
import { validateDriveReadParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

function maybeSaveExportedDriveFile(params: {
  ctx: InvocationContext;
  request: Record<string, unknown>;
  payload: Record<string, unknown>;
}): Record<string, unknown> {
  if (
    params.request.action !== "export_file" ||
    typeof params.request.outputPath !== "string" ||
    !params.request.outputPath.trim() ||
    typeof params.payload.contentBase64 !== "string"
  ) {
    return params.payload;
  }
  const bytes = Buffer.from(params.payload.contentBase64, "base64");
  const target = writeDriveBytesToWorkspace({
    workspaceDir: params.ctx.workspaceDir,
    fileId: String(params.request.fileId),
    fileName: params.request.fileId,
    outputPath: params.request.outputPath,
    overwrite: params.request.overwrite,
    bytes,
  });
  return {
    fileId: params.request.fileId,
    mimeType: params.payload.mimeType ?? params.request.mimeType,
    sizeBytes: bytes.length,
    workspaceRelativePath: target.workspaceRelativePath,
    path: target.path,
  };
}

export async function executeDriveRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateDriveReadParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_drive_read",
      service: "drive",
      readOnly: true,
      action: "unknown",
      message: "Invalid gws_drive_read params",
      issues: validated.errors,
    });
  }

  const value = validated.value as Record<string, unknown> & { action: string };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_drive_read",
    service: "drive",
    action: value.action,
    payload: value,
    readOnly: true,
    buildCommand: (auth) => buildDriveReadCommand(value, auth.args),
    transformPayload: (payload) =>
      maybeSaveExportedDriveFile({ ctx: params.ctx, request: value, payload }),
  });
}
