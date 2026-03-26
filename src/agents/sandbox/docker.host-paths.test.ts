import { describe, expect, it } from "vitest";
import { remapContainerPathToHostPath } from "./docker.js";

describe("remapContainerPathToHostPath", () => {
  it("maps a container workspace path onto the host bind source", () => {
    const resolved = remapContainerPathToHostPath(
      "/home/node/.openclaw/workspace/generated-images/x.png",
      [
        {
          source: "/opt/DAISy/workspace",
          destination: "/home/node/.openclaw/workspace",
        },
      ],
    );

    expect(resolved).toBe("/opt/DAISy/workspace/generated-images/x.png");
  });

  it("prefers the deepest matching destination when mounts overlap", () => {
    const resolved = remapContainerPathToHostPath(
      "/home/node/.openclaw/workspace/profile-a/file.txt",
      [
        {
          source: "/opt/DAISy/workspace",
          destination: "/home/node/.openclaw/workspace",
        },
        {
          source: "/srv/override/profile-a",
          destination: "/home/node/.openclaw/workspace/profile-a",
        },
      ],
    );

    expect(resolved).toBe("/srv/override/profile-a/file.txt");
  });

  it("returns the original path when no bind mount matches", () => {
    const original = "/tmp/openclaw-sandboxes/session-1";
    expect(remapContainerPathToHostPath(original, [])).toBe(original);
  });
});
