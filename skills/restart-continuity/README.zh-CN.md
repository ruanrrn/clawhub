# Restart Continuity

[English](README.md) | 简体中文

![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-111827?style=flat-square)
![Focus-State Recovery](https://img.shields.io/badge/Focus-State%20Recovery-EF8354?style=flat-square&labelColor=111827)
![Works-Standalone](https://img.shields.io/badge/Works-Standalone-F9FAFB?style=flat-square&labelColor=1F2937)
![Artifact-.skill Included](https://img.shields.io/badge/Artifact-.skill%20Included-FDE68A?style=flat-square&labelColor=1F2937)
![README-Bilingual](https://img.shields.io/badge/README-Bilingual-F9FAFB?style=flat-square&labelColor=92400E)
![License-MIT](https://img.shields.io/badge/License-MIT-F9FAFB?style=flat-square&labelColor=111827)

让 OpenClaw 在 gateway 重启前后保住正在进行的任务，并在恢复后带着可用上下文把工作接回来。

> [!IMPORTANT]
> 这套仓库标准只适用于"主要产物是 OpenClaw skill"的仓库。它不是给应用、库、或混合用途代码仓库准备的通用 README / 品牌 / GitHub 展示规范。

## 概览

`restart-continuity` 是一个边界明确的 OpenClaw skill，专门处理"重启之后怎么不断片"这件事。

它规定代理在重启前如何保存当前顶层任务、关键标识和精确下一步，也规定重启后如何优先恢复这项工作，并在第一条实质性回复里主动告诉用户恢复了什么。

这个仓刻意保持克制。它可以独立使用，但不会顺手把多任务编排、日常状态维护或其他泛化工作流策略都塞进来。

## 为什么需要它

重启应该像短暂断电，不该像当场失忆。

现实里的常见出现问题方式很固定：代理忘了真正的顶层任务，丢了 approval ID、job ID、进程状态或本来该在恢复后发给用户的说明，然后用户只能重新解释一遍已在进行中的工作。这个体验既低效，也不专业。

`restart-continuity` 的存在，就是把这类失败模式聚焦成一套可执行的操作规范：在中断前把该保存的东西保存好，在恢复后先把正确任务接上，而不是等用户来兜底。

## 适用范围

当主要问题是"如何跨过重启边界继续工作"时，就该用这个仓。

适合这些场景：

- gateway 计划重启，但进行中的工作不能断片
- 某个任务已经跨过一次重启，需要被明确恢复
- 助手需要把当前顶层未完成任务和下一步动作持久化
- approval、job、session、端口、文件路径等活跃标识必须跨重启保留
- 助手需要在重启后主动告诉用户恢复了什么

不适合这些场景：

- 正常工作期间的多任务优先级调度
- 没有重启参与时的连续性文件日常同步
- 与重启无关的泛化工作流治理

一句话：它管的是重启边界本身，不是系统里所有 continuity 问题。

## Skill 覆盖内容

这个 skill 把真正决定"重启恢复靠不靠谱"的操作环节标准化：

- 在重启前更新 `memory/active-task.md`，写清真实顶层任务、当前状态、阻塞、下一步，以及恢复后要发给用户的更新
- 记录重启后仍然重要的活跃标识，包括 approval、job ID、session、进程、端口和文件路径
- 对计划内重启创建一次性的 fallback cron，使用隔离的 `agentTurn` + `announce` 投递，而不是主会话里的 `systemEvent`，并持久化它的 `jobId`
- 检查返回的 fallback job 是否真的是 one-shot（`schedule.kind = at`），而不是重复调度；如果返回成了循环 job，必须先删掉再重建，别带病重启
- 把返回的 fallback job 快照写进 `memory/active-task.md`，包括 `jobId`、`schedule.kind`、计划触发时间和预期投递方式
- 把 cron fallback 当成强制性的兜底，而不是"有空再做"的装饰；内建的重启后 ping 有用，但单靠它不够稳
- 在安全且不阻塞时，于重启后立刻恢复顶层未完成任务
- 在恢复后的第一条实质性回复里主动说明恢复了什么
- 恢复成功后清理陈旧 fallback 状态，避免留下脏恢复轨迹
- 如果 fallback 重复触发，先杀掉它，再继续发用户可见状态更新
- 如果内建的 restart ping 没有很快带来可见的续跑，就依赖 cron fallback，不要等用户来提醒

## 工作流概览

一次标准的 `restart-continuity` 执行通常是这样：

1. 在重启前把真实顶层任务写入 `memory/active-task.md`。
2. 持久化重启后恢复所需的关键标识和精确下一步。
3. 为计划内重启安排一次性的 fallback cron job，使用隔离的 `agentTurn` + `announce` 投递，并立刻检查返回的 job 对象。
4. 只有在恢复指引已经可靠落盘，且 fallback 已确认是 one-shot 之后，才执行重启。
5. 重启后优先读取 `memory/active-task.md`，恢复顶层未完成任务。
6. 主动告诉用户恢复了什么，然后清理陈旧 fallback 状态。

## 何时使用

当核心问题不是"这个工作流平时该怎么设计"，而是"重启之后怎么别把当前任务弄丢"，就该拿出 `restart-continuity`。

典型触发语句包括：

- "把 gateway 重启了，但这个发布任务要能接着跑。"
- "我们刚在工作中途重启过，先恢复正确任务。"
- "重启前把 approvals 和下一步记下来。"
- "任务恢复后主动给用户发个更新。"

## 代表性结果

### 进行中的任务遇到计划内重启

比如仓库发布、代码审查或调试任务做到一半，必须先重启 gateway。

靠谱的代理应该先写清真实顶层任务，保存关键 ID，安排 fallback cron，然后只在恢复指引已经可靠落盘之后才重启。

### 重启后的恢复

环境在一次计划内或计划外重启之后重新上线。

靠谱的代理应该在做其他事之前先读 `memory/active-task.md`，在安全前提下恢复顶层未完成任务，并在第一条实质性回复里告诉用户恢复了什么。

### 恢复成功后的清理

恢复后的任务完成了，或者另一个未完成任务变成新的主任务。

靠谱的代理应该清理陈旧重启状态、移除 fallback cron，并清空或重写 `memory/active-task.md`，让当前顶层任务始终准确。

## 相关 skill 仓

这些仓库是相关示例，不是必需依赖：

- `task-orchestrator`：偏编排的配套仓，负责多任务调度与优先级 —— <https://github.com/ruanrrn/task-orchestrator>

如果主要故障点就发生在重启边界，从这个仓开始。

## 安装

两种方式都可以：

1. 直接把 `dist/restart-continuity.skill` 导入到 OpenClaw 环境。
2. 如果你需要可编辑源码，就把 `restart-continuity/` 复制到你的 skills 目录。

## 仓库内容

- `restart-continuity/` - skill 源码
- `dist/restart-continuity.skill` - 可直接导入的打包产物

## 仓库结构

```text
restart-continuity/
├── LICENSE
├── README.md
├── README.zh-CN.md
├── CONTRIBUTING.md
├── restart-continuity/
│   └── SKILL.md
└── dist/
    └── restart-continuity.skill
```

## 贡献

见 `CONTRIBUTING.md`。里面写明了贡献范围、PR 预期，以及如何把这个仓继续聚焦在"重启恢复"上，而不是滑坡成更宽泛的 continuity 工具箱。

## 发布规范

- skill 有实质改动后，重新生成 `dist/restart-continuity.skill`
- 保持 `README.md`、`README.zh-CN.md`、`SKILL.md` 和仓库 metadata 一致
- 维持窄而清晰的边界：先管好 restart continuity，其他工作流问题交给别的仓
- 及时移除陈旧的重启示例、ID 或文案，别让仓库看起来像它负责了更多东西

## 仓库信息

- GitHub: <https://github.com/ruanrrn/restart-continuity>
- License: MIT
