---
name: restart-continuity
description: Preserve and resume in-flight work across restarts. Use when a task spans restarts, a gateway restart is planned or happened, or the assistant must proactively continue the pre-restart task and tell the user what resumed.
---

# Restart Continuity

Treat restarts like brief blackouts, not amnesia.

## Before a restart

- Update `memory/active-task.md` with the current goal, latest working state, blockers, the exact next action, and the user-facing sentence to send after restart.
- Record any live IDs that matter, such as approval IDs, job IDs, process IDs, ports, sessions, or file paths.
- If code or config changed, name the changed files explicitly.
- If multiple tasks exist, mark one as the top task and keep the others clearly secondary.
- For any intentional restart, create a one-shot cron fallback 60-120 seconds later that uses an isolated `agentTurn` with announce delivery, not a main-session `systemEvent`. The fallback prompt should instruct the agent to read `memory/active-task.md`, resume the top task, send the queued user update, and remove the fallback job after successful resumption. Write that cron `jobId` into `memory/active-task.md` before restarting.
- After creating the fallback, immediately verify the returned schedule is truly one-shot: `schedule.kind` must be `at`, not `every`. If the created job is repeating, delete it at once and recreate it before restarting; a repeating fallback will spam the user and burn tokens.
- Record the returned fallback job snapshot in `memory/active-task.md`: `jobId`, `schedule.kind`, scheduled time, and expected delivery mode. Do not trust memory or intent; trust the returned job object.
- Treat the cron fallback as mandatory backup, not optional polish. The built-in post-restart ping is helpful, but it is not enough on its own, and heartbeat-style `systemEvent` routing is too quiet to serve as the only user-visible recovery path.

## After a restart

- Read `memory/active-task.md` before doing unrelated work.
- Resume the top unfinished task immediately if it is safe and not blocked.
- In the first substantive reply, tell the user what task resumed and what you are doing next.
- Treat failure to send that proactive restart update as a workflow failure, not a minor omission.
- Do not ask the user to say "continue" on an already active task.
- Keep updating `memory/active-task.md` as the task progresses.
- If a restart fallback cron job was scheduled, remove or disable it as soon as successful resumption is confirmed so it does not fire later and create duplicate nudges.
- If the same fallback fires twice, treat that as an operational fault. Stop relaying its output, inspect the job immediately, and kill it before doing any more narrative updates.
- If the built-in restart ping does not produce visible continuation quickly, rely on the cron fallback rather than waiting for the user to remind you.

## Active-task format

Keep `memory/active-task.md` short and operational:

```md
# Active Task

- Goal: what success looks like
- Current status: latest true state
- Latest important IDs: approvals, sessions, processes, jobs, including any restart fallback cron `jobId` and whether it is an isolated `agentTurn` fallback
- Next step: one concrete next action
- If blocked: exact unblock condition
- User update after restart: one sentence to send proactively
- Done when: short completion test
```

## When to update memory/active-task.md

Sync immediately when any of these happens:

- one task becomes the clear top priority
- the task is likely to survive the turn
- a restart or session reset would be painful without a scratchpad
- the exact next step or user-facing resume sentence changed
- important IDs appear: approvals, process IDs, session IDs, run IDs, job IDs, ports, or URLs
- the next concrete action changes
- a restart or reset becomes likely
- a task finishes and should be removed

Do not rewrite the file after every tiny step. Sync on material state changes.

Use `memory/active-task.md` for the one task that must resume first, not for every side quest.

## Sync workflow

### 1. Rebuild the true state

Before writing, determine:

- which task is top priority right now
- what is blocked vs merely waiting
- which IDs matter later
- what the next action actually is

Do not copy stale text forward blindly.

### 2. Write the top-task scratchpad

In `memory/active-task.md`, keep only:

- `Goal`
- `Current status`
- `Latest important IDs`
- `Next step`
- `If blocked`
- `User update after restart`
- `Done when`

If there is no active top task, clear the file instead of leaving fiction behind.

### 3. Verify consistency

After writing:

- the top task in `memory/active-task.md` should also make sense inside the chat section in `TODO.md`
- IDs should not contradict each other
- finished tasks should not still appear as active
- the recorded next step should still be the next step

## Fallback cron template

Before an intentional restart, schedule a one-shot fallback like this:

- `sessionTarget`: `isolated`
- `payload.kind`: `agentTurn`
- `schedule.kind`: `at`
- `schedule.at`: about 60-120 seconds in the future
- `delivery.mode`: `announce`
- `payload.message`: a short instruction such as `Restart follow-up: read memory/active-task.md now, resume only the top unfinished task, send the queued user update to the user, then remove this fallback job after successful resumption.`

Write the returned `jobId` into `memory/active-task.md`, and remove the job after successful resumption.

## Fallback audit checklist

Use this checklist every time a restart fallback is created or resumes:

- Confirm the created job has `schedule.kind = at`; never accept `every` for a restart fallback.
- Confirm the scheduled fire time is roughly 60-120 seconds after restart, not an open-ended recurring cadence.
- Keep the fallback prompt narrow. It should resume one task, send one queued update, and delete itself. Do not ask it to broadly re-audit the whole system.
- After the first successful fallback message, remove the job immediately.
- If you see duplicate fallback announcements, kill the job first and only then explain the incident to the user.
- Do not infer cron persistence from chat noise alone; verify with `cron list` / `cron runs` when available.

## Interaction with other files

- `TODO.md` is the per-chat board (managed by todo-continuity).
- `memory/active-task.md` is the current top task scratchpad for the active session.
- `task-orchestrator` decides ordering, parallelism, and progress rhythm.
- When both TODO files exist, keep them consistent.
- If work is chat-specific and likely to survive restart, write it to both.

## Practical examples

### Example: new blocker appears

A background subagent run fails and produces a session ID plus an error log path.

Sync like this:

- update `TODO.md` so the current chat now shows the blocker and the next diagnostic step (via todo-continuity)
- if this failure becomes the top task, update `memory/active-task.md`
- record the session ID and log path in whichever file will matter after restart

### Example: top task changes

A later user message introduces an urgent production issue.

Sync like this:

- rewrite `TODO.md` to show the old task as secondary and the new task as the main active lane (via todo-continuity)
- rewrite `memory/active-task.md` so the urgent issue becomes the resume-first task
- update the resume sentence so the first post-restart reply reflects reality

### Example: task completion

The repo publish finally succeeds.

Sync like this:

- remove the finished item from `TODO.md` or rewrite the section around remaining work (via todo-continuity)
- if no active top task remains, clear `memory/active-task.md`

## When the task finishes

- Remove or clear `memory/active-task.md` once the top task is complete and no immediate continuation work remains.
- If follow-up work remains, rewrite `memory/active-task.md` so the next unfinished task becomes the new top task.
- Do not leave stale approval IDs or outdated next steps in the file.

## Blocking rules

Pause and ask only if one of these is true:

- Approval or credentials are required
- The next action is destructive or external
- The user must choose between materially different options

Otherwise, keep moving.

## For this workspace

- Read `SOUL.md`, `USER.md`, today's and yesterday's memory files, and `memory/active-task.md` every session.
- Keep `memory/active-task.md` current whenever work is likely to survive a restart.
- When a restart was intentional, resume that task first and mention the resumed task in the first substantive reply.

## Failure modes to avoid

- letting `TODO.md` and `memory/active-task.md` drift apart
- keeping stale IDs or finished tasks in the file
- recording vague next steps like "continue later"
- treating waiting as the same thing as blocked
- forgetting to update the user-facing restart sentence after priorities change
- leaving no state trail for long-running work that obviously spans turns
