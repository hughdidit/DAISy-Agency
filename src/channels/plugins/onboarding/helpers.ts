<<<<<<< HEAD
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../../../routing/session-key.js";
import type { PromptAccountId, PromptAccountIdParams } from "../onboarding-types.js";
=======
import type { PromptAccountId, PromptAccountIdParams } from "../onboarding-types.js";
import { promptAccountId as promptAccountIdSdk } from "../../../plugin-sdk/onboarding.js";
>>>>>>> 0d0ebd0e2 (refactor(onboarding): share promptAccountId helper)

export const promptAccountId: PromptAccountId = async (params: PromptAccountIdParams) => {
  return await promptAccountIdSdk(params);
};

export function addWildcardAllowFrom(
  allowFrom?: Array<string | number> | null,
): Array<string | number> {
  const next = (allowFrom ?? []).map((v) => String(v).trim()).filter(Boolean);
  if (!next.includes("*")) {
    next.push("*");
  }
  return next;
}
