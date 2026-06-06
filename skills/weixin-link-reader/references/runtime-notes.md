# Runtime Notes

## Intended fallback order

Unified local-runtime entry: `scripts/run-link-reader.sh`

1. Try OpenClaw internal retrieval first:
   - `web_fetch` for straightforward/static pages
   - `browser` tool when browser automation is available and the page is JS-heavy
2. If built-in retrieval is blocked or unavailable, start the local browser session with `scripts/wechat-browser-session.sh`.
3. If the page still requires human verification, start noVNC with `scripts/wechat-novnc.sh` and let the user complete the verification in a real browser session.
4. Re-attach to the browser via CDP and continue reading.
5. Stop noVNC and the local browser session after the task finishes, unless the user explicitly wants to keep them alive.

## Known pitfalls

- **Do not claim bypass behavior.** Treat this as manual verification + session reuse, not anti-detection evasion.
- **Root-run Chrome requires `--no-sandbox`.** The bundled browser script already handles this.
- **OpenClaw internal browser on headless hosts:** if `browser.start(profile=openclaw)` times out on a server without any DISPLAY, set `browser.headless=true` (and usually `browser.noSandbox=true`) in `~/.openclaw/openclaw.json`.
- **Chinese rendering requires both fonts and UTF-8 locale.** If Chinese text is garbled, ensure `fonts-noto-cjk`, `fonts-wqy-zenhei`, and `zh_CN.UTF-8` exist.
- **Prefer TigerVNC for noVNC.** The older `x11vnc` path can hang during the noVNC handshake in this environment.
- **Full UI on iPhone:** prefer the explicit full link shape `vnc.html?path=websockify&autoconnect=1`. If password prompts are unreliable in Safari, the agent may temporarily provide a URL with `password=...` only when the user clearly accepts that convenience tradeoff.

## Suggested package sets

### Browser session

```bash
sudo apt-get update
sudo apt-get install -y xvfb fluxbox dbus-x11 ca-certificates curl wget locales fonts-noto-cjk fonts-wqy-zenhei
wget -O /tmp/google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt-get install -y /tmp/google-chrome.deb || sudo apt-get -f install -y
```

### noVNC + TigerVNC backend

```bash
sudo apt-get update
sudo apt-get install -y novnc websockify tigervnc-scraping-server tigervnc-tools
```

### Locale generation

```bash
echo 'zh_CN.UTF-8 UTF-8' | sudo tee -a /etc/locale.gen
sudo /usr/sbin/locale-gen zh_CN.UTF-8
```
