import { contextBridge, ipcRenderer } from 'electron'

export type ChatStyle = { radius: number; fontSize: number; textColor: string; bgColor: string; wrapperBg: string; containerBg: string; fontWeight: 400 | 600 | 700; fontStyle: 'normal' | 'italic' }
type OverlayState = { opacity: number; width: number; height: number; videoId?: string; style?: ChatStyle; serverUrl?: string; alwaysOnTop?: boolean; onboardingDone?: boolean }

const api = {
  getState: (): Promise<OverlayState> => ipcRenderer.invoke('overlay:get-state'),
  getServerUrl: (): Promise<string> => ipcRenderer.invoke('overlay:get-server-url'),
  getAlwaysOnTop: (): Promise<boolean> => ipcRenderer.invoke('window:get-always-on-top'),
  getVideoId: (): Promise<string> => ipcRenderer.invoke('overlay:get-video-id'),
  getOnboardingDone: (): Promise<boolean> => ipcRenderer.invoke('onboarding:get'),
  setOnboardingDone: (): Promise<boolean> => ipcRenderer.invoke('onboarding:done'),
  updateOpacity: (v: number) => ipcRenderer.send('overlay:update-opacity', v),
  updateSize: (width: number, height: number) => ipcRenderer.send('overlay:update-size', { width, height }),
  updateVideoId: (v: string) => ipcRenderer.send('overlay:update-video-id', v),
  updateStyle: (s: Partial<ChatStyle>) => ipcRenderer.send('overlay:update-style', s),
  onState: (cb: (s: OverlayState) => void) => {
    const h = (_: unknown, s: OverlayState) => cb(s)
    ipcRenderer.on('overlay:state', h)
    return () => ipcRenderer.off('overlay:state', h)
  },
  onAlwaysOnTop: (cb: (v: boolean) => void) => {
    const h = (_: unknown, v: boolean) => cb(v)
    ipcRenderer.on('overlay:alwaysOnTop', h)
    return () => ipcRenderer.off('overlay:alwaysOnTop', h)
  },
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  toggleAlwaysOnTop: (): Promise<boolean> => ipcRenderer.invoke('window:toggle-always-on-top'),
  onChatMessages: (cb: (items: unknown[]) => void) => {
    const h = (_: unknown, items: unknown[]) => cb(items)
    ipcRenderer.on('chat:new-messages', h)
    return () => ipcRenderer.off('chat:new-messages', h)
  },
  onChatError: (cb: (msg: string) => void) => {
    const h = (_: unknown, m: string) => cb(m)
    ipcRenderer.on('chat:error', h)
    return () => ipcRenderer.off('chat:error', h)
  },
  pollerStart: (cfg: { liveChatId: string; apiKey: string }) => ipcRenderer.invoke('poller:start', cfg),
  pollerStop: () => ipcRenderer.send('poller:stop')
}

contextBridge.exposeInMainWorld('api', api)
export type Api = typeof api
