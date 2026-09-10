import { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, dialog } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// dynamic import electron-store (ESM)
let Store: any
let store: any

type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'
type TimerStatus = 'idle' | 'running' | 'paused'

type AppSettings = {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longBreakEvery: number
  soundEnabled: boolean
  notifyEnabled: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  soundEnabled: true,
  notifyEnabled: true,
}

const STATE_HOME =
  process.env.XDG_STATE_HOME || path.join(process.env.HOME || os.homedir(), '.local/state')
const WAYBAR_DIR = path.join(STATE_HOME, 'sheenidoro')
const WAYBAR_FILE = path.join(WAYBAR_DIR, 'waybar.json')

// Keeps the tray tooltip and notification identity consistent. Note the
// Wayland app_id is NOT set from here: Electron reads it from package.json
// during Ozone init, before this file runs, which is why the launchers point
// at the app directory rather than straight at main.js — otherwise it falls
// back to "Electron" and `class:Sheenidoro` window rules never match.
app.setName('Sheenidoro')

// setName also moves userData (~/.config/Sheenidoro), which would orphan the
// settings and session history of anyone upgrading. Pin it back to the
// lowercase path the app has always used and that the docs point at.
app.setPath('userData', path.join(app.getPath('appData'), 'sheenidoro'))

let win: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

/* ------------------------------------------------------------------ *
 * --waybar: print current state and leave. Handled before anything
 * else so it never spins up a window or contends for the app lock.
 * ------------------------------------------------------------------ */
if (process.argv.includes('--waybar')) {
  try {
    process.stdout.write(fs.readFileSync(WAYBAR_FILE, 'utf-8').trim() + '\n')
  } catch {
    process.stdout.write(JSON.stringify({ text: '', tooltip: '', class: 'hidden', percentage: 0 }) + '\n')
  }
  app.exit(0)
}

// single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_ev, argv) => {
    handleArgv(argv)
  })
}

/**
 * CLI verbs. `--toggle` and `--skip` act on the timer *without* pulling the
 * window forward — they are driven from waybar clicks and the tray, where
 * stealing focus would be hostile. Only `--show` raises the window.
 */
function handleArgv(argv: string[]) {
  if (argv.includes('--toggle')) win?.webContents.send('sheenidoro:toggle')
  if (argv.includes('--skip')) win?.webContents.send('sheenidoro:skip')
  if (argv.includes('--show')) showWindow()
}

function showWindow() {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function getIconPath(size?: number) {
  const name = size ? `icon-${size}.png` : 'icon.png'
  const candidates = [
    path.join(process.cwd(), 'resources', name),
    path.join(process.resourcesPath || '', name),
    path.join(__dirname, '../../resources', name),
    path.join(__dirname, '../resources', name),
  ]
  return candidates.find((c) => c && fs.existsSync(c)) || candidates[0]
}

function getTrayIconPath() {
  const candidates = [
    path.join(process.cwd(), 'resources', 'tray.png'),
    path.join(process.resourcesPath || '', 'tray.png'),
    path.join(__dirname, '../../resources/tray.png'),
  ]
  return candidates.find((c) => c && fs.existsSync(c)) || candidates[0]
}

/* ================================================================== *
 * WAYBAR
 *
 * The main process owns the waybar file, not the renderer. A hidden
 * BrowserWindow gets its timers throttled hard by Chromium, which used
 * to stall the file and make the module vanish mid-session. Main-process
 * timers are never throttled, so the countdown here stays truthful even
 * while the window sits in the tray.
 * ================================================================== */

type WaybarSnapshot = {
  mode: PomodoroMode
  status: TimerStatus
  remainingSec: number
  totalSec: number
  endsAt: number | null // epoch ms; set only while running
  focusCount: number
}

const GLYPH: Record<PomodoroMode, string> = { focus: '◆', shortBreak: '▲', longBreak: '■' }
const PHASE_LABEL: Record<PomodoroMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
}
const PHASE_CLASS: Record<PomodoroMode, string> = { focus: 'focus', shortBreak: 'short', longBreak: 'long' }

let snapshot: WaybarSnapshot | null = null
let waybarTimer: NodeJS.Timeout | null = null

function ensureWaybarDir() {
  fs.mkdirSync(WAYBAR_DIR, { recursive: true })
  return WAYBAR_DIR
}

/** Write via temp file + rename so waybar can never read a half-written file. */
function writeWaybarFile(payload: Record<string, unknown>) {
  try {
    ensureWaybarDir()
    const tmp = `${WAYBAR_FILE}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf-8')
    fs.renameSync(tmp, WAYBAR_FILE)
  } catch {
    /* waybar is optional — never let it break the app */
  }
}

/** Remove the file so the waybar module collapses while we are not running. */
function clearWaybarFile() {
  try {
    if (fs.existsSync(WAYBAR_FILE)) fs.unlinkSync(WAYBAR_FILE)
  } catch {}
}

function mmss(total: number) {
  const m = Math.floor(Math.max(0, total) / 60)
  const s = Math.max(0, total) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function renderWaybar() {
  if (!snapshot) return
  const s = snapshot

  // recompute from the deadline so a throttled renderer cannot desync us
  const remaining =
    s.status === 'running' && s.endsAt
      ? Math.max(0, Math.round((s.endsAt - Date.now()) / 1000))
      : s.remainingSec

  const pct = s.totalSec ? Math.round(((s.totalSec - remaining) / s.totalSec) * 100) : 0
  const held = s.status === 'paused'
  const text = `${held ? '▮▮' : GLYPH[s.mode]} ${mmss(remaining)}`
  const state = s.status === 'running' ? '● running' : held ? '▮▮ held' : '○ standby'

  writeWaybarFile({
    text,
    tooltip: `${PHASE_LABEL[s.mode]} ${state} — ${mmss(remaining)} left · ${s.focusCount} focus done`,
    class: held ? 'paused' : s.status === 'idle' ? 'idle' : PHASE_CLASS[s.mode],
    percentage: pct,
    mode: s.mode,
    status: s.status,
    remainingSec: remaining,
  })
}

function startWaybarLoop() {
  if (waybarTimer) return
  waybarTimer = setInterval(renderWaybar, 1000)
}

function stopWaybarLoop() {
  if (waybarTimer) {
    clearInterval(waybarTimer)
    waybarTimer = null
  }
}

/* ================================================================== */

async function initStore() {
  const mod = await import('electron-store')
  Store = mod.default
  store = new Store({
    name: 'config',
    defaults: {
      settings: DEFAULT_SETTINGS,
      sessions: [] as any[],
      windowBounds: null as null | { width: number; height: number; x?: number; y?: number },
    },
  })
}

function createWindow() {
  const bounds = store.get('windowBounds') as { width: number; height: number; x?: number; y?: number } | null
  win = new BrowserWindow({
    width: bounds?.width || 1000,
    height: bounds?.height || 680,
    minWidth: 880,
    minHeight: 620,
    x: bounds?.x,
    y: bounds?.y,
    show: false,
    backgroundColor: '#000000',
    title: 'Sheenidoro',
    icon: getIconPath(),
    frame: true,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // keep the renderer's timers running while hidden in the tray, so
      // phase-end chimes and notifications fire on time rather than late
      backgroundThrottling: false,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    const prodDist = path.join(__dirname, '../../dist/index.html')
    const altDist = path.join(process.resourcesPath, 'app/dist/index.html')
    win.loadFile(fs.existsSync(prodDist) ? prodDist : altDist)
  }

  win.once('ready-to-show', () => win?.show())

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win?.hide() // tray-resident: the timer keeps running
    }
  })

  win.on('moved', saveBounds)
  win.on('resized', saveBounds)

  function saveBounds() {
    if (!win) return
    try {
      store.set('windowBounds', win.getBounds())
    } catch {}
  }
}

function createTray() {
  let img = nativeImage.createFromPath(getTrayIconPath())
  if (img.isEmpty()) {
    img = nativeImage.createFromPath(getIconPath(32)).resize({ width: 22, height: 22 })
  }
  tray = new Tray(img)
  tray.setToolTip('Sheenidoro')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show Sheenidoro', click: showWindow },
      { label: 'Toggle timer', click: () => win?.webContents.send('sheenidoro:toggle') },
      { label: 'Skip phase', click: () => win?.webContents.send('sheenidoro:skip') },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ])
  )
  tray.on('click', () => {
    if (win?.isVisible()) win.hide()
    else showWindow()
  })
  tray.on('double-click', showWindow)
}

function notifyViaMako(title: string, body: string) {
  try {
    const child = spawn('notify-send', ['-a', 'Sheenidoro', '-u', 'critical', '-i', getIconPath(64), title, body], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
  } catch {}
}

function playChimePaplay() {
  try {
    const candidates = [
      path.join(process.cwd(), 'assets/sounds/chime.wav'),
      path.join(process.cwd(), 'public/sounds/chime.wav'),
      path.join(__dirname, '../../assets/sounds/chime.wav'),
      path.join(__dirname, '../../public/sounds/chime.wav'),
      path.join(process.resourcesPath || '', 'assets/sounds/chime.wav'),
      path.join(process.resourcesPath || '', 'app/assets/sounds/chime.wav'),
    ]
    const p = candidates.find((c) => c && fs.existsSync(c))
    if (p) spawn('paplay', [p], { stdio: 'ignore', detached: true }).unref()
  } catch {}
}

function showNotification(completed: string, next: string) {
  const s = (() => {
    try {
      return store.get('settings') as AppSettings
    } catch {
      return DEFAULT_SETTINGS
    }
  })()

  const isFocusDone = completed === 'focus'
  const title = isFocusDone ? 'FOCUS COMPLETE' : 'BREAK OVER'
  const body = isFocusDone
    ? next === 'longBreak'
      ? `Long break — ${s.longBreakMin} min. Press Start when ready.`
      : `Short break — ${s.shortBreakMin} min. Press Start when ready.`
    : `Back to focus — ${s.focusMin} min. Press Start when ready.`

  try {
    const n = new Notification({ title, body, icon: getIconPath(128), urgency: 'critical' as const })
    n.on('click', showWindow)
    n.show()
  } catch {}

  notifyViaMako(title, body)

  if (s.soundEnabled !== false) playChimePaplay()

  win?.flashFrame(true)
  setTimeout(() => win?.flashFrame(false), 3000)
}

function setupIpc() {
  ipcMain.handle('sheenidoro:settings:get', () => store.get('settings') as AppSettings)
  ipcMain.on('sheenidoro:settings:set', (_e, s: AppSettings) => store.set('settings', s))

  ipcMain.handle('sheenidoro:sessions:list', () => store.get('sessions') as unknown[])
  ipcMain.on('sheenidoro:sessions:add', (_e, s) => {
    const arr = (store.get('sessions') as unknown[]) || []
    arr.unshift(s)
    if (arr.length > 10000) arr.length = 10000
    store.set('sessions', arr)
  })
  ipcMain.on('sheenidoro:sessions:clear', () => store.set('sessions', []))
  ipcMain.handle('sheenidoro:sessions:export', async () => {
    const sessions =
      (store.get('sessions') as {
        id: string
        mode: string
        plannedSec: number
        actualSec: number
        startedAt: string
        endedAt: string
        status: string
      }[]) || []
    const header = 'id,mode,plannedSec,actualSec,startedAt,endedAt,status\n'
    const rows = sessions
      .map((s) => `${s.id},${s.mode},${s.plannedSec},${s.actualSec},${s.startedAt},${s.endedAt},${s.status}`)
      .join('\n')
    const defaultPath = path.join(app.getPath('documents') || app.getPath('home'), 'sheenidoro-history.csv')
    const { canceled, filePath } = await dialog.showSaveDialog(win!, {
      title: 'Export Sheenidoro history',
      defaultPath,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (canceled || !filePath) return defaultPath
    fs.writeFileSync(filePath, header + rows, 'utf-8')
    return filePath
  })

  ipcMain.on('sheenidoro:notify:phase', (_e, completed: string, next: string) => showNotification(completed, next))
  ipcMain.on('sheenidoro:notify:test', () => showNotification('focus', 'shortBreak'))
  ipcMain.on('sheenidoro:sound:chime', () => playChimePaplay())

  // renderer reports phase transitions; main drives the per-second rendering
  ipcMain.on('sheenidoro:waybar:state', (_e, next: WaybarSnapshot) => {
    snapshot = next
    renderWaybar()
  })

  ipcMain.on('sheenidoro:window:minimize', () => win?.minimize())
  ipcMain.on('sheenidoro:window:close', () => win?.hide())
}

app.whenReady().then(async () => {
  await initStore()
  ensureWaybarDir()

  // seed from stored settings so the very first paint is correct
  const s = (store.get('settings') as AppSettings) || DEFAULT_SETTINGS
  snapshot = {
    mode: 'focus',
    status: 'idle',
    remainingSec: s.focusMin * 60,
    totalSec: s.focusMin * 60,
    endsAt: null,
    focusCount: 0,
  }
  renderWaybar()
  startWaybarLoop()

  setupIpc()
  createWindow()
  createTray()
  handleArgv(process.argv)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) app.quit()
})

/** Leave no stale timer behind: the module hides the moment we are gone. */
function teardown() {
  isQuitting = true
  stopWaybarLoop()
  clearWaybarFile()
}

app.on('before-quit', teardown)
app.on('quit', teardown)

// dev: `electron .` killed with Ctrl-C never reaches before-quit
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    teardown()
    app.exit(0)
  })
}
