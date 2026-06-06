#!/bin/sh
set -eu

DISPLAY_NUM="${WX_DISPLAY_NUM:-99}"
DISPLAY=":${DISPLAY_NUM}"
SCREEN="${WX_SCREEN:-1440x900x24}"
PROFILE_DIR="${WX_PROFILE_DIR:-$HOME/.cache/weixin-link-reader/chrome-profile}"
STATE_DIR="${WX_STATE_DIR:-$HOME/.local/state/weixin-link-reader}"
LOG_DIR="$STATE_DIR/logs"
REMOTE_DEBUG_PORT="${WX_REMOTE_DEBUG_PORT:-9222}"
START_URL="${WX_START_URL:-https://mp.weixin.qq.com/}"
BROWSER_LANG="${WX_BROWSER_LANG:-zh_CN.UTF-8}"
BROWSER_BIN=""

mkdir -p "$PROFILE_DIR" "$STATE_DIR" "$LOG_DIR"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }
need_cmd() { command -v "$1" >/dev/null 2>&1; }
write_pid() { printf '%s' "$2" > "$STATE_DIR/$1.pid"; }
read_pid() { [ -f "$STATE_DIR/$1.pid" ] || return 1; cat "$STATE_DIR/$1.pid"; }
is_running() { kill -0 "$1" >/dev/null 2>&1; }

find_browser() {
  for bin in google-chrome-stable google-chrome chromium-browser chromium; do
    if need_cmd "$bin"; then
      BROWSER_BIN="$bin"
      return 0
    fi
  done
  return 1
}

install_hint() {
  cat <<EOF
Suggested Ubuntu packages:
  sudo apt-get update
  sudo apt-get install -y xvfb fluxbox dbus-x11 ca-certificates curl wget locales fonts-noto-cjk fonts-wqy-zenhei

Browser:
  wget -O /tmp/google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  sudo apt-get install -y /tmp/google-chrome.deb || sudo apt-get -f install -y

Locale (if zh_CN.UTF-8 missing):
  echo 'zh_CN.UTF-8 UTF-8' | sudo tee -a /etc/locale.gen
  sudo /usr/sbin/locale-gen zh_CN.UTF-8
EOF
}

doctor() {
  missing=""
  for bin in Xvfb fluxbox; do
    need_cmd "$bin" || missing="$missing $bin"
  done
  if find_browser; then
    log "browser: $BROWSER_BIN"
  else
    log "browser: MISSING"
  fi
  if [ -n "$missing" ]; then
    log "missing deps:$missing"
  else
    log "display deps: OK"
  fi
  if locale -a 2>/dev/null | grep -qi '^zh_CN\.utf8$'; then
    log "locale: zh_CN.UTF-8 present"
  else
    log "locale: zh_CN.UTF-8 missing"
  fi
  if command -v fc-match >/dev/null 2>&1; then
    log "font match: $(fc-match 'sans:lang=zh-cn' | head -1)"
  fi
  log "profile dir: $PROFILE_DIR"
  log "state dir: $STATE_DIR"
  log "remote debug: http://127.0.0.1:$REMOTE_DEBUG_PORT"
  if [ -n "$missing" ] || [ -z "$BROWSER_BIN" ]; then
    printf '\n'
    install_hint
  fi
}

start_xvfb() {
  if pid=$(read_pid xvfb 2>/dev/null) && is_running "$pid"; then
    log "xvfb already running: $pid"
    return 0
  fi
  nohup Xvfb "$DISPLAY" -screen 0 "$SCREEN" >"$LOG_DIR/xvfb.log" 2>&1 &
  write_pid xvfb $!
  sleep 1
}

start_fluxbox() {
  if pid=$(read_pid fluxbox 2>/dev/null) && is_running "$pid"; then
    log "fluxbox already running: $pid"
    return 0
  fi
  nohup env DISPLAY="$DISPLAY" fluxbox >"$LOG_DIR/fluxbox.log" 2>&1 &
  write_pid fluxbox $!
  sleep 1
}

start_browser() {
  find_browser || { err "no supported browser found"; install_hint; exit 1; }
  if pid=$(read_pid browser 2>/dev/null) && is_running "$pid"; then
    log "browser already running: $pid"
    return 0
  fi
  url="${1:-$START_URL}"
  SANDBOX_FLAG=""
  if [ "$(id -u)" = "0" ]; then
    SANDBOX_FLAG="--no-sandbox"
  fi
  nohup env DISPLAY="$DISPLAY" LANG="$BROWSER_LANG" LC_ALL="$BROWSER_LANG" LANGUAGE="zh_CN:zh" "$BROWSER_BIN" \
    --user-data-dir="$PROFILE_DIR" \
    --remote-debugging-port="$REMOTE_DEBUG_PORT" \
    --no-first-run \
    --no-default-browser-check \
    --disable-dev-shm-usage \
    --window-size=1440,900 \
    $SANDBOX_FLAG \
    "$url" >"$LOG_DIR/browser.log" 2>&1 &
  write_pid browser $!
  sleep 2
}

status() {
  for name in xvfb fluxbox browser; do
    if pid=$(read_pid "$name" 2>/dev/null) && is_running "$pid"; then
      log "$name: running ($pid)"
    else
      log "$name: stopped"
    fi
  done
  log "display: $DISPLAY"
  log "profile: $PROFILE_DIR"
  log "cdp: http://127.0.0.1:$REMOTE_DEBUG_PORT"
}

stop_one() {
  name="$1"
  if pid=$(read_pid "$name" 2>/dev/null) && is_running "$pid"; then
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if is_running "$pid"; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  fi
  rm -f "$STATE_DIR/$name.pid"
}

stop_all() {
  stop_one browser
  stop_one fluxbox
  stop_one xvfb
}

print_access() {
  cat <<EOF
Remote debugging:
  http://127.0.0.1:$REMOTE_DEBUG_PORT

Profile dir:
  $PROFILE_DIR

State dir:
  $STATE_DIR
EOF
}

connect_example() {
  cat <<EOF
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:$REMOTE_DEBUG_PORT');
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://mp.weixin.qq.com/');
  console.log(await page.title());
})();
EOF
}

case "${1:-help}" in
  doctor) doctor ;;
  start) start_xvfb; start_fluxbox; start_browser "${2:-$START_URL}"; status; printf '\n'; print_access ;;
  status) status ;;
  stop) stop_all; status ;;
  access) print_access ;;
  cdp-example) connect_example ;;
  help|--help|-h)
    cat <<EOF
Usage:
  $0 doctor
  $0 start [url]
  $0 status
  $0 stop
  $0 access
  $0 cdp-example
EOF
    ;;
  *) err "unknown command: $1"; exit 1 ;;
esac
