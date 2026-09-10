import { useCallback, useEffect, useRef, useState } from 'react'
import { AppSettings, DEFAULT_SETTINGS, PomodoroMode, Session, WaybarSnapshot, secsFor, nextMode } from './types'

type Status = 'idle' | 'running' | 'paused'

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

export function usePomodoro(initialSettings: AppSettings = DEFAULT_SETTINGS) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [mode, setMode] = useState<PomodoroMode>('focus')
  const [status, setStatus] = useState<Status>('idle')
  const [focusCount, setFocusCount] = useState(0) // completed focuses in current cycle
  const [sessions, setSessions] = useState<Session[]>([])
  const [remainingSec, setRemainingSec] = useState(secsFor('focus', initialSettings))

  const intervalRef = useRef<number | null>(null)
  const startedAtRef = useRef<string | null>(null)
  const plannedSecRef = useRef<number>(remainingSec)
  const endAtRef = useRef<number>(0) // timestamp ms
  const pausedRemainingRef = useRef<number>(remainingSec)

  // load from electron store on mount
  useEffect(() => {
    const api = (window as unknown as { sheenidoro?: { getSettings: () => Promise<AppSettings>; getSessions: () => Promise<Session[]> } }).sheenidoro
    if (!api) return
    api.getSettings().then((s) => {
      setSettings(s)
      setRemainingSec(secsFor('focus', s))
      plannedSecRef.current = secsFor('focus', s)
    })
    api.getSessions().then(setSessions)
  }, [])

  // persist settings
  const updateSettings = useCallback((next: Partial<AppSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next }
      // clamp 1..90 for mins, 2..10 for longBreakEvery
      merged.focusMin = Math.max(1, Math.min(90, Math.round(merged.focusMin)))
      merged.shortBreakMin = Math.max(1, Math.min(90, Math.round(merged.shortBreakMin)))
      merged.longBreakMin = Math.max(1, Math.min(90, Math.round(merged.longBreakMin)))
      merged.longBreakEvery = Math.max(2, Math.min(10, Math.round(merged.longBreakEvery)))
      const api = (window as unknown as { sheenidoro?: { setSettings: (s: AppSettings) => void } }).sheenidoro
      api?.setSettings(merged)
      // if idle, update remaining to reflect new mode duration
      return merged
    })
  }, [])

  // when settings change while idle, sync remaining
  useEffect(() => {
    if (status === 'idle') {
      const secs = secsFor(mode, settings)
      setRemainingSec(secs)
      plannedSecRef.current = secs
      pausedRemainingRef.current = secs
    }
  }, [settings, mode, status])

  const clearIntervalIf = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const notifyPhase = useCallback(
    (completedMode: PomodoroMode, next: PomodoroMode) => {
      const api = (window as unknown as { sheenidoro?: { notifyPhase: (c: PomodoroMode, n: PomodoroMode) => void; playChime: () => void } }).sheenidoro
      if (settings.notifyEnabled) api?.notifyPhase(completedMode, next)
      if (settings.soundEnabled) api?.playChime()
      // also try renderer audio fallback
      if (settings.soundEnabled) {
        const audio = document.getElementById('sheenidoro-chime') as HTMLAudioElement | null
        if (audio) {
          audio.currentTime = 0
          audio.play().catch(() => {})
        }
      }
    },
    [settings.notifyEnabled, settings.soundEnabled]
  )

  const completePhase = useCallback(
    (skipped = false, interrupted = false) => {
      clearIntervalIf()
      const nowIso = new Date().toISOString()
      const planned = plannedSecRef.current
      const actual = skipped || interrupted ? planned - remainingSec : planned
      // remainingSec is stale inside callback if we don't capture; use pausedRemainingRef or computed
      // For accurate actual when completed naturally, actual=planned
      const finalActual = skipped || interrupted ? Math.max(0, planned - pausedRemainingRef.current) : planned
      if (startedAtRef.current) {
        const sess: Session = {
          id: uid(),
          mode,
          plannedSec: planned,
          actualSec: finalActual,
          startedAt: startedAtRef.current,
          endedAt: nowIso,
          status: skipped ? 'skipped' : interrupted ? 'interrupted' : 'completed',
        }
        setSessions((prev) => {
          const next = [sess, ...prev].slice(0, 10000)
          const api = (window as unknown as { sheenidoro?: { addSession: (s: Session) => void } }).sheenidoro
          api?.addSession(sess)
          return next
        })
      }
      // advance counters
      let nextFocusCount = focusCount
      if (mode === 'focus' && !skipped && !interrupted) {
        nextFocusCount = focusCount + 1
        setFocusCount(nextFocusCount)
      }
      const next = nextMode(mode, nextFocusCount, settings)
      notifyPhase(mode, next)
      setMode(next)
      const nextSecs = secsFor(next, settings)
      setRemainingSec(nextSecs)
      plannedSecRef.current = nextSecs
      pausedRemainingRef.current = nextSecs
      setStatus('idle')
      startedAtRef.current = null
    },
    [mode, focusCount, settings, remainingSec, notifyPhase]
  )

  const tick = useCallback(() => {
    const now = Date.now()
    const diff = Math.max(0, Math.round((endAtRef.current - now) / 1000))
    pausedRemainingRef.current = diff
    setRemainingSec(diff)
    if (diff <= 0) {
      completePhase(false, false)
    }
  }, [completePhase])

  const start = useCallback(() => {
    if (status === 'running') return
    const secs = status === 'paused' ? pausedRemainingRef.current : secsFor(mode, settings)
    if (status === 'idle') {
      startedAtRef.current = new Date().toISOString()
      plannedSecRef.current = secs
    }
    pausedRemainingRef.current = secs
    setRemainingSec(secs)
    endAtRef.current = Date.now() + secs * 1000
    setStatus('running')
    clearIntervalIf()
    intervalRef.current = window.setInterval(tick, 250) // 250ms for smooth
  }, [status, mode, settings, tick])

  const pause = useCallback(() => {
    if (status !== 'running') return
    clearIntervalIf()
    setStatus('paused')
  }, [status])

  const resume = useCallback(() => {
    if (status !== 'paused') return
    endAtRef.current = Date.now() + pausedRemainingRef.current * 1000
    setStatus('running')
    intervalRef.current = window.setInterval(tick, 250)
  }, [status, tick])

  const reset = useCallback(() => {
    clearIntervalIf()
    const secs = secsFor(mode, settings)
    setRemainingSec(secs)
    pausedRemainingRef.current = secs
    plannedSecRef.current = secs
    setStatus('idle')
    startedAtRef.current = null
  }, [mode, settings])

  const skip = useCallback(() => {
    completePhase(true, false)
  }, [completePhase])

  const switchMode = useCallback(
    (m: PomodoroMode) => {
      clearIntervalIf()
      // if running, mark interrupted
      if (status === 'running' && startedAtRef.current) {
        const nowIso = new Date().toISOString()
        const planned = plannedSecRef.current
        const actual = Math.max(0, planned - pausedRemainingRef.current)
        const sess: Session = {
          id: uid(),
          mode,
          plannedSec: planned,
          actualSec: actual,
          startedAt: startedAtRef.current,
          endedAt: nowIso,
          status: 'interrupted',
        }
        setSessions((prev) => {
          const nxt = [sess, ...prev].slice(0, 10000)
          const api = (window as unknown as { sheenidoro?: { addSession: (s: Session) => void } }).sheenidoro
          api?.addSession(sess)
          return nxt
        })
      }
      setMode(m)
      const secs = secsFor(m, settings)
      setRemainingSec(secs)
      pausedRemainingRef.current = secs
      plannedSecRef.current = secs
      setStatus('idle')
      startedAtRef.current = null
    },
    [mode, status, settings]
  )

  // Waybar: publish a snapshot on each transition only. The main process
  // re-derives the countdown from `endsAt` and writes the file once a
  // second, so the bar stays live even when this window is hidden and
  // Chromium throttles our timers.
  useEffect(() => {
    const api = (window as unknown as {
      sheenidoro?: { setWaybarState: (s: WaybarSnapshot) => void }
    }).sheenidoro
    if (!api) return
    const running = status === 'running'
    api.setWaybarState({
      mode,
      status,
      remainingSec: running
        ? Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
        : pausedRemainingRef.current,
      totalSec: secsFor(mode, settings),
      endsAt: running ? endAtRef.current : null,
      focusCount,
    })
  }, [mode, status, focusCount, settings])

  // cleanup
  useEffect(() => () => clearIntervalIf(), [])

  const totalSec = secsFor(mode, settings)
  const progress = totalSec ? (totalSec - remainingSec) / totalSec : 0

  return {
    settings,
    updateSettings,
    mode,
    status,
    remainingSec,
    totalSec,
    progress,
    focusCount,
    sessions,
    setSessions, // for clear
    start,
    pause,
    resume,
    reset,
    skip,
    switchMode,
  }
}
