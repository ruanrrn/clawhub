---
name: task-orchestrator
description: "Coordinate multiple user tasks without falling into naive first-in-first-out handling. Use when: (1) a user sends several requests across separate messages, (2) some tasks are long-running and others are short, (3) work can be parallelized across subthreads or subagents, (4) tasks may conflict, block each other, or need staged progress updates."
---

# Task Orchestrator

Turn a pile of incoming requests into an execution plan that behaves like a competent operator instead of a chat bot with queue brain.

## Core policy

- Split the user's messages into discrete tasks before acting.
- Identify dependencies, conflicts, external waits, risk, and likely execution time.
- Do not default to strict arrival order unless the user explicitly asks for it.
- Prefer parallel execution for independent work.
- Keep the main thread focused on orchestration, user communication, and decisions.
- Push slower or repetitive execution into subthreads or subagents when that reduces blocking.
- Prioritize by blocker removal, urgency, impact, and external wait cost.
- Use idle gaps to finish short, low-risk tasks that do not interfere with longer work already running.
- Send partial updates as soon as useful results land.
- Stop and ask when tasks conflict, could overwrite each other, or require a user decision.

## Quick triage

For each new task, classify it quickly:

- `blocking`: unblocks other work or waits on an external system
- `urgent`: time-sensitive or user-explicitly prioritized
- `parallel`: independent and safe to run alongside other work
- `interactive`: needs clarification, approval, credentials, or a product choice
- `background`: long-running execution that can proceed while other work continues
- `quick-win`: short and low-risk, useful to finish during waits

If the user provides `P0/P1/P2`, a numbered order, or an explicit "do X first" instruction, that overrides the default triage.

## Execution workflow

### 1. Build the task map

Write down the real tasks, not just the order they arrived.

For each task, note:

- goal
- dependencies
- likely tool/runtime needs
- whether it can run in parallel
- what would block it
- what user-visible output should be reported

### 2. Launch the right things first

Start tasks that are both high-value and slow as early as possible.

Good candidates to launch early:

- background investigations
- builds, tests, downloads, indexing, packaging
- subagent runs with clear boundaries
- anything waiting on network, model, or approval latency

### 3. Fill the gaps intelligently

While long-running tasks execute:

- finish quick wins
- clean up docs or state files tied to the same work
- verify assumptions
- prepare the next decision or merge step

Do not start side quests that add noise or context bloat.

### 4. Report like an adult

Do not make the user ask whether work is still alive.

Progress updates should say:

- what finished
- what is still running
- what is blocked, if anything
- what decision is needed, if any

Report partial results when they are independently useful; do not wait for a perfect all-at-once summary.

### 5. Resolve conflicts explicitly

Pause and ask when:

- two tasks touch the same files or state in incompatible ways
- one request would undo or invalidate another
- the correct order depends on user preference
- an external action needs consent

When there is no real conflict, keep going.

## Default scheduling heuristics

Use this order of preference unless the user overrides it:

1. unblockers and urgent work
2. long-running independent tasks worth starting now
3. short tasks that fit into wait windows
4. cleanup, polish, and secondary improvements

Timestamp alone is weak evidence. A later message that unblocks everything else can jump the queue.

## Continuity and state

Good multitask orchestration survives resets, restarts, and long waits.

- When work is likely to survive the current turn, keep `TODO.md` updated through `todo-continuity` so the current chat has a durable unfinished-task record.
- When one task becomes the main active thread, keep `memory/active-task.md` updated through `restart-continuity` with the top task, next step, important IDs, and the exact post-restart user update.
- If a restart is intentional during active multitask work, schedule the required one-shot cron fallback described by `restart-continuity` before restarting.
- After restart, resume the top unfinished task first, then rebuild the broader task map from `TODO.md` if other tasks remain.
- Clear or rewrite stale task state as tasks finish; orchestration rots fast when the board lies.

## Interaction rules with continuity skills

Use these rules when this skill overlaps with continuity work:

- `task-orchestrator` decides ordering, parallelism, and progress reporting.
- `todo-continuity` stores the per-chat unfinished queue.
- `restart-continuity` stores the top active task that must resume first after a restart.
- If the files disagree, treat that as a state bug and repair them before continuing long work.
- During a long multitask bundle, update state when priorities change materially, not after every tiny action.

## Messaging style during multitask work

- Acknowledge the overall plan once if the task bundle is complex.
- Avoid narrating every trivial tool call.
- Prefer compact progress bursts over constant chatter.
- If one task finishes much earlier than the others, report it instead of sitting on it.
- If nothing useful changed, keep working rather than sending filler.

## Examples

### Example: mixed short and long requests

User sends:

- "Fix the config bug"
- "Also summarize this log"
- "And start a PR review"

Handle it like this:

- start the PR review in a subagent if useful
- inspect the config bug immediately if it is likely blocking
- summarize the log while the longer review runs
- report the config result as soon as it lands

### Example: conflicting requests

User sends:

- "Refactor this module"
- "Do not touch any public API yet"
- "Also rename these exported functions"

Stop at the conflict and ask which constraint wins before editing.

### Example: user-specified ordering

User sends:

- "P0: verify the backup"
- "P2: polish the README"
- "P1: diagnose the restart issue"

Respect the explicit priority scheme over the default heuristics.

## Failure modes to avoid

- Treating chat like a FIFO queue when tasks are obviously parallelizable
- Waiting silently on long work without progress updates
- Starting every new task immediately and creating chaos
- Ignoring file/state conflicts between requests
- Holding finished results until all work is done
- Asking for unnecessary confirmation when the next safe action is obvious
