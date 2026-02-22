import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { listRuntimeSourceFiles, shouldSkipRuntimeSourcePath } from "../test-utils/repo-scan.js";

const RUNTIME_ROOTS = ["src", "extensions"] as const;
<<<<<<< HEAD
const SKIP_PATTERNS = [
  /\.test\.tsx?$/,
  /\.test-utils\.tsx?$/,
  /\.e2e\.tsx?$/,
  /\.d\.ts$/,
  /[\\/](?:__tests__|tests)[\\/]/,
  /[\\/][^\\/]*test-helpers(?:\.[^\\/]+)?\.ts$/,
];
=======
const QUICK_TMPDIR_JOIN_PATTERN = /\bpath\.join\s*\(\s*os\.tmpdir\s*\(\s*\)/;
>>>>>>> 29cc7f431 (test: share runtime scan filters and cached test scans)

function isIdentifierNamed(node: ts.Node, name: string): node is ts.Identifier {
  return ts.isIdentifier(node) && node.text === name;
}

function isPathJoinCall(expr: ts.LeftHandSideExpression): boolean {
  return (
    ts.isPropertyAccessExpression(expr) &&
    expr.name.text === "join" &&
    isIdentifierNamed(expr.expression, "path")
  );
}

function isOsTmpdirCall(node: ts.Expression): boolean {
  return (
    ts.isCallExpression(node) &&
    node.arguments.length === 0 &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "tmpdir" &&
    isIdentifierNamed(node.expression.expression, "os")
  );
}

function isDynamicTemplateSegment(node: ts.Expression): boolean {
  return ts.isTemplateExpression(node);
}

function mightContainDynamicTmpdirJoin(source: string): boolean {
  return source.includes("path.join") && source.includes("os.tmpdir") && source.includes("`");
}

function hasDynamicTmpdirJoin(source: string, filePath = "fixture.ts"): boolean {
  if (!mightContainDynamicTmpdirJoin(source)) {
    return false;
  }
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  let found = false;

  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isCallExpression(node) &&
      isPathJoinCall(node.expression) &&
      node.arguments.length >= 2 &&
      isOsTmpdirCall(node.arguments[0]) &&
      node.arguments.slice(1).some((arg) => isDynamicTemplateSegment(arg))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

describe("temp path guard", () => {
  it("skips test helper filename variants", () => {
    expect(shouldSkipRuntimeSourcePath("src/commands/test-helpers.ts")).toBe(true);
    expect(shouldSkipRuntimeSourcePath("src/commands/sessions.test-helpers.ts")).toBe(true);
    expect(shouldSkipRuntimeSourcePath("src\\commands\\sessions.test-helpers.ts")).toBe(true);
  });

  it("detects dynamic and ignores static fixtures", () => {
    const dynamicFixtures = [
      "const p = path.join(os.tmpdir(), `openclaw-${id}`);",
      "const p = path.join(os.tmpdir(), 'safe', `${token}`);",
    ];
    const staticFixtures = [
      "const p = path.join(os.tmpdir(), 'openclaw-fixed');",
      "const p = path.join(os.tmpdir(), `openclaw-fixed`);",
      "const p = path.join(os.tmpdir(), prefix + '-x');",
      "const p = path.join(os.tmpdir(), segment);",
      "const p = path.join('/tmp', `openclaw-${id}`);",
      "// path.join(os.tmpdir(), `openclaw-${id}`)",
      "const p = path.join(os.tmpdir());",
    ];

    for (const fixture of dynamicFixtures) {
      expect(hasDynamicTmpdirJoin(fixture)).toBe(true);
    }
    for (const fixture of staticFixtures) {
      expect(hasDynamicTmpdirJoin(fixture)).toBe(false);
    }
  });
  it("blocks dynamic template path.join(os.tmpdir(), ...) in runtime source files", async () => {
    const repoRoot = process.cwd();
    const offenders: string[] = [];

<<<<<<< HEAD
<<<<<<< HEAD
    for (const root of RUNTIME_ROOTS) {
      const absRoot = path.join(repoRoot, root);
      const files = await listTsFiles(absRoot);
      for (const file of files) {
        const relativePath = path.relative(repoRoot, file);
        if (shouldSkip(relativePath)) {
          continue;
        }
        const source = await fs.readFile(file, "utf-8");
        if (hasDynamicTmpdirJoin(source, relativePath)) {
          offenders.push(relativePath);
        }
=======
    const files = await listRepoFiles(repoRoot, {
=======
    const files = await listRuntimeSourceFiles(repoRoot, {
>>>>>>> 29cc7f431 (test: share runtime scan filters and cached test scans)
      roots: RUNTIME_ROOTS,
      extensions: [".ts", ".tsx"],
    });
    for (const file of files) {
      const relativePath = path.relative(repoRoot, file);
      const source = await fs.readFile(file, "utf-8");
      if (!QUICK_TMPDIR_JOIN_PATTERN.test(source)) {
        continue;
      }
      if (hasDynamicTmpdirJoin(source, relativePath)) {
        offenders.push(relativePath);
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      }
    }

    expect(offenders).toEqual([]);
  }, 240_000);
});
