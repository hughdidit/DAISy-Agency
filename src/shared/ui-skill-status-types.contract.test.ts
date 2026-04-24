import { describe, expectTypeOf, it } from "vitest";
import type {
  ResolvedSkillCapability as UiResolvedSkillCapability,
  ResolvedToolCapability as UiResolvedToolCapability,
  SkillStatusEntry as UiSkillStatusEntry,
  SkillStatusReport as UiSkillStatusReport,
  ToolsCatalogResult as UiToolsCatalogResult,
} from "../../ui/src/ui/types.js";
import type {
  SkillStatusEntry as GatewaySkillStatusEntry,
  SkillsStatusResult as GatewaySkillsStatusResult,
  ToolsCatalogResult as GatewayToolsCatalogResult,
} from "../gateway/protocol/schema/types.js";
import type {
  ResolvedSkillCapability,
  ResolvedToolCapability,
} from "./resolved-capability-manifest.js";

describe("ui type contracts", () => {
  it("keeps UI skills.status types aligned with the gateway protocol result", () => {
    expectTypeOf<UiSkillStatusReport>().toEqualTypeOf<GatewaySkillsStatusResult>();
    expectTypeOf<UiSkillStatusEntry>().toEqualTypeOf<GatewaySkillStatusEntry>();
  });

  it("re-exports the shared resolved skill capability type for UI helpers", () => {
    expectTypeOf<UiResolvedSkillCapability>().toEqualTypeOf<ResolvedSkillCapability>();
  });

  it("keeps UI tools catalog types aligned with the gateway protocol result", () => {
    expectTypeOf<UiToolsCatalogResult>().toEqualTypeOf<GatewayToolsCatalogResult>();
  });

  it("re-exports the shared resolved tool capability type for UI helpers", () => {
    expectTypeOf<UiResolvedToolCapability>().toEqualTypeOf<ResolvedToolCapability>();
  });
});
