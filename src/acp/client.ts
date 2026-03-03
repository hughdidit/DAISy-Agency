import { spawn, type ChildProcess } from "node:child_process";
import * as readline from "node:readline";
import { Readable, Writable } from "node:stream";

import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  ndJsonStream,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
} from "@agentclientprotocol/sdk";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as readline from "node:readline";
import { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { ensureOpenClawCliOnPath } from "../infra/path-env.js";
import { DANGEROUS_ACP_TOOLS } from "../security/dangerous-tools.js";

import { ensureOpenClawCliOnPath } from "../infra/path-env.js";

export async function resolvePermissionRequest(
  params: RequestPermissionRequest,
  deps: PermissionResolverDeps = {},
): Promise<RequestPermissionResponse> {
  const log = deps.log ?? ((line: string) => console.error(line));
  const prompt = deps.prompt ?? promptUserPermission;
  const options = params.options ?? [];
  const toolTitle = params.toolCall?.title ?? "tool";
  const toolName = resolveToolNameForPermission(params);

  if (options.length === 0) {
    log(`[permission cancelled] ${toolName ?? "unknown"}: no options available`);
    return cancelledPermission();
  }

  const allowOption = pickOption(options, ["allow_once", "allow_always"]);
  const rejectOption = pickOption(options, ["reject_once", "reject_always"]);
  const promptRequired = !toolName || DANGEROUS_ACP_TOOLS.has(toolName);

  if (!promptRequired) {
    const option = allowOption ?? options[0];
    if (!option) {
      log(`[permission cancelled] ${toolName}: no selectable options`);
      return cancelledPermission();
    }
    log(`[permission auto-approved] ${toolName}`);
    return selectedPermission(option.optionId);
  }

  log(`\n[permission requested] ${toolTitle}${toolName ? ` (${toolName})` : ""}`);
  const approved = await prompt(toolName, toolTitle);

  if (approved && allowOption) {
    return selectedPermission(allowOption.optionId);
  }
  if (!approved && rejectOption) {
    return selectedPermission(rejectOption.optionId);
  }

  log(
    `[permission cancelled] ${toolName ?? "unknown"}: missing ${approved ? "allow" : "reject"} option`,
  );
  return cancelledPermission();
}

export type AcpClientOptions = {
  cwd?: string;
  serverCommand?: string;
  serverArgs?: string[];
  serverVerbose?: boolean;
  verbose?: boolean;
};

export type AcpClientHandle = {
  client: ClientSideConnection;
  agent: ChildProcess;
  sessionId: string;
};

function toArgs(value: string[] | string | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function buildServerArgs(opts: AcpClientOptions): string[] {
  const args = ["acp", ...toArgs(opts.serverArgs)];
  if (opts.serverVerbose && !args.includes("--verbose") && !args.includes("-v")) {
    args.push("--verbose");
  }
  return args;
}

function resolveSelfEntryPath(): string | null {
  // Prefer a path relative to the built module location (dist/acp/client.js -> dist/entry.js).
  try {
    const here = fileURLToPath(import.meta.url);
    const candidate = path.resolve(path.dirname(here), "..", "entry.js");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  } catch {
    // ignore
  }

  const argv1 = process.argv[1]?.trim();
  if (argv1) {
    return path.isAbsolute(argv1) ? argv1 : path.resolve(process.cwd(), argv1);
  }
  return null;
}

function printSessionUpdate(notification: SessionNotification): void {
  const update = notification.update;
  if (!("sessionUpdate" in update)) return;

  switch (update.sessionUpdate) {
    case "agent_message_chunk": {
      if (update.content?.type === "text") {
        process.stdout.write(update.content.text);
      }
      return;
    }
    case "tool_call": {
      console.log(`\n[tool] ${update.title} (${update.status})`);
      return;
    }
    case "tool_call_update": {
      if (update.status) {
        console.log(`[tool update] ${update.toolCallId}: ${update.status}`);
      }
      return;
    }
    case "available_commands_update": {
      const names = update.availableCommands?.map((cmd) => `/${cmd.name}`).join(" ");
      if (names) console.log(`\n[commands] ${names}`);
      return;
    }
    default:
      return;
  }
}

export async function createAcpClient(opts: AcpClientOptions = {}): Promise<AcpClientHandle> {
  const cwd = opts.cwd ?? process.cwd();
  const verbose = Boolean(opts.verbose);
  const log = verbose ? (msg: string) => console.error(`[acp-client] ${msg}`) : () => {};

  ensureOpenClawCliOnPath({ cwd });
  const serverCommand = opts.serverCommand ?? "openclaw";
  const serverArgs = buildServerArgs(opts);

  const entryPath = resolveSelfEntryPath();
  const serverCommand = opts.serverCommand ?? (entryPath ? process.execPath : "openclaw");
  const effectiveArgs = opts.serverCommand || !entryPath ? serverArgs : [entryPath, ...serverArgs];

  log(`spawning: ${serverCommand} ${effectiveArgs.join(" ")}`);

  const agent = spawn(serverCommand, effectiveArgs, {
    stdio: ["pipe", "pipe", "inherit"],
    cwd,
  });

  if (!agent.stdin || !agent.stdout) {
    throw new Error("Failed to create ACP stdio pipes");
  }

  const input = Writable.toWeb(agent.stdin);
  const output = Readable.toWeb(agent.stdout) as unknown as ReadableStream<Uint8Array>;
  const stream = ndJsonStream(input, output);

  const client = new ClientSideConnection(
    () => ({
      sessionUpdate: async (params: SessionNotification) => {
        printSessionUpdate(params);
      },
      requestPermission: async (params: RequestPermissionRequest) => {
        console.log("\n[permission requested]", params.toolCall?.title ?? "tool");
        const options = params.options ?? [];
        const allowOnce = options.find((option) => option.kind === "allow_once");
        const fallback = options[0];
        return {
          outcome: {
            outcome: "selected",
            optionId: allowOnce?.optionId ?? fallback?.optionId ?? "allow",
          },
        };
      },
    }),
    stream,
  );

  log("initializing");
  await client.initialize({
    protocolVersion: PROTOCOL_VERSION,
    clientCapabilities: {
      fs: { readTextFile: true, writeTextFile: true },
      terminal: true,
    },
    clientInfo: { name: "openclaw-acp-client", version: "1.0.0" },
  });

  log("creating session");
  const session = await client.newSession({
    cwd,
    mcpServers: [],
  });

  return {
    client,
    agent,
    sessionId: session.sessionId,
  };
}

export async function runAcpClientInteractive(opts: AcpClientOptions = {}): Promise<void> {
  const { client, agent, sessionId } = await createAcpClient(opts);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("OpenClaw ACP client");
  console.log(`Session: ${sessionId}`);
  console.log('Type a prompt, or "exit" to quit.\n');

  const prompt = () => {
    rl.question("> ", async (input) => {
      const text = input.trim();
      if (!text) {
        prompt();
        return;
      }
      if (text === "exit" || text === "quit") {
        agent.kill();
        rl.close();
        process.exit(0);
      }

      try {
        const response = await client.prompt({
          sessionId,
          prompt: [{ type: "text", text }],
        });
        console.log(`\n[${response.stopReason}]\n`);
      } catch (err) {
        console.error(`\n[error] ${String(err)}\n`);
      }

      prompt();
    });
  };

  prompt();

  agent.on("exit", (code) => {
    console.log(`\nAgent exited with code ${code ?? 0}`);
    rl.close();
    process.exit(code ?? 0);
  });
}
