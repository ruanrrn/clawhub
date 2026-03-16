# Draft PR: Telegram Interactive Exec Approvals

## Title

Add Telegram interactive exec approvals with full approval IDs

## Summary

This change adds a Telegram-native exec approval path so Telegram users can approve exec requests from inline buttons that resolve the correct full native `approvalId`.

It also removes several UX issues discovered during local validation:

- some approval surfaces exposed a short `approvalSlug` instead of the real actionable id
- Telegram approval messages could duplicate after hot restarts
- Telegram button messages could repeat approval details already visible elsewhere

## Why

Telegram supports inline buttons, but exec approval UX was incomplete compared with the more specialized platform paths. In practice this caused confusing approval flows where users could see the wrong id or receive redundant approval messages.

## Changes

- add a Telegram runtime-side exec approval handler
- send Telegram inline buttons bound to the full `approvalId`
- normalize Telegram chat targets before Bot API delivery
- replace user-facing `approvalSlug` displays with `approvalId` on approval-pending surfaces
- suppress duplicate native approval sends after hot restarts
- keep the custom Telegram approval message minimal when detailed approval context already exists

## Validation

Local validation covered:

- ordinary Telegram inline buttons work
- Telegram native approval messages can be delivered to the correct chat
- `/approve <full-id> allow-once` remains a valid fallback path
- assistant-facing pending replies and Telegram-native approval messages can reference the same full UUID
- duplicate native approval sends can be reduced by singleton + duplicate suppression logic

## Suggested manual test plan

1. Trigger an exec request that requires approval from Telegram.
2. Confirm the assistant-facing pending reply shows the full UUID.
3. Confirm Telegram shows approval buttons.
4. Confirm the button action resolves the same full UUID.
5. Confirm only one native Telegram approval message appears after restart scenarios.
6. Confirm the custom Telegram button message is minimal and does not repeat the full approval detail block.

## Notes

This PR is based on local dist-level validation and should be translated back into the appropriate source files before merge. Debug-only instrumentation used during local experimentation should not be included in the final upstream patch.
