import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TimerView } from './views/TimerView'
import { HistoryView } from './views/HistoryView'
import { SettingsView } from './views/SettingsView'
import { usePomodoro } from './lib/usePomodoro'

type View = 'timer' | 'history' | 'settings'

export default function App() {
  const [view, setView] = useState<View>('timer')
  const pomo = usePomodoro()

  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (pomo.status === 'running') pomo.pause()
        else if (pomo.status === 'paused') pomo.resume()
        else pomo.start()
      }
      if (e.key.toLowerCase() === 'r') pomo.reset()
      if (e.key.toLowerCase() === 's') pomo.skip()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [pomo])

  // tray / waybar toggle via IPC
  useEffect(() => {
    const api = (window as unknown as { sheenidoro?: { onToggle: (cb: () => void) => void; onSkip: (cb: () => void) => void } }).sheenidoro
    if (!api) return
    const onToggle = () => {
      if (pomo.status === 'running') pomo.pause()
      else if (pomo.status === 'paused') pomo.resume()
      else pomo.start()
    }
    const onSkip = () => pomo.skip()
    api.onToggle(onToggle)
    api.onSkip(onSkip)
    // no cleanup for ipcRenderer.on in this simple case
  }, [pomo])

  // document title = timer
  useEffect(() => {
    const mm = String(Math.floor(pomo.remainingSec / 60)).padStart(2, '0')
    const ss = String(pomo.remainingSec % 60).padStart(2, '0')
    const emoji = pomo.mode === 'focus' ? '🍅' : pomo.mode === 'shortBreak' ? '☕' : '🌸'
    document.title = `${mm}:${ss} ${emoji} — Sheenidoro`
  }, [pomo.remainingSec, pomo.mode])

  const handleClear = () => {
    if (!confirm('Clear all history?')) return
    pomo.setSessions([])
    const api = (window as unknown as { sheenidoro?: { clearSessions: () => void } }).sheenidoro
    api?.clearSessions()
  }

  const handleExport = () => {
    const api = (window as unknown as { sheenidoro?: { exportSessions: () => Promise<string> } }).sheenidoro
    if (api) {
      api.exportSessions().then((path) => alert(`Exported to ${path}`))
    } else {
      // fallback CSV download in browser
      const header = 'id,mode,plannedSec,actualSec,startedAt,endedAt,status\n'
      const rows = pomo.sessions.map((s) => `${s.id},${s.mode},${s.plannedSec},${s.actualSec},${s.startedAt},${s.endedAt},${s.status}`).join('\n')
      const blob = new Blob([header + rows], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sheenidoro-history.csv'
      a.click()
    }
  }

  return (
    <div className="h-screen w-screen flex bg-sakuraBg overflow-hidden select-none">
      <Sidebar view={view} onChange={setView} focusCount={pomo.focusCount} />
      <main className="flex-1 flex bg-sakuraBg overflow-hidden">
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
        {view === 'history' && <HistoryView sessions={pomo.sessions} onClear={handleClear} onExport={handleExport} />}
        {view === 'settings' && <SettingsView settings={pomo.settings} onChange={pomo.updateSettings} />}
      </main>

      {/* hidden audio for chime fallback */}
      <audio id="sheenidoro-chime" src="./sounds/chime.wav" preload="auto" />

      {/* subtle footer */}
      <div className="hidden" />
    </div>
  )
}
