# Upstream Plan: Telegram Exec Approval UI

## Goal

Add a first-class Telegram interactive exec approval path in OpenClaw so Telegram users can approve exec requests from inline buttons that resolve the correct full native `approvalId`.

## Problems solved locally

1. Telegram could show approval buttons only through ad hoc local runtime patching.
2. Some approval surfaces showed a short `approvalSlug` instead of the real `approvalId`.
3. Hot restarts could leave multiple Telegram approval handlers alive, causing duplicate approval messages.
4. The custom Telegram button message repeated approval details already shown by the existing gateway message.

## Dist-level patches observed locally

### Telegram runtime layers

Patched local bundles:

- `dist/reply-DhtejUNZ.js`
- `dist/pi-embedded-CtM2Mrrj.js`
- `dist/pi-embedded-DgYXShcG.js`

Behavior added there:

- `buildTelegramExecApprovalText(request)`
- `buildTelegramExecApprovalButtons(approvalId)`
- `resolveTelegramExecApprovalTarget(...)`
- `TelegramExecApprovalHandler`
- chat id normalization from `telegram:<id>` to Bot API chat id
- duplicate suppression keyed by `approvalId`
- singleton lifecycle per account across hot restarts

### Approval-pending display surfaces

Patched local bundles:

- `dist/reply-DhtejUNZ.js`
- `dist/pi-embedded-CtM2Mrrj.js`
- `dist/pi-embedded-DgYXShcG.js`
- `dist/plugin-sdk/reply-DFFRlayb.js`
- `dist/subagent-registry-CkqrXKq4.js`

Behavior changed there:

- replace `approvalSlug` display with full `approvalId`
- keep `approvalId` authoritative across chat-facing approval surfaces

## Recommended upstream source-level design

## 1. Add a Telegram exec approval handler next to the existing platform-specific approval handlers

If Discord already has a dedicated approval handler, Telegram should have a peer implementation instead of relying on generic text forwarding.

Responsibilities:

- subscribe to `exec.approval.requested`
- resolve the Telegram delivery target from session metadata
- normalize provider-prefixed chat ids
- send inline approval buttons using the full `approvalId`
- keep the message body minimal if another message already carries detailed approval context

## 2. Centralize the approval id contract

Use one approval identifier everywhere the user can act:

- pending reply text
- inline buttons
- `/approve <id> ...` fallback
- resolved approval event

If an `approvalSlug` must still exist for internal diagnostics, do not surface it as the actionable user id on Telegram.

## 3. Make restart behavior safe

Prevent duplicate approval messages after hot restarts by:

- enforcing one Telegram approval handler per account/runtime
- suppressing repeated sends for the same `approvalId` over a short TTL window

## 4. Keep Telegram UX minimal

Recommended message split:

- existing approval detail message: keep details here
- Telegram custom button message: keep only a short action label plus buttons

This avoids duplicated walls of text.

## Minimal upstream patch set

A clean PR can likely be framed as four logical changes:

1. Add Telegram runtime approval handler
2. Normalize Telegram approval target ids
3. Use `approvalId` instead of `approvalSlug` on user-facing approval surfaces
4. Add duplicate suppression / singleton lifecycle for Telegram approval handlers

## Local validation evidence to preserve in PR notes

- ordinary Telegram inline buttons already work
- native Telegram approval messages can be sent for the correct full UUID
- duplicate native sends can be suppressed
- assistant-facing pending replies can be changed to use the full UUID

## What to remove before upstreaming

Do not upstream local-only debugging or temporary artifacts such as:

- workspace debug log writes
- workspace-specific file paths like `/root/.openclaw/workspace/...`
- ad hoc local TODO references
- any temporary text used only for debugging
