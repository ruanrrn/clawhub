#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BROWSER_SCRIPT="$SCRIPT_DIR/wechat-browser-session.sh"
NOVNC_SCRIPT="$SCRIPT_DIR/wechat-novnc.sh"
DEFAULT_URL="${WX_START_URL:-https://mp.weixin.qq.com/}"
DEFAULT_BIND="${WX_NOVNC_BIND:-127.0.0.1}"
DEFAULT_PORT="${WX_NOVNC_PORT:-6080}"

usage() {
  cat <<EOF
Usage:
  $0 doctor
  $0 local-browser [url]
  $0 human-verify <password> [bind-ip] [url]
  $0 status
  $0 cleanup
  $0 full-ui-url [bind-ip] [password]
  $0 lite-ui-url [bind-ip] [password]

Workflow intent:
  1. Prefer OpenClaw internal tools first (web_fetch / browser tool)
  2. If blocked, use: $0 local-browser <url>
  3. If human verification is still required, use: $0 human-verify <password> [bind-ip] [url]
  4. After finishing, always use: $0 cleanup
EOF
}

need_file() {
  [ -f "$1" ] || { printf 'ERROR: missing required file: %s\n' "$1" >&2; exit 1; }
}

require_scripts() {
  need_file "$BROWSER_SCRIPT"
  need_file "$NOVNC_SCRIPT"
}

print_url() {
  kind="$1"
  bind="${2:-$DEFAULT_BIND}"
  password="${3:-}"
  base="http://$bind:$DEFAULT_PORT/$kind?path=websockify&autoconnect=1"
  if [ -n "$password" ]; then
    printf '%s&password=%s\n' "$base" "$password"
  else
    printf '%s\n' "$base"
  fi
}

cmd="${1:-help}"
case "$cmd" in
  doctor)
    require_scripts
    "$BROWSER_SCRIPT" doctor
    printf '\n---\n'
    "$NOVNC_SCRIPT" doctor
    ;;
  local-browser)
    require_scripts
    url="${2:-$DEFAULT_URL}"
    "$BROWSER_SCRIPT" start "$url"
    ;;
  human-verify)
    require_scripts
    password="${2:-}"
    [ -n "$password" ] || { printf 'ERROR: usage: %s human-verify <password> [bind-ip] [url]\n' "$0" >&2; exit 1; }
    bind="${3:-$DEFAULT_BIND}"
    url="${4:-$DEFAULT_URL}"
    "$BROWSER_SCRIPT" start "$url"
    "$NOVNC_SCRIPT" set-password "$password"
    WX_NOVNC_BIND="$bind" "$NOVNC_SCRIPT" start
    printf '\nFull UI:\n  '
    print_url vnc.html "$bind" "$password"
    printf 'Lite UI:\n  '
    print_url vnc_lite.html "$bind" "$password"
    ;;
  status)
    require_scripts
    "$BROWSER_SCRIPT" status || true
    printf '\n---\n'
    "$NOVNC_SCRIPT" status || true
    ;;
  cleanup)
    require_scripts
    "$NOVNC_SCRIPT" stop || true
    printf '\n---\n'
    "$BROWSER_SCRIPT" stop || true
    ;;
  full-ui-url)
    print_url vnc.html "${2:-$DEFAULT_BIND}" "${3:-}"
    ;;
  lite-ui-url)
    print_url vnc_lite.html "${2:-$DEFAULT_BIND}" "${3:-}"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    printf 'ERROR: unknown command: %s\n\n' "$cmd" >&2
    usage >&2
    exit 1
    ;;
esac
