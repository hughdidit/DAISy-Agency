---
read_when: You are managing sandbox containers or debugging sandbox/tool-policy behavior.
status: active
summary: 管理沙箱容器并检查生效的沙箱策略
title: 沙箱 CLI
x-i18n:
  generated_at: "2026-02-03T07:45:18Z"
  model: claude-opus-4-5
  provider: pi
  source_hash: 6e1186f26c77e188206ce5e198ab624d6b38bc7bb7c06e4d2281b6935c39e347
  source_path: cli/sandbox.md
  workflow: 15
---

# 沙箱 CLI

管理基于 Docker 的沙箱容器，用于隔离智能体执行。

## 概述

OpenClaw 可以在隔离的 Docker 容器中运行智能体以确保安全。`sandbox` 命令帮助你管理这些容器，特别是在更新或配置更改后。

## 命令

### `openclaw sandbox explain`

检查**生效的**沙箱模式/作用域/配置档/工作区访问权限、沙箱工具策略、提权门控以及解析后的能力就绪状态（附带修复配置的键路径）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

`sandbox explain` 是沙箱运行时配置档和能力就绪状态的主要检查命令。它还会显示该智能体/运行时选定的沙箱运行时配置档身份。

`sandbox explain`、`status` 和 doctor 现在使用同一套共享就绪模型。该命令会展示：

- 能力类别：
  - `sandbox-local`
  - `gateway-brokered`
  - `remote-node-assisted`
  - `configured-but-blocked`
  - `unsupported-in-current-runtime`
- 标准化原因类别，例如策略阻止、配置缺口、投影缺陷、运行时/配置档缺口，以及辅助能力可用性
- 额外的 JSON `capabilities` 数据，其中包含计数、发现项、工具组、Skills 和解析后的清单
- 当前智能体/运行时选定的沙箱运行时配置档身份

如果某项能力显示为 `unsupported-in-current-runtime`，表示当前选定的官方运行时配置档并不正式支持它，即使容器里碰巧存在某个二进制文件或软件包。

### `openclaw sandbox list`

列出所有沙箱容器及其状态和配置。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**输出包括：**

- 容器名称和状态（运行中/已停止）
- Docker 镜像及其是否与配置匹配
- 创建时间
- 空闲时间（自上次使用以来的时间）
- 关联的会话/智能体

### `openclaw sandbox recreate`

移除沙箱容器以强制使用更新的镜像/配置重新创建。

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**选项：**

- `--all`：重新创建所有沙箱容器
- `--session <key>`：重新创建特定会话的容器
- `--agent <id>`：重新创建特定智能体的容器
- `--browser`：仅重新创建浏览器容器
- `--force`：跳过确认提示

**重要：** 容器会在智能体下次使用时自动重新创建。

## 使用场景

### 更新 Docker 镜像后

```bash
# Pull new image
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# Update config to use new image
# Edit config: agents.defaults.sandbox.docker.image (or agents.list[].sandbox.docker.image)

# Recreate containers
openclaw sandbox recreate --all
```

### 更改沙箱配置后

```bash
# Edit config: agents.defaults.sandbox.* (or agents.list[].sandbox.*)

# Recreate to apply new config
openclaw sandbox recreate --all
```

### 更改 setupCommand 后

```bash
openclaw sandbox recreate --all
# or just one agent:
openclaw sandbox recreate --agent family
```

请记住，`setupCommand` 是定制机制，不是独立的官方支持契约。如果运行时能力发生了实质变化，仍应让 `sandbox.profile` 与你打算满足的官方配置档保持一致。

### 仅针对特定智能体

```bash
# Update only one agent's containers
openclaw sandbox recreate --agent alfred
```

## 为什么需要这个？

**问题：** 当你更新沙箱 Docker 镜像或配置时：

- 现有容器继续使用旧设置运行
- 容器仅在空闲 24 小时后才被清理
- 经常使用的智能体会无限期保持旧容器运行

**解决方案：** 使用 `openclaw sandbox recreate` 强制移除旧容器。它们会在下次需要时自动使用当前设置重新创建。

提示：优先使用 `openclaw sandbox recreate` 而不是手动 `docker rm`。它使用 Gateway 网关的容器命名规则，避免在作用域/会话键更改时出现不匹配。

## 配置

沙箱设置位于 `~/.openclaw/openclaw.json` 的 `agents.defaults.sandbox` 下（每个智能体的覆盖设置在 `agents.list[].sandbox` 中）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "scope": "agent", // session, agent, shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... more Docker options
        },
        "prune": {
          "idleHours": 24, // Auto-prune after 24h idle
          "maxAgeDays": 7, // Auto-prune after 7 days
        },
      },
    },
  },
}
```

## 另请参阅

- [沙箱文档](/gateway/sandboxing)
- [沙箱运行时配置档](/gateway/sandbox-runtime-profiles)
- [智能体配置](/concepts/agent-workspace)
- [Doctor 命令](/gateway/doctor) - 检查沙箱设置
