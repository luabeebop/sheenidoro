#!/usr/bin/env bash
# Sheenidoro — Waybar integration setup for Omarchy
# Adds custom/sheenidoro to waybar and styles it pastel sakura.
# Safe to run multiple times — idempotent.
set -e

CONFIG="$HOME/.config/waybar/config.jsonc"
STYLE="$HOME/.config/waybar/style.css"
STATE_DIR="$HOME/.local/state/sheenidoro"
STATE_FILE="$STATE_DIR/waybar.json"

echo "🌸 Sheenidoro waybar setup"

mkdir -p "$STATE_DIR"
# hide waybar when app not running — if file is stale (>7s), helper will hide,
# but delete it now for immediate hide
if [ -f "$STATE_FILE" ] && command -v stat >/dev/null 2>&1; then
  mtime=$(stat -c %Y "$STATE_FILE" 2>/dev/null || stat -f %m "$STATE_FILE" 2>/dev/null || echo 0)
  age=$(( $(date +%s) - mtime ))
  if [ "$age" -gt 7 ]; then
    rm -f "$STATE_FILE"
    echo "  removed stale $STATE_FILE (age ${age}s → waybar hidden)"
  else
    echo "  keeping fresh $STATE_FILE (age ${age}s)"
  fi
else
  echo "  no state file, waybar hidden until app starts"
fi

# install helper script to ~/.local/share
HELPER_SRC="$(cd "$(dirname "$0")" && pwd)/waybar-sheenidoro.sh"
HELPER_DST="$HOME/.local/share/sheenidoro/waybar-sheenidoro.sh"
mkdir -p "$(dirname "$HELPER_DST")"
if [ -f "$HELPER_SRC" ]; then
  cp "$HELPER_SRC" "$HELPER_DST"
  chmod +x "$HELPER_DST"
  echo "  installed helper to $HELPER_DST"
elif [ -f "/usr/share/sheenidoro/waybar-sheenidoro.sh" ]; then
  mkdir -p "$(dirname "$HELPER_DST")"
  cp "/usr/share/sheenidoro/waybar-sheenidoro.sh" "$HELPER_DST"
  chmod +x "$HELPER_DST"
fi

# --- config.jsonc patch via python (handles jsonc comments) ---
if [ -f "$CONFIG" ]; then
  cp "$CONFIG" "$CONFIG.bak.$(date +%s)"
  echo "  backup $CONFIG.bak.*"
  python3 - <<'PY'
import re, json, pathlib
config_path = pathlib.Path.home() / ".config/waybar/config.jsonc"
text = config_path.read_text()

# strip // and /* */ comments for json parsing, but keep original for rewrite? We rewrite whole file as JSON (waybar supports pure JSON)
# Remove single-line // comments (not inside strings) — simple heuristic: remove //.*$ per line if not inside string
def strip_jsonc(s):
    # remove block comments
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    # remove line comments
    lines = []
    for line in s.splitlines():
        # naive: split // only if not inside quotes — we assume no // inside strings except URLs (which we don't have)
        if '//' in line:
            # preserve if inside string? simple: if '"' before // then check
            # For waybar, we can just remove trailing // comments
            line = re.sub(r'\s*//.*$', '', line)
        lines.append(line)
    return "\n".join(lines)

clean = strip_jsonc(text)
try:
    data = json.loads(clean)
except Exception as e:
    print(f"  ! Failed to parse config.jsonc: {e}")
    print("  Please add custom/sheenidoro manually per README.")
    raise SystemExit(1)

# ensure custom/sheenidoro definition (use helper script with stale detection)
if "custom/sheenidoro" not in data:
    data["custom/sheenidoro"] = {
        "exec": "~/.local/share/sheenidoro/waybar-sheenidoro.sh",
        "return-type": "json",
        "interval": 1,
        "tooltip": True,
        "on-click": "sheenidoro --toggle",
        "on-click-right": "sheenidoro --show"
    }
    print("  added custom/sheenidoro module definition")
else:
    # migrate old cat exec to helper script for stale handling
    old_exec = data["custom/sheenidoro"].get("exec", "")
    if "cat " in old_exec and "waybar.json" in old_exec and "waybar-sheenidoro.sh" not in old_exec:
        data["custom/sheenidoro"]["exec"] = "~/.local/share/sheenidoro/waybar-sheenidoro.sh"
        print("  migrated exec from cat to helper script for stale handling")

# ensure it's in modules-center or modules-right
added = False
for key in ["modules-center", "modules-right", "modules-left"]:
    if key in data and isinstance(data[key], list):
        if "custom/sheenidoro" in data[key]:
            added = True
            break

if not added:
    # prefer modules-center after clock
    target = "modules-center" if "modules-center" in data else "modules-right"
    lst = data.get(target, [])
    if "clock" in lst:
        idx = lst.index("clock") + 1
        lst.insert(idx, "custom/sheenidoro")
    else:
        lst.insert(0, "custom/sheenidoro")
    data[target] = lst
    print(f"  inserted custom/sheenidoro into {target}")

# write back as JSON (waybar accepts JSONC or JSON)
config_path.write_text(json.dumps(data, indent=2))
print(f"  wrote {config_path}")
PY
else
  echo "  ! $CONFIG not found, skipping config patch (create waybar config first)"
fi

# --- style.css patch ---
if [ -f "$STYLE" ]; then
  if grep -q "custom-sheenidoro.hidden" "$STYLE"; then
    echo "  style.css already contains sheenidoro hidden, skipping"
  elif grep -q "custom-sheenidoro" "$STYLE"; then
    cp "$STYLE" "$STYLE.bak.$(date +%s)"
    cat >> "$STYLE" <<'CSS'

/* Sheenidoro hidden when not running */
#custom-sheenidoro.hidden {
  opacity: 0;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  font-size: 0;
}
CSS
    echo "  appended hidden style to $STYLE"
  else
    cp "$STYLE" "$STYLE.bak.$(date +%s)"
    cat >> "$STYLE" <<'CSS'

/* Sheenidoro — pastel sakura waybar */
#custom-sheenidoro {
  padding: 0 10px;
  margin: 0 4px;
  border-radius: 12px;
  background: #ffe4ec;
  color: #5c3a4a;
  border: 1px solid #f8c8d4;
  font-weight: bold;
}
#custom-sheenidoro.focus {
  background: #f472b6;
  color: white;
  border-color: #ec4899;
}
#custom-sheenidoro.break {
  background: #fff0f5;
  color: #db2777;
  border-color: #f8c8d4;
}
#custom-sheenidoro.paused {
  opacity: 0.75;
  background: #ffd6e0;
}
#custom-sheenidoro.idle {
  background: #fff0f5;
  color: #9d6b7a;
}
#custom-sheenidoro.hidden {
  opacity: 0;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  font-size: 0;
}
CSS
    echo "  appended sheenidoro style to $STYLE"
  fi
else
  echo "  ! $STYLE not found, skipping style patch"
fi

# --- try to reload waybar ---
if pgrep -x waybar >/dev/null 2>&1; then
  echo "  reloading waybar..."
  killall -SIGUSR2 waybar 2>/dev/null || pkill -SIGUSR2 waybar 2>/dev/null || true
  # fallback: restart via omarchy if signal fails
  sleep 0.5
  if ! pgrep -x waybar >/dev/null 2>&1; then
    echo "  waybar not running after reload, try: waybar &"
  else
    echo "  waybar reloaded"
  fi
else
  echo "  waybar not running (start it with: waybar &)"
fi

echo ""
echo "✅ Waybar setup done!"
echo "   Check: cat ~/.local/state/sheenidoro/waybar.json"
echo "   Test:  bash ~/.local/share/sheenidoro/waybar-sheenidoro.sh"
echo "   If timer not visible, ensure 'custom/sheenidoro' is in your waybar config modules list and restart waybar."
