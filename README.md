# Sheenidoro — terminal-brutalist Pomodoro for Omarchy

React + Electron pomodoro with a native Hyprland window, mako notifications, tray hide-on-close,
session log review, and a waybar mini-timer.

Visual language borrowed from [aquirin.com](https://aquirin.com): **Inconsolata** everywhere, pure
black and white, one hot accent, hard 1px hairlines, zero border-radius, `steps()` typewriter
motion — read at night, with CRT scanlines and phase-coloured HUD instrumentation.

![Sheenidoro](public/icon.svg)

> Project lives at `/home/tartarus/Projects/pomodoro`; the app is branded **Sheenidoro** everywhere
> (window title, WM class, .desktop, tray, waybar).

---

## Palette

| Token | Hex | Use |
|---|---|---|
| `void` / `panel` | `#000000` / `#07080a` | ground, panels |
| `txt` / `dim` / `faint` | `#ffffff` / `#8b9199` / `#4c5259` | type ramp |
| `line` / `line2` | `#1e2227` / `#2c3238` | hairlines |
| `hot` | `#ff0033` | **focus** — aquirin's red accent |
| `ice` | `#00e5ff` | **short break** |
| `gold` | `#ffb000` | **long break** |

Each phase rebinds `--accent`, so the ring, corner brackets, caret and buttons recolour together.

## Features

- **Editable durations**: focus / short / long (1–90 min, long every 2–10 focuses). Presets 15/25/50.
- **Always waits for you**: no auto-start — each phase ends and holds until you press Engage.
- **Chime only**: `assets/sounds/chime.wav` on transition, no ticking.
- **Tray resident**: close hides the window; the timer keeps running and stays accurate
  (`backgroundThrottling: false`, so phase-end alerts fire on time rather than late).
- **Session logs**: every session (`completed` / `skipped` / `interrupted`), stat tiles, weekly
  throughput chart, Today/Week/All filters, CSV export.
- **Notifications**: Electron `Notification` + `notify-send -u critical` so they survive DND.
- **Waybar mini-timer**: phase-coloured countdown that collapses completely when the app is not running.
- **Native Hyprland**: real frame, WM class `Sheenidoro`.

## Quick start (dev)

```bash
npm install
npm run dev              # vite on http://localhost:5173
npm run dev:electron     # build electron + run

# one-shot production run
npm run build:electron   # tsc electron + vite build
electron37 .             # or: npx electron .
```

`npm install` may skip Electron's binary download (`--ignore-scripts`). The app runs fine on the
system runtime — Omarchy ships `electron37`.

## Build / package

```bash
npm run typecheck
npm run build:electron
npm run dist                        # electron-builder -> release/ (AppImage + pacman)
makepkg -s                          # PKGBUILD -> sheenidoro-2.0.0-1-x86_64.pkg.tar.zst
sudo pacman -U sheenidoro-*.pkg.tar.zst
```

The `PKGBUILD` wrapper runs system `/usr/bin/electron37` against `/opt/sheenidoro`. It passes the
**app directory**, not `main.js` — Electron reads `productName` from `package.json` during startup
to set the Wayland `app_id`, and pointing it at the script directly makes every window come up as
class `Electron`.

## Omarchy integration

### Waybar

```bash
bash scripts/setup-waybar.sh          # or after install: /usr/share/sheenidoro/setup-waybar.sh
```

Idempotent. It backs up your config and style, then:

- installs the state helper to `~/.local/share/sheenidoro/waybar-sheenidoro.sh`
- ensures a `sheenidoro` launcher exists — if the pacman package isn't installed it writes a shim
  to `~/.local/bin/sheenidoro` pointing at this checkout, so the module's click actions actually work
- registers `custom/sheenidoro` in `modules-center` (after `clock`) using **absolute paths**, since
  waybar runs click commands through `sh`, which may not have `~/.local/bin` on `PATH`
- replaces the style block between `/* >>> sheenidoro >>> */` markers
- restarts waybar via `omarchy restart waybar`

Verify:

```bash
bash ~/.local/share/sheenidoro/waybar-sheenidoro.sh   # {"text":"◆ 24:13", ...} or hidden
cat ~/.local/state/sheenidoro/waybar.json
```

**How it stays correct.** The **main process** owns the state file, not the renderer. A hidden
`BrowserWindow` gets its timers throttled hard by Chromium, which used to stall the file and make the
module vanish mid-session. Main writes once a second, re-deriving the countdown from the phase
deadline, and writes atomically (temp + rename) so waybar can never read a half-written file.

**How it hides.** Main deletes the file on exit, so the module collapses the moment you quit. If the
app is killed outright, the helper treats a file older than 5s as stale and hides it — the module
never shows a frozen timer.

Module clicks: **left** toggle · **right** show window · **middle** skip phase. Toggle and skip
deliberately do *not* raise the window.

Classes emitted: `focus` `short` `long` `paused` `idle` `hidden`.

### Hyprland (optional float)

Window class is `Sheenidoro`. Check the current rule syntax for your Hyprland version, then add
something like:

```
windowrule = float, class:Sheenidoro
windowrule = size 1060 720, class:Sheenidoro
windowrule = center, class:Sheenidoro
```

### Mako

Notifications use `-u critical`, so they show even under do-not-disturb.

## CLI

```bash
sheenidoro              # open / focus window
sheenidoro --toggle     # start/pause the running instance (does not raise the window)
sheenidoro --skip       # skip the current phase
sheenidoro --show       # bring the window to front
sheenidoro --waybar     # print current waybar json and exit
```

Single-instance lock: a second launch forwards its arguments to the running instance.

## Data & config

- **Settings & sessions**: `~/.config/sheenidoro/config.json` (electron-store, sessions capped at 10k).
  The path is pinned explicitly — `productName` alone would move it to `~/.config/Sheenidoro`.
- **Waybar state**: `~/.local/state/sheenidoro/waybar.json`, rewritten once a second by the main
  process and deleted on exit. Honours `XDG_STATE_HOME`.
- **Window bounds**: `windowBounds` in the store, restored on launch.
- **Fonts**: Inconsolata 400/700 self-hosted in `public/fonts/` — no network at runtime.

## Project structure

```
.
├── docs/spec.md
├── electron/
│   ├── main.ts                  # window, tray, IPC, notifications, waybar writer
│   └── preload.ts               # contextBridge (returns unsubscribers)
├── src/
│   ├── App.tsx                  # HUD rail, CRT layers, shortcuts
│   ├── index.css                # design tokens, scanlines, typewriter, brackets
│   ├── lib/{types,theme,usePomodoro,format}.ts
│   ├── components/{TimerRing,NavRail}.tsx
│   └── views/{TimerView,HistoryView,SettingsView}.tsx
├── public/fonts/inconsolata-{400,700}.woff2
├── assets/sounds/chime.wav
├── resources/                   # icons 512/256/128/64/32 + tray22 + .desktop
├── scripts/{setup-waybar.sh,waybar-sheenidoro.sh}
└── PKGBUILD
```

## Shortcuts

| Key | Action |
|---|---|
| `Space` | Engage / Hold / Resume |
| `R` | Reset current phase |
| `S` | Skip to next phase (logs `skipped`) |
| `1` `2` `3` | Jump to Timer / Logs / Config |

Ignored while a form field has focus. Closing the window hides to tray — quit from the tray menu.

## Troubleshooting

- **Waybar module missing**: it is *meant* to disappear when the app isn't running. With the app up,
  run `bash ~/.local/share/sheenidoro/waybar-sheenidoro.sh` — if it prints `"class":"hidden"` while
  the app is running, the state file is stale; check the app is alive and `~/.local/state/sheenidoro/`
  is writable.
- **Waybar clicks do nothing**: `command -v sheenidoro`. If empty, re-run `scripts/setup-waybar.sh`
  to regenerate the launcher shim.
- **Window class is `Electron`**: something is launching `main.js` directly instead of the app
  directory. Use the wrapper or `electron37 .` from the project root.
- **No notification**: check mako is running, then `notify-send -a Sheenidoro -u critical test`.
- **No sound**: verify `pavucontrol` levels and that `paplay assets/sounds/chime.wav` works.
- **Electron not found**: install `electron37` (`omarchy pkg add electron37`).

## License

MIT. Graphics generated for this project; Inconsolata is SIL OFL.
