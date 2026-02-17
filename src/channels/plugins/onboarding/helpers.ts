<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../../../routing/session-key.js";
import type { PromptAccountId, PromptAccountIdParams } from "../onboarding-types.js";
=======
import type { PromptAccountId, PromptAccountIdParams } from "../onboarding-types.js";
import { promptAccountId as promptAccountIdSdk } from "../../../plugin-sdk/onboarding.js";
>>>>>>> 0d0ebd0e2 (refactor(onboarding): share promptAccountId helper)
=======
import { promptAccountId as promptAccountIdSdk } from "../../../plugin-sdk/onboarding.js";
import type { PromptAccountId, PromptAccountIdParams } from "../onboarding-types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { PromptAccountId, PromptAccountIdParams } from "../onboarding-types.js";
import { promptAccountId as promptAccountIdSdk } from "../../../plugin-sdk/onboarding.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { promptAccountId as promptAccountIdSdk } from "../../../plugin-sdk/onboarding.js";
import type { PromptAccountId, PromptAccountIdParams } from "../onboarding-types.js";
>>>>>>> d0cb8c19b (chore: wtf.)

export const promptAccountId: PromptAccountId = async (params: PromptAccountIdParams) => {
  return await promptAccountIdSdk(params);
};

export function addWildcardAllowFrom(allowFrom?: Array<string | number> | null): string[] {
  const next = (allowFrom ?? []).map((v) => String(v).trim()).filter(Boolean);
  if (!next.includes("*")) {
    next.push("*");
  }
  return next;
}

export function mergeAllowFromEntries(
  current: Array<string | number> | null | undefined,
  additions: Array<string | number>,
): string[] {
  const merged = [...(current ?? []), ...additions].map((v) => String(v).trim()).filter(Boolean);
  return [...new Set(merged)];
}
