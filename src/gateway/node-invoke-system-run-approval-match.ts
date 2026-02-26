import type { ExecApprovalRequestPayload } from "../infra/exec-approvals.js";
<<<<<<< HEAD
import { matchSystemRunApprovalEnvBinding } from "./system-run-approval-env-binding.js";
=======
import {
  buildSystemRunApprovalBindingV1,
  missingSystemRunApprovalBindingV1,
  matchSystemRunApprovalBindingV1,
  type SystemRunApprovalMatchResult,
} from "../infra/system-run-approval-binding.js";
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)

export type SystemRunApprovalBinding = {
  cwd: string | null;
  agentId: string | null;
  sessionKey: string | null;
  env?: unknown;
};

function argvMatchesRequest(requestedArgv: string[], argv: string[]): boolean {
  if (requestedArgv.length === 0 || requestedArgv.length !== argv.length) {
    return false;
  }
  for (let i = 0; i < requestedArgv.length; i += 1) {
    if (requestedArgv[i] !== argv[i]) {
      return false;
    }
  }
  return true;
}

<<<<<<< HEAD
export function approvalMatchesSystemRunRequest(params: {
  cmdText: string;
  argv: string[];
  request: ExecApprovalRequestPayload;
  binding: SystemRunApprovalBinding;
}): boolean {
  return evaluateSystemRunApprovalMatch(params).ok;
}

export type SystemRunApprovalMatchResult =
  | { ok: true }
  | {
      ok: false;
      code: "APPROVAL_REQUEST_MISMATCH" | "APPROVAL_ENV_BINDING_MISSING" | "APPROVAL_ENV_MISMATCH";
      message: string;
      details?: Record<string, unknown>;
    };
=======
export { toSystemRunApprovalMismatchError } from "../infra/system-run-approval-binding.js";
export type { SystemRunApprovalMatchResult } from "../infra/system-run-approval-binding.js";
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)

export function evaluateSystemRunApprovalMatch(params: {
  argv: string[];
  request: ExecApprovalRequestPayload;
  binding: SystemRunApprovalBinding;
}): SystemRunApprovalMatchResult {
  if (params.request.host !== "node") {
    return {
      ok: false,
      code: "APPROVAL_REQUEST_MISMATCH",
      message: "approval id does not match request",
    };
  }

  const requestedArgv = params.request.commandArgv;
  if (Array.isArray(requestedArgv)) {
    if (!argvMatchesRequest(requestedArgv, params.argv)) {
      return {
        ok: false,
        code: "APPROVAL_REQUEST_MISMATCH",
        message: "approval id does not match request",
      };
    }
  } else if (!params.cmdText || params.request.command !== params.cmdText) {
    return {
      ok: false,
      code: "APPROVAL_REQUEST_MISMATCH",
      message: "approval id does not match request",
    };
  }

  if ((params.request.cwd ?? null) !== params.binding.cwd) {
    return {
      ok: false,
      code: "APPROVAL_REQUEST_MISMATCH",
      message: "approval id does not match request",
    };
  }
  if ((params.request.agentId ?? null) !== params.binding.agentId) {
    return {
      ok: false,
      code: "APPROVAL_REQUEST_MISMATCH",
      message: "approval id does not match request",
    };
  }
  if ((params.request.sessionKey ?? null) !== params.binding.sessionKey) {
    return {
      ok: false,
      code: "APPROVAL_REQUEST_MISMATCH",
      message: "approval id does not match request",
    };
  }

  const envMatch = matchSystemRunApprovalEnvBinding({
    request: params.request,
    env: params.binding.env,
  });
<<<<<<< HEAD
  if (!envMatch.ok) {
    return envMatch;
  }

  return { ok: true };
=======

  const expectedBinding = params.request.systemRunBindingV1;
  if (!expectedBinding) {
    return missingSystemRunApprovalBindingV1({
      actualEnvKeys: actualBinding.envKeys,
    });
  }
  return matchSystemRunApprovalBindingV1({
    expected: expectedBinding,
    actual: actualBinding.binding,
    actualEnvKeys: actualBinding.envKeys,
  });
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
}
