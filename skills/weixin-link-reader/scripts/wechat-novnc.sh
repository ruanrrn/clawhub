#!/bin/sh
set -eu

DISPLAY_NUM="${WX_DISPLAY_NUM:-99}"
DISPLAY=":${DISPLAY_NUM}"
STATE_DIR="${WX_STATE_DIR:-$HOME/.local/state/weixin-link-reader}"
LOG_DIR="$STATE_DIR/logs"
VNC_PORT="${WX_VNC_PORT:-5901}"
NOVNC_PORT="${WX_NOVNC_PORT:-6080}"
NOVNC_BIND="${WX_NOVNC_BIND:-127.0.0.1}"
NOVNC_WEB_ROOT="${WX_NOVNC_WEB_ROOT:-/usr/share/novnc}"
PASSWORD_FILE="$STATE_DIR/tigervnc.pass"

mkdir -p "$STATE_DIR" "$LOG_DIR"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }
need_cmd() { command -v "$1" >/dev/null 2>&1; }
write_pid() { printf '%s' "$2" > "$STATE_DIR/$1.pid"; }
read_pid() { [ -f "$STATE_DIR/$1.pid" ] || return 1; cat "$STATE_DIR/$1.pid"; }
is_running() { kill -0 "$1" >/dev/null 2>&1; }

install_hint() {
  cat <<EOF
Suggested Ubuntu packages:
  sudo apt-get update
  sudo apt-get install -y novnc websockify tigervnc-scraping-server tigervnc-tools
EOF
}

doctor() {
  missing=""
  for bin in x0vncserver websockify tigervncpasswd; do
    need_cmd "$bin" || missing="$missing $bin"
  done
  if [ -n "$missing" ]; then
    log "missing deps:$missing"
  else
    log "novnc deps: OK"
  fi
  if [ -f "$PASSWORD_FILE" ]; then
    log "password file: present"
  else
    log "password file: missing"
  fi
  log "display: $DISPLAY"
  log "novnc bind: $NOVNC_BIND:$NOVNC_PORT"
  log "vnc target: 127.0.0.1:$VNC_PORT"
  if [ -n "$missing" ]; then
    printf '\n'
    install_hint
  fi
}

set_password() {
  pw="${1:-}"
  [ -n "$pw" ] || { err "usage: $0 set-password <password>"; exit 1; }
  printf '%s\n' "$pw" | tigervncpasswd -f > "$PASSWORD_FILE"
  chmod 600 "$PASSWORD_FILE"
  log "password file updated: $PASSWORD_FILE"
}

start_vnc() {
  [ -f "$PASSWORD_FILE" ] || { err "password file missing; run '$0 set-password <password>' first"; exit 1; }
  if pid=$(read_pid x0vnc 2>/dev/null) && is_running "$pid"; then
    log "x0vncserver already running: $pid"
    return 0
  fi
  nohup x0vncserver -display "$DISPLAY" -localhost yes -rfbport "$VNC_PORT" -PasswordFile "$PASSWORD_FILE" >"$LOG_DIR/x0vncserver.log" 2>&1 &
  write_pid x0vnc $!
  sleep 2
}

start_novnc() {
  if pid=$(read_pid novnc 2>/dev/null) && is_running "$pid"; then
    log "novnc already running: $pid"
    return 0
  fi
  nohup websockify --web "$NOVNC_WEB_ROOT" "$NOVNC_BIND:$NOVNC_PORT" 127.0.0.1:"$VNC_PORT" >"$LOG_DIR/novnc.log" 2>&1 &
  write_pid novnc $!
  sleep 1
}

status() {
  for name in x0vnc novnc; do
    if pid=$(read_pid "$name" 2>/dev/null) && is_running "$pid"; then
      log "$name: running ($pid)"
    else
      log "$name: stopped"
    fi
  done
  log "full ui: http://$NOVNC_BIND:$NOVNC_PORT/vnc.html?path=websockify&autoconnect=1"
  log "lite ui: http://$NOVNC_BIND:$NOVNC_PORT/vnc_lite.html?path=websockify&autoconnect=1"
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
  stop_one novnc
  stop_one x0vnc
}

case "${1:-help}" in
  doctor) doctor ;;
  set-password) set_password "${2:-}" ;;
  start) start_vnc; start_novnc; status ;;
  status) status ;;
  stop) stop_all; status ;;
  help|--help|-h)
    cat <<EOF
Usage:
  $0 doctor
  $0 set-password <password>
  $0 start
  $0 status
  $0 stop

Notes:
  - Default bind is 127.0.0.1 for safety.
  - For LAN access, set WX_NOVNC_BIND to the approved LAN IP before start.
EOF
    ;;
  *) err "unknown command: $1"; exit 1 ;;
esac
