import { describe, expect, it } from "vitest";
import {
  authorizeOperatorScopesForMethod,
  isGatewayMethodClassified,
  resolveLeastPrivilegeOperatorScopesForMethod,
} from "./method-scopes.js";
import { listGatewayMethods } from "./server-methods-list.js";
import { coreGatewayHandlers } from "./server-methods.js";

describe("method scope resolution", () => {
  it("classifies sessions.resolve as read and poll as write", () => {
    expect(resolveLeastPrivilegeOperatorScopesForMethod("sessions.resolve")).toEqual([
      "operator.read",
    ]);
    expect(resolveLeastPrivilegeOperatorScopesForMethod("poll")).toEqual(["operator.write"]);
  });

  it("classifies Kanban methods with their least-privilege read/write scopes", () => {
    const readMethods = [
      "kanban.status",
      "kanban.board.get",
      "kanban.cards.list",
      "kanban.cards.get",
      "kanban.activity.list",
    ];
    const writeMethods = [
      "kanban.import.trello.preview",
      "kanban.cards.create",
      "kanban.cards.update",
      "kanban.cards.move",
      "kanban.cards.comment",
      "kanban.cards.attachments.add",
      "kanban.cards.attachments.archive",
      "kanban.cards.archive",
      "kanban.import.trello.run",
      "kanban.codex.pickNext",
      "kanban.codex.handoff",
      "kanban.codex.complete",
      "kanban.agent.pickNext",
      "kanban.agent.handoff",
      "kanban.agent.complete",
    ];

    for (const method of readMethods) {
      expect(resolveLeastPrivilegeOperatorScopesForMethod(method)).toEqual(["operator.read"]);
    }
    for (const method of writeMethods) {
      expect(resolveLeastPrivilegeOperatorScopesForMethod(method)).toEqual(["operator.write"]);
    }
  });

  it("returns empty scopes for unknown methods", () => {
    expect(resolveLeastPrivilegeOperatorScopesForMethod("totally.unknown.method")).toEqual([]);
  });
});

describe("operator scope authorization", () => {
  it("allows read methods with operator.read or operator.write", () => {
    expect(authorizeOperatorScopesForMethod("health", ["operator.read"])).toEqual({
      allowed: true,
    });
    expect(authorizeOperatorScopesForMethod("health", ["operator.write"])).toEqual({
      allowed: true,
    });
  });

  it("requires operator.write for write methods", () => {
    expect(authorizeOperatorScopesForMethod("send", ["operator.read"])).toEqual({
      allowed: false,
      missingScope: "operator.write",
    });
  });

  it("requires approvals scope for approval methods", () => {
    expect(authorizeOperatorScopesForMethod("exec.approval.resolve", ["operator.write"])).toEqual({
      allowed: false,
      missingScope: "operator.approvals",
    });
  });

  it("requires admin for unknown methods", () => {
    expect(authorizeOperatorScopesForMethod("unknown.method", ["operator.read"])).toEqual({
      allowed: false,
      missingScope: "operator.admin",
    });
  });
});

describe("core gateway method classification", () => {
  it("classifies every exposed core gateway handler method", () => {
    const unclassified = Object.keys(coreGatewayHandlers).filter(
      (method) => !isGatewayMethodClassified(method),
    );
    expect(unclassified).toEqual([]);
  });

  it("classifies every listed gateway method name", () => {
    const unclassified = listGatewayMethods().filter(
      (method) => !isGatewayMethodClassified(method),
    );
    expect(unclassified).toEqual([]);
  });
});
