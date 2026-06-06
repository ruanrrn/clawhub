---
name: operational-fallbacks
description: Handle recurring tool, provider, network, or environment failures without repeated blind retries. Use when the same error repeats, a provider is unavailable, a tool path is blocked, or a workaround should be documented and reused instead of rediscovered.
---

# Operational Fallbacks

Treat repeated failures as a workflow problem, not a puzzle to rediscover each time.

## When a failure repeats

- Stop blind retries after the pattern is clear.
- Identify the exact failing boundary: tool policy, provider, network, auth, runtime, or local dependency.
- Record the concrete error text and the smallest known reproduction.
- Switch to the best available fallback instead of retrying the same dead path.

## Preferred order

- Use the first-class tool if it works.
- If the tool is blocked, use a local file-based or config-based workaround.
- If the provider is unavailable, use a local/offline path.
- If no workaround exists, document the boundary precisely and ask only for the missing approval, credential, or decision.

## Turn workarounds into memory

When a workaround is likely to matter again:

- Update `TOOLS.md`, `AGENTS.md`, or a task-specific skill.
- Add short operational notes to `memory/YYYY-MM-DD.md` if the failure affected active work.
- Avoid leaving the workaround only in chat history.

## For this workspace

- If `memory_search` is unavailable, do not keep retrying it blindly. Say it is unavailable, cite the provider/config failure if known, and use local workspace files directly.
- If Telegram exec approvals fail because of ID mismatches or missing handlers, document which approval system generated the ID before building a workaround.
- If a restart-safe workaround is needed, pair this skill with `skills/restart-continuity/SKILL.md`.

## Completion rule

Once the workaround is stable:

- Update the relevant skill or note so future sessions start from the known-good path.
- Remove stale temporary steps from `memory/active-task.md`.
