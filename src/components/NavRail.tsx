type View = 'timer' | 'history' | 'settings'

const ITEMS: { id: View; label: string; sub: string }[] = [
  { id: 'timer', label: 'TIMER', sub: 'run cycle' },
  { id: 'history', label: 'LOGS', sub: 'session data' },
  { id: 'settings', label: 'CONF', sub: 'durations' },
]

export function NavRail({
  view,
  onChange,
  focusCount,
  longBreakEvery,
}: {
  view: View
  onChange: (v: View) => void
  focusCount: number
  longBreakEvery: number
}) {
  const inCycle = longBreakEvery > 0 ? focusCount % longBreakEvery : 0

  return (
    <nav className="w-[184px] shrink-0 border-r border-line bg-panel flex flex-col">
      <div className="flex flex-col">
        {ITEMS.map((it, i) => {
          const active = view === it.id
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={`relative text-left px-3 py-2.5 border-b border-line transition-colors group ${
                active ? 'bg-panel2' : 'hover:bg-panel2/60'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--accent)' }} />
              )}
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[10px] tracking-wide2"
                  style={{ color: active ? 'var(--accent)' : undefined }}
                >
                  [{String(i + 1).padStart(2, '0')}]
                </span>
                <span
                  className={`text-[12px] font-bold tracking-wide2 ${
                    active ? 'text-txt' : 'text-dim group-hover:text-txt'
                  }`}
                >
                  {it.label}
                </span>
              </div>
              <div className="text-[10px] text-faint tracking-wide2 mt-0.5 pl-[30px]">{it.sub}</div>
            </button>
          )
        })}
      </div>

      <div className="mt-auto p-3 space-y-3">
        <div className="border border-line bg-panel2 p-2.5 brk">
          <div className="text-[9px] text-faint tracking-hud">CYCLE</div>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: Math.max(1, longBreakEvery) }).map((_, i) => (
              <div
                key={i}
                className="h-[6px] flex-1 border"
                style={{
                  background: i < inCycle ? 'var(--accent)' : 'transparent',
                  borderColor: i < inCycle ? 'var(--accent)' : '#2c3238',
                }}
              />
            ))}
          </div>
          <div className="text-[10px] text-dim tracking-wide2 mt-2">
            {String(inCycle).padStart(2, '0')} / {String(longBreakEvery).padStart(2, '0')} → LONG
          </div>
        </div>

        <div className="text-[9px] text-faint tracking-wide2 leading-relaxed">
          <div>▮ LOCAL STORE ONLY</div>
          <div>▮ TRAY RESIDENT</div>
        </div>
      </div>
    </nav>
  )
}
