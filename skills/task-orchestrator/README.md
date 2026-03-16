# Task Orchestrator

English | [简体中文](README.zh-CN.md)

![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-111827?style=flat-square)
![Focus-Multitask](https://img.shields.io/badge/Focus-Multitask%20Scheduling-5BB2D7?style=flat-square&labelColor=111827)
![Works-Standalone](https://img.shields.io/badge/Works-Standalone-F9FAFB?style=flat-square&labelColor=1F2937)
![Artifact-.skill Included](https://img.shields.io/badge/Artifact-.skill%20Included-FDE68A?style=flat-square&labelColor=1F2937)
![README-Bilingual](https://img.shields.io/badge/README-Bilingual-F9FAFB?style=flat-square&labelColor=92400E)
![License-MIT](https://img.shields.io/badge/License-MIT-F9FAFB?style=flat-square&labelColor=111827)

Coordinate multi-task chat with explicit scheduling, safe parallelism, and staged progress updates.

> [!IMPORTANT]
> This standard applies only to repositories whose primary artifact is an OpenClaw skill. It is not a general README, branding, or GitHub styling guide for apps, libraries, or mixed-purpose codebases.

## Overview

`task-orchestrator` is a focused OpenClaw skill for handling multi-task chat without defaulting to naive FIFO queue brain.

It gives the agent an operating policy for multi-task chat:

- split incoming messages into discrete tasks
- identify blockers, conflicts, urgency, and likely execution time
- avoid treating chat like a strict queue unless the user explicitly asks for it
- use idle gaps effectively by running short tasks while long tasks execute
- report partial results as soon as useful results land
- stop and ask only when tasks truly conflict, require consent, or need a product choice

The repo is intentionally narrow. It defines scheduling, prioritization, and progress reporting policy. It does not own state persistence—continuity skills own `TODO.md` and `memory/active-task.md`.

## Why this exists

Real users already deliver work as a neat sequence of isolated ticks. They send multiple requests across separate messages, then introduce another task that changes priorities mid-flight, then expect the assistant to figure out what to run first without asking about everything.

An explicit orchestration policy exists to turn a pile of incoming requests into an execution plan that behaves like a competent operator instead of a chat bot with queue brain.

It prioritizes by:

- blocker removal (tasks that unblock other work or wait on an external system)
- urgency (time-sensitive or user-explicitly prioritized)
- external wait cost (start long-running tasks early so they're not blocking later)
- impact (high-value tasks over low-value noise)

Timestamp alone is weak evidence. A later message that unblocks everything else can jump the queue.

## Scope

Use this skill when the conversation pattern is coordinating multi-task chat:

- a user sends several requests across separate messages
- some tasks are long-running and others are short
- work can be parallelized across subthreads or subagents
- tasks may conflict, block each other, or need staged progress updates
- conversation needs explicit scheduling decisions, not just "do everything in order"

## What this skill covers

This skill teaches the agent default scheduling heuristics and conflict resolution patterns:

- task classification (blocking, urgent, parallel, interactive, background, quick-win)
- default scheduling order (unblockers → long-running → quick-wins → cleanup)
- when to launch work in parallel vs. serial
- when to report partial results vs. waiting for everything to finish
- how to resolve file/state conflicts between requests
- interaction patterns with continuity skills (`todo-continuity` and `restart-continuity`)

**Note on continuity integration:** This skill does not directly edit `TODO.md` or `memory/active-task.md`. It delegates that to `todo-continuity` and `restart-continuity`. This skill only decides scheduling and tells continuity skills when to persist state.

## Workflow summary

A good `task-orchestrator` pass always looks like this:

1. Break incoming user requests into discrete tasks, not just the order they arrived.
2. Identify dependencies, conflicts, external waits, risk, and likely execution time.
3. Launch high-value slow tasks early (background investigations, builds, tests, downloads).
4. Fill idle gaps with quick wins while long tasks execute.
5. Report partial results as soon as useful results land; do not wait for all-at-once.
6. Stop and ask only when tasks conflict, would overwrite each other, or require a user decision.

## When to use it

Reach for `task-orchestrator` when the conversation starts feeling like multi-task coordination but the agent is defaulting to naive first-in-first-out.

Typical triggers:

- "Fix the deploy script, also review this PR, and tell me what happened after the restart."
- "Create a migration script, but first check if the backup completed and summarize the recent logs."
- "Start a long-running build, and while it runs, update the README and fix linting errors."
- "P0: Verify production readiness, P1: Run the migration, P2: Send status update to team."

## Related skill repos

This skill is part of a continuity family. For state persistence and restart recovery:

- **todo-continuity** - Per-chat TODO.md ownership. Use when tasks span turns and `TODO.md` needs to stay accurate: <https://github.com/ruanrrn/todo-continuity>
- **restart-continuity** - Top-task recovery and restart logic. Use when restarts happen and active work must resume: <https://github.com/ruanrrn/restart-continuity>


## Install

Use either path:

1. Import `dist/task-orchestrator.skill` into an OpenClaw environment.
2. Copy `task-orchestrator/` into your skills directory if you want the editable source.

## What this repo contains

- `task-orchestrator/` - the skill source
- `dist/task-orchestrator.skill` - the packaged artifact ready to import

## Repository layout

```text
task-orchestrator/
├── LICENSE
├── README.md
├── README.zh-CN.md
├── task-orchestrator/
│   └── SKILL.md
└── dist/
    └── task-orchestrator.skill
```

## Contributing

See `CONTRIBUTING.md` for contribution scope, PR expectations, and what changes belong in this repo versus what should go to broader continuity work.

## Release hygiene

- Tag releases with semantic versioning (v1.0.0, v1.0.1, etc.)
- Keep `CHANGELOG.md` updated with user-facing changes
- Regenerate `dist/task-orchestrator.skill` after any `SKILL.md` changes
- Test scheduling heuristics and progress reporting before release

## License

MIT

## Repository

- GitHub: https://github.com/ruanrrn/task-orchestrator
- License: MIT
