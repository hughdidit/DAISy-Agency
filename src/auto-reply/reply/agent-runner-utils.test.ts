<<<<<<< HEAD
import { describe, expect, it } from "vitest";

import type { MoltbotConfig } from "../../config/config.js";
import type { TemplateContext } from "../templating.js";
import { buildThreadingToolContext } from "./agent-runner-utils.js";

describe("buildThreadingToolContext", () => {
  const cfg = {} as MoltbotConfig;

  it("uses conversation id for WhatsApp", () => {
    const sessionCtx = {
      Provider: "whatsapp",
      From: "123@g.us",
      To: "+15550001",
    } as TemplateContext;

    const result = buildThreadingToolContext({
      sessionCtx,
      config: cfg,
      hasRepliedRef: undefined,
    });

    expect(result.currentChannelId).toBe("123@g.us");
  });

  it("falls back to To for WhatsApp when From is missing", () => {
    const sessionCtx = {
      Provider: "whatsapp",
      To: "+15550001",
    } as TemplateContext;

    const result = buildThreadingToolContext({
      sessionCtx,
      config: cfg,
      hasRepliedRef: undefined,
    });

    expect(result.currentChannelId).toBe("+15550001");
  });

  it("uses the recipient id for other channels", () => {
    const sessionCtx = {
      Provider: "telegram",
      From: "user:42",
      To: "chat:99",
    } as TemplateContext;

    const result = buildThreadingToolContext({
      sessionCtx,
      config: cfg,
      hasRepliedRef: undefined,
    });

    expect(result.currentChannelId).toBe("chat:99");
  });

  it("uses the sender handle for iMessage direct chats", () => {
    const sessionCtx = {
      Provider: "imessage",
      ChatType: "direct",
      From: "imessage:+15550001",
      To: "chat_id:12",
    } as TemplateContext;

    const result = buildThreadingToolContext({
      sessionCtx,
      config: cfg,
      hasRepliedRef: undefined,
    });

    expect(result.currentChannelId).toBe("imessage:+15550001");
  });

  it("uses chat_id for iMessage groups", () => {
    const sessionCtx = {
      Provider: "imessage",
      ChatType: "group",
      From: "imessage:group:7",
      To: "chat_id:7",
    } as TemplateContext;

    const result = buildThreadingToolContext({
      sessionCtx,
      config: cfg,
      hasRepliedRef: undefined,
    });

    expect(result.currentChannelId).toBe("chat_id:7");
  });

  it("prefers MessageThreadId for Slack tool threading", () => {
    const sessionCtx = {
      Provider: "slack",
      To: "channel:C1",
      MessageThreadId: "123.456",
    } as TemplateContext;

    const result = buildThreadingToolContext({
      sessionCtx,
      config: { channels: { slack: { replyToMode: "all" } } } as MoltbotConfig,
      hasRepliedRef: undefined,
    });

    expect(result.currentChannelId).toBe("C1");
    expect(result.currentThreadTs).toBe("123.456");
=======
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FollowupRun } from "./queue.js";

const hoisted = vi.hoisted(() => {
  const resolveAgentModelFallbacksOverrideMock = vi.fn();
  const resolveAgentIdFromSessionKeyMock = vi.fn();
  return { resolveAgentModelFallbacksOverrideMock, resolveAgentIdFromSessionKeyMock };
});

vi.mock("../../agents/agent-scope.js", () => ({
  resolveAgentModelFallbacksOverride: (...args: unknown[]) =>
    hoisted.resolveAgentModelFallbacksOverrideMock(...args),
}));

vi.mock("../../config/sessions.js", () => ({
  resolveAgentIdFromSessionKey: (...args: unknown[]) =>
    hoisted.resolveAgentIdFromSessionKeyMock(...args),
}));

const {
  buildEmbeddedRunBaseParams,
  buildEmbeddedRunContexts,
  resolveModelFallbackOptions,
  resolveProviderScopedAuthProfile,
} = await import("./agent-runner-utils.js");

function makeRun(overrides: Partial<FollowupRun["run"]> = {}): FollowupRun["run"] {
  return {
    sessionId: "session-1",
    agentId: "agent-1",
    config: { models: { providers: {} } },
    provider: "openai",
    model: "gpt-4.1",
    agentDir: "/tmp/agent",
    sessionKey: "agent:test:session",
    sessionFile: "/tmp/session.json",
    workspaceDir: "/tmp/workspace",
    skillsSnapshot: [],
    ownerNumbers: ["+15550001"],
    enforceFinalTag: false,
    thinkLevel: "medium",
    verboseLevel: "off",
    reasoningLevel: "none",
    execOverrides: {},
    bashElevated: false,
    timeoutMs: 60_000,
    ...overrides,
  } as unknown as FollowupRun["run"];
}

describe("agent-runner-utils", () => {
  beforeEach(() => {
    hoisted.resolveAgentModelFallbacksOverrideMock.mockReset();
    hoisted.resolveAgentIdFromSessionKeyMock.mockReset();
  });

  it("resolves model fallback options from run context", () => {
    hoisted.resolveAgentIdFromSessionKeyMock.mockReturnValue("agent-id");
    hoisted.resolveAgentModelFallbacksOverrideMock.mockReturnValue(["fallback-model"]);
    const run = makeRun();

    const resolved = resolveModelFallbackOptions(run);

    expect(hoisted.resolveAgentIdFromSessionKeyMock).toHaveBeenCalledWith(run.sessionKey);
    expect(hoisted.resolveAgentModelFallbacksOverrideMock).toHaveBeenCalledWith(
      run.config,
      "agent-id",
    );
    expect(resolved).toEqual({
      cfg: run.config,
      provider: run.provider,
      model: run.model,
      agentDir: run.agentDir,
      fallbacksOverride: ["fallback-model"],
    });
  });

  it("builds embedded run base params with auth profile and run metadata", () => {
    const run = makeRun({ enforceFinalTag: true });
    const authProfile = resolveProviderScopedAuthProfile({
      provider: "openai",
      primaryProvider: "openai",
      authProfileId: "profile-openai",
      authProfileIdSource: "user",
    });

    const resolved = buildEmbeddedRunBaseParams({
      run,
      provider: "openai",
      model: "gpt-4.1-mini",
      runId: "run-1",
      authProfile,
    });

    expect(resolved).toMatchObject({
      sessionFile: run.sessionFile,
      workspaceDir: run.workspaceDir,
      agentDir: run.agentDir,
      config: run.config,
      skillsSnapshot: run.skillsSnapshot,
      ownerNumbers: run.ownerNumbers,
      enforceFinalTag: true,
      provider: "openai",
      model: "gpt-4.1-mini",
      authProfileId: "profile-openai",
      authProfileIdSource: "user",
      thinkLevel: run.thinkLevel,
      verboseLevel: run.verboseLevel,
      reasoningLevel: run.reasoningLevel,
      execOverrides: run.execOverrides,
      bashElevated: run.bashElevated,
      timeoutMs: run.timeoutMs,
      runId: "run-1",
    });
  });

  it("builds embedded contexts and scopes auth profile by provider", () => {
    const run = makeRun({
      authProfileId: "profile-openai",
      authProfileIdSource: "auto",
    });

    const resolved = buildEmbeddedRunContexts({
      run,
      sessionCtx: {
        Provider: "OpenAI",
        To: "channel-1",
        SenderId: "sender-1",
      },
      hasRepliedRef: undefined,
      provider: "anthropic",
    });

    expect(resolved.authProfile).toEqual({
      authProfileId: undefined,
      authProfileIdSource: undefined,
    });
    expect(resolved.embeddedContext).toMatchObject({
      sessionId: run.sessionId,
      sessionKey: run.sessionKey,
      agentId: run.agentId,
      messageProvider: "openai",
      messageTo: "channel-1",
    });
    expect(resolved.senderContext).toEqual({
      senderId: "sender-1",
      senderName: undefined,
      senderUsername: undefined,
      senderE164: undefined,
    });
>>>>>>> d7a6a0a0b (refactor(reply): share embedded run fallback/context builders)
  });
});
