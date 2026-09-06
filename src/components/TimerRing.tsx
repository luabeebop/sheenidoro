import { fmtMMSS } from '../lib/format'
import { PomodoroMode } from '../lib/types'

export function TimerRing({
  remainingSec,
  totalSec,
  progress,
  mode,
  status,
}: {
  remainingSec: number
  totalSec: number
  progress: number
  mode: PomodoroMode
  status: 'idle' | 'running' | 'paused'
}) {
  const size = 280
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - progress)

  const gradientId = `sakura-grad-${mode}`

  const modeLabel = mode === 'focus' ? 'FOCUS' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK'
  const modeColor =
    mode === 'focus' ? 'bg-sakuraPrimary text-white' : 'bg-white text-sakuraPrimary border border-sakuraAccent'

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="drop-shadow-sm">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id="track" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe4ec" />
            <stop offset="100%" stopColor="#ffd6e0" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#track)" strokeWidth={stroke} fill="none" />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: status === 'running' ? 'stroke-dashoffset 0.25s linear' : 'stroke-dashoffset 0.4s ease' }}
        />
        {/* inner highlight */}
        <circle cx={size / 2} cy={size / 2} r={r - 22} fill="white" opacity="0.85" />
      </svg>

      {/* centered content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-2 ${modeColor}`}>
          {modeLabel}
        </span>
        <div className="font-mono text-[56px] font-bold tracking-tight text-sakuraText leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {fmtMMSS(remainingSec)}
        </div>
        <div className="text-[11px] tracking-widest text-sakuraMuted mt-1 font-medium">
          {totalSec ? `${Math.floor(totalSec / 60)} MIN • ${status.toUpperCase()}` : ''}
        </div>
        {status === 'paused' && <div className="mt-2 text-xs bg-sakuraBg2 text-sakuraMuted px-3 py-1 rounded-full">paused</div>}
      </div>
    </div>
  )
}
