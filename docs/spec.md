# Sheenidoro — Pomodoro Spec Sheet

**Version:** 1.0.0  
**Date:** 2026-09-07  
**Target:** Omarchy (Arch + Hyprland 0.55.2)  
**Project Path:** `/home/tartarus/Projects/pomodoro` (app name: `Sheenidoro`)  
**Stack:** Electron + Vite + React + TypeScript + Tailwind

---

## 1. Overview

Sheenidoro is a pastel sakura-themed Pomodoro desktop app, styled like Spotify/Discord (React web UI wrapped as a native Electron app). Primary purpose: **reviewing and tracking breaks** — not just a timer, but a history and stats system for focus discipline on Omarchy.

Runs natively on Hyprland, integrates with `mako` notifications and `waybar`.

## 2. Requirements

### 2.1 Must-have (from user)

| ID | Requirement | Notes |
|----|-------------|-------|
| R1 | Editable time | All durations user-configurable, applies next cycle |
| R2 | Notification | Critical `mako` notification + chime on phase transition |
| R3 | Application | Native window, `.desktop` launcher, tray, survives close→hide |
| R4 | Graphics supplied | Generated pastel SGV + PNG icons bundled |
| R5 | React webapp desktop | Vite+React inside Electron (`BrowserWindow`), Spotify-like |
| R6 | Pink theme | Pastel sakura palette, matches `~/.config/mako/config` |

### 2.2 Derived (break tracking & review)

| ID | Requirement |
|----|-------------|
| R7 | Persist session history locally (no cloud) |
| R8 | History view with list + weekly chart + stats (today/week/total, streak) |
| R9 | Waybar mini-timer integration |
| R10 | Export history to CSV |

## 3. Decisions (user confirmed 2026-09-07)

1. Defaults: **focus 25 / short break 5 / long break 15**, long break every 4, range 1–90 min
2. Auto-start: **OFF** — always wait for user interaction after phase end
3. Sound: **chime only**, no ticking
4. Lifecycle: **stay running** — window close hides to tray, timer keeps ticking
5. History depth: **break review only**, no per-pomodoro task notes (future `v1.1` candidate)
6. Palette: **pastel sakura** — `bg #fff0f5`, `bg2 #ffe4ec`, `card #fff`, `primary #f472b6/#ec4899`, `primaryDark #db2777`, `accent #f8c8d4`, `text #5c3a4a`, `muted #9d6b7a`
7. Window chrome: **native Hyprland header** (`frame:true`, `titleBarStyle: default`), no custom frameless
8. Packaging: **PKGBUILD** (AUR) + AppImage via `electron-builder`
9. Waybar: **yes** — `custom/sheenidoro` module
10. Name: **Sheenidoro**

## 4. Architecture

### 4.1 Stack

- **Runtime:** Node 26.2.0 via `mise`, Electron 37 (`/usr/bin/electron37`), `npm 12.0.2`
- **Frontend:** Vite 6, React 18, TypeScript 5, Tailwind 4, Recharts 2
- **Desktop:** Electron + `electron-store` (JSON at `~/.config/sheenidoro/config.json`), `electron-builder`
- **System:** `notify-send` fallback, `mako` (already pink at `~/.config/mako/config`), Hyprland, Waybar

### 4.2 Process Model

```
Main (electron/main.ts) ──IPC──> Preload (contextBridge) ──> Renderer (React)
  │                          │
  ├── electron-store (settings + sessions)
  ├── Notification + spawn('notify-send')
  ├── Tray + hide-on-close
  ├── Waybar state file ~/.local/state/sheenidoro/waybar.json
  └── CLI --toggle / --show / --waybar
```

### 4.3 Data Model

```ts
// electron-store schema
type AppSettings = {
  focusMin: number;       // 1..90 default 25
  shortBreakMin: number;  // 1..90 default 5
  longBreakMin: number;   // 1..90 default 15
  longBreakEvery: number; // 2..10 default 4
  soundEnabled: boolean;  // default true
  notifyEnabled: boolean; // default true
}

type Session = {
  id: string;             // nanoid
  mode: 'focus'|'shortBreak'|'longBreak';
  plannedSec: number;
  actualSec: number;
  startedAt: string; // ISO
  endedAt: string;   // ISO
  status: 'completed'|'skipped'|'interrupted';
}
```

Storage: `sessions: Session[]` capped ~10k, no SQLite for v1.

### 4.4 Timer Engine (`src/lib/timer.ts`)

- Hook `usePomodoro(settings, sessions)`
- Modes: `focus → shortBreak → focus ... → longBreak` every N
- `setInterval(1000)` + drift correction via `Date.now()`
- State: `idle|running|paused`
- Controls: `start()`, `pause()`, `resume()`, `skip()`, `reset()`, `switchMode(m)`
- Event: `onPhaseComplete(newMode, session)` → main handles notification + session log

### 4.5 IPC Channels (`electron/preload.ts`)

- `sheenidoro:settings:get` / `set`
- `sheenidoro:sessions:list` / `add` / `clear` / `export`
- `sheenidoro:timer:phase-complete` (renderer→main notification)
- `sheenidoro:waybar:update` (1s poll)
- `sheenidoro:notify:test`

## 5. UI / UX

### 5.1 Layout

Window: `min 880×620`, default `1000×680`, resizable, remembers bounds.

**Navigation (left sidebar 220px, pastel card):**
- Timer | History | Settings — pink pill active
- Footer: cycle dots + version

**TimerView:**
- Large circular progress `TimerRing.tsx` (270px SVG, gradient `f472b6→fb7185`, track `#ffe4ec`, `strokeDashoffset` animated)
- `MM:SS` (JetBrainsMono 64px bold), mode pill (`FOCUS` / `SHORT BREAK` / `LONG BREAK`), next-up hint
- Controls: round pink buttons — Start/Pause (filled), Reset, Skip
- Illustrations switching by mode (SVG components)

**HistoryView:**
- Stats cards: Today focus/break, Weekly total, Streak, Completion %
- Weekly BarChart (Recharts, pink bars)
- Filters: Today / Week / All + search
- Session list: cards with time, mode, status (`completed` pink dot, `skipped` grey)
- Actions: Export CSV, Clear All

**SettingsView:**
- Time editors: +/- stepper + number input 1–90
- Presets: 15/25/50 min
- Toggles: Sound (chime), Notify, Waybar
- About: Sheenidoro v1.0.0

### 5.2 Theme

Tailwind extended:

```js
colors: {
  sakuraBg: '#fff0f5',
  sakuraBg2: '#ffe4ec',
  sakuraAccent: '#f8c8d4',
  sakuraPrimary: '#f472b6',
  sakuraPrimaryDark: '#db2777',
  sakuraText: '#5c3a4a',
  sakuraMuted: '#9d6b7a',
}
```

Font: `JetBrainsMono Nerd Font` (matches waybar) + `Inter` fallback.

## 6. Graphics (generated)

All in `src/assets/illustrations/` as React SVG components + PNG exports via `sharp`:

| Asset | Size | Description |
|-------|------|-------------|
| `icon.svg/png` | 512/256/128/64 | Kawaii pink tomato clock (blush, leaf stem, white clock highlight) — app & `.desktop` icon |
| `tray-idle.svg/png` | 22 | Outline tomato |
| `tray-running.svg/png` | 22 | Filled pink tomato |
| `illust-focus.svg` | 320 | Tomato at desk studying |
| `illust-short.svg` | 320 | Tomato sipping tea |
| `illust-long.svg` | 320 | Tomato napping cloud |
| `illust-empty.svg` | 240 | Sleeping tomato for empty history |
| `TimerRing` gradient | — | `f472b6→fb7185` |

No external fetches at runtime.

## 7. System Integration

### 7.1 Notifications

- Primary: `new Notification({title, body, icon})` in main (integrates with `mako`)
- Fallback: `spawn('notify-send', ['-a','Sheenidoro','-u','critical','-i',icon, title, body])` — critical ensures visible even under `[mode=do-not-disturb]` (whitelisted in `~/.config/mako/config`)
- Body examples: `Focus done! Take a 5 min break ☕` / `Break over! Back to focus 🍅`
- Sound: `assets/sounds/chime.mp3` via `Audio` in renderer or `main` play, respects `soundEnabled`

### 7.2 Waybar Module

File: `~/.local/state/sheenidoro/waybar.json` (written every 1s by main):

```json
{ "text": "24:12 🍅", "tooltip": "Focus 2/4 — 24:12 left", "class": "focus", "percentage": 62 }
```

Config snippet for user (`~/.config/waybar/config.jsonc`):

```json
"custom/sheenidoro": {
  "exec": "cat ~/.local/state/sheenidoro/waybar.json",
  "return-type": "json",
  "interval": 1,
  "on-click": "sheenidoro --toggle",
  "on-click-right": "sheenidoro --show",
  "tooltip": true
}
```

Style (`~/.config/waybar/style.css`):

```css
#custom-sheenidoro { padding:0 8px; }
#custom-sheenidoro.focus { color:#ec4899; }
#custom-sheenidoro.break { color:#fb7185; }
#custom-sheenidoro.paused { opacity:0.7; }
```

### 7.3 Hyprland

- `frame:true`, so Hyprland `general:border_size 2` & `decoration:rounding 0` apply naturally
- Suggested opt-in windowrule (README):
  ```
  windowrule = float, match:class Sheenidoro
  windowrule = size 1000 680, match:class Sheenidoro
  windowrule = center, match:class Sheenidoro
  ```

### 7.4 Tray

- `new Tray(icon)` — 22px pink
- Menu: Show Sheenidoro | Start/Pause | Skip | Reset | Quit
- Double-click toggles, keeps timer running when hidden

## 8. Packaging

### 8.1 electron-builder.yml

- `appId: com.sheenidoro.app`
- Targets: `AppImage` (x64), `pacman` maybe via `PKGBUILD`
- `extraResources: assets/**`

### 8.2 PKGBUILD

- `pkgname=sheenidoro`, `pkgver=1.0.0`, depends `electron37`, `libnotify`
- Installs to `/opt/sheenidoro`, binary `/usr/bin/sheenidoro` (wrapper), `.desktop` + icons

### 8.3 CLI

- `sheenidoro` launch GUI
- `sheenidoro --toggle` toggle timer (via IPC to running instance, single instance lock)
- `sheenidoro --show` bring to front
- `sheenidoro --waybar` print waybar JSON and exit

## 9. Validation

- `npm run typecheck` (tsc)
- `npm run lint`
- Vitest: `timer` hook drift, phase logic, session log
- Manual: Hyprland launch, mako notification, tray hide/show, waybar json cat, PKGBUILD install

## 10. Future (post 1.0)

- Per-pomodoro notes
- Auto-start opt-in per mode
- Heatmap calendar
- Idle detection pause
- Omarchy theme sync
- AUR publish

---

**Sign-off:** Approved 2026-09-07 by user. Keep spec in `docs/spec.md`, log changes in `CHANGELOG.md`, usage in `README.md`.
