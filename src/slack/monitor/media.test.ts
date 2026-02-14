import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Store original fetch
const originalFetch = globalThis.fetch;
let mockFetch: ReturnType<typeof vi.fn>;

describe("fetchWithSlackAuth", () => {
  beforeEach(() => {
    // Create a new mock for each test
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    vi.resetModules();
  });

  it("sends Authorization header on initial request with manual redirect", async () => {
    // Import after mocking fetch
    const { fetchWithSlackAuth } = await import("./media.js");

    // Simulate direct 200 response (no redirect)
    const mockResponse = new Response(Buffer.from("image data"), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithSlackAuth("https://files.slack.com/test.jpg", "xoxb-test-token");

    expect(result).toBe(mockResponse);

    // Verify fetch was called with correct params
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://files.slack.com/test.jpg", {
      headers: { Authorization: "Bearer xoxb-test-token" },
      redirect: "manual",
    });
  });

  it("rejects non-Slack hosts to avoid leaking tokens", async () => {
    const { fetchWithSlackAuth } = await import("./media.js");

    await expect(
      fetchWithSlackAuth("https://example.com/test.jpg", "xoxb-test-token"),
    ).rejects.toThrow(/non-Slack host|non-Slack/i);

    // Should fail fast without attempting a fetch.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("follows redirects without Authorization header", async () => {
    const { fetchWithSlackAuth } = await import("./media.js");

    // First call: redirect response from Slack
    const redirectResponse = new Response(null, {
      status: 302,
      headers: { location: "https://cdn.slack-edge.com/presigned-url?sig=abc123" },
    });

    // Second call: actual file content from CDN
    const fileResponse = new Response(Buffer.from("actual image data"), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });

    mockFetch.mockResolvedValueOnce(redirectResponse).mockResolvedValueOnce(fileResponse);

    const result = await fetchWithSlackAuth("https://files.slack.com/test.jpg", "xoxb-test-token");

    expect(result).toBe(fileResponse);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // First call should have Authorization header and manual redirect
    expect(mockFetch).toHaveBeenNthCalledWith(1, "https://files.slack.com/test.jpg", {
      headers: { Authorization: "Bearer xoxb-test-token" },
      redirect: "manual",
    });

    // Second call should follow the redirect without Authorization
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://cdn.slack-edge.com/presigned-url?sig=abc123",
      { redirect: "follow" },
    );
  });

  it("handles relative redirect URLs", async () => {
    const { fetchWithSlackAuth } = await import("./media.js");

    // Redirect with relative URL
    const redirectResponse = new Response(null, {
      status: 302,
      headers: { location: "/files/redirect-target" },
    });

    const fileResponse = new Response(Buffer.from("image data"), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });

    mockFetch.mockResolvedValueOnce(redirectResponse).mockResolvedValueOnce(fileResponse);

    await fetchWithSlackAuth("https://files.slack.com/original.jpg", "xoxb-test-token");

    // Second call should resolve the relative URL against the original
    expect(mockFetch).toHaveBeenNthCalledWith(2, "https://files.slack.com/files/redirect-target", {
      redirect: "follow",
    });
  });

  it("returns redirect response when no location header is provided", async () => {
    const { fetchWithSlackAuth } = await import("./media.js");

    // Redirect without location header
    const redirectResponse = new Response(null, {
      status: 302,
      // No location header
    });

    mockFetch.mockResolvedValueOnce(redirectResponse);

    const result = await fetchWithSlackAuth("https://files.slack.com/test.jpg", "xoxb-test-token");

    // Should return the redirect response directly
    expect(result).toBe(redirectResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 4xx/5xx responses directly without following", async () => {
    const { fetchWithSlackAuth } = await import("./media.js");

    const errorResponse = new Response("Not Found", {
      status: 404,
    });

    mockFetch.mockResolvedValueOnce(errorResponse);

    const result = await fetchWithSlackAuth("https://files.slack.com/test.jpg", "xoxb-test-token");

    expect(result).toBe(errorResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles 301 permanent redirects", async () => {
    const { fetchWithSlackAuth } = await import("./media.js");

    const redirectResponse = new Response(null, {
      status: 301,
      headers: { location: "https://cdn.slack.com/new-url" },
    });

    const fileResponse = new Response(Buffer.from("image data"), {
      status: 200,
    });

    mockFetch.mockResolvedValueOnce(redirectResponse).mockResolvedValueOnce(fileResponse);

    await fetchWithSlackAuth("https://files.slack.com/test.jpg", "xoxb-test-token");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(2, "https://cdn.slack.com/new-url", {
      redirect: "follow",
    });
  });
});

describe("resolveSlackMedia", () => {
  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.resetModules();
  });

  it("prefers url_private_download over url_private", async () => {
    // Mock the store module
    vi.doMock("../../media/store.js", () => ({
      saveMediaBuffer: vi.fn().mockResolvedValue({
        path: "/tmp/test.jpg",
        contentType: "image/jpeg",
      }),
    }));

    const { resolveSlackMedia } = await import("./media.js");

    const mockResponse = new Response(Buffer.from("image data"), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
    mockFetch.mockResolvedValueOnce(mockResponse);

    await resolveSlackMedia({
      files: [
        {
          url_private: "https://files.slack.com/private.jpg",
          url_private_download: "https://files.slack.com/download.jpg",
          name: "test.jpg",
        },
      ],
      token: "xoxb-test-token",
      maxBytes: 1024 * 1024,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://files.slack.com/download.jpg",
      expect.anything(),
    );
  });

  it("returns null when download fails", async () => {
    const { resolveSlackMedia } = await import("./media.js");

    // Simulate a network error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await resolveSlackMedia({
      files: [{ url_private: "https://files.slack.com/test.jpg", name: "test.jpg" }],
      token: "xoxb-test-token",
      maxBytes: 1024 * 1024,
    });

    expect(result).toBeNull();
  });

  it("returns null when no files are provided", async () => {
    const { resolveSlackMedia } = await import("./media.js");

    const result = await resolveSlackMedia({
      files: [],
      token: "xoxb-test-token",
      maxBytes: 1024 * 1024,
    });

    expect(result).toBeNull();
  });

  it("skips files without url_private", async () => {
    const { resolveSlackMedia } = await import("./media.js");

    const result = await resolveSlackMedia({
      files: [{ name: "test.jpg" }], // No url_private
      token: "xoxb-test-token",
      maxBytes: 1024 * 1024,
    });

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

<<<<<<< HEAD
=======
  it("overrides video/* MIME to audio/* for slack_audio voice messages", async () => {
    // saveMediaBuffer re-detects MIME from buffer bytes, so it may return
    // video/mp4 for MP4 containers.  Verify resolveSlackMedia preserves
    // the overridden audio/* type in its return value despite this.
    const saveMediaBufferMock = vi.spyOn(mediaStore, "saveMediaBuffer").mockResolvedValue({
      path: "/tmp/voice.mp4",
      contentType: "video/mp4",
    });

    const mockResponse = new Response(Buffer.from("audio data"), {
      status: 200,
      headers: { "content-type": "video/mp4" },
    });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await resolveSlackMedia({
      files: [
        {
          url_private: "https://files.slack.com/voice.mp4",
          name: "audio_message.mp4",
          mimetype: "video/mp4",
          subtype: "slack_audio",
        },
      ],
      token: "xoxb-test-token",
      maxBytes: 16 * 1024 * 1024,
    });

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    // saveMediaBuffer should receive the overridden audio/mp4
    expect(saveMediaBufferMock).toHaveBeenCalledWith(
      expect.any(Buffer),
      "audio/mp4",
      "inbound",
      16 * 1024 * 1024,
    );
    // Returned contentType must be the overridden value, not the
    // re-detected video/mp4 from saveMediaBuffer
    expect(result![0]?.contentType).toBe("audio/mp4");
  });

  it("preserves original MIME for non-voice Slack files", async () => {
    const saveMediaBufferMock = vi.spyOn(mediaStore, "saveMediaBuffer").mockResolvedValue({
      path: "/tmp/video.mp4",
      contentType: "video/mp4",
    });

    const mockResponse = new Response(Buffer.from("video data"), {
      status: 200,
      headers: { "content-type": "video/mp4" },
    });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await resolveSlackMedia({
      files: [
        {
          url_private: "https://files.slack.com/clip.mp4",
          name: "recording.mp4",
          mimetype: "video/mp4",
        },
      ],
      token: "xoxb-test-token",
      maxBytes: 16 * 1024 * 1024,
    });

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(saveMediaBufferMock).toHaveBeenCalledWith(
      expect.any(Buffer),
      "video/mp4",
      "inbound",
      16 * 1024 * 1024,
    );
    expect(result![0]?.contentType).toBe("video/mp4");
  });

>>>>>>> c76288bdf (fix(slack): download all files in multi-image messages (#15447))
  it("falls through to next file when first file returns error", async () => {
    // Mock the store module
    vi.doMock("../../media/store.js", () => ({
      saveMediaBuffer: vi.fn().mockResolvedValue({
        path: "/tmp/test.jpg",
        contentType: "image/jpeg",
      }),
    }));

    const { resolveSlackMedia } = await import("./media.js");

    // First file: 404
    const errorResponse = new Response("Not Found", { status: 404 });
    // Second file: success
    const successResponse = new Response(Buffer.from("image data"), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });

    mockFetch.mockResolvedValueOnce(errorResponse).mockResolvedValueOnce(successResponse);

    const result = await resolveSlackMedia({
      files: [
        { url_private: "https://files.slack.com/first.jpg", name: "first.jpg" },
        { url_private: "https://files.slack.com/second.jpg", name: "second.jpg" },
      ],
      token: "xoxb-test-token",
      maxBytes: 1024 * 1024,
    });

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns all successfully downloaded files as an array", async () => {
    vi.spyOn(mediaStore, "saveMediaBuffer")
      .mockResolvedValueOnce({ path: "/tmp/a.jpg", contentType: "image/jpeg" })
      .mockResolvedValueOnce({ path: "/tmp/b.png", contentType: "image/png" });

    const responseA = new Response(Buffer.from("image a"), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
    const responseB = new Response(Buffer.from("image b"), {
      status: 200,
      headers: { "content-type": "image/png" },
    });

    mockFetch.mockResolvedValueOnce(responseA).mockResolvedValueOnce(responseB);

    const result = await resolveSlackMedia({
      files: [
        { url_private: "https://files.slack.com/a.jpg", name: "a.jpg" },
        { url_private: "https://files.slack.com/b.png", name: "b.png" },
      ],
      token: "xoxb-test-token",
      maxBytes: 1024 * 1024,
    });

    expect(result).toHaveLength(2);
    expect(result![0].path).toBe("/tmp/a.jpg");
    expect(result![0].placeholder).toBe("[Slack file: a.jpg]");
    expect(result![1].path).toBe("/tmp/b.png");
    expect(result![1].placeholder).toBe("[Slack file: b.png]");
  });
});
