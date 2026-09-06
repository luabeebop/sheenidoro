import { useMemo, useState } from 'react'
import { Session } from '../lib/types'
import { fmtDate, fmtHuman, startOfWeek } from '../lib/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { IllustEmpty } from '../assets/illustrations/IllustFocus'

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
    if (filter === 'today') return sessions.filter((s) => new Date(s.startedAt).toDateString() === new Date().toDateString())
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
    const completion = sessions.length ? Math.round((sessions.filter((s) => s.status === 'completed').length / sessions.length) * 100) : 0
    return { focusToday: focusToday.length, breakToday: breakToday.length, focusMinToday, breakMinToday, totalFocus, totalBreak, completion }
  }, [sessions])

  const weeklyData = useMemo(() => {
    const days: { name: string; focus: number; breaks: number }[] = []
    const start = startOfWeek()
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const label = d.toLocaleDateString(undefined, { weekday: 'short' })
      const daySessions = sessions.filter((s) => new Date(s.startedAt).toDateString() === d.toDateString())
      days.push({
        name: label,
        focus: Math.round(daySessions.filter((s) => s.mode === 'focus' && s.status === 'completed').reduce((a, b) => a + b.actualSec, 0) / 60),
        breaks: Math.round(daySessions.filter((s) => s.mode !== 'focus' && s.status === 'completed').reduce((a, b) => a + b.actualSec, 0) / 60),
      })
    }
    return days
  }, [sessions])

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-sakuraText">Break Review</h2>
          <p className="text-sm text-sakuraMuted">Your focus & rest history</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExport} className="px-4 py-2 rounded-full bg-white border border-sakuraBorder text-sm font-semibold text-sakuraText hover:bg-sakuraBg2">
            Export CSV
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2 rounded-full bg-sakuraBg2 border border-sakuraAccent text-sm font-semibold text-sakuraMuted hover:text-sakuraText"
          >
            Clear
          </button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Focus today" value={`${stats.focusToday} ×`} sub={`${stats.focusMinToday}m`} />
        <Stat label="Breaks today" value={`${stats.breakToday} ×`} sub={`${stats.breakMinToday}m`} />
        <Stat label="Total focus" value={`${stats.totalFocus}`} sub={`${stats.totalBreak} breaks`} />
        <Stat label="Completion" value={`${stats.completion}%`} sub={`${sessions.length} sessions`} />
      </div>

      {/* chart */}
      <div className="bg-white rounded-2xl border border-sakuraBorder p-4 shadow-sakura">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sakuraText text-sm">Weekly overview (minutes)</h3>
          <span className="text-[11px] text-sakuraMuted">Mon → Sun</span>
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffe4ec" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9d6b7a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9d6b7a' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: '#f8c8d4', fontSize: 12 }}
                cursor={{ fill: '#fff0f5' }}
              />
              <Bar dataKey="focus" fill="#f472b6" radius={[6, 6, 0, 0]} name="Focus" />
              <Bar dataKey="breaks" fill="#f8c8d4" radius={[6, 6, 0, 0]} name="Break" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* filters */}
      <div className="flex gap-2">
        {(['all', 'today', 'week'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize border ${
              filter === f ? 'bg-sakuraPrimary text-white border-sakuraPrimary' : 'bg-white text-sakuraMuted border-sakuraBorder hover:border-sakuraAccent'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-sakuraMuted self-center">{filtered.length} sessions</span>
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-10 bg-white rounded-2xl border border-sakuraBorder">
          <IllustEmpty />
          <p className="text-sm text-sakuraMuted mt-3">No sessions for this filter yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-sakuraBorder p-3.5 flex items-center gap-3 hover:shadow-sakura transition">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${s.mode === 'focus' ? 'bg-sakuraBg2' : 'bg-sakuraBg'}`}>
                {s.mode === 'focus' ? '🍅' : s.mode === 'shortBreak' ? '☕' : '🌸'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sakuraText text-sm capitalize">{s.mode === 'focus' ? 'Focus' : s.mode === 'shortBreak' ? 'Short Break' : 'Long Break'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' : s.status === 'skipped' ? 'bg-gray-50 text-gray-600 border border-gray-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="text-xs text-sakuraMuted truncate">
                  {fmtDate(s.startedAt)} • {fmtHuman(s.plannedSec)} planned • {fmtHuman(s.actualSec)} actual
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold text-sakuraText">{fmtHuman(s.actualSec)}</div>
                <div className="text-[11px] text-sakuraMuted">{new Date(s.startedAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-sakuraBorder p-4 shadow-sm">
      <div className="text-[11px] tracking-widest font-bold text-sakuraMuted uppercase">{label}</div>
      <div className="text-2xl font-bold text-sakuraText mt-1">{value}</div>
      <div className="text-xs text-sakuraMuted">{sub}</div>
    </div>
  )
}
