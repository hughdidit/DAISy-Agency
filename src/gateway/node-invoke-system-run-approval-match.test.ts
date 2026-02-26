import { describe, expect, test } from "vitest";
<<<<<<< HEAD
import { approvalMatchesSystemRunRequest } from "./node-invoke-system-run-approval-match.js";
import { buildSystemRunApprovalEnvBinding } from "./system-run-approval-env-binding.js";

describe("approvalMatchesSystemRunRequest", () => {
  test("matches legacy command text when binding fields match", () => {
    const result = approvalMatchesSystemRunRequest({
      cmdText: "echo SAFE",
=======
import { buildSystemRunApprovalBindingV1 } from "../infra/system-run-approval-binding.js";
import { evaluateSystemRunApprovalMatch } from "./node-invoke-system-run-approval-match.js";

describe("evaluateSystemRunApprovalMatch", () => {
  test("rejects approvals that do not carry v1 binding", () => {
    const result = evaluateSystemRunApprovalMatch({
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      argv: ["echo", "SAFE"],
      request: {
        host: "node",
        command: "echo SAFE",
<<<<<<< HEAD
        cwd: "/tmp",
        agentId: "agent-1",
        sessionKey: "session-1",
      },
      binding: {
        cwd: "/tmp",
        agentId: "agent-1",
        sessionKey: "session-1",
      },
    });
    expect(result).toBe(true);
  });

  test("rejects legacy command mismatch", () => {
    const result = approvalMatchesSystemRunRequest({
      cmdText: "echo PWNED",
      argv: ["echo", "PWNED"],
      request: {
        host: "node",
        command: "echo SAFE",
=======
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      },
      binding: {
        cwd: null,
        agentId: null,
        sessionKey: null,
      },
    });
    expect(result).toBe(false);
  });

<<<<<<< HEAD
  test("enforces exact argv binding when commandArgv is set", () => {
    const result = approvalMatchesSystemRunRequest({
      cmdText: "echo SAFE",
=======
  test("enforces exact argv binding in v1 object", () => {
    const result = evaluateSystemRunApprovalMatch({
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      argv: ["echo", "SAFE"],
      request: {
        host: "node",
        command: "echo SAFE",
        commandArgv: ["echo", "SAFE"],
      },
      binding: {
        cwd: null,
        agentId: null,
        sessionKey: null,
      },
    });
    expect(result).toBe(true);
  });

<<<<<<< HEAD
  test("rejects argv mismatch even when command text matches", () => {
    const result = approvalMatchesSystemRunRequest({
      cmdText: "echo SAFE",
=======
  test("rejects argv mismatch in v1 object", () => {
    const result = evaluateSystemRunApprovalMatch({
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      argv: ["echo", "SAFE"],
      request: {
        host: "node",
        command: "echo SAFE",
        commandArgv: ["echo SAFE"],
      },
      binding: {
        cwd: null,
        agentId: null,
        sessionKey: null,
      },
    });
    expect(result).toBe(false);
  });

<<<<<<< HEAD
  test("rejects env overrides when approval record lacks env hash", () => {
    const result = approvalMatchesSystemRunRequest({
      cmdText: "git diff",
=======
  test("rejects env overrides when v1 binding has no env hash", () => {
    const result = evaluateSystemRunApprovalMatch({
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      argv: ["git", "diff"],
      request: {
        host: "node",
        command: "git diff",
        systemRunBindingV1: buildSystemRunApprovalBindingV1({
          argv: ["git", "diff"],
          cwd: null,
          agentId: null,
          sessionKey: null,
        }).binding,
      },
      binding: {
        cwd: null,
        agentId: null,
        sessionKey: null,
        env: { GIT_EXTERNAL_DIFF: "/tmp/pwn.sh" },
      },
    });
    expect(result).toBe(false);
  });

  test("accepts matching env hash with reordered keys", () => {
<<<<<<< HEAD
    const binding = buildSystemRunApprovalEnvBinding({
      SAFE_A: "1",
      SAFE_B: "2",
    });
    const result = approvalMatchesSystemRunRequest({
      cmdText: "git diff",
=======
    const result = evaluateSystemRunApprovalMatch({
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      argv: ["git", "diff"],
      request: {
        host: "node",
        command: "git diff",
<<<<<<< HEAD
        commandArgv: ["git", "diff"],
        envHash: binding.envHash,
=======
        systemRunBindingV1: buildSystemRunApprovalBindingV1({
          argv: ["git", "diff"],
          cwd: null,
          agentId: null,
          sessionKey: null,
          env: { SAFE_A: "1", SAFE_B: "2" },
        }).binding,
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      },
      binding: {
        cwd: null,
        agentId: null,
        sessionKey: null,
        env: { SAFE_B: "2", SAFE_A: "1" },
      },
    });
    expect(result).toBe(true);
  });

  test("rejects non-node host requests", () => {
<<<<<<< HEAD
    const result = approvalMatchesSystemRunRequest({
      cmdText: "echo SAFE",
=======
    const result = evaluateSystemRunApprovalMatch({
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      argv: ["echo", "SAFE"],
      request: {
        host: "gateway",
        command: "echo SAFE",
      },
      binding: {
        cwd: null,
        agentId: null,
        sessionKey: null,
      },
    });
<<<<<<< HEAD
    expect(result).toBe(false);
=======
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("unreachable");
    }
    expect(result.code).toBe("APPROVAL_REQUEST_MISMATCH");
  });

  test("uses v1 binding even when legacy command text diverges", () => {
    const result = evaluateSystemRunApprovalMatch({
      argv: ["echo", "SAFE"],
      request: {
        host: "node",
        command: "echo STALE",
        commandArgv: ["echo STALE"],
        systemRunBindingV1: buildSystemRunApprovalBindingV1({
          argv: ["echo", "SAFE"],
          cwd: null,
          agentId: null,
          sessionKey: null,
        }).binding,
      },
      binding: {
        cwd: null,
        agentId: null,
        sessionKey: null,
      },
    });
    expect(result).toEqual({ ok: true });
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
  });
});
