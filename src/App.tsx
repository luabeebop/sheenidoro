import { useEffect, useRef, useState } from 'react'
import { NavRail } from './components/NavRail'
import { TimerView } from './views/TimerView'
import { HistoryView } from './views/HistoryView'
import { SettingsView } from './views/SettingsView'
import { usePomodoro } from './lib/usePomodoro'
import { accentVars, PHASE, STATUS_LABEL } from './lib/theme'
import { fmtMMSS } from './lib/format'

type View = 'timer' | 'history' | 'settings'

/** Ticking wall clock for the HUD rail. */
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export default function App() {
  const [view, setView] = useState<View>('timer')
  const pomo = usePomodoro()
  const clock = useClock()

  // retrigger the chromatic-split animation whenever the phase flips
  const [glitchKey, setGlitchKey] = useState(0)
  const prevMode = useRef(pomo.mode)
  useEffect(() => {
    if (prevMode.current !== pomo.mode) {
      prevMode.current = pomo.mode
      setGlitchKey((k) => k + 1)
    }
  }, [pomo.mode])

  // keyboard shortcuts — ignored while a field has focus
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (pomo.status === 'running') pomo.pause()
        else if (pomo.status === 'paused') pomo.resume()
        else pomo.start()
      }
      if (e.key.toLowerCase() === 'r') pomo.reset()
      if (e.key.toLowerCase() === 's') pomo.skip()
      // jump straight to a pane — mirrors the [01]/[02]/[03] nav labels
      if (e.key === '1') setView('timer')
      if (e.key === '2') setView('history')
      if (e.key === '3') setView('settings')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [pomo])

  // Tray / waybar commands. Subscribe exactly once and reach the current timer
  // through a ref — re-subscribing per render would leave a listener behind on
  // every tick, so one waybar click would fire hundreds of stale handlers.
  const pomoRef = useRef(pomo)
  pomoRef.current = pomo
  useEffect(() => {
    const api = (window as unknown as {
      sheenidoro?: {
        onToggle: (cb: () => void) => (() => void) | void
        onSkip: (cb: () => void) => (() => void) | void
      }
    }).sheenidoro
    if (!api) return
    const offToggle = api.onToggle(() => {
      const p = pomoRef.current
      if (p.status === 'running') p.pause()
      else if (p.status === 'paused') p.resume()
      else p.start()
    })
    const offSkip = api.onSkip(() => pomoRef.current.skip())
    return () => {
      offToggle?.()
      offSkip?.()
    }
  }, [])

  // document title = timer
  useEffect(() => {
    document.title = `${fmtMMSS(pomo.remainingSec)} ${PHASE[pomo.mode].code} — SHEENIDORO`
  }, [pomo.remainingSec, pomo.mode])

  const handleClear = () => {
    if (!confirm('PURGE ALL SESSION LOGS? This cannot be undone.')) return
    pomo.setSessions([])
    const api = (window as unknown as { sheenidoro?: { clearSessions: () => void } }).sheenidoro
    api?.clearSessions()
  }

  const handleExport = () => {
    const api = (window as unknown as { sheenidoro?: { exportSessions: () => Promise<string> } }).sheenidoro
    if (api) {
      api.exportSessions().then((path) => alert(`EXPORTED → ${path}`))
      return
    }
    const header = 'id,mode,plannedSec,actualSec,startedAt,endedAt,status\n'
    const rows = pomo.sessions
      .map((s) => `${s.id},${s.mode},${s.plannedSec},${s.actualSec},${s.startedAt},${s.endedAt},${s.status}`)
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sheenidoro-history.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const phase = PHASE[pomo.mode]

  return (
    <div
      className="h-screen w-screen flex flex-col bg-void text-txt overflow-hidden select-none"
      style={accentVars(pomo.mode)}
    >
      {/* ── HUD rail ───────────────────────────────────────────── */}
      <header className="h-9 shrink-0 border-b border-line flex items-center px-3 gap-3 bg-panel">
        <div className="flex items-center gap-2">
          <span className="text-[--accent] text-[13px] leading-none" style={{ color: 'var(--accent)' }}>
            ▮
          </span>
          <span className="text-[12px] font-bold tracking-hud">SHEENIDORO</span>
          <span className="text-[10px] text-faint tracking-wide2">v{__APP_VERSION__}</span>
        </div>

        <div className="flex-1 flex items-center justify-center gap-2 text-[11px] tracking-wide2">
          <span
            key={glitchKey}
            className={`${glitchKey ? 'glitch' : ''} font-bold`}
            style={{ color: 'var(--accent)' }}
          >
            {phase.glyph} {phase.label}
          </span>
          <span className="text-faint">//</span>
          <span className={pomo.status === 'running' ? 'text-txt' : 'text-dim'}>
            {STATUS_LABEL[pomo.status]}
          </span>
          {pomo.status === 'running' && (
            <span className="w-1.5 h-1.5 animate-blink" style={{ background: 'var(--accent)' }} />
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-dim tracking-wide2">
          <span>
            SES <span className="text-txt font-bold">{String(pomo.focusCount).padStart(2, '0')}</span>
          </span>
          <span className="text-faint">│</span>
          <span className="tabular-nums">{clock.toLocaleTimeString('en-GB')}</span>
        </div>
      </header>

      {/* ── body ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <NavRail
          view={view}
          onChange={setView}
          focusCount={pomo.focusCount}
          longBreakEvery={pomo.settings.longBreakEvery}
        />
        <main className="flex-1 flex overflow-hidden bg-void">
          {view === 'timer' && (
            <TimerView
              mode={pomo.mode}
              status={pomo.status}
              remainingSec={pomo.remainingSec}
              totalSec={pomo.totalSec}
              progress={pomo.progress}
              onStart={pomo.start}
              onPause={pomo.pause}
              onResume={pomo.resume}
              onReset={pomo.reset}
              onSkip={pomo.skip}
              onSwitch={pomo.switchMode}
              focusCount={pomo.focusCount}
              settings={pomo.settings}
            />
          )}
          {view === 'history' && (
            <HistoryView sessions={pomo.sessions} onClear={handleClear} onExport={handleExport} />
          )}
          {view === 'settings' && <SettingsView settings={pomo.settings} onChange={pomo.updateSettings} />}
        </main>
      </div>

      {/* chime fallback for the browser/dev path */}
      <audio id="sheenidoro-chime" src="./sounds/chime.wav" preload="auto" />

      {/* ── CRT atmosphere (non-interactive overlays) ──────────── */}
      <div className="crt-sweep" />
      <div className="crt-noise" />
      <div className="crt-vignette" />
      <div className="crt-scanlines" />
    </div>
  )
}
