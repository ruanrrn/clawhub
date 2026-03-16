# Contributing to Telegram Exec Approval

Keep contributions narrow, practical, and focused on Telegram approval UX that actually breaks in the wild.

## Scope

Good contributions:

- clearer diagnosis of wrong approval IDs, missing buttons, or duplicate approval messages
- tighter Telegram-native approval routing guidance
- better examples of how to validate the full `approvalId` path
- cleaner upstreaming notes and packaging polish
- README improvements that make the repo independently understandable

Avoid:

- turning the repo into a generic Telegram bot toolkit
- adding unrelated messaging features that have nothing to do with exec approvals
- bloating the repo with broad OpenClaw troubleshooting outside the approval flow

## Workflow

1. Make the smallest useful change.
2. Keep README claims aligned with `telegram-exec-approval-ui/SKILL.md`.
3. Regenerate `dist/telegram-exec-approval-ui.skill` after material skill changes.
4. Prefer concrete validation steps over vague debugging folklore.

## Pull request guidance

A good PR should explain:

- what broke in the approval flow
- what changed and why it fixes the user-visible problem
- whether the packaged `.skill` artifact was regenerated
- whether the reusable and upstream-facing guidance still matches the fix

## Repo principle

This repo should remain the Telegram exec approval specialist of the family, not a general-purpose Telegram integration grab bag.
