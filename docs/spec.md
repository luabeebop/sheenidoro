# Sheenidoro — Pomodoro Spec Sheet

**Version:** 2.0.0
**Date:** 2026-09-11 (v1.0.0 — 2026-09-07)
**Target:** Omarchy (Arch + Hyprland 0.56.2)
**Project Path:** `/home/tartarus/Projects/pomodoro` (app name: `Sheenidoro`)
**Stack:** Electron + Vite + React + TypeScript + Tailwind

---

## 1. Overview

Sheenidoro is a Pomodoro desktop app for Omarchy — a React web UI wrapped as a native Electron app.
Primary purpose: **reviewing and tracking breaks**, not just counting down. History and stats are
first-class.

Runs natively on Hyprland, integrates with `mako` notifications and `waybar`.

**v2 visual language** — terminal brutalism, derived from [aquirin.com](https://aquirin.com):
Inconsolata mono throughout, pure black and white, a single hot accent, 1px hairlines, zero
border-radius, `steps()` typewriter motion. Inverted to a dark ground for a cyberpunk read, with CRT
scanlines and phase-coloured HUD instrumentation.

## 2. Requirements

### 2.1 Must-have (from user)

| ID | Requirement | Notes |
|----|-------------|-------|
| R1 | Editable time | All durations user-configurable, applies next cycle |
| R2 | Notification | Critical `mako` notification + chime on phase transition |
| R3 | Application | Native window, `.desktop` launcher, tray, survives close→hide |
| R4 | Graphics supplied | Generated icons bundled, no runtime fetches |
| R5 | React webapp desktop | Vite+React inside Electron (`BrowserWindow`) |
| ~~R6~~ | ~~Pink theme~~ | **Superseded by R11** |
| R11 | Cyberpunk theme (v2) | aquirin-derived palette, explicitly no pink |

### 2.2 Derived (break tracking & review)

| ID | Requirement |
|----|-------------|
| R7 | Persist session history locally (no cloud) |
| R8 | History view with list + weekly chart + stats |
| R9 | Waybar mini-timer integration |
| R10 | Export history to CSV |

### 2.3 Derived (v2 waybar correctness)

| ID | Requirement |
|----|-------------|
| R12 | Countdown stays accurate while the window is hidden in the tray |
| R13 | Module collapses entirely when the app is not running — including after a crash |
| R14 | Module click actions work without the pacman package installed |
| R15 | Timer controls invoked from the bar must not raise or focus the window |

## 3. Decisions

### 3.1 v1 (user confirmed 2026-09-07)

1. Defaults: **focus 25 / short break 5 / long break 15**, long break every 4, range 1–90 min
2. Auto-start: **OFF** — always wait for user interaction after phase end
3. Sound: **chime only**, no ticking
4. Lifecycle: **stay running** — window close hides to tray, timer keeps ticking
5. History depth: **break review only**, no per-pomodoro task notes
6. ~~Palette: pastel sakura~~ — **superseded, see 3.2**
7. Window chrome: **native Hyprland header** (`frame:true`), no custom frameless
8. Packaging: **PKGBUILD** (AUR) + AppImage via `electron-builder`
9. Waybar: **yes** — `custom/sheenidoro` module
10. Name: **Sheenidoro**

### 3.2 v2 (user confirmed 2026-09-11)

11. Palette: **aquirin-derived terminal**, explicitly **no pink**. Source site is white-on-black with
    a red accent; inverted to a dark ground because the brief asked for cyberpunk and the app is used
    on a dark desktop. Red is carried over verbatim as the focus accent.
12. Type: **Inconsolata** (aquirin's own face), self-hosted; `JetBrainsMono Nerd Font` fallback.
13. Phase colours: focus `#ff0033`, short break `#00e5ff`, long break `#ffb000`. Two extra hues are a
    deliberate departure from aquirin's single accent — a pomodoro must distinguish three phases at a
    glance. Both additions are cyberpunk-canonical and contain no pink.
14. Waybar state is owned by the **main process**, not the renderer (see 7.2 for why).
15. Mascot illustrations dropped; the timer's illustration slot shows real cycle state instead.

## 4. Architecture

### 4.1 Stack

- **Runtime:** Node 26.2.0 via `mise`, Electron 37 (`/usr/bin/electron37`)
- **Frontend:** Vite 6, React 18, TypeScript 5, Tailwind 3, Recharts 2
- **Desktop:** Electron + `electron-store` (JSON at `~/.config/sheenidoro/config.json`), `electron-builder`
- **System:** `notify-send` fallback, `mako`, Hyprland, Waybar

### 4.2 Process Model

```
Main (electron/main.ts) ──IPC──> Preload (contextBridge) ──> Renderer (React)
  │                          │
  ├── electron-store (settings + sessions)
  ├── Notification + spawn('notify-send')
  ├── Tray + hide-on-close
  ├── Waybar writer — owns ~/.local/state/sheenidoro/waybar.json, 1s unthrottled
  └── CLI --toggle / --skip / --show / --waybar
```

The renderer runs the timer and publishes a **snapshot on each phase transition**. Main re-derives
the countdown from the deadline and does the per-second file writing.

### 4.3 Data Model

```ts
type AppSettings = {
  focusMin: number;       // 1..90 default 25
  shortBreakMin: number;  // 1..90 default 5
  longBreakMin: number;   // 1..90 default 15
  longBreakEvery: number; // 2..10 default 4
  soundEnabled: boolean;  // default true
  notifyEnabled: boolean; // default true
}

type Session = {
  id: string;
  mode: 'focus'|'shortBreak'|'longBreak';
  plannedSec: number;
  actualSec: number;
  startedAt: string; // ISO
  endedAt: string;   // ISO
  status: 'completed'|'skipped'|'interrupted';
}

// v2 — renderer → main, on transition only
type WaybarSnapshot = {
  mode: PomodoroMode;
  status: 'idle'|'running'|'paused';
  remainingSec: number;
  totalSec: number;
  endsAt: number | null;  // epoch ms, set only while running
  focusCount: number;
}
```

Storage: `sessions: Session[]` capped 10k, no SQLite.

**Store path is pinned explicitly.** v2 sets `productName: "Sheenidoro"` so Electron reports a usable
Wayland `app_id`; that alone would relocate `userData` to `~/.config/Sheenidoro` and orphan existing
settings and history, so main calls `app.setPath('userData', …/sheenidoro)`.

### 4.4 Timer Engine (`src/lib/usePomodoro.ts`)

- Hook `usePomodoro(initialSettings)`
- Modes: `focus → shortBreak → focus … → longBreak` every N
- `setInterval(250)` for smooth rendering, drift-corrected from `endAtRef` via `Date.now()`
- State: `idle|running|paused`
- Controls: `start()`, `pause()`, `resume()`, `skip()`, `reset()`, `switchMode(m)`
- On phase complete: logs the session, advances mode, returns to `idle` and waits for the user
- Publishes a `WaybarSnapshot` on transition (not per tick)

### 4.5 IPC Channels (`electron/preload.ts`)

- `sheenidoro:settings:get` / `set`
- `sheenidoro:sessions:list` / `add` / `clear` / `export`
- `sheenidoro:notify:phase` / `notify:test`
- `sheenidoro:sound:chime`
- `sheenidoro:waybar:state` — renderer→main snapshot (v2; replaces `waybar:update`)
- `sheenidoro:toggle` / `skip` — main→renderer, from tray and CLI

`onToggle`/`onSkip` **return an unsubscribe function**. Without one the renderer stacked a listener
per render; at 4 renders/sec a single waybar click fired hundreds of stale handlers and restarted the
phase instead of pausing it.

## 5. UI / UX

### 5.1 Layout

Window: `min 880×620`, default `1000×680`, resizable, remembers bounds. Background `#000000`.

**HUD rail (top, 36px):** brand + version · live phase/status with blink indicator · session count ·
wall clock. Phase changes trigger a brief chromatic-split glitch.

**Nav rail (left, 184px):** `[01] TIMER` · `[02] LOGS` · `[03] CONF` — bracketed indices, accent bar
on the active item. Footer: cycle progress block, residency notes.

**TimerView:**
- Phase selector — three hard-edged tabs, each lit in its own phase colour when active
- `TimerRing.tsx` — 306px HUD reactor: 60 chronometer ticks lighting with progress (major every 5),
  butt-cap arc with SVG glow, leading head marker, corner brackets, crosshairs, and a dashed scan
  ring that rotates only while running
- Centre readout: phase label, `MM:SS` at 68px with accent glow, duration/status, `NNN% ELAPSED`
- Queued-next line, then controls: `ENGAGE`/`HOLD`/`RESUME` (filled accent), `RESET`, `SKIP`
- **Cycle map** — replaces v1's mascot illustration with real state: focus blocks, break separators,
  long-break marker

**HistoryView (LOGS):**
- Stat tiles with corner brackets: focus today, breaks today, total focus, completion %
- Weekly throughput BarChart — focus `#ff0033`, break `#00879b`, dark grid, mono ticks
- Filters All / Today / Week, record count alongside
- Log rows, column-aligned: stamp · phase glyph+label · planned · actual · state
  (`OK` white / `SKIP` faint / `ABORT` amber)

**SettingsView (CONF):**
- Panels with header bars: DURATIONS, ALERTS, SYSTEM
- Steppers `− NNN +` with unit label; presets 15/03/10, 25/05/15, 50/10/20
- Hard `ON`/`OFF` switches; test alert + test chime
- SYSTEM: store path, waybar state path, setup command, CLI verbs, Hyprland rule

### 5.2 Theme

Tailwind extended:

```js
colors: {
  void: '#000000', panel: '#07080a', panel2: '#0d0f12', panel3: '#14171b',
  line: '#1e2227', line2: '#2c3238',
  txt: '#ffffff', dim: '#8b9199', faint: '#4c5259',
  hot: '#ff0033',  hotDim: '#a3001f',   // focus — aquirin's accent
  ice: '#00e5ff',  iceDim: '#00879b',   // short break
  gold: '#ffb000', goldDim: '#9c6c00',  // long break
}
```

Font: `Inconsolata` 400/700 (self-hosted woff2) → `JetBrainsMono Nerd Font` → `ui-monospace`.

`src/lib/theme.ts` is the single source for each phase's label, hex, glow and glyph. Components write
the active phase into `--accent` / `--accent-glow`, so the ring, `.brk` corner brackets, `.cursor`
caret and filled buttons recolour together from one binding.

Global: `border-radius: 0 !important`, tabular numerals, `letter-spacing` scale (`hud` 0.22em).

CRT layers in `src/index.css`, all `pointer-events: none` and stacked above the app:
`.crt-scanlines` (1px dark line per 4px), `.crt-vignette`, `.crt-noise` (inline SVG turbulence),
`.crt-sweep`. Kept deliberately light — at first-pass strength they crushed legibility.

Motion: `type` (aquirin's `steps()` typewriter), `blink`, `flicker`, `glitch`, `pulseBar`.

## 6. Graphics (generated)

No external fetches at runtime; Inconsolata is vendored in `public/fonts/`.

| Asset | Size | Description |
|-------|------|-------------|
| `public/icon.svg` | 512 | Black ground, red HUD corner brackets, tick ring, 70% progress arc, head marker, `25` |
| `resources/icon*.png` | 512/256/128/64/32 | Rasterised from the SVG via `rsvg-convert` |
| `resources/tray.png` | 22 | Simplified mark — ring + centre dot, legible at tray size |
| `public/fonts/inconsolata-{400,700}.woff2` | — | Latin subset, self-hosted |

v1's kawaii tomato SVGs and the `src/assets/illustrations/` React components were removed.

## 7. System Integration

### 7.1 Notifications

- Primary: `new Notification({title, body, icon, urgency:'critical'})` in main (integrates with `mako`)
- Fallback: `spawn('notify-send', ['-a','Sheenidoro','-u','critical','-i',icon, title, body])` —
  critical keeps it visible under `[mode=do-not-disturb]`
- Body examples: `Short break — 5 min. Press Start when ready.`
- Sound: `assets/sounds/chime.wav` via `paplay` in main + `<audio>` fallback in renderer, gated on
  `soundEnabled`

### 7.2 Waybar Module

State file `~/.local/state/sheenidoro/waybar.json` (honours `XDG_STATE_HOME`):

```json
{ "text": "◆ 24:12", "tooltip": "Focus ● running — 24:12 left · 2 focus done",
  "class": "focus", "percentage": 62, "mode": "focus", "status": "running", "remainingSec": 1452 }
```

Classes: `focus` `short` `long` `paused` `idle` `hidden`.

**Ownership (R12).** Main writes the file, not the renderer. Chromium throttles timers hard in a
hidden `BrowserWindow`, and since the app is tray-resident by design that is its normal state — the
v1 renderer-owned file went stale and the helper hid the module mid-session. Main re-derives the
countdown from `endsAt` on an unthrottled 1s interval. The window also sets
`backgroundThrottling: false` so phase-end chimes and notifications fire on time.

**Atomicity.** Writes go to a temp file then `rename()`, so waybar can never read a torn file.

**Hiding (R13).** Main deletes the file on `before-quit`, `quit`, and `SIGINT`/`SIGTERM`/`SIGHUP` — so
killing a dev run no longer strands a frozen timer. If the app is `SIGKILL`ed, no cleanup can run, so
the helper treats a file older than **5s** as stale and reports hidden. The `.hidden` style zeroes
padding, margin, border and font-size so the module collapses rather than leaving a gap.

**Helper** `scripts/waybar-sheenidoro.sh` — pure bash. Waybar polls it once a second forever; v1
spawned a Python interpreter on every poll.

**Setup** `scripts/setup-waybar.sh` — idempotent; backs up config and style, then:
- installs the helper to `~/.local/share/sheenidoro/`
- **(R14)** ensures a `sheenidoro` launcher exists — without the pacman package the command did not
  exist at all and every click was a silent no-op. Writes a marked shim to `~/.local/bin/sheenidoro`
  when there is no real install, and refreshes its own shim on re-runs
- registers the module with **absolute paths**, since waybar runs click commands through `sh`, which
  may not have `~/.local/bin` on `PATH`
- replaces the style block between `/* >>> sheenidoro >>> */` markers so re-runs replace rather than stack
- restarts via `omarchy restart waybar`

Bindings: left `--toggle` · right `--show` · middle `--skip`. **(R15)** Only `--show` raises the
window; `second-instance` no longer calls `show()` unconditionally.

Style (`~/.config/waybar/style.css`) — flat, to match the Omarchy bar:

```css
#custom-sheenidoro { padding:0 8px; margin:0 6px; font-weight:bold; border-left:2px solid #2c3238; }
#custom-sheenidoro.focus  { color:#ff0033; border-left-color:#ff0033; }
#custom-sheenidoro.short  { color:#00e5ff; border-left-color:#00e5ff; }
#custom-sheenidoro.long   { color:#ffb000; border-left-color:#ffb000; }
#custom-sheenidoro.paused { color:#8b9199; border-left-color:#8b9199; }
#custom-sheenidoro.idle   { color:#6b7178; border-left-color:#2c3238; }
#custom-sheenidoro.hidden { opacity:0; min-width:0; margin:0; padding:0; border:none; font-size:0; }
```

### 7.3 Hyprland

- `frame:true`, so Hyprland border/rounding settings apply naturally
- **Window class is `Sheenidoro`.** Electron reads app identity from the nearest `package.json` during
  Ozone init — before `main.js` runs, so `app.setName()` is too late and `--class` does not set the
  Wayland `app_id`. v1 wrappers invoked `main.js` by absolute path, so every window came up as class
  `Electron`, colliding with other Electron apps and breaking both `StartupWMClass` and the
  `class:Sheenidoro` rule this spec recommends. Fixed with top-level `productName` plus launchers that
  pass the **app directory**.
- Suggested opt-in windowrule (verify syntax against your Hyprland version):
  ```
  windowrule = float, class:Sheenidoro
  windowrule = size 1060 720, class:Sheenidoro
  windowrule = center, class:Sheenidoro
  ```

### 7.4 Tray

- `new Tray(icon)` — 22px mark
- Menu: Show Sheenidoro | Toggle timer | Skip phase | Quit
- Click toggles visibility, double-click shows; timer keeps running while hidden

## 8. Packaging

### 8.1 electron-builder

- `appId: com.sheenidoro.app`, `productName: Sheenidoro`
- Targets: `AppImage` + `pacman`
- `extraResources: assets/**`

### 8.2 PKGBUILD

- `pkgname=sheenidoro`, `pkgver=2.0.0`, depends `electron37`, `libnotify`, `libpulse`
- Installs to `/opt/sheenidoro`, wrapper `/usr/bin/sheenidoro`, `.desktop` + hicolor icons
- Wrapper execs `electron37 --class=Sheenidoro /opt/sheenidoro` — the **directory**, so `package.json`
  is discoverable (see 7.3)

### 8.3 CLI

- `sheenidoro` launch GUI
- `sheenidoro --toggle` start/pause via IPC, does not raise the window
- `sheenidoro --skip` skip current phase
- `sheenidoro --show` bring to front
- `sheenidoro --waybar` print state JSON and exit — returns before any window or lock work, rather
  than booting a full instance to print one line

## 9. Validation

- `npm run typecheck` (renderer + electron + node configs)
- `npm run lint`
- Vitest: timer drift, phase logic, session log
- Manual, verified 2026-09-11 against the running app on Hyprland 0.56.2:
  - three panes render; phase accents recolour ring/brackets/buttons
  - window class reports `Sheenidoro`
  - waybar lifecycle: hidden → idle → running → paused → resumed → skipped → collapsed on quit
  - countdown holds steady across 30s hidden in the tray (R12)
  - `SIGKILL` → module hides within ~5s via stale detection (R13)
  - `--toggle` pauses without stealing focus (R15)
  - phase completion logs a session and advances without auto-starting

## 10. Future (post 2.0)

- Per-pomodoro notes
- Auto-start opt-in per mode
- Heatmap calendar
- Idle detection pause
- Omarchy theme sync — read `~/.config/omarchy/current/theme` and derive the accent
- AUR publish

---

**Sign-off:** v1.0.0 approved 2026-09-07. v2.0.0 approved 2026-09-11. Keep spec in `docs/spec.md`,
log changes in `CHANGELOG.md`, usage in `README.md`.
