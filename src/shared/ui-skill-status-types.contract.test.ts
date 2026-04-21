import { describe, expectTypeOf, it } from "vitest";
import type {
  SkillStatusEntry as UiSkillStatusEntry,
  SkillStatusReport as UiSkillStatusReport,
  ToolsCatalogResult as UiToolsCatalogResult,
} from "../../ui/src/ui/types.js";
import type {
  SkillStatusEntry as GatewaySkillStatusEntry,
  SkillsStatusResult as GatewaySkillsStatusResult,
  ToolsCatalogResult as GatewayToolsCatalogResult,
} from "../gateway/protocol/schema/types.js";
import type { ResolvedSkillCapability } from "./resolved-capability-manifest.js";

describe("ui type contracts", () => {
  it("keeps UI skills.status types aligned with the gateway protocol result", () => {
    expectTypeOf<UiSkillStatusReport>().toEqualTypeOf<GatewaySkillsStatusResult>();
    expectTypeOf<UiSkillStatusEntry>().toEqualTypeOf<GatewaySkillStatusEntry>();
  });

  it("exposes the shared resolved skill capability through the UI skill entry type", () => {
    expectTypeOf<UiSkillStatusEntry["capability"]>().toMatchTypeOf<ResolvedSkillCapability>();
    expectTypeOf<ResolvedSkillCapability>().toMatchTypeOf<UiSkillStatusEntry["capability"]>();
  });

  it("keeps UI tools catalog types aligned with the gateway protocol result", () => {
    expectTypeOf<UiToolsCatalogResult>().toEqualTypeOf<GatewayToolsCatalogResult>();
  });
});
