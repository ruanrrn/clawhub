# GitHub Publish Skill

[English](README.md) | 简体中文

![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-111827?style=flat-square)
![Focus-Skill Repo Publishing](https://img.shields.io/badge/Focus-Skill%20Repo%20Publishing-F59E0B?style=flat-square&labelColor=111827)
![Works-Standalone](https://img.shields.io/badge/Works-Standalone-F9FAFB?style=flat-square&labelColor=1F2937)
![Artifact-.skill Included](https://img.shields.io/badge/Artifact-.skill%20Included-FDE68A?style=flat-square&labelColor=1F2937)
![README-Bilingual](https://img.shields.io/badge/README-Bilingual-F9FAFB?style=flat-square&labelColor=92400E)
![License-MIT](https://img.shields.io/badge/License-MIT-F9FAFB?style=flat-square&labelColor=111827)

将 OpenClaw skill 发布或重新发布为完整、专业且适合公开分发的 GitHub skill 仓库，遵循一套专为 skill 仓库设计的标准。

> [!IMPORTANT]
> 这套标准仅适用于以 OpenClaw skill 为主要产物的仓库。不适用于应用、库或混合用途代码仓库的通用 README / 品牌 / GitHub 展示规范。

## 概览

`skill-publish` 定义了公开 OpenClaw skill 仓库的发布标准，而不仅仅是"将文件推送到 GitHub"。

它涵盖两部分工作：

- skill 本体的发布或重新发布
- 仓库对外展示的整理，使其呈现为完整的成品，而非内部目录的导出

具体而言，就是将 `.skill` 产物打包、理清仓库叙事、对齐 metadata，并确保任何首次在 GitHub 上看到该仓库的人都能独立理解它。

## 为什么需要它

让一个 skill 能跑起来并不难。真正经常缺失标准的，是如何把它发布成一个可理解、可复用、值得信任的公开仓库。

如果没有明确标准，公开 skill 仓库通常会在以下几个方面出现问题：

- 仓库看起来像内部文件夹直出，而不像正式发布物
- 打包产物缺失，或者虽然存在但被埋得很深
- README 默认读者已经知道太多上下文
- 贡献方式和维护边界不清楚
- 同一 skill 家族里的仓库越长越不像一家人

`skill-publish` 的意义，就是把这类问题收敛成一套可重复执行的标准流程。

## 适用边界

当目标仓库本质上是一个可分发的 OpenClaw skill 仓库，且你需要将其对外展示整理完整时，就应使用此 skill。

适合这些场景：

- 为一个可复用 OpenClaw skill 新建公开 GitHub 仓库
- skill 发生实质更新后重新发布
- 把旧 skill 仓升级到当前的公开标准
- 统一 skill 家族中 README、badge、metadata 和贡献文档的表达方式

不适合这些场景：

- 普通软件项目
- 应用或库
- skill 只是附属产物的混合仓库

## 这套标准覆盖什么

此 skill 要求代理将决定"仓库是否呈现为公开成品"的关键部分标准化：

- 发布前先校验 skill
- 正确生成 `.skill` 打包产物
- 组织完整的公开仓库内容，包括 `README.md`、`README.zh-CN.md`、`LICENSE`、`CONTRIBUTING.md`、skill 源码和 `dist/`
- 撰写让没有内部背景的人也能理解的仓库文案
- 让仓库 description 和 topics 与 skill 的真实职责对齐
- README 文案按正式公开工具文档撰写，而非内部备忘的口吻
- 明确保留适用边界，避免仓库沦为"GitHub 展示美化万能包"

## 工作流概览

一次标准的发布整理流程如下：

1. 校验 skill，确认 frontmatter、references 和打包输入都能正确解析。
2. 生成或刷新 `.skill` 产物。
3. 组装公开发布所需的仓库内容。
4. 重写 README 和贡献说明，使其适合独立公开阅读。
5. 对齐仓库 metadata 和 badge，使其反映 skill 的真实定位。
6. 在 material update 之后干净地重新发布。

## 何时使用

当问题的核心是"怎么把仓库本身发布好"，而不是"skill 逻辑怎么写"时，就应该用 `skill-publish`。

典型触发语句包括：

- "把这个内部 skill 整理成公开 GitHub 仓。"
- "把这个 repo 聚焦到像正式发布物。"
- "让这个 skill 仓和同一家族的公开仓风格一致。"
- "把打包产物和公开展示一起整理好。"

## 代表性结果

### 新建公开 skill 仓

一个内部可复用的 skill 已经准备好对外发布。

靠谱的代理应该先校验 skill，再打包产物、组织公开仓内容，最后把仓库发布成一个不需要额外解释也能安装和理解的公开成品。

### 旧仓翻新

一个现有 skill 仓功能没坏，但公开展示已经落后于同一家族的新仓。

靠谱的代理应该保留 working skill，本着最小必要改动原则升级 README、贡献文档，同时确保仓库本身仍然独立可用。

### 边界控制

有人想把这套标准拿去包装普通 app 仓或库仓。

靠谱的代理应该拒绝这种 scope 扩张，并明确指出这套标准只服务于 OpenClaw skill 仓。

## 相关 skill 仓

这些仓库是相关示例，不是依赖项：

- `task-orchestrator`：多任务编排 skill 示例 —— <https://github.com/ruanrrn/task-orchestrator>
- `restart-continuity`：重启恢复 skill 示例 —— <https://github.com/ruanrrn/restart-continuity>
- `telegram-exec-approval`：Telegram 审批修复 skill 示例 —— <https://github.com/ruanrrn/telegram-exec-approval>

如果你要解决的是"如何正确发布和整理 skill 仓库"，就从这里开始。

## 安装

两种方式都可以：

1. 直接把 `dist/skill-publish.skill` 导入到 OpenClaw 环境。
2. 如果你需要可编辑源码，就把 `skill-publish/` 复制到你的 skills 目录。

## 仓库内容

- `skill-publish/` - skill 源码
- `skill-publish/references/public-skill-style.md` - 公开 skill 仓风格蓝图
- `dist/skill-publish.skill` - 可直接导入的打包产物

## 仓库结构

```text
skill-publish/
├── LICENSE
├── README.md
├── README.zh-CN.md
├── CONTRIBUTING.md
├── skill-publish/
│   ├── SKILL.md
│   └── references/
│       └── public-skill-style.md
└── dist/
    └── skill-publish.skill
```

## 贡献

详见 `CONTRIBUTING.md`，其中明确了贡献范围、PR 预期，以及如何确保本仓库始终聚焦于"公开 skill 仓库发布标准"，而非沦为通用的 GitHub 美化工具。

## 发布规范

- 每次对 skill 进行实质性修改后，重新生成 `dist/skill-publish.skill`
- 保持 `README.md`、`README.zh-CN.md`、`SKILL.md` 与仓库 metadata 一致
- 始终明确适用范围：本标准仅适用于 skill 仓库
- 优先选择更精简、更稳定、更易维护的发布标准，避免功能膨胀

## 仓库信息

- GitHub: `https://github.com/ruanrrn/skill-publish`
- License: MIT
