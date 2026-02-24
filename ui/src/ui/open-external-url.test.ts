import { describe, expect, it } from "vitest";
import { resolveSafeExternalUrl } from "./open-external-url.ts";

describe("resolveSafeExternalUrl", () => {
  const baseHref = "https://openclaw.ai/chat";

  it("allows absolute https URLs", () => {
    expect(resolveSafeExternalUrl("https://example.com/a.png?x=1#y", baseHref)).toBe(
      "https://example.com/a.png?x=1#y",
    );
  });

  it("allows relative URLs resolved against the current origin", () => {
    expect(resolveSafeExternalUrl("/assets/pic.png", baseHref)).toBe(
      "https://openclaw.ai/assets/pic.png",
    );
  });

  it("allows blob URLs", () => {
    expect(resolveSafeExternalUrl("blob:https://openclaw.ai/abc-123", baseHref)).toBe(
      "blob:https://openclaw.ai/abc-123",
    );
  });

  it("allows data image URLs when enabled", () => {
    expect(
      resolveSafeExternalUrl("data:image/png;base64,iVBORw0KGgo=", baseHref, {
        allowDataImage: true,
      }),
    ).toBe("data:image/png;base64,iVBORw0KGgo=");
  });

  it("rejects non-image data URLs", () => {
    expect(
      resolveSafeExternalUrl("data:text/html,<script>alert(1)</script>", baseHref, {
        allowDataImage: true,
      }),
    ).toBeNull();
  });

<<<<<<< HEAD
=======
  it("rejects SVG data image URLs", () => {
    expect(
      resolveSafeExternalUrl(
        "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' />",
        baseHref,
        {
          allowDataImage: true,
        },
      ),
    ).toBeNull();
  });

  it("rejects base64-encoded SVG data image URLs", () => {
    expect(
      resolveSafeExternalUrl(
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIC8+",
        baseHref,
        {
          allowDataImage: true,
        },
      ),
    ).toBeNull();
  });

>>>>>>> 30cb849b1 (test(ui): reject base64 SVG data URLs)
  it("rejects data image URLs unless explicitly enabled", () => {
    expect(resolveSafeExternalUrl("data:image/png;base64,iVBORw0KGgo=", baseHref)).toBeNull();
  });

  it("rejects javascript URLs", () => {
    expect(resolveSafeExternalUrl("javascript:alert(1)", baseHref)).toBeNull();
  });

  it("rejects file URLs", () => {
    expect(resolveSafeExternalUrl("file:///tmp/x.png", baseHref)).toBeNull();
  });

  it("rejects empty values", () => {
    expect(resolveSafeExternalUrl("   ", baseHref)).toBeNull();
  });
});
