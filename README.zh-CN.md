# 智能体技能库

[English](README.md) | 简体中文

个人自建的智能体技能，标准 `SKILL.md` 格式，任何支持技能目录约定的客户端都能用（如 `~/.agents/skills/`、`~/.claude/skills/`）

## 技能列表（10 个）

### 思维与研究
- **[deep-research](skills/deep-research/)** — 横纵分析法深度研究，产出带时间线、对比表、来源标注的研究报告
- **[fact-check](skills/fact-check/)** — 事实核查：拆分事实/推断/价值判断，联网核查来源，五级可信度标记，审查推理链漏洞
- **[learn-anything](skills/learn-anything/)** — 学习工具箱：双层解释法讲概念（小白版+专业版），反向拆解优秀成品

### 决策与解题
- **[make-better-decision](skills/make-better-decision/)** — 决策工具箱：双向钢人论证 + 最小实验设计
- **[solve-hard-problem](skills/solve-hard-problem/)** — 解决难题工具箱：专家会诊 + 第一性原理 + 跨领域借解
- **[socratic-questioning](skills/socratic-questioning/)** — 苏格拉底式问诊，多轮追问收敛出真正值得回答的问题

### 自我认知与人生规划
- **[life-design](skills/life-design/)** — 基于斯坦福 Designing Your Life 的人生设计，产出三个五年人生版本
- **[find-hidden-talent](skills/find-hidden-talent/)** — 深度天赋挖掘，多轮对话生成《个人天赋使用说明书》

### 开发与写作
- **[frontend](skills/frontend/)** — 前端开发专家技能：React/Vue/Angular、TypeScript、样式工程、性能、测试、无障碍
- **[plain-style](skills/plain-style/)** — 产物写作风格约束：说人话，去黑话

## 仓库结构

```text
clawhub/
├── skills/     # 10 个技能，每个一个 SKILL.md
└── sripts/     # 共享工具脚本
```

## 安装

把技能目录复制到你的客户端技能目录即可：

```bash
git clone https://github.com/ruanrrn/clawhub.git
cp -r clawhub/skills/<技能名称> ~/.agents/skills/
```

## 仓库信息

- **GitHub**: https://github.com/ruanrrn/clawhub
- **许可证**: MIT
- **维护者**: @ruanrrn

## 更新日志

### 2026-09-02
- 仓库内容替换为 10 个个人智能体技能（思维研究/决策解题/人生规划/开发写作）
- 删除此前全部 OpenClaw 技能
