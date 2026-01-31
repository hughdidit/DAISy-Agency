import JSON5 from "json5";
import { describe, expect, it } from "vitest";

import { parseFrontmatterBlock } from "./frontmatter.js";

describe("parseFrontmatterBlock", () => {
  it("parses YAML block scalars", () => {
    const content = `---
name: yaml-hook
description: |
  line one
  line two
---
`;
    const result = parseFrontmatterBlock(content);
    expect(result.name).toBe("yaml-hook");
    expect(result.description).toBe("line one\nline two");
  });

  it("handles JSON5-style multi-line metadata", () => {
    const content = `---
name: session-memory
metadata:
  {
    "moltbot":
      {
        "emoji": "disk",
        "events": ["command:new"],
      },
  }
---
`;
    const result = parseFrontmatterBlock(content);
    expect(result.metadata).toBeDefined();

<<<<<<< HEAD
    const parsed = JSON5.parse(result.metadata ?? "") as { moltbot?: { emoji?: string } };
    expect(parsed.moltbot?.emoji).toBe("disk");
=======
    const parsed = JSON5.parse(result.metadata ?? "");
    expect(parsed.openclaw?.emoji).toBe("disk");
>>>>>>> 15792b153 (chore: Enable more lint rules, disable some that trigger a lot. Will clean up later.)
  });

  it("preserves inline JSON values", () => {
    const content = `---
name: inline-json
metadata: {"moltbot": {"events": ["test"]}}
---
`;
    const result = parseFrontmatterBlock(content);
    expect(result.metadata).toBe('{"moltbot": {"events": ["test"]}}');
  });

  it("stringifies YAML objects and arrays", () => {
    const content = `---
name: yaml-objects
enabled: true
retries: 3
tags:
  - alpha
  - beta
metadata:
  moltbot:
    events:
      - command:new
---
`;
    const result = parseFrontmatterBlock(content);
    expect(result.enabled).toBe("true");
    expect(result.retries).toBe("3");
    expect(JSON.parse(result.tags ?? "[]")).toEqual(["alpha", "beta"]);
<<<<<<< HEAD
    const parsed = JSON5.parse(result.metadata ?? "") as { moltbot?: { events?: string[] } };
    expect(parsed.moltbot?.events).toEqual(["command:new"]);
=======
    const parsed = JSON5.parse(result.metadata ?? "");
    expect(parsed.openclaw?.events).toEqual(["command:new"]);
>>>>>>> 15792b153 (chore: Enable more lint rules, disable some that trigger a lot. Will clean up later.)
  });

  it("returns empty when frontmatter is missing", () => {
    const content = "# No frontmatter";
    expect(parseFrontmatterBlock(content)).toEqual({});
  });
});
