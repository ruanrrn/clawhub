# Contributing to Task Orchestrator

Keep contributions narrow, practical, and aligned with the skill's purpose.

## Scope

Good contributions:

- clearer trigger language in `task-orchestrator/SKILL.md`
- better real-world multitask examples
- packaging or repository polish that keeps the repo focused
- README improvements that make standalone usage clearer

Avoid:

- turning the repo into a generic prompt collection
- adding unrelated automation or workflow experiments
- expanding the skill into state-sync or restart-specific logic that belongs elsewhere

## Workflow

1. Make the smallest useful change.
2. Keep README claims aligned with the actual skill behavior.
3. Regenerate `dist/task-orchestrator.skill` after material skill changes.
4. Keep `README.md` and `README.zh-CN.md` aligned when the public pitch changes.
5. Keep examples concrete rather than theoretical.

## Pull request guidance

A good PR should explain:

- what changed
- why the change helps real multitask orchestration
- whether `dist/task-orchestrator.skill` was regenerated

## Repo principle

This repo should remain the focused scheduling brain of the family, not the entire family in one folder.
