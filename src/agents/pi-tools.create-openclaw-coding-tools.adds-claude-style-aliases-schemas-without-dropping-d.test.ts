import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import "./test-helpers/fast-coding-tools.js";
<<<<<<< HEAD
import { createMoltbotCodingTools } from "./pi-tools.js";
=======
import { createOpenClawCodingTools } from "./pi-tools.js";
import { createHostSandboxFsBridge } from "./test-helpers/host-sandbox-fs-bridge.js";
<<<<<<< HEAD
>>>>>>> 31c6a12cf (fix(agents): restore missing runtime helpers and sandbox types)
=======
import { createPiToolsSandboxContext } from "./test-helpers/pi-tools-sandbox-context.js";
>>>>>>> b96419fab (test(agents): share pi-tools sandbox fixture context)

<<<<<<< HEAD
const defaultTools = createMoltbotCodingTools();
=======
const defaultTools = createOpenClawCodingTools();
const tinyPngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2f7z8AAAAASUVORK5CYII=",
  "base64",
);
>>>>>>> c7a4346e4 (test: remove sharp dependency from read-tool metadata test)

<<<<<<< HEAD
describe("createMoltbotCodingTools", () => {
  it("keeps read tool image metadata intact", async () => {
=======
describe("createOpenClawCodingTools", () => {
  it("returns image metadata for images and text-only blocks for text files", async () => {
>>>>>>> 96515a572 (test: merge duplicate read-tool content coverage cases)
    const readTool = defaultTools.find((tool) => tool.name === "read");
    expect(readTool).toBeDefined();

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-read-"));
    try {
      const imagePath = path.join(tmpDir, "sample.png");
      await fs.writeFile(imagePath, tinyPngBuffer);

      const imageResult = await readTool?.execute("tool-1", {
        path: imagePath,
      });

      expect(imageResult?.content?.some((block) => block.type === "image")).toBe(true);
      const imageText = imageResult?.content?.find((block) => block.type === "text") as
        | { text?: string }
        | undefined;
      expect(imageText?.text ?? "").toContain("Read image file [image/png]");
      const image = imageResult?.content?.find((block) => block.type === "image") as
        | { mimeType?: string }
        | undefined;
      expect(image?.mimeType).toBe("image/png");
<<<<<<< HEAD
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
  it("returns text content without image blocks for text files", async () => {
<<<<<<< HEAD
    const tools = createMoltbotCodingTools();
    const readTool = tools.find((tool) => tool.name === "read");
=======
    const readTool = defaultTools.find((tool) => tool.name === "read");
>>>>>>> c7a4346e4 (test: remove sharp dependency from read-tool metadata test)
    expect(readTool).toBeDefined();

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-read-"));
    try {
=======

>>>>>>> 96515a572 (test: merge duplicate read-tool content coverage cases)
      const textPath = path.join(tmpDir, "sample.txt");
      const contents = "Hello from moltbot read tool.";
      await fs.writeFile(textPath, contents, "utf8");

      const textResult = await readTool?.execute("tool-2", {
        path: textPath,
      });

      expect(textResult?.content?.some((block) => block.type === "image")).toBe(false);
      const textBlocks = textResult?.content?.filter((block) => block.type === "text") as
        | Array<{ text?: string }>
        | undefined;
      expect(textBlocks?.length ?? 0).toBeGreaterThan(0);
      const combinedText = textBlocks?.map((block) => block.text ?? "").join("\n");
      expect(combinedText).toContain(contents);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
  it("filters tools by sandbox policy", () => {
<<<<<<< HEAD
    const sandbox = {
      enabled: true,
      sessionKey: "sandbox:test",
      workspaceDir: path.join(os.tmpdir(), "moltbot-sandbox"),
=======
    const sandboxDir = path.join(os.tmpdir(), "moltbot-sandbox");
    const sandbox = createPiToolsSandboxContext({
      workspaceDir: sandboxDir,
>>>>>>> b96419fab (test(agents): share pi-tools sandbox fixture context)
      agentWorkspaceDir: path.join(os.tmpdir(), "moltbot-workspace"),
<<<<<<< HEAD
      workspaceAccess: "none",
      containerName: "moltbot-sbx-test",
=======
      workspaceAccess: "none" as const,
<<<<<<< HEAD
      containerName: "openclaw-sbx-test",
>>>>>>> 688f86bf2 (chore: Fix types in tests 43/N.)
      containerWorkdir: "/workspace",
      docker: {
        image: "moltbot-sandbox:bookworm-slim",
        containerPrefix: "moltbot-sbx-",
        workdir: "/workspace",
        readOnlyRoot: true,
        tmpfs: [],
        network: "none",
        user: "1000:1000",
        capDrop: ["ALL"],
        env: { LANG: "C.UTF-8" },
      },
=======
      fsBridge: createHostSandboxFsBridge(sandboxDir),
>>>>>>> b96419fab (test(agents): share pi-tools sandbox fixture context)
      tools: {
        allow: ["bash"],
        deny: ["browser"],
      },
<<<<<<< HEAD
      browserAllowHostControl: false,
    };
    const tools = createMoltbotCodingTools({ sandbox });
=======
    });
    const tools = createOpenClawCodingTools({ sandbox });
>>>>>>> b96419fab (test(agents): share pi-tools sandbox fixture context)
    expect(tools.some((tool) => tool.name === "exec")).toBe(true);
    expect(tools.some((tool) => tool.name === "read")).toBe(false);
    expect(tools.some((tool) => tool.name === "browser")).toBe(false);
  });
  it("hard-disables write/edit when sandbox workspaceAccess is ro", () => {
<<<<<<< HEAD
    const sandbox = {
      enabled: true,
      sessionKey: "sandbox:test",
      workspaceDir: path.join(os.tmpdir(), "moltbot-sandbox"),
=======
    const sandboxDir = path.join(os.tmpdir(), "moltbot-sandbox");
    const sandbox = createPiToolsSandboxContext({
      workspaceDir: sandboxDir,
>>>>>>> b96419fab (test(agents): share pi-tools sandbox fixture context)
      agentWorkspaceDir: path.join(os.tmpdir(), "moltbot-workspace"),
<<<<<<< HEAD
      workspaceAccess: "ro",
      containerName: "moltbot-sbx-test",
=======
      workspaceAccess: "ro" as const,
<<<<<<< HEAD
      containerName: "openclaw-sbx-test",
>>>>>>> 688f86bf2 (chore: Fix types in tests 43/N.)
      containerWorkdir: "/workspace",
      docker: {
        image: "moltbot-sandbox:bookworm-slim",
        containerPrefix: "moltbot-sbx-",
        workdir: "/workspace",
        readOnlyRoot: true,
        tmpfs: [],
        network: "none",
        user: "1000:1000",
        capDrop: ["ALL"],
        env: { LANG: "C.UTF-8" },
      },
=======
      fsBridge: createHostSandboxFsBridge(sandboxDir),
>>>>>>> b96419fab (test(agents): share pi-tools sandbox fixture context)
      tools: {
        allow: ["read", "write", "edit"],
        deny: [],
      },
<<<<<<< HEAD
      browserAllowHostControl: false,
    };
    const tools = createMoltbotCodingTools({ sandbox });
=======
    });
    const tools = createOpenClawCodingTools({ sandbox });
>>>>>>> b96419fab (test(agents): share pi-tools sandbox fixture context)
    expect(tools.some((tool) => tool.name === "read")).toBe(true);
    expect(tools.some((tool) => tool.name === "write")).toBe(false);
    expect(tools.some((tool) => tool.name === "edit")).toBe(false);
  });
<<<<<<< HEAD
  it("filters tools by agent tool policy even without sandbox", () => {
    const tools = createMoltbotCodingTools({
      config: { tools: { deny: ["browser"] } },
    });
    expect(tools.some((tool) => tool.name === "exec")).toBe(true);
    expect(tools.some((tool) => tool.name === "browser")).toBe(false);
  });
=======
>>>>>>> 63e4dfaa9 (test: consolidate pi-tools gating assertions)
});
