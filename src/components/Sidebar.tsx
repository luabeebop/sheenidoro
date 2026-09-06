type View = 'timer' | 'history' | 'settings'

export function Sidebar({ view, onChange, focusCount }: { view: View; onChange: (v: View) => void; focusCount: number }) {
  const items: { id: View; label: string; icon: string; desc: string }[] = [
    { id: 'timer', label: 'Timer', icon: '🍅', desc: 'Pomodoro' },
    { id: 'history', label: 'History', icon: '📊', desc: 'Break review' },
    { id: 'settings', label: 'Settings', icon: '⚙️', desc: 'Durations' },
  ]
  return (
    <nav className="w-[220px] shrink-0 bg-white border-r border-sakuraBorder flex flex-col p-4 gap-3">
      <div className="flex items-center gap-3 px-2 py-3">
        <img src="/icon.svg" alt="Sheenidoro" className="w-9 h-9 rounded-xl shadow-sakura" />
        <div>
          <div className="font-bold text-sakuraText leading-none">Sheenidoro</div>
          <div className="text-[11px] text-sakuraMuted tracking-wide">pastel pomodoro</div>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition text-left ${
              view === it.id
                ? 'bg-sakuraPrimary text-white shadow-sakura'
                : 'text-sakuraText hover:bg-sakuraBg2 border border-transparent hover:border-sakuraBorder'
            }`}
          >
            <span className="text-[18px] w-6 text-center">{it.icon}</span>
            <span className="flex-1">{it.label}</span>
            {view === it.id && <span className="w-2 h-2 rounded-full bg-white/90" />}
          </button>
        ))}
      </div>

      <div className="mt-auto space-y-3">
        <div className="bg-sakuraBg rounded-2xl p-3 border border-sakuraBorder">
          <div className="text-xs font-bold text-sakuraText">Today's cycle</div>
          <div className="flex gap-1.5 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < focusCount % 4 ? 'bg-sakuraPrimary' : 'bg-sakuraAccent'}`} />
            ))}
          </div>
          <div className="text-[11px] text-sakuraMuted mt-1.5">{focusCount} focus completed</div>
        </div>
        <div className="text-[10px] text-sakuraMuted px-2 text-center">
          v1.0.0 • pink for focus 🌸
          <br />
          stay running in tray
        </div>
      </div>
    </nav>
  )
}
