#!/usr/bin/env bash
# Sheenidoro waybar helper — cat state file for waybar custom module
# Install: add to waybar config.jsonc:
# "custom/sheenidoro": {
#   "exec": "~/.local/share/sheenidoro/waybar-sheenidoro.sh",
#   "return-type": "json",
#   "interval": 1,
#   "on-click": "sheenidoro --toggle",
#   "on-click-right": "sheenidoro --show",
#   "tooltip": true
# }

STATE="$HOME/.local/state/sheenidoro/waybar.json"
if [ -f "$STATE" ]; then
  cat "$STATE"
else
  echo '{"text":"○ 25:00 🍅","tooltip":"Sheenidoro not running","class":"idle","percentage":0}'
fi
