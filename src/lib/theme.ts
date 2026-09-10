import type { CSSProperties } from 'react'
import { PomodoroMode } from './types'

/**
 * Phase accents. `hot` red is aquirin's own accent colour; the two break
 * phases take cyan / amber so a glance at the ring tells you the phase.
 * Every component reads `hex`/`glow` into the `--accent` custom property,
 * so .brk brackets, .glow text and the .cursor caret all recolour together.
 */
export const PHASE: Record<
  PomodoroMode,
  { label: string; short: string; code: string; hex: string; glow: string; glyph: string }
> = {
  focus: {
    label: 'FOCUS',
    short: 'FOCUS',
    code: 'FCS',
    hex: '#ff0033',
    glow: 'rgba(255,0,51,0.50)',
    glyph: '◆',
  },
  shortBreak: {
    label: 'SHORT BREAK',
    short: 'SHORT',
    code: 'BRK',
    hex: '#00e5ff',
    glow: 'rgba(0,229,255,0.45)',
    glyph: '▲',
  },
  longBreak: {
    label: 'LONG BREAK',
    short: 'LONG',
    code: 'LNG',
    hex: '#ffb000',
    glow: 'rgba(255,176,0,0.45)',
    glyph: '■',
  },
}

/** Inline style that rebinds the accent custom properties for a subtree. */
export function accentVars(mode: PomodoroMode): CSSProperties {
  return {
    ['--accent' as string]: PHASE[mode].hex,
    ['--accent-glow' as string]: PHASE[mode].glow,
  } as CSSProperties
}

export const STATUS_LABEL: Record<'idle' | 'running' | 'paused', string> = {
  idle: 'STANDBY',
  running: 'RUNNING',
  paused: 'HELD',
}
