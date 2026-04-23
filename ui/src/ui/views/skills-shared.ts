import { html, nothing } from "lit";
import type { SkillStatusEntry } from "../types.ts";
import { computeCapabilityDetails, renderCapabilityClassChip } from "./capability-readiness.ts";

export function computeSkillMissing(skill: SkillStatusEntry): string[] {
  return [
    ...skill.missing.bins.map((b) => `bin:${b}`),
    ...skill.missing.env.map((e) => `env:${e}`),
    ...skill.missing.config.map((c) => `config:${c}`),
    ...skill.missing.os.map((o) => `os:${o}`),
  ];
}

export function computeSkillDetails(skill: SkillStatusEntry): string[] {
  return computeCapabilityDetails(skill.capability);
}

export function renderSkillStatusChips(params: {
  skill: SkillStatusEntry;
  showBundledBadge?: boolean;
}) {
  const skill = params.skill;
  const showBundledBadge = Boolean(params.showBundledBadge);
  return html`
    <div class="chip-row" style="margin-top: 6px;">
      <span class="chip">${skill.source}</span>
      ${
        showBundledBadge
          ? html`
              <span class="chip">bundled</span>
            `
          : nothing
      }
      ${renderCapabilityClassChip(skill.capabilityClass)}
      ${
        skill.disabled
          ? html`
              <span class="chip chip-warn">disabled</span>
            `
          : nothing
      }
    </div>
  `;
}
