#!/usr/bin/env bash
# Sheenidoro waybar helper — resilient cat with stale detection
# If waybar.json is older than 5s (vite dev died, app quit without cleanup, etc.)
# we show idle instead of stuck timer. Also validates JSON.

STATE="$HOME/.local/state/sheenidoro/waybar.json"
# when app not running, waybar should hide completely (empty text, hidden class) — user request
HIDDEN='{"text":"","tooltip":"Sheenidoro not running","class":"hidden","percentage":0}'

if [ ! -f "$STATE" ]; then
  echo "$HIDDEN"
  exit 0
fi

# check staleness: if file not updated in last 7 seconds, treat as stale (vite died, app quit without cleanup)
if command -v stat >/dev/null 2>&1; then
  mtime=$(stat -c %Y "$STATE" 2>/dev/null || stat -f %m "$STATE" 2>/dev/null || echo 0)
  now=$(date +%s)
  age=$((now - mtime))
  if [ "$age" -gt 7 ]; then
    # app not updating -> hide instead of showing stale timer
    echo "$HIDDEN"
    exit 0
  fi
fi

# validate JSON + has text field
content=$(cat "$STATE" 2>/dev/null)
if echo "$content" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'text' in d" 2>/dev/null; then
  # if file says idle but app not running? still show timer when app is running idle (fresh file)
  # fresh file means app is running, so show it
  echo "$content"
else
  echo "$HIDDEN"
fi
