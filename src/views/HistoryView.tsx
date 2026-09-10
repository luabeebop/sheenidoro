import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Session } from '../lib/types'
import { fmtHuman, startOfWeek } from '../lib/format'
import { PHASE } from '../lib/theme'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const STATUS_STYLE: Record<Session['status'], { label: string; className: string; style?: CSSProperties }> = {
  completed: { label: 'OK', className: 'text-txt' },
  skipped: { label: 'SKIP', className: 'text-faint' },
  interrupted: { label: 'ABORT', className: '', style: { color: '#ffb000' } },
}

function logStamp(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function HistoryView({
  sessions,
  onClear,
  onExport,
}: {
  sessions: Session[]
  onClear: () => void
  onExport: () => void
}) {
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return sessions
    if (filter === 'today')
      return sessions.filter((s) => new Date(s.startedAt).toDateString() === new Date().toDateString())
    const start = startOfWeek()
    return sessions.filter((s) => new Date(s.startedAt) >= start)
  }, [sessions, filter])

  const stats = useMemo(() => {
    const today = sessions.filter((s) => new Date(s.startedAt).toDateString() === new Date().toDateString())
    const focusToday = today.filter((s) => s.mode === 'focus' && s.status === 'completed')
    const breakToday = today.filter((s) => s.mode !== 'focus' && s.status === 'completed')
    const focusMinToday = Math.round(focusToday.reduce((a, b) => a + b.actualSec, 0) / 60)
    const breakMinToday = Math.round(breakToday.reduce((a, b) => a + b.actualSec, 0) / 60)
    const totalFocus = sessions.filter((s) => s.mode === 'focus' && s.status === 'completed').length
    const totalBreak = sessions.filter((s) => s.mode !== 'focus').length
    const completion = sessions.length
      ? Math.round((sessions.filter((s) => s.status === 'completed').length / sessions.length) * 100)
      : 0
    return { focusToday: focusToday.length, breakToday: breakToday.length, focusMinToday, breakMinToday, totalFocus, totalBreak, completion }
  }, [sessions])

  const weeklyData = useMemo(() => {
    const days: { name: string; focus: number; breaks: number }[] = []
    const start = startOfWeek()
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const daySessions = sessions.filter((s) => new Date(s.startedAt).toDateString() === d.toDateString())
      days.push({
        name: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toUpperCase(),
        focus: Math.round(
          daySessions.filter((s) => s.mode === 'focus' && s.status === 'completed').reduce((a, b) => a + b.actualSec, 0) / 60
        ),
        breaks: Math.round(
          daySessions.filter((s) => s.mode !== 'focus' && s.status === 'completed').reduce((a, b) => a + b.actualSec, 0) / 60
        ),
      })
    }
    return days
  }, [sessions])

  return (
    <div className="flex-1 overflow-auto p-5 space-y-5">
      {/* ── header ─────────────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-line pb-3">
        <div>
          <h2 className="text-[14px] font-bold tracking-hud">
            <span className="text-faint">//</span> SESSION LOGS
          </h2>
          <p className="text-[10px] text-faint tracking-wide2 mt-1">LOCAL STORE · ~/.config/sheenidoro</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="px-3.5 py-1.5 text-[10px] font-bold tracking-hud border border-line2 text-dim hover:text-txt hover:border-dim transition-colors"
          >
            EXPORT CSV
          </button>
          <button
            onClick={onClear}
            className="px-3.5 py-1.5 text-[10px] font-bold tracking-hud border border-line2 text-dim hover:border-hot transition-colors hover:text-hot"
          >
            PURGE
          </button>
        </div>
      </div>

      {/* ── stat tiles ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="FOCUS TODAY" value={String(stats.focusToday).padStart(2, '0')} sub={`${stats.focusMinToday} MIN`} accent={PHASE.focus.hex} />
        <Stat label="BREAKS TODAY" value={String(stats.breakToday).padStart(2, '0')} sub={`${stats.breakMinToday} MIN`} accent={PHASE.shortBreak.hex} />
        <Stat label="TOTAL FOCUS" value={String(stats.totalFocus)} sub={`${stats.totalBreak} BREAKS`} accent={PHASE.longBreak.hex} />
        <Stat label="COMPLETION" value={`${stats.completion}%`} sub={`${sessions.length} RECORDS`} accent="#ffffff" />
      </div>

      {/* ── chart ──────────────────────────────────────── */}
      <div className="border border-line bg-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold tracking-hud">
            <span className="text-faint">//</span> WEEKLY THROUGHPUT
          </h3>
          <div className="flex items-center gap-3 text-[9px] tracking-wide2 text-faint">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 inline-block" style={{ background: PHASE.focus.hex }} /> FOCUS
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 inline-block" style={{ background: '#00879b' }} /> BREAK
            </span>
            <span>MIN · MON→SUN</span>
          </div>
        </div>
        <div className="h-[172px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1e2227" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8b9199' }} axisLine={{ stroke: '#1e2227' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8b9199' }} axisLine={false} tickLine={false} width={34} />
              <Tooltip
                contentStyle={{
                  background: '#0d0f12',
                  border: '1px solid #2c3238',
                  fontSize: 11,
                  fontFamily: 'Inconsolata, monospace',
                  color: '#fff',
                }}
                labelStyle={{ color: '#8b9199' }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="focus" fill={PHASE.focus.hex} name="FOCUS" />
              <Bar dataKey="breaks" fill="#00879b" name="BREAK" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── filters ────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex border border-line w-fit">
          {(['all', 'today', 'week'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-[10px] font-bold tracking-hud border-r border-line last:border-r-0 transition-colors ${
                filter === f ? 'bg-panel2 text-txt' : 'text-faint hover:text-dim'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-faint tracking-wide2">
          {String(filtered.length).padStart(3, '0')} RECORDS
        </span>
      </div>

      {/* ── log rows ───────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-line2 py-12 text-center">
          <div className="text-[11px] tracking-hud text-faint">[ NO RECORDS ]</div>
          <div className="text-[10px] tracking-wide2 text-faint mt-2 opacity-60">
            run a cycle to populate the log
          </div>
        </div>
      ) : (
        <div className="border border-line">
          <div className="flex items-center gap-3 px-3 py-1.5 border-b border-line bg-panel2 text-[9px] tracking-hud text-faint">
            <span className="w-[86px]">STAMP</span>
            <span className="flex-1">PHASE</span>
            <span className="w-[70px] text-right">PLANNED</span>
            <span className="w-[70px] text-right">ACTUAL</span>
            <span className="w-[52px] text-right">STATE</span>
          </div>
          {filtered.map((s) => {
            const phase = PHASE[s.mode]
            const st = STATUS_STYLE[s.status]
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 px-3 py-2 border-b border-line last:border-b-0 text-[11px] hover:bg-panel2 transition-colors"
              >
                <span className="w-[86px] text-faint tabular-nums">{logStamp(s.startedAt)}</span>
                <span className="flex-1 flex items-center gap-2">
                  <span style={{ color: phase.hex }}>{phase.glyph}</span>
                  <span className="text-dim tracking-wide2">{phase.label}</span>
                </span>
                <span className="w-[70px] text-right text-faint tabular-nums">{fmtHuman(s.plannedSec)}</span>
                <span className="w-[70px] text-right text-txt tabular-nums">{fmtHuman(s.actualSec)}</span>
                <span className={`w-[52px] text-right font-bold tracking-wide2 ${st.className}`} style={st.style}>
                  {st.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="border border-line bg-panel p-3.5 brk" style={{ ['--accent' as string]: accent } as CSSProperties}>
      <div className="text-[9px] tracking-hud text-faint">{label}</div>
      <div className="text-[28px] font-bold leading-none mt-2 tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-[10px] text-dim tracking-wide2 mt-1.5">{sub}</div>
    </div>
  )
}
