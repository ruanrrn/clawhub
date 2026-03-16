# Task Orchestrator

[English](README.md) | 简体中文

![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-132A13?style=flat-square)
![Focus-Multitask Orchestration](https://img.shields.io/badge/Focus-Multitask%20Orchestration-DDA15E?style=flat-square&labelColor=132A13)
![Works-Standalone](https://img.shields.io/badge/Works-Standalone-E9EDC9?style=flat-square&labelColor=31572C)
![Artifact-.skill Included](https://img.shields.io/badge/Artifact-.skill%20Included-B7C89A?style=flat-square&labelColor=31572C)
![README-Bilingual](https://img.shields.io/badge/README-Bilingual-E9EDC9?style=flat-square&labelColor=6B705C)
![License-MIT](https://img.shields.io/badge/License-MIT-E9EDC9?style=flat-square&labelColor=132A13)

为多请求聊天工作提供明确优先级、安全并行执行和分阶段进度汇报的编排策略。

## 概览

`task-orchestrator` 是一个聚焦型 OpenClaw skill，用来处理同一段对话里的多项用户请求，避免代理退化成只会按先进先出排队的队列脑。

它给代理定义的是一套多任务聊天执行策略：

- 把连续进入的消息拆成真正的离散任务
- 识别阻塞项、冲突、紧急程度和等待成本
- 尽早启动值得提前启动的长耗时工作
- 在等待窗口里完成短小、低风险任务
- 在整包任务结束前就主动汇报可独立消费的结果

这个仓库刻意保持窄边界。它负责的是编排策略，不是通用项目管理，也不是单独承担持久化或重启恢复的总方案。

## 为什么需要它

真实用户不会把工作整理成一串互不影响的工单。他们会先发一个请求，再补一个，然后第三条消息把前两件事的优先级一起改掉。

如果没有明确的编排策略，代理通常会在几个老地方出现问题：

- 长任务无意义地挡住短任务
- 真正的 unblocker 排在低价值工作后面
- 明明能并行的任务始终没有并行
- 后台工作还在跑，但进度对用户完全静音
- 整段对话被处理成队列，而不是执行计划

`task-orchestrator` 的价值，就是把这些常见失误收敛成一套清晰的默认调度模型。

## 适用范围

当核心问题是"如何在一段活跃对话里协调多项用户任务"时，就该用这个 skill。

适合这些场景：

- 多个请求跨多条消息到达
- 有些工作很快，有些工作会跑很久
- 多项任务可以安全并行
- 请求之间可能冲突、互相阻塞，或需要分阶段汇报
- 代理需要判断哪些现在启动，哪些稍后处理

不适合这些场景：

- 不需要编排的单任务回合
- 单独做连续性状态存储
- 单独做重启恢复
- 脱离聊天任务束的通用工作流自动化

## 这个技能覆盖什么

这个技能把多任务执行里最容易出问题的关键动作标准化：

- 按紧急程度、阻塞价值和运行时特征分类任务
- 除非用户明确要求，否则不按到达顺序死排队
- 让主线程专注在编排、沟通和决策上
- 在合适时把较慢的执行下放到子线程或 subagent
- 遇到真实冲突时停下来确认，而不是擅自猜
- 只要结果足够有用，就尽早对外汇报
- 当任务跨轮次或跨重启时，与连续性技能协作

## 工作流概览

一次合格的 `task-orchestrator` 执行通常长这样：

1. 把进入的消息拆成真正的任务集合。
2. 识别依赖、冲突、风险和大致运行时长。
3. 尽早启动高价值的长耗时工作。
4. 用等待窗口吃掉短小、安全的 quick wins。
5. 有阶段性成果就汇报，不等最后做成总包。
6. 状态冲突先修复或升级处理，别让它继续扩散。

## 何时使用

当一段对话已经不像"单个请求"，而更像"实时工作队列"时，就该用 `task-orchestrator`。

典型触发语句：

- "先修 config bug，再顺手总结这个日志，还要启动一个 PR review。"
- "这两件事能并行就并行，但碰到共享文件先问我。"
- "每完成一块就告诉我，不要等所有东西都做完。"
- "中途可能会重启，所以任务顺序和进度别乱掉。"

## 代表性结果

### 混合负载编排

用户连续发来 blocker 排查、文档请求和一个更长的 review 任务。

一个靠谱代理应该先查 blocker，把能独立运行的长任务尽早启动，再利用等待时间完成短文档任务，并在每个结果足够独立时立刻汇报。

### 冲突感知调度

两条请求会修改同一批文件，或者约束条件彼此矛盾。

一个靠谱代理应该在真正的决策点停下，问清楚哪条指令优先，而不是自信地把现场搞成事故复盘素材。

### 面向重启的协作

一组多任务工作很可能跨过重启或 session reset。

一个靠谱代理应该把编排策略放在这个 repo 里，同时与负责未完成队列和当前主任务状态的连续性技能协同工作。

## 相关 skill 仓

这些仓库是相关示例，不是必需依赖：


如果你的问题是对话内部的任务排序、并行执行和进度汇报，从这个仓库开始。
如果你需要的是围绕这些编排策略的完整连续性工作流，就看总包仓库。

## 安装

两种方式都可以：

1. 把 `dist/task-orchestrator.skill` 导入 OpenClaw 环境。
2. 如果你需要可编辑源码，就把 `task-orchestrator/` 复制到你的 skills 目录。

## 仓库内容

- `task-orchestrator/` - skill 源码
- `dist/task-orchestrator.skill` - 可直接导入的打包产物

## 仓库结构

```text
task-orchestrator/
├── LICENSE
├── README.md
├── README.zh-CN.md
├── CONTRIBUTING.md
├── task-orchestrator/
│   └── SKILL.md
└── dist/
    └── task-orchestrator.skill
```

## 贡献

见 `CONTRIBUTING.md`。里面写明了贡献范围、PR 预期，以及如何让这个仓库继续聚焦多任务编排，而不是把相邻的连续性逻辑也一股脑吞进来。

## 发布规范

- 只要 skill 有实质改动，就重新生成 `dist/task-orchestrator.skill`
- 保持 `README.md`、`README.zh-CN.md`、`task-orchestrator/SKILL.md` 和仓库 metadata 一致
- 让仓库继续聚焦编排策略，而不是扩张成宽泛的连续性功能集合
- 当调度策略发生明显变化时，同步更新代表性结果与示例

## 仓库信息

- GitHub: `https://github.com/ruanrrn/task-orchestrator`
- License: MIT
