<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import type { MoltbotConfig } from "../../config/config.js";
=======
import type { OpenClawConfig } from "../../config/config.js";
import { slackPlugin } from "../../../extensions/slack/src/channel.js";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
>>>>>>> 6ac5dd2c0 (test: cover telegram topic threadId auto-injection and subagent origin threading)
=======
=======
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
import { slackPlugin } from "../../../extensions/slack/src/channel.js";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { OpenClawConfig } from "../../config/config.js";
import { slackPlugin } from "../../../extensions/slack/src/channel.js";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { slackPlugin } from "../../../extensions/slack/src/channel.js";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "../../config/config.js";
import { slackPlugin } from "../../../extensions/slack/src/channel.js";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { slackPlugin } from "../../../extensions/slack/src/channel.js";
import { telegramPlugin } from "../../../extensions/telegram/src/channel.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { createTestRegistry } from "../../test-utils/channel-plugins.js";
import { slackPlugin } from "../../../extensions/slack/src/channel.js";

const mocks = vi.hoisted(() => ({
  executeSendAction: vi.fn(),
  recordSessionMetaFromInbound: vi.fn(async () => ({ ok: true })),
}));

vi.mock("./outbound-send-service.js", async () => {
  const actual = await vi.importActual<typeof import("./outbound-send-service.js")>(
    "./outbound-send-service.js",
  );
  return {
    ...actual,
    executeSendAction: mocks.executeSendAction,
  };
});

vi.mock("../../config/sessions.js", async () => {
  const actual = await vi.importActual<typeof import("../../config/sessions.js")>(
    "../../config/sessions.js",
  );
  return {
    ...actual,
    recordSessionMetaFromInbound: mocks.recordSessionMetaFromInbound,
  };
});

import { runMessageAction } from "./message-action-runner.js";

const slackConfig = {
  channels: {
    slack: {
      botToken: "xoxb-test",
      appToken: "xapp-test",
    },
  },
} as MoltbotConfig;

const telegramConfig = {
  channels: {
    telegram: {
      botToken: "telegram-test",
    },
  },
} as OpenClawConfig;

async function runThreadingAction(params: {
  cfg: OpenClawConfig;
  actionParams: Record<string, unknown>;
  toolContext?: Record<string, unknown>;
}) {
  await runMessageAction({
    cfg: params.cfg,
    action: "send",
    params: params.actionParams as never,
    toolContext: params.toolContext as never,
    agentId: "main",
  });
  return mocks.executeSendAction.mock.calls[0]?.[0] as {
    threadId?: string;
    replyToId?: string;
    ctx?: { agentId?: string; mirror?: { sessionKey?: string }; params?: Record<string, unknown> };
  };
}

function mockHandledSendAction() {
  mocks.executeSendAction.mockResolvedValue({
    handledBy: "plugin",
    payload: {},
  });
}

const defaultTelegramToolContext = {
  currentChannelId: "telegram:123",
  currentThreadTs: "42",
} as const;

let createPluginRuntime: typeof import("../../plugins/runtime/index.js").createPluginRuntime;
let setSlackRuntime: typeof import("../../../extensions/slack/src/runtime.js").setSlackRuntime;
let setTelegramRuntime: typeof import("../../../extensions/telegram/src/runtime.js").setTelegramRuntime;

describe("runMessageAction threading auto-injection", () => {
  beforeAll(async () => {
    ({ createPluginRuntime } = await import("../../plugins/runtime/index.js"));
    ({ setSlackRuntime } = await import("../../../extensions/slack/src/runtime.js"));
    ({ setTelegramRuntime } = await import("../../../extensions/telegram/src/runtime.js"));
  });

  beforeEach(() => {
    const runtime = createPluginRuntime();
    setSlackRuntime(runtime);
    setTelegramRuntime(runtime);
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "slack",
          source: "test",
          plugin: slackPlugin,
        },
        {
          pluginId: "telegram",
          source: "test",
          plugin: telegramPlugin,
        },
      ]),
    );
  });

  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
    mocks.executeSendAction.mockReset();
    mocks.recordSessionMetaFromInbound.mockReset();
  });

  it.each([
    {
      name: "exact channel id",
      target: "channel:C123",
      threadTs: "111.222",
      expectedSessionKey: "agent:main:slack:channel:c123:thread:111.222",
    },
    {
      name: "case-insensitive channel id",
      target: "channel:c123",
      threadTs: "333.444",
      expectedSessionKey: "agent:main:slack:channel:c123:thread:333.444",
    },
  ] as const)("auto-threads slack using $name", async (testCase) => {
    mockHandledSendAction();

    const call = await runThreadingAction({
      cfg: slackConfig,
      actionParams: {
        channel: "slack",
        target: testCase.target,
        message: "hi",
      },
      toolContext: {
        currentChannelId: "C123",
        currentThreadTs: testCase.threadTs,
        replyToMode: "all",
      },
    });

    expect(call?.ctx?.agentId).toBe("main");
    expect(call?.ctx?.mirror?.sessionKey).toBe(testCase.expectedSessionKey);
  });

  it.each([
    {
      name: "injects threadId for matching target",
      target: "telegram:123",
      expectedThreadId: "42",
    },
    {
      name: "injects threadId for prefixed group target",
      target: "telegram:group:123",
      expectedThreadId: "42",
    },
    {
      name: "skips threadId when target chat differs",
      target: "telegram:999",
      expectedThreadId: undefined,
    },
  ] as const)("telegram auto-threading: $name", async (testCase) => {
    mockHandledSendAction();

    const call = await runThreadingAction({
      cfg: telegramConfig,
      actionParams: {
        channel: "telegram",
        target: testCase.target,
        message: "hi",
      },
      toolContext: defaultTelegramToolContext,
    });

<<<<<<< HEAD
<<<<<<< HEAD
    const call = mocks.executeSendAction.mock.calls[0]?.[0] as { ctx?: { params?: any } };
=======
    expect(call?.threadId).toBe("42");
    expect(call?.ctx?.params?.threadId).toBe("42");
  });

  it("skips telegram auto-threading when target chat differs", async () => {
    mockHandledSendAction();

    const call = await runThreadingAction({
      cfg: telegramConfig,
      actionParams: {
        channel: "telegram",
        target: "telegram:999",
        message: "hi",
      },
      toolContext: defaultTelegramToolContext,
    });

    expect(call?.ctx?.params?.threadId).toBeUndefined();
  });

  it("matches telegram target with internal prefix variations", async () => {
    mockHandledSendAction();

    const call = await runThreadingAction({
      cfg: telegramConfig,
      actionParams: {
        channel: "telegram",
        target: "telegram:group:123",
        message: "hi",
      },
      toolContext: defaultTelegramToolContext,
    });

>>>>>>> 71111c997 (refactor(tests): dedupe gateway send and threading fixtures)
    expect(call?.ctx?.params?.threadId).toBe("42");
=======
    expect(call?.ctx?.params?.threadId).toBe(testCase.expectedThreadId);
    if (testCase.expectedThreadId !== undefined) {
      expect(call?.threadId).toBe(testCase.expectedThreadId);
    }
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
  });

  it("uses explicit telegram threadId when provided", async () => {
    mockHandledSendAction();

    const call = await runThreadingAction({
      cfg: telegramConfig,
      actionParams: {
        channel: "telegram",
        target: "telegram:123",
        message: "hi",
        threadId: "999",
      },
      toolContext: defaultTelegramToolContext,
    });

<<<<<<< HEAD
    const call = mocks.executeSendAction.mock.calls[0]?.[0] as { ctx?: { params?: any } };
    expect(call?.ctx?.params?.threadId).toBe("999");
  });
=======
    expect(call?.threadId).toBe("999");
    expect(call?.ctx?.params?.threadId).toBe("999");
  });

  it("threads explicit replyTo through executeSendAction", async () => {
    mockHandledSendAction();

    const call = await runThreadingAction({
      cfg: telegramConfig,
      actionParams: {
        channel: "telegram",
        target: "telegram:123",
        message: "hi",
        replyTo: "777",
      },
      toolContext: defaultTelegramToolContext,
    });

    expect(call?.replyToId).toBe("777");
    expect(call?.ctx?.params?.replyTo).toBe("777");
  });
>>>>>>> 71111c997 (refactor(tests): dedupe gateway send and threading fixtures)
});
