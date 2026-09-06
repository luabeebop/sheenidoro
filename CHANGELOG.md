# Changelog — Sheenidoro

All notable changes are recorded here. Project path: `/home/tartarus/Projects/pomodoro` (app name: `Sheenidoro`).

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

## [Unreleased]
- Per-pomodoro notes
- Heatmap calendar
- Idle detection pause
- Omarchy theme sync
