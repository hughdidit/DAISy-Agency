import type { ExecApprovalRequestPayload } from "../infra/exec-approvals.js";
import {
<<<<<<< HEAD
  buildSystemRunApprovalBindingV1,
  matchLegacySystemRunApprovalBinding,
  matchSystemRunApprovalBindingV1,
=======
  buildSystemRunApprovalBinding,
  missingSystemRunApprovalBinding,
  matchSystemRunApprovalBinding,
>>>>>>> 155118751 (refactor!: remove versioned system-run approval contract)
  type SystemRunApprovalMatchResult,
} from "./system-run-approval-binding.js";

export type SystemRunApprovalBinding = {
  cwd: string | null;
  agentId: string | null;
  sessionKey: string | null;
  env?: unknown;
};

function requestMismatch(): SystemRunApprovalMatchResult {
  return {
    ok: false,
    code: "APPROVAL_REQUEST_MISMATCH",
    message: "approval id does not match request",
  };
}

export { toSystemRunApprovalMismatchError } from "./system-run-approval-binding.js";
export type { SystemRunApprovalMatchResult } from "./system-run-approval-binding.js";

export function evaluateSystemRunApprovalMatch(params: {
  cmdText: string;
  argv: string[];
  request: ExecApprovalRequestPayload;
  binding: SystemRunApprovalBinding;
}): SystemRunApprovalMatchResult {
  if (params.request.host !== "node") {
    return requestMismatch();
  }

  const actualBinding = buildSystemRunApprovalBinding({
    argv: params.argv,
    cwd: params.binding.cwd,
    agentId: params.binding.agentId,
    sessionKey: params.binding.sessionKey,
    env: params.binding.env,
  });

<<<<<<< HEAD
  const expectedBinding = params.request.systemRunBindingV1;
  if (expectedBinding) {
    return matchSystemRunApprovalBindingV1({
      expected: expectedBinding,
      actual: actualBinding.binding,
      actualEnvKeys: actualBinding.envKeys,
    });
  }

  return matchLegacySystemRunApprovalBinding({
    request: params.request,
    cmdText: params.cmdText,
    argv: params.argv,
    binding: params.binding,
=======
  const expectedBinding = params.request.systemRunBinding;
  if (!expectedBinding) {
    return missingSystemRunApprovalBinding({
      actualEnvKeys: actualBinding.envKeys,
    });
  }
  return matchSystemRunApprovalBinding({
    expected: expectedBinding,
    actual: actualBinding.binding,
    actualEnvKeys: actualBinding.envKeys,
>>>>>>> 155118751 (refactor!: remove versioned system-run approval contract)
  });
}
