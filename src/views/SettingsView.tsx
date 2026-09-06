import { AppSettings } from '../lib/types'

export function SettingsView({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (p: Partial<AppSettings>) => void
}) {
  return (
    <div className="flex-1 overflow-auto p-6 space-y-6 max-w-[640px]">
      <div>
        <h2 className="text-xl font-bold text-sakuraText">Settings</h2>
        <p className="text-sm text-sakuraMuted">Edit durations anytime — applies next cycle</p>
      </div>

      <div className="bg-white rounded-2xl border border-sakuraBorder p-5 shadow-sm space-y-5">
        <h3 className="font-bold text-sakuraText">Durations</h3>

        <DurationRow
          label="Focus"
          desc="Deep work"
          value={settings.focusMin}
          onChange={(v) => onChange({ focusMin: v })}
          icon="🍅"
        />
        <DurationRow
          label="Short Break"
          desc="Quick rest"
          value={settings.shortBreakMin}
          onChange={(v) => onChange({ shortBreakMin: v })}
          icon="☕"
        />
        <DurationRow
          label="Long Break"
          desc="After N focuses"
          value={settings.longBreakMin}
          onChange={(v) => onChange({ longBreakMin: v })}
          icon="🌸"
        />

        <div className="flex items-center justify-between py-2 border-t border-sakuraBg2 pt-4">
          <div>
            <div className="font-semibold text-sakuraText text-sm">Long break every</div>
            <div className="text-xs text-sakuraMuted">{settings.longBreakEvery} focus sessions</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange({ longBreakEvery: settings.longBreakEvery - 1 })}
              className="w-8 h-8 rounded-full border border-sakuraBorder bg-white hover:bg-sakuraBg2 font-bold text-sakuraText"
            >
              −
            </button>
            <span className="w-10 text-center font-mono font-bold text-sakuraText">{settings.longBreakEvery}</span>
            <button
              onClick={() => onChange({ longBreakEvery: settings.longBreakEvery + 1 })}
              className="w-8 h-8 rounded-full border border-sakuraBorder bg-white hover:bg-sakuraBg2 font-bold text-sakuraText"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-sakuraMuted tracking-widest mb-2">QUICK PRESETS</div>
          <div className="flex gap-2">
            {[
              { l: 'Pop 15/3/10', v: { focusMin: 15, shortBreakMin: 3, longBreakMin: 10 } },
              { l: 'Classic 25/5/15', v: { focusMin: 25, shortBreakMin: 5, longBreakMin: 15 } },
              { l: 'Deep 50/10/20', v: { focusMin: 50, shortBreakMin: 10, longBreakMin: 20 } },
            ].map((p) => (
              <button
                key={p.l}
                onClick={() => onChange(p.v)}
                className="flex-1 py-2 rounded-full bg-sakuraBg2 border border-sakuraBorder text-xs font-bold text-sakuraText hover:bg-sakuraAccent transition"
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-sakuraBorder p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sakuraText">Notifications & Sound</h3>
        <Toggle
          label="Notifications"
          desc="Critical mako popup on phase end"
          checked={settings.notifyEnabled}
          onChange={(v) => onChange({ notifyEnabled: v })}
        />
        <Toggle
          label="Chime"
          desc="Soft bell (no ticking)"
          checked={settings.soundEnabled}
          onChange={(v) => onChange({ soundEnabled: v })}
        />
        <div className="pt-2 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const api = (window as unknown as { sheenidoro?: { testNotify: () => void; playChime: () => void } }).sheenidoro
              api?.testNotify()
              api?.playChime()
              const audio = document.getElementById('sheenidoro-chime') as HTMLAudioElement | null
              if (audio) {
                audio.volume = 1.0
                audio.currentTime = 0
                audio.play().catch(() => {})
              } else {
                // fallback create audio
                const a = new Audio('./sounds/chime.wav')
                a.volume = 1.0
                a.play().catch(() => {})
              }
            }}
            className="px-4 py-2 rounded-full bg-sakuraBg2 border border-sakuraBorder text-sm font-semibold text-sakuraText hover:bg-sakuraAccent"
          >
            Test notification + chime 🔔
          </button>
          <button
            onClick={() => {
              const audio = document.getElementById('sheenidoro-chime') as HTMLAudioElement | null
              if (audio) {
                audio.volume = 1.0
                audio.currentTime = 0
                audio.play().catch(() => {})
              }
              const api = (window as unknown as { sheenidoro?: { playChime: () => void } }).sheenidoro
              api?.playChime()
            }}
            className="px-4 py-2 rounded-full bg-white border border-sakuraBorder text-sm font-semibold text-sakuraMuted hover:text-sakuraText"
          >
            Test chime only 🎵
          </button>
        </div>
        <p className="text-[11px] text-sakuraMuted">If you hear no sound, check `pavucontrol` volume and that `paplay` works.</p>
      </div>

      <div className="bg-white rounded-2xl border border-sakuraBorder p-5 shadow-sm">
        <h3 className="font-bold text-sakuraText text-sm">About Sheenidoro</h3>
        <p className="text-xs text-sakuraMuted mt-2 leading-relaxed">
          Pastel sakura pomodoro for Omarchy. Native Hyprland window, tray hide-on-close, waybar integration. All data stays local in{' '}
          <code className="bg-sakuraBg px-1 py-0.5 rounded">~/.config/sheenidoro/</code>.
        </p>
        <ul className="text-xs text-sakuraMuted list-disc list-inside mt-3 space-y-1">
          <li>Waybar file: <code>~/.local/state/sheenidoro/waybar.json</code></li>
          <li>Hyprland: add <code>windowrule = float, match:class Sheenidoro</code> to float</li>
          <li>CLI: <code>sheenidoro --toggle</code> / <code>--show</code></li>
        </ul>
      </div>
    </div>
  )
}

function DurationRow({
  label,
  desc,
  value,
  onChange,
  icon,
}: {
  label: string
  desc: string
  value: number
  onChange: (v: number) => void
  icon: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-sakuraBg2 border border-sakuraBorder flex items-center justify-center">{icon}</span>
        <div>
          <div className="font-semibold text-sakuraText text-sm">{label}</div>
          <div className="text-xs text-sakuraMuted">{desc} • 1–90 min</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(value - 1)}
          className="w-8 h-8 rounded-full border border-sakuraBorder bg-white hover:bg-sakuraBg2 font-bold text-sakuraText"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={90}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value || '1', 10))}
          className="w-14 text-center font-mono font-bold text-sakuraText border border-sakuraBorder rounded-full py-1 bg-white focus:outline-none focus:ring-2 focus:ring-sakuraAccent"
        />
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full border border-sakuraBorder bg-white hover:bg-sakuraBg2 font-bold text-sakuraText"
        >
          +
        </button>
      </div>
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <div className="font-semibold text-sakuraText text-sm">{label}</div>
        <div className="text-xs text-sakuraMuted">{desc}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <div className={`w-11 h-6 rounded-full p-1 transition flex items-center ${checked ? 'bg-sakuraPrimary justify-end' : 'bg-sakuraBg2 border border-sakuraBorder justify-start'}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow ${checked ? '' : 'border border-sakuraBorder'}`} />
      </div>
    </label>
  )
}
