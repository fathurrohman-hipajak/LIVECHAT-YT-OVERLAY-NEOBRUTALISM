import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import { startOverlayServer } from './server'
import { createPoller, type PollerHandle } from './youtube-poller'

const is = { dev: !app.isPackaged }
const electronApp = { setAppUserModelId: (id: string) => { if (process.platform === 'win32') app.setAppUserModelId(id) } }
const optimizer = { watchWindowShortcuts: (_w: BrowserWindow) => {} }

let win: BrowserWindow | null = null
let poller: PollerHandle | null = null

export type ChatStyle = {
  radius: number // px 0..24
  fontSize: number // px 11..22
  textColor: string // hex
  bgColor: string // hex - chat bubble
  wrapperBg: string // hex - outer app
  containerBg: string // hex - chat rectangle container
  fontWeight: 400 | 600 | 700
  fontStyle: 'normal' | 'italic'
}

type PersistedState = { opacity: number; width: number; height: number; videoId: string; style: ChatStyle; onboardingDone: boolean }
const store = new Store<PersistedState>({
  defaults: {
    opacity: 0.85,
    width: 420,
    height: 640,
    videoId: '',
    style: { radius: 10, fontSize: 13, textColor: '#111111', bgColor: '#ffffff', wrapperBg: '#fef08a', containerBg: '#ffffff', fontWeight: 600, fontStyle: 'normal' },
    onboardingDone: false
  }
})

// persisted overlay state — shared with localhost GET /overlay-state; init from store
export const overlayState: { opacity: number; width: number; height: number; videoId: string; style: ChatStyle } = {
  opacity: store.get('opacity') as number,
  width: store.get('width') as number,
  height: store.get('height') as number,
  videoId: (store.get('videoId') as string) || '',
  style: (store.get('style') as ChatStyle) || { radius: 10, fontSize: 13, textColor: '#111111', bgColor: '#ffffff', wrapperBg: '#fef08a', containerBg: '#ffffff', fontWeight: 600, fontStyle: 'normal' }
}

function persist() {
  store.set('opacity', overlayState.opacity)
  store.set('width', overlayState.width)
  store.set('height', overlayState.height)
  store.set('videoId', overlayState.videoId)
  store.set('style', overlayState.style)
}

function createWindow(): void {
  win = new BrowserWindow({
    width: overlayState.width + 40,
    height: overlayState.height + 80,
    minWidth: 320,
    minHeight: 400,
    frame: false,
    transparent: false,
    backgroundColor: overlayState.style.wrapperBg || '#fef08a',
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  })

  // keep alwaysOnTop at screen-saver level on mac/win
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true)
  // restore opacity from persisted state
  try {
    win.setOpacity(overlayState.opacity)
  } catch {}

  win.on('ready-to-show', () => win?.show())

  win.webContents.setWindowOpenHandler((d) => {
    shell.openExternal(d.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.on('closed', () => {
    win = null
    poller?.stop()
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.livechat.floating')

  app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))

  // start embedded static server for OBS Browser Source
  const { url } = await startOverlayServer(() => overlayState)
  console.log(`[overlay-server] ${url} — add as OBS Browser Source`)

  // IPC: overlay controls + onboarding
  ipcMain.handle('overlay:get-state', () => ({
    ...overlayState,
    serverUrl: url,
    alwaysOnTop: win?.isAlwaysOnTop() ?? true,
    onboardingDone: (store.get('onboardingDone') as boolean) ?? false
  }))
  ipcMain.handle('overlay:get-server-url', () => url)
  ipcMain.handle('overlay:get-video-id', () => overlayState.videoId)
  ipcMain.handle('onboarding:get', () => (store.get('onboardingDone') as boolean) ?? false)
  ipcMain.handle('onboarding:done', () => {
    store.set('onboardingDone', true)
    return true
  })
  ipcMain.on('overlay:update-opacity', (_e, v: number) => {
    overlayState.opacity = Math.max(0.05, Math.min(1, v))
    if (win && !win.isDestroyed()) {
      try {
        win.setOpacity(overlayState.opacity)
      } catch {}
    }
    persist()
    win?.webContents.send('overlay:state', { ...overlayState, alwaysOnTop: win?.isAlwaysOnTop() ?? true })
  })
  ipcMain.on('overlay:update-size', (_e, { width, height }: { width: number; height: number }) => {
    if (width) overlayState.width = Math.max(280, Math.min(800, width))
    if (height) overlayState.height = Math.max(300, Math.min(1200, height))
    win?.setSize(overlayState.width + 40, overlayState.height + 80, true)
    persist()
    win?.webContents.send('overlay:state', { ...overlayState, alwaysOnTop: win?.isAlwaysOnTop() ?? true })
  })
  ipcMain.on('overlay:update-video-id', (_e, v: string) => {
    overlayState.videoId = String(v || '').trim()
    persist()
    win?.webContents.send('overlay:state', { ...overlayState, alwaysOnTop: win?.isAlwaysOnTop() ?? true })
  })
  ipcMain.on('overlay:update-style', (_e, style: Partial<ChatStyle>) => {
    if (typeof style.radius === 'number') overlayState.style.radius = Math.max(0, Math.min(24, Math.round(style.radius)))
    if (typeof style.fontSize === 'number') overlayState.style.fontSize = Math.max(11, Math.min(22, Math.round(style.fontSize)))
    if (typeof style.textColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(style.textColor)) overlayState.style.textColor = style.textColor
    if (typeof style.bgColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(style.bgColor)) overlayState.style.bgColor = style.bgColor
    if (typeof style.wrapperBg === 'string' && /^#[0-9a-fA-F]{6}$/.test(style.wrapperBg)) {
      overlayState.style.wrapperBg = style.wrapperBg
      if (win && !win.isDestroyed()) win.setBackgroundColor(style.wrapperBg)
    }
    if (typeof style.containerBg === 'string' && /^#[0-9a-fA-F]{6}$/.test(style.containerBg)) overlayState.style.containerBg = style.containerBg
    if (style.fontWeight === 400 || style.fontWeight === 600 || style.fontWeight === 700) overlayState.style.fontWeight = style.fontWeight
    if (style.fontStyle === 'normal' || style.fontStyle === 'italic') overlayState.style.fontStyle = style.fontStyle
    persist()
    win?.webContents.send('overlay:state', { ...overlayState, alwaysOnTop: win?.isAlwaysOnTop() ?? true })
  })

  // window controls
  ipcMain.on('window:minimize', () => win?.minimize())
  ipcMain.on('window:close', () => win?.close())
  ipcMain.handle('window:toggle-always-on-top', () => {
    if (!win) return false
    const next = !win.isAlwaysOnTop()
    win.setAlwaysOnTop(next, 'screen-saver')
    win.setVisibleOnAllWorkspaces(next)
    // force level reapply on Windows/macOS when toggling
    if (next) win.moveTop()
    win.webContents.send('overlay:alwaysOnTop', next)
    win.webContents.send('overlay:state', { ...overlayState, alwaysOnTop: next })
    return next
  })
  ipcMain.handle('window:get-always-on-top', () => win?.isAlwaysOnTop() ?? true)

  createWindow()

  // YouTube poller — reads liveChatId + apiKey from env (prod: from secure storage later)
  const liveChatId = process.env.YT_LIVE_CHAT_ID || ''
  const apiKey = process.env.YT_API_KEY || ''
  if (liveChatId && apiKey) {
    poller = createPoller({
      liveChatId,
      apiKey,
      onMessages: (items) => win?.webContents.send('chat:new-messages', items),
      onError: (e) => win?.webContents.send('chat:error', String(e))
    })
    poller.start()
  }

  // allow renderer to start/stop poller with credentials later
  ipcMain.handle('poller:start', (_e, cfg: { liveChatId: string; apiKey: string }) => {
    poller?.stop()
    poller = createPoller({
      liveChatId: cfg.liveChatId,
      apiKey: cfg.apiKey,
      onMessages: (items) => win?.webContents.send('chat:new-messages', items),
      onError: (e) => win?.webContents.send('chat:error', String(e))
    })
    poller.start()
    return true
  })
  ipcMain.on('poller:stop', () => poller?.stop())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  poller?.stop()
  if (process.platform !== 'darwin') app.quit()
})
