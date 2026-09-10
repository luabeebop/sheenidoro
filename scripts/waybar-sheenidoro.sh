#!/usr/bin/env bash
# Sheenidoro waybar helper.
#
# Prints the current timer state, or a collapsed module when the app is not
# running. Sheenidoro's main process rewrites the state file once a second and
# deletes it on exit, so "missing or stale" is a reliable stand-in for "not
# running" — including after a crash or SIGKILL, where no cleanup ran.
#
# Deliberately pure bash: waybar polls this once a second, forever.

set -u

STATE="${XDG_STATE_HOME:-$HOME/.local/state}/sheenidoro/waybar.json"
HIDDEN='{"text":"","tooltip":"","class":"hidden","percentage":0}'
STALE_AFTER=5

if [ ! -f "$STATE" ]; then
  echo "$HIDDEN"
  exit 0
fi

mtime=$(stat -c %Y "$STATE" 2>/dev/null || stat -f %m "$STATE" 2>/dev/null || echo "")
if [ -n "$mtime" ] && [ $(( $(date +%s) - mtime )) -gt "$STALE_AFTER" ]; then
  echo "$HIDDEN"
  exit 0
fi

content=$(cat "$STATE" 2>/dev/null)
# the app writes atomically (tmp + rename), so a torn read should be impossible;
# this is a cheap belt-and-braces check that we got an object with a text field
case "$content" in
  '{'*'"text"'*'}') echo "$content" ;;
  *) echo "$HIDDEN" ;;
esac
