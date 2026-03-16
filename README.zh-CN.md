# OpenClaw Skills

[English](README.md) | 简体中文

![OpenClaw](https://img.shields.io/badge/OpenClaw-Unified%20Skills-111827?style=flat-square)
![Repository](https://img.shields.io/badge/Repository-Open%20Source-F9FAFB?style=flat-square&labelColor=1F2937)
![License-MIT](https://img.shields.io/badge/License-MIT-F9FAFB?style=flat-square&labelColor=111827)

包含公共 OpenClaw skills 和 scripts 的统一仓库。

## 概述

本仓库作为 OpenClaw skills 的中心仓库——这些是可复用、可分享的 agent 能力，可以通过 ClawHub 安装。

不再为每个 skill 维护单独的仓库，所有公共 skills 都组织在 `skills/` 目录下，提供单一的发现和维护点。

## Skills

### 可用的 Skills

- **[skill-publish](skills/skill-publish/)** — 将 OpenClaw skills 发布或重新发布到统一仓库
- **[task-orchestrator](skills/task-orchestrator/)** — 协调多个用户任务，避免简单的 FIFO 处理
- **[restart-continuity](skills/restart-continuity/)** — 在重启之间保留和恢复进行中的工作
- **[telegram-exec-approval](skills/telegram-exec-approval/)** — 添加或修复 Telegram 交互式 exec 审批
- **[model-speedtest](skills/model-speedtest/)** — 通过测量 API 响应速度测试模型延迟

## 安装

### 安装一个 Skill

使用 ClawHub 从本仓库安装任何 skill：

```bash
clawhub install ruanrrn/openclaw/skills/<skill-name>
```

例如，安装 `skill-publish`：

```bash
clawhub install ruanrrn/openclaw/skills/skill-publish
```

### 手动安装

如果偏好手动安装：

1. 进入 skill 目录：`skills/<skill-name>/`
2. 将 `SKILL.md` 和相关文件复制到你的 OpenClaw skills 目录
3. 可选地使用 `dist/` 目录中预构建的 `.skill` 文件

## 仓库结构

```text
openclaw/
├── skills/                    # 所有 OpenClaw skills
│   ├── skill-publish/        # Skill 发布工作流
│   ├── task-orchestrator/    # 任务协调
│   ├── restart-continuity/   # 重启恢复
│   ├── telegram-exec-approval/  # Telegram 审批
│   └── model-speedtest/      # 模型延迟测试
└── scripts/                   # 共享工具脚本
```

## 贡献

欢迎贡献！请遵循以下指南：

1. **Skill 结构**：每个 skill 应包含 `SKILL.md`、`README.md`，理想情况下还有 `README.zh-CN.md`
2. **文档**：提供清晰的描述、使用示例和范围边界
3. **构建产物**：在 `dist/` 目录中包含打包的 `.skill` 文件
4. **元数据**：保持徽章、描述和仓库主题的一致性
5. **范围**：专注于 OpenClaw 特定的 agent skills，而非通用代码

详细的贡献指南，请查看每个 skill 目录中的 `CONTRIBUTING.md` 文件。

## 许可证

本仓库采用 MIT 许可证。每个独立的 skill 可能有自己的许可证——请检查每个 skill 目录中的 `LICENSE` 文件。

## 仓库

- **GitHub**: https://github.com/ruanrrn/openclaw
- **许可证**: MIT
- **维护者**: @ruanrrn
