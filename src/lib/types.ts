export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'

export interface AppSettings {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longBreakEvery: number
  soundEnabled: boolean
  notifyEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  soundEnabled: true,
  notifyEnabled: true,
}

export interface Session {
  id: string
  mode: PomodoroMode
  plannedSec: number
  actualSec: number
  startedAt: string
  endedAt: string
  status: 'completed' | 'skipped' | 'interrupted'
}

/**
 * What the renderer hands the main process on each phase transition.
 * Main re-derives the countdown from `endsAt`, so it stays correct even
 * when the window is hidden and the renderer's timers are throttled.
 */
export interface WaybarSnapshot {
  mode: PomodoroMode
  status: 'idle' | 'running' | 'paused'
  remainingSec: number
  totalSec: number
  endsAt: number | null
  focusCount: number
}

export function secsFor(mode: PomodoroMode, s: AppSettings): number {
  if (mode === 'focus') return s.focusMin * 60
  if (mode === 'shortBreak') return s.shortBreakMin * 60
  return s.longBreakMin * 60
}

export function labelFor(mode: PomodoroMode): string {
  if (mode === 'focus') return 'Focus'
  if (mode === 'shortBreak') return 'Short Break'
  return 'Long Break'
}

export function emojiFor(mode: PomodoroMode): string {
  if (mode === 'focus') return '🍅'
  if (mode === 'shortBreak') return '☕'
  return '🌸'
}

export function nextMode(current: PomodoroMode, focusCount: number, s: AppSettings): PomodoroMode {
  if (current === 'focus') {
    // after focus, decide break
    const isLong = focusCount > 0 && focusCount % s.longBreakEvery === 0
    return isLong ? 'longBreak' : 'shortBreak'
  }
  return 'focus'
}
