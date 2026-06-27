import { describe, expect, it } from "vitest";
import { resolveKanbanConfig, redactMongoUri } from "./config.js";

describe("resolveKanbanConfig", () => {
  it("reports unavailable when MongoDB URI is not configured", () => {
    const result = resolveKanbanConfig({ env: {} });

    expect(result).toMatchObject({
      available: false,
      reason: "missing-uri",
    });
  });

  it("resolves defaults from environment without exposing them in status fields", () => {
    const result = resolveKanbanConfig({
      env: {
        KANBAN_MONGODB_URI: "mongodb://kanban-user:kanban-pass@mongo:27017",
      },
    });

    expect(result.available).toBe(true);
    if (!result.available) {
      throw new Error(result.message);
    }
    expect(result.config.database).toBe("daisy_kanban");
    expect(result.config.board).toEqual({ slug: "team-agents", title: "Team Agents" });
    expect(result.config.collections).toEqual({
      boards: "boards",
      cards: "cards",
      activity: "activity",
      imports: "imports",
      attachments: "attachments",
      gridFsBucket: "kanban_attachments",
    });
    expect(result.config.redactedUri).toContain("redacted:redacted@mongo");
    expect(result.config.redactedUri).not.toContain("kanban-pass");
  });

  it("allows config values to override environment defaults", () => {
    const result = resolveKanbanConfig({
      cfg: {
        kanban: {
          mongodb: {
            uri: "mongodb+srv://cfg-user:cfg-pass@cluster.example.com",
            database: "cfg_db",
            collections: {
              cards: "cfg_cards",
              gridFsBucket: "cfg_files",
            },
          },
          board: {
            slug: "cfg-board",
            title: "Configured Board",
          },
        },
      },
      env: {
        KANBAN_MONGODB_URI: "mongodb://env-user:env-pass@mongo:27017",
        KANBAN_MONGODB_DATABASE: "env_db",
      },
    });

    expect(result.available).toBe(true);
    if (!result.available) {
      throw new Error(result.message);
    }
    expect(result.config.database).toBe("cfg_db");
    expect(result.config.collections.cards).toBe("cfg_cards");
    expect(result.config.collections.gridFsBucket).toBe("cfg_files");
    expect(result.config.board).toEqual({ slug: "cfg-board", title: "Configured Board" });
    expect(result.config.redactedUri).not.toContain("cfg-pass");
  });

  it("rejects remote mongodb URIs without TLS", () => {
    const result = resolveKanbanConfig({
      env: {
        KANBAN_MONGODB_URI: "mongodb://kanban-user:kanban-pass@db.example.com:27017",
      },
    });

    expect(result).toMatchObject({
      available: false,
      reason: "tls-required",
    });
    if (result.available) {
      throw new Error("Expected unavailable result");
    }
    expect(result.message).toContain("redacted:redacted@db.example.com");
    expect(result.message).not.toContain("kanban-pass");
  });

  it("accepts remote mongodb URIs with TLS enabled", () => {
    const result = resolveKanbanConfig({
      env: {
        KANBAN_MONGODB_URI: "mongodb://kanban-user:kanban-pass@db.example.com:27017/?tls=true",
      },
    });

    expect(result.available).toBe(true);
  });

  it("accepts multi-host mongodb seedlists with TLS enabled", () => {
    const uri =
      "mongodb://kanban-user:kanban-pass@mongo1.example.com:27017,mongo2.example.com:27017/daisy?replicaSet=rs0&tls=true";
    const result = resolveKanbanConfig({
      env: {
        KANBAN_MONGODB_URI: uri,
      },
    });

    expect(result.available).toBe(true);
    if (!result.available) {
      throw new Error(result.message);
    }
    expect(result.config.redactedUri).toContain("redacted:redacted@mongo1.example.com");
    expect(result.config.redactedUri).not.toContain("kanban-pass");
  });

  it("accepts local IPv6 mongodb URIs without TLS", () => {
    const result = resolveKanbanConfig({
      env: {
        KANBAN_MONGODB_URI: "mongodb://kanban-user:kanban-pass@[::1]:27017",
      },
    });

    expect(result.available).toBe(true);
  });

  it("rejects single-label non-container hosts without TLS", () => {
    const result = resolveKanbanConfig({
      env: {
        KANBAN_MONGODB_URI: "mongodb://kanban-user:kanban-pass@prod-db:27017",
      },
    });

    expect(result).toMatchObject({
      available: false,
      reason: "tls-required",
    });
  });

  it("rejects mongodb+srv URIs when TLS is explicitly disabled", () => {
    const uri = "mongodb+srv://kanban-user:kanban-pass@cluster.example.com/?tls=false";
    const result = resolveKanbanConfig({
      env: {
        KANBAN_MONGODB_URI: uri,
      },
    });

    expect(result).toMatchObject({
      available: false,
      reason: "tls-required",
    });
  });

  it("reports invalid URI errors with redacted credentials", () => {
    const result = resolveKanbanConfig({
      env: {
        KANBAN_MONGODB_URI: "mongodb://kanban-user:kanban-pass@",
      },
    });

    expect(result).toMatchObject({
      available: false,
      reason: "invalid-uri",
    });
    if (result.available) {
      throw new Error("Expected unavailable result");
    }
    expect(result.message).toContain("redacted@");
    expect(result.message).not.toContain("kanban-pass");
  });
});

describe("redactMongoUri", () => {
  it("redacts username, password, and sensitive query values", () => {
    expect(
      redactMongoUri(
        "mongodb://user:pass@localhost:27017/?appName=daisy&tlsCertificateKeyFilePassword=secret",
      ),
    ).toBe(
      "mongodb://redacted:redacted@localhost:27017/?appName=daisy&tlsCertificateKeyFilePassword=redacted",
    );
  });

  it("redacts sensitive query values in multi-host seedlist URIs", () => {
    const uri =
      "mongodb://user:pass@mongo1.example.com:27017,mongo2.example.com:27017/daisy?replicaSet=rs0&tlsCertificateKeyFilePassword=secret";
    const redacted =
      "mongodb://redacted:redacted@mongo1.example.com:27017,mongo2.example.com:27017/daisy?replicaSet=rs0&tlsCertificateKeyFilePassword=redacted";

    expect(redactMongoUri(uri)).toBe(redacted);
  });

  it("redacts sensitive query values in malformed URI fallback output", () => {
    expect(
      redactMongoUri("mongodb://user:pass@?tlsCertificateKeyFilePassword=secret&appName=daisy"),
    ).toBe("mongodb://redacted@?tlsCertificateKeyFilePassword=redacted&appName=daisy");
  });
});
