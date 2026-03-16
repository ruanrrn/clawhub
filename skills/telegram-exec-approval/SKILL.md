---
name: telegram-exec-approval-ui
description: Diagnose, implement, or repair Telegram interactive exec approvals in OpenClaw. Use when Telegram approval messages are missing buttons, show the wrong approval id, duplicate after restart, fail to route back to the native approve command, or when the learned fix needs to be packaged for reuse or upstream review.
---

# Telegram Exec Approval UI

Stabilize the Telegram exec approval flow first, then reduce the local fix into a reusable or upstreamable patch.

## Workflow

1. Identify which approval surface is wrong.
2. Make the native Telegram approval path work end-to-end.
3. Remove duplicate or misleading approval surfaces.
4. Package the working flow for reuse or upstream review.

## 1. Separate the approval surfaces

Do not trust the first id you see.

- The authoritative id is the full `approvalId` used by `/approve <id> allow-once|allow-always|deny`.
- Short ids are often display-only `approvalSlug` values.
- The pending assistant reply, Telegram button message, and any extra gateway or harness message may show different identifiers.

Check each surface independently before patching.

## 2. Make the Telegram-native path work

Prefer a runtime-side Telegram handler over plain text forwarding.

Required behavior:

- subscribe to `exec.approval.requested`
- resolve the Telegram target from the session record
- normalize `telegram:<id>` into a Bot API chat id
- send inline buttons that call `/approve <full-approval-id> ...`

Useful validation:

- prove ordinary Telegram inline buttons work first
- log the exact `approvalId` emitted by the event
- verify the Telegram button message and assistant-facing pending reply refer to the same full id

## 3. Fix the common failure modes

### Wrong id

Patch the visible surface that still uses `approvalSlug` instead of `approvalId`.

Common local validation targets can include runtime bundles such as:

- `dist/reply-*.js`
- `dist/pi-embedded-*.js`
- `dist/plugin-sdk/reply-*.js`

Patch the smallest user-visible surface first, then retest with a fresh approval.

### Duplicate approval messages

Treat the Telegram approval sender as a singleton per account and dedupe repeated `approvalId` handling for a short window.

### Noisy approval body

If another OpenClaw message already carries the detailed approval text, keep the Telegram-native button message minimal.

## 4. Prepare the reusable or PR-minded version

Once local behavior works, collapse the fix into the smallest coherent change.

Prefer these rules:

- keep one authoritative `approvalId`
- avoid Telegram-only synthetic approval ids
- keep the Telegram button sender small
- preserve `/approve <id> ...` as the fallback path
- strip temporary debug logging before packaging or opening a PR

Read these bundled references when needed:

- `references/upstream-plan.md` for mapping local runtime experiments back to the logical source patch
- `references/pr-draft.md` for PR title, summary, and validation framing

## Validation checklist

Do not call the flow fixed until all are true:

- Telegram approval messages show inline buttons
- tapping a button resolves the correct full `approvalId`
- the assistant-facing pending reply also references the full `approvalId`
- duplicate native approval messages are suppressed
- the custom Telegram button message stays minimal
- after sending an approval request, the assistant avoids extra routine replies until the approval action finishes

## Packaging rule

When the fix is reusable, package the skill and keep any in-flight task state aligned with the current verification status.
