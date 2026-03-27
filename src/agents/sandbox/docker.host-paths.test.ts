import { describe, expect, it } from "vitest";
import { extractDockerContainerIdFromMountInfo, remapContainerPathToHostPath } from "./docker.js";

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

  it("maps paths correctly when the mount destination is root", () => {
    const resolved = remapContainerPathToHostPath("/workspace/generated-images/out.png", [
      {
        source: "/var/lib/openclaw-root",
        destination: "/",
      },
    ]);

    expect(resolved).toBe("/var/lib/openclaw-root/workspace/generated-images/out.png");
  });
});

describe("extractDockerContainerIdFromMountInfo", () => {
  it("extracts the container id from docker hostname mounts", () => {
    const mountInfo = [
      "1175 1165 8:1 /var/lib/docker/containers/c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c/hostname /etc/hostname ro,relatime - ext4 /dev/sda1 rw,discard,errors=remount-ro",
      "1176 1165 8:1 /var/lib/docker/containers/c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c/hosts /etc/hosts ro,relatime - ext4 /dev/sda1 rw,discard,errors=remount-ro",
    ].join("\n");

    expect(extractDockerContainerIdFromMountInfo(mountInfo)).toBe(
      "c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c",
    );
  });

  it("extracts the container id when Docker uses a custom data-root", () => {
    const mountInfo =
      "1175 1165 8:1 /srv/docker-data/containers/c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c/hostname /etc/hostname ro,relatime - ext4 /dev/sda1 rw";

    expect(extractDockerContainerIdFromMountInfo(mountInfo)).toBe(
      "c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c",
    );
  });

  it("extracts the container id for rootless Docker mount paths", () => {
    const mountInfo =
      "1175 1165 8:1 /home/node/.local/share/docker/containers/c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c/resolv.conf /etc/resolv.conf ro,relatime - ext4 /dev/sda1 rw";

    expect(extractDockerContainerIdFromMountInfo(mountInfo)).toBe(
      "c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c",
    );
  });

  it("returns null when mountinfo does not expose a docker container path", () => {
    expect(
      extractDockerContainerIdFromMountInfo("24 19 259:2 / / rw,relatime - ext4 /dev/nvme0n1p2 rw"),
    ).toBeNull();
  });
});
