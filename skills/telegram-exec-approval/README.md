# Telegram Exec Approval

English | [简体中文](README.zh-CN.md)

![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-1F2937?style=flat-square)
![Focus-Telegram Approval UI](https://img.shields.io/badge/Focus-Telegram%20Approval%20UI-10B981?style=flat-square&labelColor=1F2937)
![Works-Standalone](https://img.shields.io/badge/Works-Standalone-F9FAFB?style=flat-square&labelColor=374151)
![Artifact-.skill Included](https://img.shields.io/badge/Artifact-.skill%20Included-D1FAE5?style=flat-square&labelColor=374151)
![README-Bilingual](https://img.shields.io/badge/README-Bilingual-F9FAFB?style=flat-square&labelColor=065F46)
![License-MIT](https://img.shields.io/badge/License-MIT-F9FAFB?style=flat-square&labelColor=1F2937)

Diagnose and repair Telegram interactive exec approvals in OpenClaw, with a workflow focused on the native approval path, correct approval IDs, duplicate suppression, and reusable upstream-ready fixes.

## Overview

`telegram-exec-approval` is a focused public skill repository for one operational problem: Telegram exec approvals that look valid to users but fail in practice.

The repository is intentionally narrow. It does not try to document general Telegram development or broad OpenClaw troubleshooting. Instead, it packages a repeatable method for repairing the approval flow when the visible message, the inline button action, and the underlying `approvalId` drift out of sync.

## Why this exists

Telegram approval failures tend to cluster around the same set of issues:

- approval messages expose the wrong identifier
- inline buttons are missing or route to the wrong approval target
- duplicate approval messages appear after restart or replay
- a local runtime workaround exists, but nobody turns it into a clean reusable or upstreamable fix

That combination is expensive because it produces folklore instead of a reliable repair path. This repository exists to make the diagnosis and fix sequence explicit, testable, and reusable.

## Scope

Use this repository when the main problem is the Telegram exec approval experience itself.

Good fit:

- debugging approval messages that show the wrong ID
- repairing Telegram inline button routing for exec approvals
- distinguishing display-only IDs from the full authoritative `approvalId`
- suppressing duplicate native approval messages after restart or repeated event delivery
- turning a local validation patch into a cleaner reusable or upstream-facing change

Not a fit:

- general Telegram bot development
- unrelated OpenClaw messaging work
- broad OpenClaw troubleshooting that does not involve Telegram exec approvals
- packaging a general-purpose Telegram toolkit

## What the skill covers

The bundled skill tells an agent to keep the repair disciplined and minimal:

- separate each approval surface before patching anything
- treat the full `approvalId` as authoritative
- make the native Telegram approval path work end-to-end first
- patch the smallest user-visible surface that is still wrong
- dedupe repeated approval handling when duplicate messages appear
- keep Telegram button messages minimal when another OpenClaw message already carries the detailed body
- reduce a local runtime fix into the smallest reusable or upstream-ready change

## Workflow summary

A typical repair pass should look like this:

1. Identify which approval surface is wrong and which identifier each surface shows.
2. Verify that the Telegram-native approval path can carry the full `approvalId` end-to-end.
3. Fix the smallest wrong user-visible surface before widening the patch.
4. Suppress duplicate approval sends if restart or replay generates noisy repeats.
5. Collapse the working repair into a reusable or upstream-reviewable change.
6. Package the result without mixing in unrelated Telegram debugging.

## When to use it

Use `telegram-exec-approval-ui` when the incident is specifically about Telegram approval UX rather than the entire OpenClaw runtime.

Typical triggers:

- "Telegram approval buttons stopped working."
- "The visible approval ID does not match what `/approve` needs."
- "Restart now sends duplicate approval messages."
- "The local fix works, but we still need a clean reusable patch or PR plan."

## Representative outcomes

### Wrong visible ID

A Telegram approval message shows a short display value, while the executable approval path requires the full internal ID.

A good repair flow should prove which surface is wrong, preserve the full `approvalId` as the source of truth, patch the smallest leaking surface, and retest with a fresh approval request.

### Buttons exist but resolve badly

The UI shows inline buttons, but pressing them does not approve the intended request.

A good repair flow should verify ordinary Telegram inline buttons first, compare the emitted approval payload with the pending assistant reply, and fix the Telegram routing path before touching broader presentation layers.

### Local fix works, reusable change does not exist yet

A runtime patch has already demonstrated the correct behavior, but the change is still trapped in local experimentation.

A good repair flow should remove temporary debugging noise, map the runtime fix back to the real source-level change, and package the result so another operator can reuse it without rediscovering the same steps.

## Related skill repos

These repositories are related examples, not required dependencies:

- `restart-continuity`: useful when approval issues are entangled with restart behavior - <https://github.com/ruanrrn/restart-continuity>

Start here when the problem is Telegram exec approval UX itself.

## Install

Use either path:

1. Import `dist/telegram-exec-approval-ui.skill` into an OpenClaw environment.
2. Copy `telegram-exec-approval-ui/` into your skills directory if you want the editable source.

## What this repo contains

- `telegram-exec-approval-ui/` - the skill source
- `telegram-exec-approval-ui/references/upstream-plan.md` - guidance for translating local runtime experiments into a source-level fix
- `telegram-exec-approval-ui/references/pr-draft.md` - PR framing and validation notes for upstream review
- `dist/telegram-exec-approval-ui.skill` - the packaged artifact ready to import

## Repository layout

```text
telegram-exec-approval/
├── LICENSE
├── README.md
├── README.zh-CN.md
├── CONTRIBUTING.md
├── telegram-exec-approval-ui/
│   ├── SKILL.md
│   └── references/
│       ├── pr-draft.md
│       └── upstream-plan.md
└── dist/
    └── telegram-exec-approval-ui.skill
```

## Contributing

See `CONTRIBUTING.md` for contribution scope, PR expectations, and the boundary that keeps this repository focused on Telegram exec approvals instead of broader Telegram integration work.

## Release hygiene

- regenerate `dist/telegram-exec-approval-ui.skill` after each material skill change
- keep `README.md`, `README.zh-CN.md`, and `telegram-exec-approval-ui/SKILL.md` aligned
- preserve the narrow repository scope instead of expanding into unrelated Telegram debugging
- keep the reusable guidance and upstreaming notes aligned with the actual repair path

## Repository

- GitHub: `https://github.com/ruanrrn/telegram-exec-approval`
- License: MIT
