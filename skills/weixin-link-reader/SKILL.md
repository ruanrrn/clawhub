---
name: weixin-link-reader
description: Read and extract content from Weixin/公众号 links and other blocked or JS-heavy URLs using a staged fallback workflow. Use when OpenClaw should try internal fetch/browser tools first, then fall back to a local Ubuntu browser session, and, if human verification is still required, bring up a temporary noVNC session so the user can finish the verification. Also use when the agent must guide installation of the required browser/Xvfb/noVNC/TigerVNC runtime on a machine that does not have those pieces yet, and when the temporary browser/noVNC stack should be shut down after the link-reading task is complete.
---

# Overview

Use the cheapest working path first. Escalate only when the page blocks the current path.

Read `references/runtime-notes.md` when you need the exact package sets, known pitfalls, or iPhone/noVNC behavior details.

# Workflow

## 1. Try internal OpenClaw retrieval first

Start with built-in tools before touching the host runtime.

- Use `web_fetch` for normal/static pages.
- If the page is JS-heavy or needs interaction, try the `browser` tool.
- If the page is readable at this stage, extract what the user needs and stop.

## 2. If internal tools are blocked, prepare a local browser session

Use the unified entry script first; it wraps the runtime pieces without pretending to replace OpenClaw tools:

```bash
skills/weixin-link-reader/scripts/run-link-reader.sh doctor
skills/weixin-link-reader/scripts/run-link-reader.sh local-browser '<url>'
```

Interpret `doctor` before installing anything.

- If packages are missing, ask for approval, then use the package hints from the script or `references/runtime-notes.md`.
- If the browser session starts successfully, attach to Chrome via CDP and retry the reading task.
- Keep the browser session temporary unless the user explicitly wants it to persist.

## 3. If the page still requires human verification, start noVNC

Use noVNC only when the user needs to manually complete a verification/checkpoint in the real browser.

Preferred path:

```bash
skills/weixin-link-reader/scripts/run-link-reader.sh human-verify '<password>' '<approved-bind-ip>' '<url>'
```

This command starts the local browser if needed, configures the TigerVNC password, starts noVNC, and prints the full/lite access URLs.

Default bind is `127.0.0.1` for safety. Expose a LAN IP only after the user explicitly asks for LAN access.

When sharing the URL:

- Prefer full UI: `http://<bind-ip>:6080/vnc.html?path=websockify&autoconnect=1`
- Use `vnc_lite.html` only when the user prefers the lighter page.
- If Safari/iPhone password prompting is unreliable and the user accepts the tradeoff, provide a temporary URL that includes `password=...`.

After the user completes verification, re-attach via CDP and continue reading/extracting.

## 4. Finish the task, then shut everything down

Unless the user explicitly asks to keep the environment alive, stop temporary runtime pieces after the link-reading task is done.

Use the unified cleanup entry:

```bash
skills/weixin-link-reader/scripts/run-link-reader.sh cleanup
```

Do not leave noVNC or the browser session running without a reason.

# Installation guidance

Use the scripts as the primary installation guide.

- `wechat-browser-session.sh doctor` identifies missing browser-session dependencies.
- `wechat-novnc.sh doctor` identifies missing noVNC/TigerVNC dependencies.

When the user wants the agent to install packages, ask for approval, then execute only the missing package set relevant to the chosen path.

- Browser session packages: Xvfb/fluxbox/dbus-x11/Chrome/locales/CJK fonts
- Human-verification packages: noVNC/websockify/TigerVNC

Do not install the noVNC stack unless the task actually reached the human-verification stage.

# Resource map

- `scripts/run-link-reader.sh` — unified entry for doctor/local-browser/human-verify/cleanup/url printing
- `scripts/wechat-browser-session.sh` — start/stop/check the temporary Xvfb + fluxbox + Chrome session
- `scripts/wechat-novnc.sh` — set password and start/stop TigerVNC + noVNC
- `references/runtime-notes.md` — package lists, pitfalls, and environment notes
