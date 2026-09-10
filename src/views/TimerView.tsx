import type { ReactNode } from 'react'
import { TimerRing } from '../components/TimerRing'
import { PomodoroMode } from '../lib/types'
import { PHASE } from '../lib/theme'
import { fmtMMSS } from '../lib/format'

const MODES: PomodoroMode[] = ['focus', 'shortBreak', 'longBreak']

function Btn({
  onClick,
  children,
  primary,
  title,
}: {
  onClick: () => void
  children: ReactNode
  primary?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={
        primary
          ? 'px-8 py-2.5 text-[12px] font-bold tracking-hud text-void transition-opacity hover:opacity-80'
          : 'px-5 py-2.5 text-[12px] font-bold tracking-hud border border-line2 text-dim hover:text-txt hover:border-dim transition-colors'
      }
      style={primary ? { background: 'var(--accent)' } : undefined}
    >
      {children}
    </button>
  )
}

export function TimerView({
  mode,
  status,
  remainingSec,
  totalSec,
  progress,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  onSwitch,
  focusCount,
  settings,
}: {
  mode: PomodoroMode
  status: 'idle' | 'running' | 'paused'
  remainingSec: number
  totalSec: number
  progress: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onSkip: () => void
  onSwitch: (m: PomodoroMode) => void
  focusCount: number
  settings: { focusMin: number; shortBreakMin: number; longBreakMin: number; longBreakEvery: number }
}) {
  const minsFor = (m: PomodoroMode) =>
    m === 'focus' ? settings.focusMin : m === 'shortBreak' ? settings.shortBreakMin : settings.longBreakMin

  const nextIsLong = focusCount > 0 && (focusCount + 1) % settings.longBreakEvery === 0
  const nextMode: PomodoroMode = mode === 'focus' ? (nextIsLong ? 'longBreak' : 'shortBreak') : 'focus'
  const inCycle = settings.longBreakEvery > 0 ? focusCount % settings.longBreakEvery : 0

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 p-6 overflow-auto">
      {/* ── phase selector ─────────────────────────────── */}
      <div className="flex border border-line">
        {MODES.map((m) => {
          const active = mode === m
          return (
            <button
              key={m}
              onClick={() => onSwitch(m)}
              className={`px-5 py-2 text-[11px] font-bold tracking-wide2 border-r border-line last:border-r-0 transition-colors ${
                active ? 'bg-panel2' : 'text-faint hover:text-dim hover:bg-panel2/50'
              }`}
              style={active ? { color: PHASE[m].hex } : undefined}
            >
              {active ? PHASE[m].glyph : '·'} {PHASE[m].short} {String(minsFor(m)).padStart(2, '0')}
            </button>
          )
        })}
      </div>

      <TimerRing
        remainingSec={remainingSec}
        totalSec={totalSec}
        progress={progress}
        mode={mode}
        status={status}
      />

      {/* ── next-up readout ────────────────────────────── */}
      <div className="text-[11px] tracking-wide2 text-dim">
        <span className="text-faint">&gt;&gt;</span> QUEUED{' '}
        <span style={{ color: PHASE[nextMode].hex }}>{PHASE[nextMode].label}</span>
        <span className="text-faint mx-1.5">//</span>
        <span className="tabular-nums text-txt">{fmtMMSS(minsFor(nextMode) * 60)}</span>
      </div>

      {/* ── controls ───────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {status === 'idle' && (
          <Btn primary onClick={onStart}>
            ▶ ENGAGE
          </Btn>
        )}
        {status === 'running' && (
          <Btn primary onClick={onPause}>
            ▮▮ HOLD
          </Btn>
        )}
        {status === 'paused' && (
          <Btn primary onClick={onResume}>
            ▶ RESUME
          </Btn>
        )}
        <Btn onClick={onReset} title="Reset (R)">
          ↺ RESET
        </Btn>
        <Btn onClick={onSkip} title="Skip (S)">
          ▶▶ SKIP
        </Btn>
      </div>

      <div className="text-[10px] tracking-wide2 text-faint">
        SPC {status === 'running' ? 'HOLD' : 'ENGAGE'}
        <span className="mx-2">·</span>R RESET
        <span className="mx-2">·</span>S SKIP
        <span className="mx-2">·</span>1/2/3 PANE
      </div>

      {/* ── cycle map: replaces the old mascot illustration with real state ── */}
      <div className="w-full max-w-[380px] border-t border-line pt-3">
        <div className="flex items-center justify-between text-[9px] tracking-hud text-faint mb-2">
          <span>CYCLE MAP</span>
          <span>
            {String(inCycle).padStart(2, '0')}/{String(settings.longBreakEvery).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: settings.longBreakEvery }).map((_, i) => {
            const done = i < inCycle
            const current = i === inCycle && mode === 'focus'
            return (
              <div key={i} className="flex-1 flex items-center gap-1">
                <div
                  className={`h-[10px] flex-1 border ${current && status === 'running' ? 'animate-pulseBar' : ''}`}
                  style={{
                    background: done ? PHASE.focus.hex : current ? 'transparent' : 'transparent',
                    borderColor: done || current ? PHASE.focus.hex : '#2c3238',
                  }}
                />
                <div
                  className="h-[10px] w-[5px] border"
                  style={{ borderColor: done ? PHASE.shortBreak.hex : '#2c3238' }}
                />
              </div>
            )
          })}
          <div
            className="h-[10px] w-[18px] border ml-1"
            style={{
              borderColor: PHASE.longBreak.hex,
              background: inCycle === 0 && focusCount > 0 ? PHASE.longBreak.hex : 'transparent',
            }}
            title="Long break"
          />
        </div>
      </div>
    </div>
  )
}
