import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, Session } from '../src/lib/types'

contextBridge.exposeInMainWorld('sheenidoro', {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('sheenidoro:settings:get'),
  setSettings: (s: AppSettings) => ipcRenderer.send('sheenidoro:settings:set', s),

  getSessions: (): Promise<Session[]> => ipcRenderer.invoke('sheenidoro:sessions:list'),
  addSession: (s: Session) => ipcRenderer.send('sheenidoro:sessions:add', s),
  clearSessions: () => ipcRenderer.send('sheenidoro:sessions:clear'),
  exportSessions: (): Promise<string> => ipcRenderer.invoke('sheenidoro:sessions:export'),

  notifyPhase: (completed: string, next: string) => ipcRenderer.send('sheenidoro:notify:phase', completed, next),
  playChime: () => ipcRenderer.send('sheenidoro:sound:chime'),
  testNotify: () => ipcRenderer.send('sheenidoro:notify:test'),

  updateWaybar: (payload: Record<string, unknown>) => ipcRenderer.send('sheenidoro:waybar:update', payload),

  // window controls for future if needed
  minimize: () => ipcRenderer.send('sheenidoro:window:minimize'),
  close: () => ipcRenderer.send('sheenidoro:window:close'),

  onToggle: (cb: () => void) => ipcRenderer.on('sheenidoro:toggle', cb),
  onSkip: (cb: () => void) => ipcRenderer.on('sheenidoro:skip', cb),
})

declare global {
  interface Window {
    sheenidoro: {
      getSettings: () => Promise<AppSettings>
      setSettings: (s: AppSettings) => void
      getSessions: () => Promise<Session[]>
      addSession: (s: Session) => void
      clearSessions: () => void
      exportSessions: () => Promise<string>
      notifyPhase: (c: string, n: string) => void
      playChime: () => void
      testNotify: () => void
      updateWaybar: (p: Record<string, unknown>) => void
      minimize: () => void
      close: () => void
      onToggle: (cb: () => void) => void
      onSkip: (cb: () => void) => void
    }
  }
}
