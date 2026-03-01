import fs from "node:fs";
import path from "node:path";
<<<<<<< HEAD

import { resolveMoltbotPackageRoot } from "../infra/moltbot-root.js";
=======
import { resolveOpenClawPackageRoot } from "../infra/openclaw-root.js";
>>>>>>> f06dd8df0 (chore: Enable "experimentalSortImports" in Oxfmt and reformat all imorts.)

export async function resolveMoltbotDocsPath(params: {
  workspaceDir?: string;
  argv1?: string;
  cwd?: string;
  moduleUrl?: string;
}): Promise<string | null> {
  const workspaceDir = params.workspaceDir?.trim();
  if (workspaceDir) {
    const workspaceDocs = path.join(workspaceDir, "docs");
    if (fs.existsSync(workspaceDocs)) return workspaceDocs;
  }

  const packageRoot = await resolveMoltbotPackageRoot({
    cwd: params.cwd,
    argv1: params.argv1,
    moduleUrl: params.moduleUrl,
  });
  if (!packageRoot) return null;

  const packageDocs = path.join(packageRoot, "docs");
  return fs.existsSync(packageDocs) ? packageDocs : null;
}
