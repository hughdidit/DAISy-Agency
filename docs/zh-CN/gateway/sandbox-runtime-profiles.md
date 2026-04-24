---
summary: "官方支持的沙箱运行时配置档及其用途"
title: 沙箱运行时配置档
read_when: "你需要为智能体或部署选择并记录受支持的沙箱运行时配置档。"
status: active
---

# 沙箱运行时配置档

OpenClaw 只支持一小组明确命名的沙箱运行时配置档。这些配置档用于
声明沙箱运行时的官方身份，避免维护者去反向推断 Dockerfile、安装脚本
或偶然存在的软件包。

通过 `agents.defaults.sandbox.profile` 或 `agents.list[].sandbox.profile`
设置配置档。

## 官方配置档

| 配置档 id            | 预期工作负载                                     | 信任姿态                                                                    | 辅助方式                                                |
| -------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| `ops-readonly`       | 只读诊断、检查与沙箱安全的运维排障               | 最小权限、以只读投影为中心的运行时                                          | sandbox-local + gateway-brokered                        |
| `coding-base`        | 在声明的工作区边界内进行常规编码、编辑和命令执行 | 默认的 sandbox-first 编码运行时，工作区访问显式配置，不默认保证直接网络能力 | sandbox-local + gateway-brokered + remote-node-assisted |
| `browser-automation` | 启用沙箱浏览器支持时的浏览器/CDP 工作流          | 与专用浏览器运行时配对的沙箱运行时；浏览器支持必须显式启用                  | sandbox-local + gateway-brokered + browser              |

## 配置档说明

### `ops-readonly`

适用于 `status`、`sandbox explain`、投影检查以及其他不修改状态的只读工作流。

基础预期：

- 配置/状态/工作区投影存在且内容真实
- 只读技能不依赖可写工作区
- 不默认提供浏览器能力

### `coding-base`

这是普通沙箱编码工作的默认配置档，用于描述 DAISy 常规的沙箱编码姿态：
读取、编辑、打补丁，以及在配置允许的工作区边界内执行命令。

基础预期：

- 编码工作在沙箱边界内完成
- 工作区访问由沙箱配置显式控制
- brokered 或 remote-assisted 能力保持显式，而不是依赖环境偶然性

### `browser-automation`

当运行时需要通过专用沙箱浏览器支持浏览器/CDP 工作流时使用。

基础预期：

- 通过 `agents.defaults.sandbox.browser` 启用浏览器支持
- 浏览器能力依赖专用沙箱浏览器运行时，而不是基础镜像中的偶然软件包
- 非浏览器能力仍然遵守正常的沙箱与网关策略

## 自定义镜像与 setupCommand

允许使用自定义镜像，但它们不会创建新的官方配置档 id。请为自定义镜像
选择其目标满足的官方配置档，并在配置中显式声明。

`setupCommand`、额外安装的软件包或本地镜像变体，最多只能帮助某个运行时
满足某个官方配置档；它们本身不会扩展受支持的配置档目录。

## 示例

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all",
        "scope": "session",
        "profile": "coding-base"
      }
    }
  }
}
```

另请参阅：

- [沙箱隔离](/gateway/sandboxing)
- [Sandbox CLI](/cli/sandbox)
