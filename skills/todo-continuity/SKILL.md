---
name: todo-continuity
description: Track per-user and per-group unfinished work in TODO.md across session restarts and gateway restarts. Use when tasks span turns, a restart is planned or requested, multiple chats need isolated task tracking, or the assistant must resume work after restart and proactively tell the user what resumed.
---

# TODO Continuity

Use `TODO.md` as the durable task board for unfinished work.

## Scope rules

- Isolate tasks by chat, not globally.
- Use one section per conversation target.
- For direct chats, key by `channel:user-id`.
- For groups, key by `channel:group-id` and include topic/thread if relevant.
- Never mix one chat's unfinished work into another chat's section.

## Required sections

Each task section should be short and operational. Use this shape:

```md
## <channel:key>

- Context: direct | group | topic
- Goal: ...
- In progress: ...
- Next step: ...
- Blockers: ...
- Important IDs: ...
- Resume message: ...
```

## When to update TODO.md

Sync immediately when any of these happens:

- the current chat has unfinished or blocked work
- multiple tasks are active and the queue matters
- a new task meaningfully changes priority
- a blocker appears or clears
- the next step or blocker changed
- a finished task should be removed from the board
- important IDs appear: approvals, process IDs, session IDs, run IDs, job IDs, ports, or URLs

Do not rewrite the file after every tiny step. Sync on material state changes.

Use `TODO.md` as the durable queue for the current chat, not as a global brain dump.

## Sync workflow

### 1. Rebuild the true state

Before writing, determine:

- what tasks are still active
- what is blocked vs merely waiting
- which IDs matter later
- what the next action actually is

Do not copy stale text forward blindly.

### 2. Write the per-chat queue

In `TODO.md`, keep the current chat section short and operational:

- `Context`
- `Goal`
- `In progress`
- `Next step`
- `Blockers`
- `Important IDs`
- `Resume message`

If the chat has no unfinished work, remove its section.

### 3. Verify consistency

After writing:

- IDs should not contradict each other
- finished tasks should not still appear as active
- the recorded next step should still be the next step

## Before restart or session reset

- Update the current chat's section in `TODO.md`.
- Record the real next step, not a vague intention.
- Record live ids that matter: approval ids, process ids, session ids, chat ids, files, URLs.
- If the task is complete, remove the chat's section instead of leaving stale notes.

## After restart

- Read `TODO.md` before unrelated work.
- Find the current chat's matching section.
- Resume that chat's unfinished task immediately when safe.
- In the first substantive reply, proactively tell the user what task resumed and what happens next.
- Treat missing that proactive restart update as a process failure that must be corrected, not ignored.
- If the task is done during the resumed turn, clear or rewrite that chat's section before ending the turn.

## Interaction with other files

- `TODO.md` is the per-chat board.
- `memory/active-task.md` is the current top task scratchpad for the active session.
- `task-orchestrator` decides ordering, parallelism, and progress rhythm.
- When both TODO files exist, keep them consistent.
- If work is chat-specific and likely to survive restart, write it to both.

## Practical examples

### Example: new blocker appears

A background subagent run fails and produces a session ID plus an error log path.

Sync like this:

- update `TODO.md` so the current chat now shows the blocker and the next diagnostic step
- update `memory/active-task.md` if this failure becomes the top task (via restart-continuity)
- record the session ID and log path in whichever file will matter after restart

### Example: task completion

The repo publish finally succeeds.

Sync like this:

- remove the finished item from `TODO.md` or rewrite the section around remaining work
- if no active top task remains, clear `memory/active-task.md` (via restart-continuity)

### Example: top task changes

A later user message introduces an urgent production issue.

Sync like this:

- rewrite `TODO.md` to show the old task as secondary and the new task as the main active lane
- rewrite `memory/active-task.md` so the urgent issue becomes the resume-first task (via restart-continuity)
- update the resume sentence so the first post-restart reply reflects reality

## For this workspace

- Prefer `telegram:<user-id>` for direct Telegram chats.
- Prefer `telegram:<group-id>` or `telegram:<group-id>:topic:<topic-id>` for Telegram groups/topics.
- Keep the file concise; only store active or blocked tasks.

## Completion rule

- Remove finished tasks from `TODO.md`.
- Do not keep stale approval ids or already-completed next steps.

## Failure modes to avoid

- keeping stale IDs or finished tasks in the file
- recording vague next steps like "continue later"
- treating waiting as the same thing as blocked
- leaving no state trail for long-running work that obviously spans turns
