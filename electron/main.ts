import { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, dialog } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// dynamic import electron-store (ESM)
let Store: any
let store: any

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

let win: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_ev, argv) => {
    handleArgv(argv)
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
}

function handleArgv(argv: string[]) {
  if (argv.includes('--toggle')) {
    win?.webContents.send('sheenidoro:toggle')
    // also toggle via hidden command: we send IPC but if renderer not ready, we store?
    // minimal: show/hide window toggles play? renderer handles
  }
  if (argv.includes('--show')) {
    win?.show()
    win?.focus()
  }
  if (argv.includes('--waybar')) {
    const f = path.join(app.getPath('userData'), '..', 'state', 'sheenidoro', 'waybar.json')
    // fallback to xdg state
    const alt = path.join(process.env.HOME || '', '.local/state/sheenidoro/waybar.json')
    try {
      const data = fs.readFileSync(fs.existsSync(f) ? f : alt, 'utf-8')
      console.log(data)
    } catch {
      console.log(JSON.stringify({ text: '○ Sheenidoro', tooltip: 'Not running', class: 'idle', percentage: 0 }))
    }
    app.quit()
  }
}
handleArgv(process.argv)

function getIconPath(size?: number) {
  // in dev, resources at project root
  const devIcon = path.join(process.cwd(), 'resources', size ? `icon-${size}.png` : 'icon.png')
  if (fs.existsSync(devIcon)) return devIcon
  // in packaged, extraResources or resources
  const prodIcon = path.join(process.resourcesPath, 'icon.png')
  if (fs.existsSync(prodIcon)) return prodIcon
  const prodSized = path.join(process.resourcesPath, size ? `icon-${size}.png` : 'icon.png')
  if (fs.existsSync(prodSized)) return prodSized
  const alt = path.join(__dirname, '../../resources/icon.png')
  if (fs.existsSync(alt)) return alt
  const alt2 = path.join(__dirname, '../resources/icon.png')
  if (fs.existsSync(alt2)) return alt2
  return devIcon
}

function getTrayIconPath() {
  const dev = path.join(process.cwd(), 'resources', 'tray.png')
  if (fs.existsSync(dev)) return dev
  const prod = path.join(process.resourcesPath, 'tray.png')
  if (fs.existsSync(prod)) return prod
  const alt = path.join(__dirname, '../../resources/tray.png')
  if (fs.existsSync(alt)) return alt
  return dev
}

function ensureWaybarDir() {
  const dir = path.join(process.env.HOME || app.getPath('home'), '.local/state/sheenidoro')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function writeWaybarIdle() {
  try {
    const dir = ensureWaybarDir()
    const file = path.join(dir, 'waybar.json')
    // delete file so waybar hides (user wants no timer when app not running)
    if (fs.existsSync(file)) fs.unlinkSync(file)
  } catch {}
}

function writeWaybarHidden() {
  writeWaybarIdle()
}

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
    backgroundColor: '#fff0f5',
    title: 'Sheenidoro',
    icon: getIconPath(),
    // native Hyprland header per spec
    frame: true,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // load
  const isDev = !app.isPackaged
  if (isDev) {
    // vite dev server
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    // dist-electron/electron -> ../../dist
    const prodDist = path.join(__dirname, '../../dist/index.html')
    const altDist = path.join(process.resourcesPath, 'app/dist/index.html')
    const target = fs.existsSync(prodDist) ? prodDist : altDist
    win.loadFile(target)
  }

  win.once('ready-to-show', () => win?.show())

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win?.hide()
      // hide to tray, keep running
      return
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
  const iconPath = getTrayIconPath()
  let img = nativeImage.createFromPath(iconPath)
  if (img.isEmpty()) {
    // fallback to main icon resized
    const main = nativeImage.createFromPath(getIconPath(32))
    img = main.resize({ width: 22, height: 22 })
  }
  tray = new Tray(img)
  tray.setToolTip('Sheenidoro — pastel pomodoro 🍅')
  const menu = Menu.buildFromTemplate([
    {
      label: 'Show Sheenidoro',
      click: () => {
        win?.show()
        win?.focus()
      },
    },
    {
      label: 'Toggle Timer (Space)',
      click: () => win?.webContents.send('sheenidoro:toggle'),
    },
    {
      label: 'Skip Phase',
      click: () => win?.webContents.send('sheenidoro:skip'),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => {
    if (win?.isVisible()) win.hide()
    else {
      win?.show()
      win?.focus()
    }
  })
  tray.on('double-click', () => {
    win?.show()
    win?.focus()
  })
}

function notifyViaMako(title: string, body: string) {
  try {
    const icon = getIconPath(64)
    const child = spawn('notify-send', ['-a', 'Sheenidoro', '-u', 'critical', '-i', icon, title, body], {
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
      path.join(process.resourcesPath, 'assets/sounds/chime.wav'),
      path.join(process.resourcesPath, 'app/assets/sounds/chime.wav'),
    ]
    const p = candidates.find((c) => fs.existsSync(c))
    if (p) {
      spawn('paplay', [p], { stdio: 'ignore', detached: true }).unref()
    } else {
      // fallback beep via pw-play or aplay
      spawn('paplay', ['--version'], { stdio: 'ignore' }).on('error', () => {})
    }
  } catch {}
}

function showNotification(completed: string, next: string) {
  const isFocusDone = completed === 'focus'
  const title = isFocusDone ? 'Focus complete! 🍅' : 'Break over! 🌸'
  let body = ''
  if (isFocusDone) {
    if (next === 'longBreak') body = `Time for a long break — 15 min to rest 🌸. Click Start when ready.`
    else body = `Take a short break — 5 min ☕. Click Start when ready.`
    // use settings durations if available
    try {
      const s = store.get('settings') as AppSettings
      if (next === 'shortBreak') body = `Take a short break — ${s.shortBreakMin} min ☕. Click Start when ready.`
      if (next === 'longBreak') body = `Time for a long break — ${s.longBreakMin} min 🌸. Click Start when ready.`
    } catch {}
  } else {
    try {
      const s = store.get('settings') as AppSettings
      body = `Break over! Back to focus — ${s.focusMin} min 🍅. Click Start.`
    } catch {
      body = 'Break over! Back to focus 🍅. Click Start.'
    }
  }

  const icon = getIconPath(128)
  // Electron notification (works with mako)
  try {
    const n = new Notification({
      title,
      body,
      icon,
      urgency: 'critical' as const,
    })
    n.on('click', () => {
      win?.show()
      win?.focus()
    })
    n.show()
  } catch {}

  // also fallback to notify-send to ensure critical
  notifyViaMako(title, body)

  // play chime via paplay if enabled (catchy!)
  try {
    const s = store?.get('settings') as AppSettings | undefined
    if (s?.soundEnabled !== false) {
      playChimePaplay()
    }
  } catch {}

  // flash window
  win?.flashFrame(true)
  setTimeout(() => win?.flashFrame(false), 3000)
  // Hyprland urgent
  try {
    spawn('hyprctl', ['dispatch', 'bringactivetowindow', 'class:Sheenidoro'], { stdio: 'ignore', detached: true }).unref()
  } catch {}
}

function setupIpc() {
  ipcMain.handle('sheenidoro:settings:get', () => {
    return store.get('settings') as AppSettings
  })
  ipcMain.on('sheenidoro:settings:set', (_e, s: AppSettings) => {
    store.set('settings', s)
  })
  ipcMain.handle('sheenidoro:sessions:list', () => {
    return store.get('sessions') as unknown[]
  })
  ipcMain.on('sheenidoro:sessions:add', (_e, s) => {
    const arr = (store.get('sessions') as unknown[]) || []
    arr.unshift(s)
    // cap
    if (arr.length > 10000) arr.length = 10000
    store.set('sessions', arr)
  })
  ipcMain.on('sheenidoro:sessions:clear', () => {
    store.set('sessions', [])
  })
  ipcMain.handle('sheenidoro:sessions:export', async () => {
    const sessions = (store.get('sessions') as { id: string; mode: string; plannedSec: number; actualSec: number; startedAt: string; endedAt: string; status: string }[]) || []
    const header = 'id,mode,plannedSec,actualSec,startedAt,endedAt,status\n'
    const rows = sessions.map((s) => `${s.id},${s.mode},${s.plannedSec},${s.actualSec},${s.startedAt},${s.endedAt},${s.status}`).join('\n')
    const content = header + rows
    const defaultPath = path.join(app.getPath('documents') || app.getPath('home'), 'sheenidoro-history.csv')
    const { canceled, filePath } = await dialog.showSaveDialog(win!, {
      title: 'Export Sheenidoro history',
      defaultPath,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (canceled || !filePath) return defaultPath
    fs.writeFileSync(filePath, content, 'utf-8')
    return filePath
  })

  ipcMain.on('sheenidoro:notify:phase', (_e, completed: string, next: string) => {
    showNotification(completed, next)
  })
  ipcMain.on('sheenidoro:notify:test', () => {
    showNotification('focus', 'shortBreak')
    // also ensure chime plays even if showNotification already did — double ensure for test
    playChimePaplay()
  })
  ipcMain.on('sheenidoro:sound:chime', () => {
    playChimePaplay()
  })
  ipcMain.on('sheenidoro:waybar:update', (_e, payload: Record<string, unknown>) => {
    try {
      const dir = ensureWaybarDir()
      const file = path.join(dir, 'waybar.json')
      fs.writeFileSync(file, JSON.stringify(payload), 'utf-8')
    } catch {}
  })
  ipcMain.on('sheenidoro:window:minimize', () => win?.minimize())
  ipcMain.on('sheenidoro:window:close', () => win?.hide())
}

app.whenReady().then(async () => {
  await initStore()
  ensureWaybarDir()
  // initial waybar idle file if not exists
  const wb = path.join(ensureWaybarDir(), 'waybar.json')
  if (!fs.existsSync(wb)) {
    fs.writeFileSync(wb, JSON.stringify({ text: '○ 25:00 🍅', tooltip: 'Sheenidoro idle — click to start', class: 'idle', percentage: 0 }))
  }
  setupIpc()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else win?.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // keep tray alive unless quitting
    if (isQuitting) app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  writeWaybarIdle()
})

// also handle renderer crash / dev server stop — write idle so waybar doesn't stay stuck
app.on('render-process-gone', () => {
  // keep waybar stale check will handle, but also ensure we don't leave stale timer forever
  // no-op: helper script handles stale >5s
})

app.on('quit', () => {
  writeWaybarIdle()
})
