import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REQUIRED_CLASSIFICATIONS = [
  "clearly-host-only-today",
  "likely-convertible",
  "explicit-break-glass",
  "stale-host-assumption",
] as const;

const REQUIRED_HEADERS = [
  "ID",
  "Workflow",
  "User/operator surface",
  "Code or doc evidence",
  "Classification",
  "Host rationale",
  "Need type",
  "Owner/subsystem",
  "Recommended next step",
  "SBX-504/SBX-505 input",
] as const;

const REQUIRED_MARKERS = [
  "/bash",
  "! <command>",
  "!poll",
  "!stop",
  "/elevated",
  "/exec",
  "tools.elevated",
  "/acp",
  'sessions_spawn runtime="acp"',
  "SBX-404",
  "host-only-blocks",
  "subagent",
  "cron",
  "Docker Release",
  "staging deploy",
  "SBX-504 outcome",
  "chat-bash",
  "exec-gateway",
  "exec-node",
  "acp-runtime",
  "gateway-restart",
  "runtime-debug",
  "sandbox-dangerous-override",
] as const;

function parseTableLine(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function parseInventoryRows(markdown: string): Array<Record<string, string>> {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex(
    (line) => line.startsWith("| ID ") && line.includes("Classification"),
  );
  expect(headerIndex).toBeGreaterThan(-1);

  const headers = parseTableLine(lines[headerIndex]);
  expect(headers).toEqual([...REQUIRED_HEADERS]);

  const rows: Array<Record<string, string>> = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("| `HWI-")) {
      break;
    }
    const cells = parseTableLine(line);
    expect(cells).toHaveLength(headers.length);
    rows.push(Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
  }
  return rows;
}

describe("host-only workflows inventory docs", () => {
  it("keeps the SBX-503 inventory mechanically consumable", async () => {
    const docPath = path.join(process.cwd(), "docs", "gateway", "host-only-workflows-inventory.md");
    const markdown = await fs.readFile(docPath, "utf8");
    const rows = parseInventoryRows(markdown);

    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(new Set(rows.map((row) => row.ID)).size).toBe(rows.length);
    expect(rows.every((row) => /^`HWI-\d{3}`$/.test(row.ID))).toBe(true);

    for (const classification of REQUIRED_CLASSIFICATIONS) {
      expect(markdown).toContain(`\`${classification}\``);
      expect(rows.some((row) => row.Classification === `\`${classification}\``)).toBe(true);
    }
  });

  it("anchors required host-only and stale-assumption surfaces in repo evidence", async () => {
    const docPath = path.join(process.cwd(), "docs", "gateway", "host-only-workflows-inventory.md");
    const markdown = await fs.readFile(docPath, "utf8");

    for (const marker of REQUIRED_MARKERS) {
      expect(markdown).toContain(marker);
    }
  });
});
