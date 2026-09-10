import { fmtMMSS } from '../lib/format'
import { PomodoroMode } from '../lib/types'
import { PHASE, STATUS_LABEL } from '../lib/theme'

const SIZE = 306
const C = SIZE / 2
const R_ARC = 118
const R_TICK_IN = 132
const R_TICK_OUT = 142
const CIRC = 2 * Math.PI * R_ARC

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) }
}

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
  const phase = PHASE[mode]
  const accent = phase.hex
  const lit = Math.round(progress * 60)
  const head = polar(R_ARC, progress * 360)

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className={status === 'running' ? 'flicker' : undefined}>
        <defs>
          <filter id="ring-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* corner brackets — HUD framing */}
        <g stroke={accent} strokeWidth="1.5" fill="none" opacity="0.9">
          <path d={`M2,20 L2,2 L20,2`} />
          <path d={`M${SIZE - 20},2 L${SIZE - 2},2 L${SIZE - 2},20`} />
          <path d={`M2,${SIZE - 20} L2,${SIZE - 2} L20,${SIZE - 2}`} />
          <path d={`M${SIZE - 20},${SIZE - 2} L${SIZE - 2},${SIZE - 2} L${SIZE - 2},${SIZE - 20}`} />
        </g>

        {/* chronometer tick ring — one tick per minute of the dial */}
        <g>
          {Array.from({ length: 60 }).map((_, i) => {
            const major = i % 5 === 0
            const on = i < lit
            const a = polar(major ? R_TICK_IN - 5 : R_TICK_IN, i * 6)
            const b = polar(R_TICK_OUT, i * 6)
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={on ? accent : '#2c3238'}
                strokeWidth={major ? 2 : 1}
                opacity={on ? 1 : major ? 0.85 : 0.5}
              />
            )
          })}
        </g>

        {/* idle scan ring — spins only while running */}
        <circle
          cx={C}
          cy={C}
          r={R_TICK_OUT + 8}
          fill="none"
          stroke={accent}
          strokeWidth="1"
          strokeDasharray="2 14"
          opacity="0.35"
        >
          {status === 'running' && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${C} ${C}`}
              to={`360 ${C} ${C}`}
              dur="24s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* track + progress arc, square caps, no gradient */}
        <circle cx={C} cy={C} r={R_ARC} fill="none" stroke="#1e2227" strokeWidth="3" />
        <circle
          cx={C}
          cy={C}
          r={R_ARC}
          fill="none"
          stroke={accent}
          strokeWidth="3"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
          transform={`rotate(-90 ${C} ${C})`}
          filter="url(#ring-glow)"
          style={{
            transition: status === 'running' ? 'stroke-dashoffset 0.25s linear' : 'stroke-dashoffset 0.35s ease',
          }}
        />

        {/* leading head marker */}
        {progress > 0.004 && (
          <rect
            x={head.x - 3}
            y={head.y - 3}
            width="6"
            height="6"
            fill={accent}
            filter="url(#ring-glow)"
            style={{ transition: status === 'running' ? 'all 0.25s linear' : 'all 0.35s ease' }}
          />
        )}

        {/* inner hairline + crosshairs */}
        <circle cx={C} cy={C} r="100" fill="none" stroke="#1e2227" strokeWidth="1" />
        <g stroke="#2c3238" strokeWidth="1">
          <line x1={C} y1={C - 100} x2={C} y2={C - 92} />
          <line x1={C} y1={C + 92} x2={C} y2={C + 100} />
          <line x1={C - 100} y1={C} x2={C - 92} y2={C} />
          <line x1={C + 92} y1={C} x2={C + 100} y2={C} />
        </g>
      </svg>

      {/* centred readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[10px] tracking-hud mb-2 font-bold" style={{ color: accent }}>
          {phase.glyph} {phase.label}
        </div>

        <div
          className="text-[68px] font-bold leading-none tabular-nums glow"
          style={{ color: 'var(--txt, #fff)' }}
        >
          {fmtMMSS(remainingSec)}
        </div>

        <div className="text-[10px] tracking-hud text-dim mt-2.5">
          {String(Math.floor(totalSec / 60)).padStart(2, '0')} MIN
          <span className="text-faint mx-1.5">│</span>
          <span className={status === 'running' ? 'text-txt' : undefined}>{STATUS_LABEL[status]}</span>
        </div>

        <div className="text-[10px] tracking-wide2 text-faint mt-1 tabular-nums">
          {String(Math.round(progress * 100)).padStart(3, '0')}% ELAPSED
        </div>
      </div>
    </div>
  )
}
