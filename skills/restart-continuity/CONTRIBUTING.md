# Contributing to Restart Continuity

Keep contributions narrow, practical, and centered on restart-safe recovery.

## Scope

Good contributions:

- clearer restart-prep and restart-recovery rules
- better examples of `memory/active-task.md` usage and fallback cron handling
- README improvements that make standalone restart continuity usage clearer
- bilingual documentation or packaging polish that keeps the repo focused

Avoid:

- turning the repo into a general multitask scheduler
- mixing in broad continuity-file maintenance that belongs in state-sync lanes
- adding unrelated automation or GitHub repo polish that is outside restart recovery

## Workflow

1. Make the smallest useful change.
2. Keep README claims aligned with the actual skill behavior.
3. Regenerate `dist/restart-continuity.skill` after material skill changes.
4. If docs change, keep `README.md` and `README.zh-CN.md` aligned.
5. Prefer operational examples over vague advice.

## Pull request guidance

A good PR should explain:

- what changed
- why the change improves restart-safe recovery
- whether `dist/restart-continuity.skill` was regenerated
- whether both READMEs still describe the same scope

## Repo principle

This repo should remain the restart-recovery specialist of the family, not a catch-all continuity bundle.
Do not turn restart-boundary recovery into generic state-sync policy or umbrella multitask orchestration.
