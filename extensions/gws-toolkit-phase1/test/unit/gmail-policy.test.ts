import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildGmailReadPolicyPayload,
  evaluateGmailMetadataContactPolicy,
  evaluateGmailWriteContactPolicy,
  gmailPolicyClassifyEmail,
  resolveGmailContactPolicy,
} from "../../src/gmail-policy.js";
import type { GmailContactPolicy } from "../../src/types.js";

const tempDirs: string[] = [];

async function makePolicyDir(params?: {
  whitelist?: unknown;
  blacklist?: unknown;
}): Promise<{ dir: string; configPath: string; whitelistPath: string; blacklistPath: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gws-gmail-policy-"));
  tempDirs.push(dir);
  const gwsDir = path.join(dir, "gws");
  await fs.mkdir(gwsDir);
  const whitelistPath = path.join(gwsDir, "gmail-whitelist.json");
  const blacklistPath = path.join(gwsDir, "gmail-blacklist.json");
  await fs.writeFile(
    whitelistPath,
    JSON.stringify(
      params?.whitelist ?? {
        version: 1,
        emails: ["HughDidIt@gmail.com"],
        domains: ["HughDidIt.com"],
      },
    ),
    "utf8",
  );
  await fs.writeFile(
    blacklistPath,
    JSON.stringify(
      params?.blacklist ?? {
        version: 1,
        emails: [],
        domains: [],
      },
    ),
    "utf8",
  );
  const configPath = path.join(dir, "openclaw.json");
  await fs.writeFile(configPath, "{}", "utf8");
  return { dir, configPath, whitelistPath, blacklistPath };
}

function mustResolvePolicy(policy: ReturnType<typeof resolveGmailContactPolicy>): GmailContactPolicy {
  expect(policy.ok).toBe(true);
  if (!policy.ok) {
    throw new Error(policy.error);
  }
  expect(policy.value).toBeDefined();
  return policy.value as GmailContactPolicy;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("gmail contact policy", () => {
  it("parses and normalizes seeded whitelist entries", async () => {
    const { configPath } = await makePolicyDir();

    const policy = mustResolvePolicy(
      resolveGmailContactPolicy({
        sourcePath: configPath,
        rawPolicy: {
          whitelistFile: "./gws/gmail-whitelist.json",
          blacklistFile: "./gws/gmail-blacklist.json",
        },
      }),
    );

    expect(policy.whitelist.emails).toEqual(["hughdidit@gmail.com"]);
    expect(policy.whitelist.domains).toEqual(["hughdidit.com"]);
    expect(gmailPolicyClassifyEmail(policy, "hughdidit@gmail.com")).toBe("whitelisted");
    expect(gmailPolicyClassifyEmail(policy, "agent@hughdidit.com")).toBe("whitelisted");
  });

  it("rejects invalid JSON and paths outside the config directory", async () => {
    const { configPath, whitelistPath } = await makePolicyDir();
    await fs.writeFile(whitelistPath, "{bad json", "utf8");

    const invalidJson = resolveGmailContactPolicy({
      sourcePath: configPath,
      rawPolicy: {
        whitelistFile: "./gws/gmail-whitelist.json",
      },
    });
    expect(invalidJson.ok).toBe(false);
    if (!invalidJson.ok) {
      expect(invalidJson.error).toContain("valid JSON");
    }

    const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), "gws-gmail-policy-outside-"));
    tempDirs.push(outsideDir);
    const outsideFile = path.join(outsideDir, "gmail-whitelist.json");
    await fs.writeFile(outsideFile, JSON.stringify({ version: 1, emails: [], domains: [] }), "utf8");
    const outside = resolveGmailContactPolicy({
      sourcePath: configPath,
      rawPolicy: {
        whitelistFile: outsideFile,
      },
    });
    expect(outside.ok).toBe(false);
    if (!outside.ok) {
      expect(outside.error).toContain("inside the config directory");
    }

    const missing = resolveGmailContactPolicy({
      sourcePath: configPath,
      rawPolicy: {
        blacklistFile: "./gws/missing-blacklist.json",
      },
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error).toContain("not readable");
    }
  });

  it("rejects symlinked policy files", async () => {
    const { configPath, whitelistPath } = await makePolicyDir();
    const linkPath = path.join(path.dirname(whitelistPath), "linked-whitelist.json");
    try {
      await fs.symlink(whitelistPath, linkPath);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "EPERM"
      ) {
        return;
      }
      throw error;
    }

    const policy = resolveGmailContactPolicy({
      sourcePath: configPath,
      rawPolicy: {
        whitelistFile: "./gws/linked-whitelist.json",
      },
    });

    expect(policy.ok).toBe(false);
    if (!policy.ok) {
      expect(policy.error).toContain("must not be a symlink");
    }
  });

  it("gives blacklist matches precedence over whitelist matches", async () => {
    const { configPath } = await makePolicyDir({
      blacklist: {
        version: 1,
        emails: ["hughdidit@gmail.com"],
        domains: ["blocked.example"],
      },
    });
    const policy = mustResolvePolicy(
      resolveGmailContactPolicy({
        sourcePath: configPath,
        rawPolicy: {
          whitelistFile: "./gws/gmail-whitelist.json",
          blacklistFile: "./gws/gmail-blacklist.json",
        },
      }),
    );

    expect(gmailPolicyClassifyEmail(policy, "hughdidit@gmail.com")).toBe("blacklisted");
    expect(gmailPolicyClassifyEmail(policy, "person@blocked.example")).toBe("blacklisted");
  });

  it("enforces gmail write policy for send, draft, and blacklist recipients", () => {
    const policy: GmailContactPolicy = {
      whitelist: {
        emails: ["approved@example.com"],
        domains: ["trusted.example"],
      },
      blacklist: {
        emails: ["blocked@example.com"],
        domains: ["bad.example"],
      },
    };

    expect(
      evaluateGmailWriteContactPolicy({
        action: "send_message",
        payload: { to: ["approved@example.com", "agent@trusted.example"] },
        policy,
      }).allowed,
    ).toBe(true);
    expect(
      evaluateGmailWriteContactPolicy({
        action: "draft_message",
        payload: { to: "unknown@example.com" },
        policy,
      }).allowed,
    ).toBe(true);
    expect(
      evaluateGmailWriteContactPolicy({
        action: "send_message",
        payload: { to: "unknown@example.com" },
        policy,
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluateGmailWriteContactPolicy({
        action: "draft_message",
        payload: { to: "Blocked <blocked@example.com>" },
        policy,
      }),
    ).toMatchObject({ allowed: false });
  });

  it("adds spam and blacklist exclusions to list read queries", () => {
    const policy: GmailContactPolicy = {
      whitelist: { emails: [], domains: [] },
      blacklist: {
        emails: ["blocked@example.com"],
        domains: ["bad.example"],
      },
    };

    const payload = buildGmailReadPolicyPayload(
      {
        action: "list_messages",
        query: "is:unread",
      },
      policy,
    );

    expect(payload.query).toBe("is:unread -in:spam -from:blocked@example.com -from:bad.example");
    expect(buildGmailReadPolicyPayload({ action: "list_messages" }, undefined).query).toBe(
      "-in:spam",
    );
  });

  it("denies metadata envelopes for blacklisted senders", () => {
    const policy: GmailContactPolicy = {
      whitelist: { emails: [], domains: [] },
      blacklist: {
        emails: ["blocked@example.com"],
        domains: [],
      },
    };

    expect(
      evaluateGmailMetadataContactPolicy({
        policy,
        payload: {
          payload: {
            headers: [{ name: "From", value: "Blocked Sender <blocked@example.com>" }],
          },
        },
      }),
    ).toMatchObject({ allowed: false, sender: "blocked@example.com" });
  });
});
