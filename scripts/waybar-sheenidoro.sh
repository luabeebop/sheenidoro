#!/usr/bin/env bash
# Sheenidoro waybar helper — resilient cat with stale detection
# If waybar.json is older than 5s (vite dev died, app quit without cleanup, etc.)
# we show idle instead of stuck timer. Also validates JSON.

STATE="$HOME/.local/state/sheenidoro/waybar.json"
IDLE='{"text":"○ 25:00 🍅","tooltip":"Sheenidoro not running — click to open","class":"idle","percentage":0}'

if [ ! -f "$STATE" ]; then
  echo "$IDLE"
  exit 0
fi

# check staleness: if file not updated in last 7 seconds, treat as stale (dev server closed, app hidden but timer stopped)
if command -v stat >/dev/null 2>&1; then
  mtime=$(stat -c %Y "$STATE" 2>/dev/null || stat -f %m "$STATE" 2>/dev/null || echo 0)
  now=$(date +%s)
  age=$((now - mtime))
  # if older than 7s, waybar would be showing stale timer — show idle
  # but allow running timer: file should update every ~250ms while app runs
  if [ "$age" -gt 7 ]; then
    # double-check: if app is still running but idle, file is still updated every tick (even idle updates)
    # So >7 means app not updating -> stale -> idle
    echo "$IDLE"
    exit 0
  fi
fi

# validate JSON + has text field
content=$(cat "$STATE" 2>/dev/null)
if echo "$content" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'text' in d" 2>/dev/null; then
  echo "$content"
else
  echo "$IDLE"
fi
