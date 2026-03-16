# Model Speedtest - 模型速度测试

[English](README.md) | 简体中文

![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-00A98F?style=flat-square&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMCAxMCI+PHBhdGggZD0iTTEgNWwtMSAxbDEtMSAxbDItLTFoIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==)
![Focus-Utility](https://img.shields.io/badge/Focus-Utility-FF5722?style=flat-square)
![Works-Standalone](https://img.shields.io/badge/Works-Standalone-4CAF50?style=flat-square)
![Artifact-.skill Included](https://img.shields.io/badge/Artifact-.skill%20Included-9C27B0?style=flat-square)
![License-MIT](https://img.shields.io/badge/License-MIT-59AED9?style=flat-square)

为所有配置的 AI 模型测试 API 响应延迟，支持自动协议检测。

## 概述

Model Speedtest 是一个 OpenClaw 技能，用于测试 `openclaw.json` 中配置的所有 AI 模型的响应时间。它向每个模型发送最小的 "ping" 探测请求，并测量往返延迟，提供完整的性能排名。

## 为什么存在此技能

理解不同提供商的 AI 模型性能需要一致的、自动化的测试。Model Speedtest 通过以下方式消除手动探测测试：

- 自动从配置中发现所有模型
- 为每个提供商使用正确的协议（OpenAI Completions、OpenAI Responses、Anthropic Messages）
- 精确测量往返时间
- 以排序的延迟表显示结果

## 范围

此技能专注于模型性能测试：

- 测试所有已配置提供商的所有模型
- 动态支持多种 API 协议
- 显示失败模型的错误原因
- 按延迟排序结果（从快到慢）
- 提供提供商级别的分类和摘要统计

## 标准涵盖内容

- 从提供商配置中动态检测协议
- 自动超时处理（每个请求 5 秒）
- 错误分类（认证失败、速率限制、超时、API 错误）
- 支持返回推理内容的推理模型
- 带状态表情符号的双语输出

## 工作流程摘要

1. 读取 `openclaw.json` 发现提供商和模型
2. 检测每个提供商的 API 协议
3. 使用适当的适配器发送 "ping" 探测请求
4. 测量响应时间
5. 分类状态（OK、Non-pong、超时等）
6. 按提供商分组显示结果
7. 按延迟排序所有模型
8. 显示摘要统计信息

## 何时使用

- 在为对时间敏感的任务选择模型之前
- 当监控 API 性能随时间变化时
- 当比较提供商（BigModel vs ARK vs Rightcode）时
- 更新模型配置后验证连接
- 当调试慢速 API 响应时

## 示例

测试所有模型并查看延迟排名：

```bash
node skills/model-speedtest/scripts/main.js
```

输出示例：

```
🔍 Model Speedtest

Reading configuration...
Found 3 providers: rightcode, bigmodel, ark

📋 Protocols detected:

  rightcode: openai-responses (8 models)
  bigmodel: openai-completions (7 models)
  ark: openai-completions (1 models)

Testing 16 models...

================================================================================
ALL MODELS SORTED BY LATENCY
================================================================================

| Rank | Model | Provider | Latency | Status | Reason |
|------|-------|----------|---------|--------|---------|
| 1 | glm-5 | bigmodel | 250ms | ❌ API 错误 | 订阅未启用 |
| 2 | glm-4.5 | bigmodel | 570ms | ⚠️ Non-pong | 有响应但返回非 Pong |
| 3 | ark-code-latest | ark | 787ms | ✅ 正常 | 完美 Pong 响应 |

🏆 最快（有响应）: glm-4.5 (bigmodel) - 570ms
🐌 最慢（有响应）: glm-4.6 (bigmodel) - 938ms
```

## 相关技能仓库

这些仓库是相关示例，不是必需的依赖项：

- [clawhub](https://github.com/openclaw/clawhub) - 用于分发和安装技能
- [skill-publish](https://github.com/openclaw/skills/tree/main/skill-publish) - 发布技能仓库的标准

## 安装

### 使用 ClawHub

```bash
clawhub install model-speedtest
```

### 手动安装

克隆此仓库到您的 OpenClaw 工作区：

```bash
cd /root/.openclaw/workspace/skills
git clone <repo-url> model-speedtest
```

## 仓库包含内容

```
model-speedtest/
├── SKILL.md                    # 技能文档和触发器
├── README.md                    # 英文文档
├── README.zh-CN.md               # 中文文档
├── LICENSE                      # MIT 许可证
├── CONTRIBUTING.md               # 贡献指南
├── scripts/
│   ├── main.js                  # 主测试脚本
│   ├── protocols/
│   │   ├── openai-completions.js
│   │   ├── openai-responses.js
│   │   └── anthropic-messages.js
│   └── utils/
│       ├── read-config.js
│       └── format-output.js
└── references/
    └── api-specs.md             # API 格式文档
```

## 社交预览

建议的社交预览素材：`assets/social-preview.svg`

> 跨提供商测试 AI 模型响应延迟，支持自动协议检测和完整错误报告。

GitHub 说明：

- 当前的 `gh` CLI 和 GraphQL `UpdateRepositoryInput` 不暴露可写的自定义社交预览字段。
- 要将此图像用作仓库社交预览，请在仓库设置 UI 中手动上传 `assets/social-preview.svg`。

## 仓库布局

- `SKILL.md` - 技能元数据和文档
- `scripts/` - JavaScript 测试脚本和协议适配器
- `protocols/` - API 协议适配器（OpenAI Completions、Responses、Anthropic）
- `utils/` - 配置读取和输出格式化工具
- `references/` - API 规范文档

## 贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献指南。

## 发布规范

发布此技能的更新时：

- 重新生成 `.skill` 工件：`python3 scripts/package_skill.py`
- 对所有已配置的提供商进行测试
- 如果触发器更改，更新 SKILL.md 描述
- 同步 README.md 和 README.zh-CN.md 之间的更改

## 仓库

[仓库](https://github.com/ruanrrn/model-speedtest)
