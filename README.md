# Agent Skills

English | [简体中文](README.zh-CN.md)

Personal agent skills, in standard `SKILL.md` format. Usable in any agent client that supports the skills directory convention (e.g. `~/.agents/skills/`, `~/.claude/skills/`).

## Skills (10)

### Thinking & Research
- **[deep-research](skills/deep-research/)** — In-depth research via vertical/horizontal analysis, with timelines, comparison tables and cited sources
- **[fact-check](skills/fact-check/)** — Fact-checking: split claims into facts/inferences/value judgments, verify sources online, five-level confidence rating, expose reasoning flaws
- **[learn-anything](skills/learn-anything/)** — Learning toolbox: two-layer explanations (plain + expert) for concepts, reverse-engineering analysis for excellent products

### Decisions & Problem Solving
- **[make-better-decision](skills/make-better-decision/)** — Decision toolbox: two-sided steelman arguments + minimal experiment design
- **[solve-hard-problem](skills/solve-hard-problem/)** — Hard-problem toolbox: expert panel + first principles + cross-domain borrowing
- **[socratic-questioning](skills/socratic-questioning/)** — Socratic questioning to converge on the question actually worth answering

### Self-Knowledge & Life Planning
- **[life-design](skills/life-design/)** — Life design based on Stanford Designing Your Life, produces three five-year Odyssey plans
- **[find-hidden-talent](skills/find-hidden-talent/)** — Deep talent mining through multi-round dialogue, produces a personal talent manual

### Development & Writing
- **[frontend](skills/frontend/)** — Frontend expertise: React/Vue/Angular, TypeScript, CSS engineering, performance, testing, a11y
- **[plain-style](skills/plain-style/)** — Writing style constraint for all outputs: plain language, no jargon

## Repository Structure

```text
clawhub/
├── skills/     # 10 skills, one SKILL.md each
└── sripts/     # Shared utility scripts
```

## Install

Copy the skill directory into your agent's skills directory:

```bash
git clone https://github.com/ruanrrn/clawhub.git
cp -r clawhub/skills/<skill-name> ~/.agents/skills/
```

## Repository

- **GitHub**: https://github.com/ruanrrn/clawhub
- **License**: MIT
- **Maintainer**: @ruanrrn

## Changelog

### 2026-09-02
- Replaced repo content with 10 personal agent skills (thinking/research, decisions, life planning, development/writing)
- Removed all previous OpenClaw skills
