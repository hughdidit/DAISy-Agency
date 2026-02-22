import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SessionEntry as PiSessionEntry, SessionHeader } from "@mariozechner/pi-coding-agent";
import { SessionManager } from "@mariozechner/pi-coding-agent";
import {
  resolveDefaultSessionStorePath,
  resolveSessionFilePath,
  resolveSessionFilePathOptions,
} from "../../config/sessions/paths.js";
import { loadSessionStore } from "../../config/sessions/store.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { getRemoteSkillEligibility } from "../../infra/skills-remote.js";
import { buildTtsSystemPromptHint } from "../../tts/tts.js";
=======
=======
import type { SessionEntry } from "../../config/sessions/types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { resolveUserPath } from "../../utils.js";
import type { ReplyPayload } from "../types.js";
import { resolveCommandsSystemPromptBundle } from "./commands-system-prompt.js";
<<<<<<< HEAD
>>>>>>> f6111622e (refactor(commands): share system prompt bundle for context and export)
=======
import type { HandleCommandsParams } from "./commands-types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { resolveCommandsSystemPromptBundle } from "./commands-system-prompt.js";
>>>>>>> 4fa35d3fd (Revert "fix: use resolveUserPath utility for tilde expansion")
=======
import type { SessionEntry } from "../../config/sessions/types.js";
import type { ReplyPayload } from "../types.js";
import { resolveCommandsSystemPromptBundle } from "./commands-system-prompt.js";
import type { HandleCommandsParams } from "./commands-types.js";
>>>>>>> c49234cbf (chore: chore: Fix types in tests 4/N.)
=======
import { resolveCommandsSystemPromptBundle } from "./commands-system-prompt.js";
>>>>>>> ed11e93cf (chore(format))
=======
import type { SessionEntry } from "../../config/sessions/types.js";
import type { ReplyPayload } from "../types.js";
import { resolveCommandsSystemPromptBundle } from "./commands-system-prompt.js";
import type { HandleCommandsParams } from "./commands-types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { resolveCommandsSystemPromptBundle } from "./commands-system-prompt.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { SessionEntry } from "../../config/sessions/types.js";
import type { ReplyPayload } from "../types.js";
import { resolveCommandsSystemPromptBundle } from "./commands-system-prompt.js";
import type { HandleCommandsParams } from "./commands-types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

// Export HTML templates are bundled with this module
const EXPORT_HTML_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "export-html");

interface SessionData {
  header: SessionHeader | null;
  entries: PiSessionEntry[];
  leafId: string | null;
  systemPrompt?: string;
  tools?: Array<{ name: string; description?: string; parameters?: unknown }>;
}

function loadTemplate(fileName: string): string {
  return fs.readFileSync(path.join(EXPORT_HTML_DIR, fileName), "utf-8");
}

function generateHtml(sessionData: SessionData): string {
  const template = loadTemplate("template.html");
  const templateCss = loadTemplate("template.css");
  const templateJs = loadTemplate("template.js");
  const markedJs = loadTemplate(path.join("vendor", "marked.min.js"));
  const hljsJs = loadTemplate(path.join("vendor", "highlight.min.js"));

  // Use default theme colors
  const themeVars = `
    --bg: #1a1a2e;
    --fg: #eaeaea;
    --userMessageBg: #2d2d44;
    --assistantMessageBg: #1e1e30;
    --toolCallBg: #252538;
    --toolResultBg: #1c1c2c;
    --codeBg: #0d0d14;
    --borderColor: #3a3a5a;
    --linkColor: #6b9fff;
    --errorColor: #ff6b6b;
    --successColor: #6bff6b;
    --warningColor: #ffcc00;
  `;
  const bodyBg = "#1a1a2e";
  const containerBg = "#1e1e30";
  const infoBg = "#2a2a40";

  // Base64 encode session data
  const sessionDataBase64 = Buffer.from(JSON.stringify(sessionData)).toString("base64");

  // Build CSS with theme variables
  const css = templateCss
    .replace("/* {{THEME_VARS}} */", themeVars.trim())
    .replace("/* {{BODY_BG_DECL}} */", `--body-bg: ${bodyBg};`)
    .replace("/* {{CONTAINER_BG_DECL}} */", `--container-bg: ${containerBg};`)
    .replace("/* {{INFO_BG_DECL}} */", `--info-bg: ${infoBg};`);

  return template
    .replace("{{CSS}}", css)
    .replace("{{JS}}", templateJs)
    .replace("{{SESSION_DATA}}", sessionDataBase64)
    .replace("{{MARKED_JS}}", markedJs)
    .replace("{{HIGHLIGHT_JS}}", hljsJs);
}

function parseExportArgs(commandBodyNormalized: string): { outputPath?: string } {
  const normalized = commandBodyNormalized.trim();
  if (normalized === "/export-session" || normalized === "/export") {
    return {};
  }
  const args = normalized.replace(/^\/(export-session|export)\s*/, "").trim();
  // First non-flag argument is the output path
  const outputPath = args.split(/\s+/).find((part) => !part.startsWith("-"));
  return { outputPath };
}

export async function buildExportSessionReply(params: HandleCommandsParams): Promise<ReplyPayload> {
  const args = parseExportArgs(params.command.commandBodyNormalized);

  // 1. Resolve session file
  const sessionEntry = params.sessionEntry;
  if (!sessionEntry?.sessionId) {
    return { text: "❌ No active session found." };
  }

  const storePath = resolveDefaultSessionStorePath(params.agentId);
  const store = loadSessionStore(storePath, { skipCache: true });
  const entry = store[params.sessionKey] as SessionEntry | undefined;
  if (!entry?.sessionId) {
    return { text: `❌ Session not found: ${params.sessionKey}` };
  }

  let sessionFile: string;
  try {
    sessionFile = resolveSessionFilePath(
      entry.sessionId,
      entry,
      resolveSessionFilePathOptions({ agentId: params.agentId, storePath }),
    );
  } catch (err) {
    return {
      text: `❌ Failed to resolve session file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!fs.existsSync(sessionFile)) {
    return { text: `❌ Session file not found: ${sessionFile}` };
  }

  // 2. Load session entries
  const sessionManager = SessionManager.open(sessionFile);
  const entries = sessionManager.getEntries();
  const header = sessionManager.getHeader();
  const leafId = sessionManager.getLeafId();

  // 3. Build full system prompt
  const { systemPrompt, tools } = await resolveCommandsSystemPromptBundle(params);

  // 4. Prepare session data
  const sessionData: SessionData = {
    header,
    entries,
    leafId,
    systemPrompt,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  };

  // 5. Generate HTML
  const html = generateHtml(sessionData);

  // 6. Determine output path
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const defaultFileName = `openclaw-session-${entry.sessionId.slice(0, 8)}-${timestamp}.html`;
  const outputPath = args.outputPath
<<<<<<< HEAD
    ? path.resolve(args.outputPath.startsWith("~") ? args.outputPath.replace("~", process.env.HOME ?? "") : args.outputPath)
=======
    ? path.resolve(
        args.outputPath.startsWith("~")
          ? args.outputPath.replace("~", process.env.HOME ?? "")
          : args.outputPath,
      )
>>>>>>> 4fa35d3fd (Revert "fix: use resolveUserPath utility for tilde expansion")
    : path.join(params.workspaceDir, defaultFileName);

  // Ensure directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 7. Write file
  fs.writeFileSync(outputPath, html, "utf-8");

  const relativePath = path.relative(params.workspaceDir, outputPath);
  const displayPath = relativePath.startsWith("..") ? outputPath : relativePath;

  return {
    text: [
      "✅ Session exported!",
      "",
      `📄 File: ${displayPath}`,
      `📊 Entries: ${entries.length}`,
      `🧠 System prompt: ${systemPrompt.length.toLocaleString()} chars`,
      `🔧 Tools: ${tools.length}`,
    ].join("\n"),
  };
}
