# Changelog — Sheenidoro

All notable changes are recorded here. Project path: `/home/tartarus/Projects/pomodoro` (app name: `Sheenidoro`).

## [2.0.0] — 2026-09-11

Visual rebuild plus a waybar integration that actually survives being hidden.

### Changed — UI
- **Theme replaced**: pastel sakura pink is gone. New language derived from
  [aquirin.com](https://aquirin.com) — Inconsolata mono throughout, pure black/white, one hot accent,
  1px hairlines, zero border-radius, `steps()` typewriter motion — inverted to a dark cyberpunk
  terminal. Phase accents: focus `#ff0033` (aquirin's red), short break `#00e5ff`, long break `#ffb000`.
  Each phase rebinds `--accent`, so ring, brackets, caret and buttons recolour together.
- `src/index.css:1` — design tokens, self-hosted Inconsolata 400/700, CRT scanline/vignette/noise/sweep
  layers, typewriter + blink + flicker + glitch keyframes, corner-bracket utility.
- `src/App.tsx:1` — HUD rail (brand, live phase/status, session count, wall clock), CRT overlay stack,
  chromatic-split glitch on phase change.
- `src/components/TimerRing.tsx:1` — soft gradient ring replaced by a HUD reactor: 60 chronometer
  ticks that light with progress, hard butt-cap arc with SVG glow, leading head marker, corner
  brackets, crosshairs, scan ring that spins only while running.
- `src/components/NavRail.tsx:1` (was `Sidebar.tsx`) — bracketed `[01]/[02]/[03]` nav with accent bar.
- `src/views/HistoryView.tsx:1` — data terminal: bracketed stat tiles, restyled chart, aligned log rows.
- `src/views/SettingsView.tsx:1` — terminal config panels, hard steppers and ON/OFF switches.
- `src/lib/theme.ts:1` — single source for phase label/colour/glyph.
- Kawaii tomato SVGs removed; the timer's illustration slot now shows a real **cycle map**.
- Icon redesigned (black ground, red HUD brackets, progress arc); PNGs and tray mark regenerated.
- Added `1`/`2`/`3` shortcuts for the three panes; shortcuts now ignore keystrokes in form fields.

### Fixed — waybar
- **Module vanished mid-session.** The renderer owned the state file, and Chromium throttles timers in
  a hidden window, so the file went stale while the app sat in the tray and the helper hid the module.
  The **main process** now owns it (`electron/main.ts:1`): the renderer publishes a snapshot on each
  phase transition, main re-derives the countdown from the deadline and writes once a second on an
  unthrottled timer.
- **Torn reads.** State file is now written atomically (temp + `rename`).
- **Timer and alerts drifted when hidden.** Set `backgroundThrottling: false`.
- **Clicks did nothing.** `sheenidoro` was never on `PATH` without the pacman package. `setup-waybar.sh`
  now writes a launcher shim to `~/.local/bin/sheenidoro` and registers **absolute paths** in the
  module, since waybar runs click commands through `sh`.
- **`--toggle` yanked the window forward.** The `second-instance` handler raised the window
  unconditionally; only `--show` does now. Added `--skip` (bound to middle-click).
- **`--waybar` booted a whole Electron instance** to print one line — it now prints and exits before
  any window or lock work.
- **Helper spawned a Python interpreter every second, forever.** Rewritten in pure bash; honours
  `XDG_STATE_HOME`.
- **Stale idle file.** Startup seeded a hardcoded `○ 25:00 🍅` ignoring real settings; it now seeds
  from the store. Main removes the file on quit and on `SIGINT`/`SIGTERM`/`SIGHUP`, so killing a dev
  run no longer leaves a frozen timer.
- Waybar styling rewritten flat to match the Omarchy bar, with per-phase classes
  (`focus`/`short`/`long`/`paused`/`idle`/`hidden`); the style block is delimited so re-runs replace
  it cleanly instead of stacking.

### Fixed — app
- **A waybar click fired hundreds of stale handlers.** `onToggle`/`onSkip` re-registered an IPC
  listener on every render and never removed one — with the timer re-rendering 4×/s, `--toggle`
  restarted the phase instead of pausing it. Preload now returns an unsubscriber, and `App.tsx`
  subscribes once and reads the live timer through a ref.
- **Window class was `Electron`.** Wrappers invoked `main.js` by absolute path, so Electron could not
  find `package.json` and fell back to the default name, colliding with every other Electron app and
  breaking `StartupWMClass` and `class:Sheenidoro` rules. Added top-level `productName` and pointed
  the launchers at the app directory.
- **Config path would have moved.** Setting `productName` relocates `userData` to
  `~/.config/Sheenidoro`, orphaning existing settings and history; `userData` is now pinned to the
  documented `~/.config/sheenidoro`.

## [1.0.0] — 2026-09-07

### Added
- Initial release of **Sheenidoro** pastel sakura pomodoro for Omarchy (Hyprland 0.55.2).
- Stack: Electron 37 + Vite 6 + React 18 + TypeScript 5 + Tailwind 4 + Recharts + electron-store.
- **Timer**: 25/5/15 defaults, editable 1–90 min, long break every 4 (2–10), manual next-mode advance, always waits for user click (no auto-start per spec).
- **Engine**: `src/lib/usePomodoro.ts:1` — `setInterval` 250ms drift-corrected, status `idle|running|paused`, `start/pause/resume/reset/skip/switchMode`, phase-complete session logging.
- **Persistence**: `electron-store` at `~/.config/sheenidoro/config.json` — `settings` + `sessions` (cap 10k).
- **Notifications**: Electron `Notification` (critical) + `notify-send -a Sheenidoro -u critical` fallback, window flash + `hyprctl dispatch bringactivetowindow`. Mako pink theme compatible.
- **Sound**: Chime only (`assets/sounds/chime.wav` 52KB, 0.6s bell), no ticking, `paplay` fallback in main + `<audio>` in renderer. Toggle in Settings.
- **UI**:
  - `TimerRing.tsx:1` — 280px SVG gradient ring (`#f472b6→#fb7185`), `MM:SS` tabular.
  - `Sidebar.tsx:1` — 220px nav (Timer/History/Settings), cycle dots.
  - `TimerView.tsx:1` — mode pills, controls (Start/Pause/Resume/Reset/Skip), keyboard Space/R/S, illustration switch.
  - `HistoryView.tsx:1` — stats cards, weekly BarChart, filters Today/Week/All, session cards, Export/Clear, empty illustration.
  - `SettingsView.tsx:1` — steppers, number inputs, presets (15/25/50), toggles, test notify, about.
- **Graphics**: Generated pastel tomato SVGs — `public/icon.svg` (512), PNGs 512/256/128/64/32/tray22 via `rsvg-convert`, inline React illustrations (`IllustFocus/Short/Long/Empty`).
- **Shell**: `electron/main.ts:1` — native Hyprland frame (`frame:true`), tray hide-on-close, single-instance lock, CLI `--toggle/--show/--waybar`, window bounds persistence, waybar state file `~/.local/state/sheenidoro/waybar.json`.
- **Preload**: `electron/preload.ts:1` — `window.sheenidoro` bridge (settings, sessions, notify, waybar).
- **System**:
  - `resources/sheenidoro.desktop:1` — Categories Productivity, actions Toggle/Show.
  - `scripts/waybar-sheenidoro.sh:1` — helper for waybar custom module.
  - `PKGBUILD:1` — `pkgname=sheenidoro`, `depends=electron37 libnotify`, install to `/opt/sheenidoro`, wrapper `/usr/bin/sheenidoro`, icons hicolor, `electron-builder` AppImage/pacman targets.
- **Config**:
  - `tailwind.config.js:1` — `sakuraBg/Bg2/Accent/Primary/Text` palette.
  - `vite.config.ts:1`, `tsconfig*.json`, `postcss.config.js:1`, `index.html:1`.
- **Docs**: `docs/spec.md:1` — full spec sheet (requirements, decisions, architecture, data model, waybar, packaging). `README.md:1` — usage, Omarchy integration, CLI, troubleshooting. `CHANGELOG.md:1` — this file.

### Decisions Recorded (2026-09-07 user approvals)
1. Durations 25/5/15 editable 1–90 — yes
2. Auto-start off, always wait — yes
3. Chime only — yes
4. Stay running in tray — yes
5. Break review only (no notes) — yes
6. Pastel sakura palette — yes
7. Native Hyprland header — yes
8. PKGBUILD — yes
9. Waybar mini-timer — yes
10. Name Sheenidoro — yes, kept in same directory `/home/tartarus/Projects/pomodoro`

### Technical Notes
- Waybar interval: main writes file every interval tick (250ms) via `updateWaybar` IPC; waybar polls 1s.
- Hyprland optional float rules documented in README.
- No SQLite — JSON store suffices for <10k sessions.

## [1.0.1] — 2026-09-07 (fix/waybar-notify-chime)

### Fixed
- **Test notification sound**: `SettingsView` now triggers both `notify` + `paplay` chime + HTML5 `Audio` (`./sounds/chime.wav`); `electron/main.ts:242` `showNotification` now calls `playChimePaplay()` when `soundEnabled`, and `ipc 'sheenidoro:notify:test'` double-ensures chime. Fixes silent test button.
- **Waybar integration**: added `scripts/setup-waybar.sh:1` (idempotent) — parses `config.jsonc`, injects `custom/sheenidoro` after `clock` in `modules-center`, appends pastel styles to `style.css`, reloads waybar. Previously user saw no timer because module was missing. Now `bash scripts/setup-waybar.sh` fixes. Updated `README.md:65` docs.
- **Chime catchiness**: regenerated `assets/sounds/chime.wav:1` from 0.6s soft to 1.6s double-strike bright bell (880+1109+1320Hz → 1046+1318+1760+2093Hz echo at 0.38s + 0.78s sparkle, 138KB), louder (22000), catches attention. Copied to `public/sounds/` and `src/assets/`.

### Added
- `scripts/setup-waybar.sh` installed via `PKGBUILD:52` to `/usr/share/sheenidoro/`.
- `SettingsView` now has two test buttons: `Test notification + chime` and `Test chime only`.

### Changed
- `README.md` Waybar section now documents automatic setup.
- Branch discipline enforced: this release developed on `fix/waybar-notify-chime`, not `main`.

### Notes
- 2026-09-07 — Sheena (girlfriend) feedback: prefers strawberry over tomato (pomodoro literal). Forgiven, keep tomato graphics for now. Strawberry swap prepared for future branch `fix/strawberry-for-sheena` if requested (replace `public/icon.svg`, PNGs, illustrations, emoji 🍓). No code change in 1.0.1.
- Local continuity captured in `docs/session-2026-09-07.md:1` for next session.

## [1.0.2] — 2026-09-07 (fix/waybar-stuck-idle)

### Fixed
- **Waybar stuck after dev closed**: `waybar.json` remained with stale timer after `npm run dev` (vite) stopped or app quit without cleanup. Now `electron/main.ts:405` `writeWaybarIdle()` on `before-quit`/`quit`, and `scripts/waybar-sheenidoro.sh:1` detects staleness (>7s via `stat` mtime) and returns idle `○ 25:00 🍅` instead of stale timer. Prevents stuck display when vite dies or electron hidden but timer not updating.
- **Helper script**: migrated from simple `cat` to resilient script with JSON validation via python3.

### Changed
- `scripts/setup-waybar.sh:1` now installs helper to `~/.local/share/sheenidoro/waybar-sheenidoro.sh` and migrates old `cat ~/.local/state/.../waybar.json` exec to helper script path. Existing user config auto-migrated (verified: waybar reloaded, shows `custom/sheenidoro` after `clock`).
- Branch `fix/waybar-stuck-idle` from `fix/waybar-notify-chime`, not `main`.

## [1.0.3] — 2026-09-07 (fix/waybar-hide-when-closed)

### Fixed
- **Waybar shows when app not running**: user wants hidden when closed. Now `waybar-sheenidoro.sh:1` returns `{"text":"","class":"hidden"}` when file missing or stale (>7s), and `style.css` `#custom-sheenidoro.hidden {opacity:0; min-width:0; margin:0; padding:0;}` hides module. `electron/main.ts:108` `writeWaybarIdle()` now deletes `waybar.json` on `before-quit`/`quit` instead of writing idle, so helper hides immediately. `setup-waybar.sh` now removes stale file on setup if not running. Verified: no app → `bash waybar-sheenidoro.sh` → hidden, fresh timer → visible, stale 10s → hidden.

## [Unreleased]
- Per-pomodoro notes
- Heatmap calendar
- Idle detection pause
- Omarchy theme sync
