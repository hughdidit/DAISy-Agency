import type { ResolvedCapabilityManifest } from "../../shared/resolved-capability-manifest.js";
import type { SkillStatusReport } from "../skills-status.js";
import { buildSkillStatusReportFromManifest } from "./joins.js";
import {
  collectReadonlyCapabilityInputs,
  type ReadonlyCapabilityCollectorParams,
} from "./collect-readonly.js";
import { resolveCapabilityManifest } from "./resolve.js";

export type ReadonlySkillStatusAssembly = {
  collected: ReturnType<typeof collectReadonlyCapabilityInputs>;
  manifest: ResolvedCapabilityManifest;
  report: SkillStatusReport;
};

export function buildReadonlySkillStatusReport(
  params: ReadonlyCapabilityCollectorParams,
): ReadonlySkillStatusAssembly {
  const collected = collectReadonlyCapabilityInputs(params);
  const manifest = resolveCapabilityManifest(collected);
  const report = buildSkillStatusReportFromManifest({
    workspaceDir: params.workspaceDir ?? "/workspace",
    managedSkillsDir: collected.managedSkillsDir,
    skills: collected.skills,
    manifest,
  });
  return {
    collected,
    manifest,
    report,
  };
}
