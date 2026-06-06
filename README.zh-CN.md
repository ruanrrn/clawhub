# OpenClaw 技能库

[English](README.md) | 简体中文

![OpenClaw](https://img.shields.io/badge/OpenClaw-Unified%20Skills-111827?style=flat-square)
![Repository](https://img.shields.io/badge/Repository-Open%20Source-F9FAFB?style=flat-square&labelColor=1F2937)
![License-MIT](https://img.shields.io/badge/License-MIT-F9FAFB?style=flat-square&labelColor=111827)

OpenClaw 公共技能和脚本的统一仓库。

## 概述

本仓库是 OpenClaw 技能的中心仓库——可通过 ClawHub 安装的可复用、可共享的代理能力。

所有公共技能都组织在 `skills/` 目录下，提供单一的发现和维护点，而不是为每个技能单独维护一个仓库。

## 技能列表

### 可用技能（11 个）

#### 代理操作
- **[memory-manager](skills/memory-manager/)** — 管理代理记忆：添加、搜索、更新和组织持久知识
- **[operational-fallbacks](skills/operational-fallbacks/)** — 常见操作失败的降级策略和恢复模式
- **[restart-continuity](skills/restart-continuity/)** — 跨重启保留和恢复进行中的工作
- **[self-improving-agent](skills/self-improving-agent/)** — 自我改进循环：监控性能、识别缺陷、修补技能
- **[task-orchestrator](skills/task-orchestrator/)** — 协调多个用户任务，避免简单的 FIFO 处理
- **[todo-continuity](skills/todo-continuity/)** — 跨会话保留和恢复 TODO 状态

#### 技能管理
- **[skill-publish](skills/skill-publish/)** — 发布或重新发布 OpenClaw 技能到统一仓库
- **[skill-vetter](skills/skill-vetter/)** — 在发布或部署前验证技能

#### 测试与调试
- **[model-speedtest](skills/model-speedtest/)** — 通过测量 API 响应速度来测试模型延迟
- **[telegram-exec-approval](skills/telegram-exec-approval/)** — 添加或修复 Telegram 交互式执行批准

#### 内容处理
- **[weixin-link-reader](skills/weixin-link-reader/)** — 从微信文章链接提取和处理内容

## 安装

### 安装技能

使用 ClawHub 从本仓库安装任何技能：

```bash
clawhub install ruanrrn/openclaw/skills/<技能名称>
```

例如，安装 `memory-manager`：

```bash
clawhub install ruanrrn/openclaw/skills/memory-manager
```

### 手动安装

如果你偏好手动安装：

1. 导航到技能目录：`skills/<技能名称>/`
2. 将 `SKILL.md` 和相关文件复制到你的 OpenClaw 技能目录
3. 可选择使用 `dist/` 中预构建的 `.skill` 工件

## 仓库结构

```text
clawhub/
├── skills/                         # 所有 OpenClaw 技能（11 个）
│   ├── memory-manager/            # 记忆管理
│   ├── model-speedtest/           # 模型延迟测试
│   ├── operational-fallbacks/     # 故障恢复模式
│   ├── restart-continuity/        # 重启恢复
│   ├── self-improving-agent/      # 自我改进循环
│   ├── skill-publish/             # 技能发布工作流
│   ├── skill-vetter/              # 技能验证
│   ├── task-orchestrator/         # 任务协调
│   ├── telegram-exec-approval/    # Telegram 批准
│   ├── todo-continuity/           # TODO 状态保留
│   └── weixin-link-reader/        # 微信内容提取
└── scripts/                        # 共享工具脚本
```

## 贡献

欢迎贡献！请遵循以下指南：

1. **技能结构**：每个技能应包含 `SKILL.md`、`README.md`，最好还有 `README.zh-CN.md`
2. **文档**：提供清晰的描述、使用示例和范围界限
3. **工件**：在 `dist/` 目录中包含打包的 `.skill` 文件
4. **元数据**：保持徽章、描述和仓库主题一致
5. **范围**：专注于 OpenClaw 特定的代理技能，而非通用代码
6. **无私人数据**：确保没有 API 密钥、秘密、个人数据或私人服务器 IP

详细的贡献指南请参阅每个技能目录中的 `CONTRIBUTING.md` 文件。

## 许可证

本仓库采用 MIT 许可证。每个独立技能可能有自己的许可证——请查看每个技能目录中的 `LICENSE` 文件。

## 仓库信息

- **GitHub**: https://github.com/ruanrrn/clawhub
- **许可证**: MIT
- **维护者**: @ruanrrn

## 更新日志

### 2026-06-07
- 从私人工作区整合了 6 个额外技能
- 技能总数：5 → 11
- 新增分类：代理操作、技能管理、测试与调试、内容处理
