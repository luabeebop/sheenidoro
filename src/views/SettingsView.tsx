import type { ReactNode } from 'react'
import { AppSettings, PomodoroMode } from '../lib/types'
import { PHASE } from '../lib/theme'

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-line bg-panel">
      <div className="px-3 py-2 border-b border-line bg-panel2 text-[10px] font-bold tracking-hud">
        <span className="text-faint">//</span> {title}
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  )
}

function Stepper({
  value,
  onChange,
  unit,
  min,
  max,
}: {
  value: number
  onChange: (v: number) => void
  unit: string
  min: number
  max: number
}) {
  const step = (d: number) => onChange(Math.max(min, Math.min(max, value + d)))
  return (
    <div className="flex items-center">
      <button
        onClick={() => step(-1)}
        className="w-7 h-7 border border-line2 text-dim hover:text-txt hover:border-dim transition-colors text-[13px] leading-none"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)))
        }}
        className="w-[54px] h-7 text-center bg-void border-y border-line2 text-txt text-[13px] font-bold tabular-nums focus:outline-none focus:border-dim"
      />
      <button
        onClick={() => step(1)}
        className="w-7 h-7 border border-line2 text-dim hover:text-txt hover:border-dim transition-colors text-[13px] leading-none"
      >
        +
      </button>
      <span className="ml-2.5 text-[9px] tracking-hud text-faint w-[36px]">{unit}</span>
    </div>
  )
}

function Row({
  glyph,
  color,
  label,
  desc,
  children,
}: {
  glyph?: string
  color?: string
  label: string
  desc: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {glyph && (
          <span className="text-[12px] w-3 shrink-0" style={{ color }}>
            {glyph}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-[12px] font-bold tracking-wide2 text-txt">{label}</div>
          <div className="text-[10px] text-faint tracking-wide2 truncate">{desc}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="flex items-center border border-line2 h-7 hover:border-dim transition-colors shrink-0"
    >
      <span
        className={`px-2.5 h-full flex items-center text-[10px] font-bold tracking-hud ${
          checked ? 'text-void' : 'text-faint'
        }`}
        style={checked ? { background: 'var(--accent)' } : undefined}
      >
        ON
      </span>
      <span
        className={`px-2.5 h-full flex items-center text-[10px] font-bold tracking-hud border-l border-line2 ${
          checked ? 'text-faint' : 'bg-line2 text-txt'
        }`}
      >
        OFF
      </span>
    </button>
  )
}

const PRESETS: { label: string; tag: string; v: Partial<AppSettings> }[] = [
  { label: '15/03/10', tag: 'SPRINT', v: { focusMin: 15, shortBreakMin: 3, longBreakMin: 10 } },
  { label: '25/05/15', tag: 'CLASSIC', v: { focusMin: 25, shortBreakMin: 5, longBreakMin: 15 } },
  { label: '50/10/20', tag: 'DEEP', v: { focusMin: 50, shortBreakMin: 10, longBreakMin: 20 } },
]

const DURATIONS: { mode: PomodoroMode; key: 'focusMin' | 'shortBreakMin' | 'longBreakMin'; desc: string }[] = [
  { mode: 'focus', key: 'focusMin', desc: 'deep work block' },
  { mode: 'shortBreak', key: 'shortBreakMin', desc: 'quick reset' },
  { mode: 'longBreak', key: 'longBreakMin', desc: 'extended recovery' },
]

function playTestChime() {
  const audio = document.getElementById('sheenidoro-chime') as HTMLAudioElement | null
  if (audio) {
    audio.volume = 1.0
    audio.currentTime = 0
    audio.play().catch(() => {})
  }
  const api = (window as unknown as { sheenidoro?: { playChime: () => void } }).sheenidoro
  api?.playChime()
}

export function SettingsView({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (p: Partial<AppSettings>) => void
}) {
  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="max-w-[620px] space-y-5">
        <div className="border-b border-line pb-3">
          <h2 className="text-[14px] font-bold tracking-hud">
            <span className="text-faint">//</span> CONFIG
          </h2>
          <p className="text-[10px] text-faint tracking-wide2 mt-1">
            RUNTIME PARAMETERS · APPLIED ON NEXT CYCLE
          </p>
        </div>

        <Panel title="DURATIONS">
          {DURATIONS.map(({ mode, key, desc }) => (
            <Row
              key={key}
              glyph={PHASE[mode].glyph}
              color={PHASE[mode].hex}
              label={PHASE[mode].label}
              desc={`${desc} · range 01–90`}
            >
              <Stepper
                value={settings[key]}
                onChange={(v) => onChange({ [key]: v } as Partial<AppSettings>)}
                unit="MIN"
                min={1}
                max={90}
              />
            </Row>
          ))}

          <div className="border-t border-line pt-4">
            <Row label="LONG BREAK INTERVAL" desc="focus blocks before an extended break · range 02–10">
              <Stepper
                value={settings.longBreakEvery}
                onChange={(v) => onChange({ longBreakEvery: v })}
                unit="BLKS"
                min={2}
                max={10}
              />
            </Row>
          </div>

          <div className="border-t border-line pt-4">
            <div className="text-[9px] tracking-hud text-faint mb-2.5">PRESETS</div>
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.tag}
                  onClick={() => onChange(p.v)}
                  className="flex-1 py-2 border border-line2 text-dim hover:text-txt hover:border-dim transition-colors"
                >
                  <div className="text-[12px] font-bold tabular-nums">{p.label}</div>
                  <div className="text-[9px] tracking-hud text-faint mt-0.5">{p.tag}</div>
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="ALERTS">
          <Row label="NOTIFICATIONS" desc="critical mako popup on phase end">
            <Switch checked={settings.notifyEnabled} onChange={(v) => onChange({ notifyEnabled: v })} />
          </Row>
          <Row label="CHIME" desc="double bell on transition · no ticking">
            <Switch checked={settings.soundEnabled} onChange={(v) => onChange({ soundEnabled: v })} />
          </Row>

          <div className="border-t border-line pt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                const api = (window as unknown as { sheenidoro?: { testNotify: () => void } }).sheenidoro
                api?.testNotify()
                playTestChime()
              }}
              className="px-4 py-2 text-[10px] font-bold tracking-hud border border-line2 text-dim hover:text-txt hover:border-dim transition-colors"
            >
              ▶ TEST ALERT + CHIME
            </button>
            <button
              onClick={playTestChime}
              className="px-4 py-2 text-[10px] font-bold tracking-hud border border-line2 text-dim hover:text-txt hover:border-dim transition-colors"
            >
              ▶ TEST CHIME
            </button>
          </div>
          <p className="text-[10px] text-faint tracking-wide2 leading-relaxed">
            NO AUDIO? verify <code className="text-dim">pavucontrol</code> levels and that{' '}
            <code className="text-dim">paplay</code> resolves.
          </p>
        </Panel>

        <Panel title="SYSTEM">
          <dl className="text-[10px] tracking-wide2 space-y-2">
            {[
              ['STORE', '~/.config/sheenidoro/config.json'],
              ['WAYBAR STATE', '~/.local/state/sheenidoro/waybar.json'],
              ['WAYBAR SETUP', 'bash scripts/setup-waybar.sh'],
              ['CLI', 'sheenidoro --toggle | --show | --waybar'],
              ['HYPRLAND', 'windowrule = float, class:Sheenidoro'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-[104px] shrink-0 text-faint">{k}</dt>
                <dd className="text-dim break-all">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[10px] text-faint tracking-wide2 leading-relaxed border-t border-line pt-3">
            Terminal pomodoro for Omarchy. Native Hyprland window, tray-resident on close,
            waybar mini-timer driven by the main process. All data stays local.
          </p>
        </Panel>
      </div>
    </div>
  )
}
