import { describe, expect, it } from "vitest";

import { splitMediaFromOutput } from "./parse.js";

describe("splitMediaFromOutput", () => {
  it("detects audio_as_voice tag and strips it", () => {
    const result = splitMediaFromOutput("Hello [[audio_as_voice]] world");
    expect(result.audioAsVoice).toBe(true);
    expect(result.text).toBe("Hello world");
  });

  it("captures media paths with spaces", () => {
    const result = splitMediaFromOutput("MEDIA:/Users/pete/My File.png");
    expect(result.mediaUrls).toEqual(["/Users/pete/My File.png"]);
    expect(result.text).toBe("");
  });

  it("captures quoted media paths with spaces", () => {
    const result = splitMediaFromOutput('MEDIA:"/Users/pete/My File.png"');
    expect(result.mediaUrls).toEqual(["/Users/pete/My File.png"]);
    expect(result.text).toBe("");
  });

  it("captures tilde media paths with spaces", () => {
    const result = splitMediaFromOutput("MEDIA:~/Pictures/My File.png");
    expect(result.mediaUrls).toEqual(["~/Pictures/My File.png"]);
    expect(result.text).toBe("");
  });

  it("accepts sandbox-relative media paths", () => {
    const result = splitMediaFromOutput("MEDIA:media/inbound/image.png");
    expect(result.mediaUrls).toEqual(["media/inbound/image.png"]);
    expect(result.text).toBe("");
  });

  it("keeps audio_as_voice detection stable across calls", () => {
    const input = "Hello [[audio_as_voice]]";
    const first = splitMediaFromOutput(input);
    const second = splitMediaFromOutput(input);
    expect(first.audioAsVoice).toBe(true);
    expect(second.audioAsVoice).toBe(true);
  });

  it("keeps MEDIA mentions in prose", () => {
    const input = "The MEDIA: tag fails to deliver";
    const result = splitMediaFromOutput(input);
    expect(result.mediaUrls).toBeUndefined();
    expect(result.text).toBe(input);
  });

  it("parses MEDIA tags with leading whitespace", () => {
    const result = splitMediaFromOutput("  MEDIA:/tmp/screenshot.png");
    expect(result.mediaUrls).toEqual(["/tmp/screenshot.png"]);
    expect(result.text).toBe("");
  });

  it("accepts Windows-style paths", () => {
    const result = splitMediaFromOutput("MEDIA:C:\\Users\\pete\\Pictures\\snap.png");
    expect(result.mediaUrls).toEqual(["C:\\Users\\pete\\Pictures\\snap.png"]);
    expect(result.text).toBe("");
  });

  it("accepts TTS temp file paths", () => {
    const result = splitMediaFromOutput("MEDIA:/tmp/tts-fAJy8C/voice-1770246885083.opus");
    expect(result.mediaUrls).toEqual(["/tmp/tts-fAJy8C/voice-1770246885083.opus"]);
    expect(result.text).toBe("");
  });

  it("accepts bare filenames with extensions", () => {
    const result = splitMediaFromOutput("MEDIA:image.png");
    expect(result.mediaUrls).toEqual(["image.png"]);
    expect(result.text).toBe("");
  });

  it("rejects bare words without file extensions", () => {
    const result = splitMediaFromOutput("MEDIA:screenshot");
    expect(result.mediaUrls).toBeUndefined();
  });
});
