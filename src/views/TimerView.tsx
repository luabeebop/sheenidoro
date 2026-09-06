import { TimerRing } from '../components/TimerRing'
import { IllustFocus, IllustShort, IllustLong } from '../assets/illustrations/IllustFocus'
import { PomodoroMode } from '../lib/types'

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
  const nextLabel =
    mode === 'focus'
      ? `Next: ${focusCount > 0 && (focusCount + 1) % settings.longBreakEvery === 0 ? `Long Break ${settings.longBreakMin}m 🌸` : `Short Break ${settings.shortBreakMin}m ☕`}`
      : `Next: Focus ${settings.focusMin}m 🍅`

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 overflow-auto">
      {/* mode switch pills */}
      <div className="flex gap-2 bg-white p-1.5 rounded-full border border-sakuraBorder shadow-sm">
        {(['focus', 'shortBreak', 'longBreak'] as PomodoroMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onSwitch(m)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition ${
              mode === m ? 'bg-sakuraPrimary text-white shadow' : 'text-sakuraMuted hover:text-sakuraText hover:bg-sakuraBg2'
            }`}
          >
            {m === 'focus' ? `Focus ${settings.focusMin}m` : m === 'shortBreak' ? `Short ${settings.shortBreakMin}m` : `Long ${settings.longBreakMin}m`}
          </button>
        ))}
      </div>

      <TimerRing remainingSec={remainingSec} totalSec={totalSec} progress={progress} mode={mode} status={status} />

      <div className="text-xs text-sakuraMuted bg-white border border-sakuraBorder px-3 py-1.5 rounded-full">{nextLabel}</div>

      {/* controls */}
      <div className="flex items-center gap-3">
        {status === 'idle' && (
          <button
            onClick={onStart}
            className="px-10 py-3 rounded-full bg-sakuraPrimary hover:bg-sakuraPrimaryDark text-white font-bold shadow-sakuraLg transition flex items-center gap-2"
          >
            <span>▶</span> Start
          </button>
        )}
        {status === 'running' && (
          <button
            onClick={onPause}
            className="px-10 py-3 rounded-full bg-sakuraPrimary hover:bg-sakuraPrimaryDark text-white font-bold shadow-sakuraLg transition"
          >
            ⏸ Pause
          </button>
        )}
        {status === 'paused' && (
          <button
            onClick={onResume}
            className="px-10 py-3 rounded-full bg-sakuraPrimary hover:bg-sakuraPrimaryDark text-white font-bold shadow-sakuraLg transition"
          >
            ▶ Resume
          </button>
        )}
        <button
          onClick={onReset}
          className="px-5 py-3 rounded-full bg-white border border-sakuraBorder text-sakuraText hover:bg-sakuraBg2 text-sm font-semibold transition"
          title="Reset (R)"
        >
          ↺ Reset
        </button>
        <button
          onClick={onSkip}
          className="px-5 py-3 rounded-full bg-white border border-sakuraBorder text-sakuraMuted hover:text-sakuraText hover:bg-sakuraBg2 text-sm font-semibold transition"
          title="Skip (S)"
        >
          Skip →
        </button>
      </div>

      <div className="text-[11px] text-sakuraMuted">
        Space: {status === 'running' ? 'pause' : 'start'} • R reset • S skip
      </div>

      {/* illustration */}
      <div className="mt-1 opacity-95">
        {mode === 'focus' ? <IllustFocus /> : mode === 'shortBreak' ? <IllustShort /> : <IllustLong />}
      </div>
    </div>
  )
}
