# Telegram Exec Approval

[English](README.md) | 简体中文

![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-1F2937?style=flat-square)
![Focus-Telegram Approval UI](https://img.shields.io/badge/Focus-Telegram%20Approval%20UI-10B981?style=flat-square&labelColor=1F2937)
![Works-Standalone](https://img.shields.io/badge/Works-Standalone-F9FAFB?style=flat-square&labelColor=374151)
![Artifact-.skill Included](https://img.shields.io/badge/Artifact-.skill%20Included-D1FAE5?style=flat-square&labelColor=374151)
![README-Bilingual](https://img.shields.io/badge/README-Bilingual-F9FAFB?style=flat-square&labelColor=065F46)
![License-MIT](https://img.shields.io/badge/License-MIT-F9FAFB?style=flat-square&labelColor=1F2937)

一个聚焦 OpenClaw Telegram 交互式 exec 审批修复的公开 skill 仓库：把原生审批链路、正确的审批 ID、重复消息抑制，以及可复用的上游交付路径整理成可重复执行的工作流。

## 概览

`telegram-exec-approval` 是一个边界很窄的公开 skill 仓，专门处理一种非常具体、也非常烦人的问题：Telegram exec 审批看起来像在工作，实际却在用户可见层、按钮路由层、和底层 `approvalId` 之间对不上。

这个仓刻意不去扮演通用 Telegram 开发指南，也不想顺手接管整个 OpenClaw 故障排查。它只做一件事：把 Telegram exec 审批从“靠经验修”变成“按流程修”。

## 为什么需要它

Telegram 审批问题通常不是单点故障，而是几类问题一起出现：

- 审批消息显示了错误的标识符
- inline button 缺失，或者点击后路由到错误的审批目标
- 重启或事件重放后出现重复审批消息
- 本地 runtime 侧已经验证出可行修复，但没有被整理成可复用或可上游提交的变更

这类问题最糟糕的地方，不是难，而是特别容易演变成部落传说。这个仓的意义，就是把诊断顺序、修复边界和打包出口写成明确流程，避免下次再从零踩坑。

## 适用范围

当核心问题就是 Telegram exec 审批体验本身时，用这个仓最合适。

适合这些场景：

- 排查审批消息为什么显示了错误 ID
- 修复 Telegram inline button 的 exec 审批路由
- 区分展示用短 ID 和真正权威的完整 `approvalId`
- 抑制重启后或重复事件投递造成的重复原生审批消息
- 把本地验证有效的 patch 收敛成更干净的复用方案或上游改动

不适合这些场景：

- 通用 Telegram bot 开发
- 与 exec 审批无关的 OpenClaw 消息工作
- 不涉及 Telegram exec 审批的宽泛 OpenClaw 故障排查
- 把仓库扩张成通用 Telegram 工具箱

## 这个 skill 覆盖什么

仓内 skill 要求代理按克制、可验证的方式处理修复：

- 在打补丁之前先拆清不同审批展示面
- 把完整 `approvalId` 当成唯一权威值
- 先让 Telegram 原生审批路径端到端跑通
- 优先修复最小但仍然错误的用户可见面
- 当重复消息出现时，对重复审批处理做去重
- 如果另一条 OpenClaw 消息已经带了详细正文，就让 Telegram 按钮消息保持简洁
- 把本地 runtime 修复收敛成最小的可复用或可上游提交改动

## 工作流概览

一次标准修复通常应该这样推进：

1. 确认到底是哪一个审批展示面出了问题，以及每个展示面各自显示什么 ID。
2. 验证 Telegram 原生审批路径能否端到端传递完整 `approvalId`。
3. 先修最小的错误用户可见面，再决定是否扩大补丁范围。
4. 如果重启或重放导致重复审批消息，先把重复发送压住。
5. 把已经验证有效的修复收敛成可复用或可上游评审的改动。
6. 打包结果时保持仓库边界干净，不混入无关 Telegram 调试内容。

## 何时使用

当问题的重心是 Telegram 审批 UX，而不是整个 OpenClaw runtime 时，就该用 `telegram-exec-approval-ui`。

典型触发语句包括：

- “Telegram 审批按钮坏了。”
- “消息里显示的审批 ID 和 `/approve` 真正要的对不上。”
- “重启之后审批消息开始重复发。”
- “本地已经修通了，但还缺一个干净的复用补丁或 PR 方案。”

## 代表性结果

### 可见 ID 错误

Telegram 审批消息展示的是短 ID，但实际审批链路要求的是完整内部 ID。

靠谱的修复流程应该先定位到底是哪一个展示面泄漏了错误值，把完整 `approvalId` 作为唯一真值，只修复最小的错误展示面，然后用新的审批请求重新验证。

### 按钮存在，但审批目标不对

界面里已经有 inline button，但点击后并不能命中正确审批请求。

靠谱的修复流程应该先证明普通 Telegram inline button 本身是通的，再把按钮触发的 payload 与 assistant 侧 pending reply 做逐项比对，优先修 Telegram 路由链路，而不是先去大动显示层。

### 本地修好了，但还没有可复用成果

runtime patch 已经证明修复方向正确，但改动仍停留在本地实验状态。

靠谱的修复流程应该先清理临时调试垃圾，再把 runtime 试验映射回真正的源码级改动，最后打包成别人不需要重新发明轮子也能复用的结果。

## 相关 skill 仓

这些仓库是相关示例，不是必需依赖：

- `restart-continuity`：当审批问题和重启行为缠在一起时很有用 - <https://github.com/ruanrrn/restart-continuity>

如果问题本体就是 Telegram exec 审批 UX，从这个仓开始就对了。

## 安装

两种方式都可以：

1. 把 `dist/telegram-exec-approval-ui.skill` 导入 OpenClaw 环境。
2. 如果需要可编辑源码，就把 `telegram-exec-approval-ui/` 复制到你的 skills 目录。

## 仓库内容

- `telegram-exec-approval-ui/` - skill 源码
- `telegram-exec-approval-ui/references/upstream-plan.md` - 把本地 runtime 实验映射成源码级修复的说明
- `telegram-exec-approval-ui/references/pr-draft.md` - 面向上游评审的 PR 组织方式与验证备注
- `dist/telegram-exec-approval-ui.skill` - 可直接导入的打包产物

## 仓库结构

```text
telegram-exec-approval/
├── LICENSE
├── README.md
├── README.zh-CN.md
├── CONTRIBUTING.md
├── telegram-exec-approval-ui/
│   ├── SKILL.md
│   └── references/
│       ├── pr-draft.md
│       └── upstream-plan.md
└── dist/
    └── telegram-exec-approval-ui.skill
```

## 贡献

见 `CONTRIBUTING.md`。其中说明了贡献范围、PR 预期，以及如何保持这个仓持续聚焦 Telegram exec 审批，而不是失控扩张成更宽泛的 Telegram 集成仓。

## 发布规范

- 每次 skill 有实质改动后，都要重新生成 `dist/telegram-exec-approval-ui.skill`
- 保持 `README.md`、`README.zh-CN.md` 和 `telegram-exec-approval-ui/SKILL.md` 的表述一致
- 维持仓库边界克制，不把无关 Telegram 调试问题混进来
- 保证复用说明和上游交付说明始终和真实修复路径保持一致

## 仓库信息

- GitHub: `https://github.com/ruanrrn/telegram-exec-approval`
- License: MIT
