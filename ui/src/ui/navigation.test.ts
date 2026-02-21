import { describe, expect, it } from "vitest";

import {
  TAB_GROUPS,
  iconForTab,
  inferBasePathFromPathname,
  normalizeBasePath,
  normalizePath,
  pathForTab,
  subtitleForTab,
  tabFromPath,
  titleForTab,
  type Tab,
} from "./navigation.ts";

/** All valid tab identifiers derived from TAB_GROUPS */
const ALL_TABS: Tab[] = TAB_GROUPS.flatMap((group) => group.tabs) as Tab[];

describe("iconForTab", () => {
  it("returns a non-empty string for every tab", () => {
    for (const tab of ALL_TABS) {
      const icon = iconForTab(tab);
      expect(icon).toBeTruthy();
      expect(typeof icon).toBe("string");
      expect(icon.length).toBeGreaterThan(0);
    }
  });

  it("returns stable icons for known tabs", () => {
<<<<<<< HEAD
    expect(iconForTab("chat")).toBe("💬");
    expect(iconForTab("overview")).toBe("📊");
    expect(iconForTab("channels")).toBe("🔗");
    expect(iconForTab("instances")).toBe("📡");
    expect(iconForTab("sessions")).toBe("📄");
    expect(iconForTab("cron")).toBe("⏰");
    expect(iconForTab("skills")).toBe("⚡️");
    expect(iconForTab("nodes")).toBe("🖥️");
    expect(iconForTab("config")).toBe("⚙️");
    expect(iconForTab("debug")).toBe("🐞");
    expect(iconForTab("logs")).toBe("🧾");
=======
    const cases = [
      { tab: "chat", icon: "messageSquare" },
      { tab: "overview", icon: "barChart" },
      { tab: "channels", icon: "link" },
      { tab: "instances", icon: "radio" },
      { tab: "sessions", icon: "fileText" },
      { tab: "cron", icon: "loader" },
      { tab: "skills", icon: "zap" },
      { tab: "nodes", icon: "monitor" },
      { tab: "config", icon: "settings" },
      { tab: "debug", icon: "bug" },
      { tab: "logs", icon: "scrollText" },
    ] as const;
    for (const testCase of cases) {
      expect(iconForTab(testCase.tab), testCase.tab).toBe(testCase.icon);
    }
>>>>>>> 1baac3e31 (test(ui): consolidate navigation/scroll/format matrices)
  });

  it("returns a fallback icon for unknown tab", () => {
    // TypeScript won't allow this normally, but runtime could receive unexpected values
    const unknownTab = "unknown" as Tab;
    expect(iconForTab(unknownTab)).toBe("📁");
  });
});

describe("titleForTab", () => {
  it("returns a non-empty string for every tab", () => {
    for (const tab of ALL_TABS) {
      const title = titleForTab(tab);
      expect(title).toBeTruthy();
      expect(typeof title).toBe("string");
    }
  });

  it("returns expected titles", () => {
    const cases = [
      { tab: "chat", title: "Chat" },
      { tab: "overview", title: "Overview" },
      { tab: "cron", title: "Cron Jobs" },
    ] as const;
    for (const testCase of cases) {
      expect(titleForTab(testCase.tab), testCase.tab).toBe(testCase.title);
    }
  });
});

describe("subtitleForTab", () => {
  it("returns a string for every tab", () => {
    for (const tab of ALL_TABS) {
      const subtitle = subtitleForTab(tab);
      expect(typeof subtitle).toBe("string");
    }
  });

  it("returns descriptive subtitles", () => {
    expect(subtitleForTab("chat")).toContain("chat session");
    expect(subtitleForTab("config")).toContain("moltbot.json");
  });
});

describe("normalizeBasePath", () => {
<<<<<<< HEAD
  it("returns empty string for falsy input", () => {
    expect(normalizeBasePath("")).toBe("");
  });

  it("adds leading slash if missing", () => {
    expect(normalizeBasePath("ui")).toBe("/ui");
  });

  it("removes trailing slash", () => {
    expect(normalizeBasePath("/ui/")).toBe("/ui");
  });

  it("returns empty string for root path", () => {
    expect(normalizeBasePath("/")).toBe("");
  });

  it("handles nested paths", () => {
    expect(normalizeBasePath("/apps/moltbot")).toBe("/apps/moltbot");
=======
  it("normalizes base-path variants", () => {
    const cases = [
      { input: "", expected: "" },
      { input: "ui", expected: "/ui" },
      { input: "/ui/", expected: "/ui" },
      { input: "/", expected: "" },
      { input: "/apps/openclaw", expected: "/apps/openclaw" },
    ] as const;
    for (const testCase of cases) {
      expect(normalizeBasePath(testCase.input), testCase.input).toBe(testCase.expected);
    }
>>>>>>> 1baac3e31 (test(ui): consolidate navigation/scroll/format matrices)
  });
});

describe("normalizePath", () => {
  it("normalizes paths", () => {
    const cases = [
      { input: "", expected: "/" },
      { input: "chat", expected: "/chat" },
      { input: "/chat/", expected: "/chat" },
      { input: "/", expected: "/" },
    ] as const;
    for (const testCase of cases) {
      expect(normalizePath(testCase.input), testCase.input).toBe(testCase.expected);
    }
  });
});

describe("pathForTab", () => {
<<<<<<< HEAD
  it("returns correct path without base", () => {
    expect(pathForTab("chat")).toBe("/chat");
    expect(pathForTab("overview")).toBe("/overview");
  });

  it("prepends base path", () => {
    expect(pathForTab("chat", "/ui")).toBe("/ui/chat");
    expect(pathForTab("sessions", "/apps/moltbot")).toBe("/apps/moltbot/sessions");
=======
  it("builds tab paths with optional bases", () => {
    const cases = [
      { tab: "chat", base: undefined, expected: "/chat" },
      { tab: "overview", base: undefined, expected: "/overview" },
      { tab: "chat", base: "/ui", expected: "/ui/chat" },
      { tab: "sessions", base: "/apps/openclaw", expected: "/apps/openclaw/sessions" },
    ] as const;
    for (const testCase of cases) {
      expect(
        pathForTab(testCase.tab, testCase.base),
        `${testCase.tab}:${testCase.base ?? "root"}`,
      ).toBe(testCase.expected);
    }
>>>>>>> 1baac3e31 (test(ui): consolidate navigation/scroll/format matrices)
  });
});

describe("tabFromPath", () => {
<<<<<<< HEAD
  it("returns tab for valid path", () => {
    expect(tabFromPath("/chat")).toBe("chat");
    expect(tabFromPath("/overview")).toBe("overview");
    expect(tabFromPath("/sessions")).toBe("sessions");
  });

  it("returns chat for root path", () => {
    expect(tabFromPath("/")).toBe("chat");
  });

  it("handles base paths", () => {
    expect(tabFromPath("/ui/chat", "/ui")).toBe("chat");
    expect(tabFromPath("/apps/moltbot/sessions", "/apps/moltbot")).toBe("sessions");
  });

  it("returns null for unknown path", () => {
    expect(tabFromPath("/unknown")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(tabFromPath("/CHAT")).toBe("chat");
    expect(tabFromPath("/Overview")).toBe("overview");
=======
  it("resolves tabs from path variants", () => {
    const cases = [
      { path: "/chat", base: undefined, expected: "chat" },
      { path: "/overview", base: undefined, expected: "overview" },
      { path: "/sessions", base: undefined, expected: "sessions" },
      { path: "/", base: undefined, expected: "chat" },
      { path: "/ui/chat", base: "/ui", expected: "chat" },
      { path: "/apps/openclaw/sessions", base: "/apps/openclaw", expected: "sessions" },
      { path: "/unknown", base: undefined, expected: null },
      { path: "/CHAT", base: undefined, expected: "chat" },
      { path: "/Overview", base: undefined, expected: "overview" },
    ] as const;
    for (const testCase of cases) {
      expect(
        tabFromPath(testCase.path, testCase.base),
        `${testCase.path}:${testCase.base ?? "root"}`,
      ).toBe(testCase.expected);
    }
>>>>>>> 1baac3e31 (test(ui): consolidate navigation/scroll/format matrices)
  });
});

describe("inferBasePathFromPathname", () => {
<<<<<<< HEAD
  it("returns empty string for root", () => {
    expect(inferBasePathFromPathname("/")).toBe("");
  });

  it("returns empty string for direct tab path", () => {
    expect(inferBasePathFromPathname("/chat")).toBe("");
    expect(inferBasePathFromPathname("/overview")).toBe("");
  });

  it("infers base path from nested paths", () => {
    expect(inferBasePathFromPathname("/ui/chat")).toBe("/ui");
    expect(inferBasePathFromPathname("/apps/moltbot/sessions")).toBe("/apps/moltbot");
  });

  it("handles index.html suffix", () => {
    expect(inferBasePathFromPathname("/index.html")).toBe("");
    expect(inferBasePathFromPathname("/ui/index.html")).toBe("/ui");
=======
  it("infers base-path variants from pathname", () => {
    const cases = [
      { path: "/", expected: "" },
      { path: "/chat", expected: "" },
      { path: "/overview", expected: "" },
      { path: "/ui/chat", expected: "/ui" },
      { path: "/apps/openclaw/sessions", expected: "/apps/openclaw" },
      { path: "/index.html", expected: "" },
      { path: "/ui/index.html", expected: "/ui" },
    ] as const;
    for (const testCase of cases) {
      expect(inferBasePathFromPathname(testCase.path), testCase.path).toBe(testCase.expected);
    }
>>>>>>> 1baac3e31 (test(ui): consolidate navigation/scroll/format matrices)
  });
});

describe("TAB_GROUPS", () => {
  it("contains all expected groups", () => {
    const labels = TAB_GROUPS.map((g) => g.label.toLowerCase());
    for (const expected of ["chat", "control", "agent", "settings"]) {
      expect(labels).toContain(expected);
    }
  });

  it("all tabs are unique", () => {
    const allTabs = TAB_GROUPS.flatMap((g) => g.tabs);
    const uniqueTabs = new Set(allTabs);
    expect(uniqueTabs.size).toBe(allTabs.length);
  });
});
