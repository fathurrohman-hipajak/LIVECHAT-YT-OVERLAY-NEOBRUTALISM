import { useEffect, useRef, useState } from 'react'

type ChatStyle = { radius: number; fontSize: number; textColor: string; bgColor: string; wrapperBg: string; containerBg: string; fontWeight: 400 | 600 | 700; fontStyle: 'normal' | 'italic' }
const DEFAULT_STYLE: ChatStyle = { radius: 10, fontSize: 13, textColor: '#111111', bgColor: '#ffffff', wrapperBg: '#fef08a', containerBg: '#ffffff', fontWeight: 600, fontStyle: 'normal' }

type ChatMsg = {
  id: string
  snippet: { displayMessage?: string; publishedAt: string; textMessageDetails?: { messageText?: string } }
  authorDetails?: { displayName?: string; profileImageUrl?: string; isChatOwner?: boolean; isChatModerator?: boolean }
}

declare global {
  interface Window {
    api?: {
      getState: () => Promise<{ opacity: number; width: number; height: number; videoId?: string; style?: ChatStyle; serverUrl?: string; alwaysOnTop?: boolean; onboardingDone?: boolean }>
      getAlwaysOnTop: () => Promise<boolean>
      getVideoId: () => Promise<string>
      getOnboardingDone: () => Promise<boolean>
      setOnboardingDone: () => Promise<boolean>
      updateOpacity: (v: number) => void
      updateSize: (w: number, h: number) => void
      updateVideoId: (v: string) => void
      updateStyle: (s: Partial<ChatStyle>) => void
      onState: (cb: (s: { opacity: number; width: number; height: number; videoId?: string; style?: ChatStyle; alwaysOnTop?: boolean }) => void) => () => void
      onAlwaysOnTop: (cb: (v: boolean) => void) => () => void
      minimize: () => void
      close: () => void
      toggleAlwaysOnTop: () => Promise<boolean>
      onChatMessages: (cb: (items: ChatMsg[]) => void) => () => void
      onChatError: (cb: (m: string) => void) => () => void
      pollerStart: (cfg: { liveChatId: string; apiKey: string }) => Promise<unknown>
      pollerStop: () => void
    }
  }
}
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { src?: string; partition?: string }, HTMLElement>
    }
  }
}

const isElectron = typeof window !== 'undefined' && !!window.api
const DEFAULT_VIDEO_ID = ''

function extractVideoId(input: string): string {
  const s = input.trim()
  if (!s) return ''
  try {
    if (s.includes('youtube.com') || s.includes('youtu.be')) {
      const u = new URL(s.startsWith('http') ? s : `https://${s}`)
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split(/[?&#]/)[0] || ''
      const v = u.searchParams.get('v')
      if (v) return v
      const parts = u.pathname.split('/').filter(Boolean)
      const idx = parts.findIndex((p) => p === 'live' || p === 'embed' || p === 'watch')
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].split(/[?&#]/)[0]!
      return parts[parts.length - 1]?.split(/[?&#]/)[0] || ''
    }
    return s.split(/[?&#/\s]/)[0] || ''
  } catch {
    return s.split(/[?&#/\s]/)[0] || ''
  }
}

function popoutUrl(videoId: string): string {
  if (!videoId) return ''
  return `https://www.youtube.com/live_chat?is_popout=1&v=${encodeURIComponent(videoId)}`
}

function neoCss(style: ChatStyle): string {
  const weight = String(style.fontWeight)
  const fontStyle = style.fontStyle
  return `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
body, html { background: transparent !important; }
yt-live-chat-renderer { background: transparent !important; }
#chat, #item-scroller, yt-live-chat-item-list-renderer #items { background: transparent !important; overflow: hidden !important; }
yt-live-chat-header-renderer, yt-live-chat-message-input-renderer, yt-live-chat-ticker-renderer, yt-live-chat-banner-manager, yt-live-chat-viewer-engagement-message-renderer, yt-live-chat-mode-change-message-renderer, yt-live-chat-restricted-participation-renderer { display: none !important; }
yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer, yt-live-chat-membership-item-renderer {
  background: ${style.bgColor} !important; border: 3px solid #000 !important; box-shadow: 4px 4px 0 #000 !important; border-radius: ${style.radius}px !important; margin: 6px 8px !important; padding: 8px 10px !important;
}
yt-live-chat-text-message-renderer #author-name, yt-live-chat-paid-message-renderer #author-name { font-family: 'Space Grotesk', sans-serif !important; font-weight: 700 !important; font-size: ${style.fontSize}px !important; color: #000 !important; }
yt-live-chat-text-message-renderer #message, yt-live-chat-text-message-renderer #message * { font-family: 'JetBrains Mono', monospace !important; font-size: ${style.fontSize}px !important; line-height: 1.35 !important; color: ${style.textColor} !important; font-weight: ${weight} !important; font-style: ${fontStyle} !important; }
yt-live-chat-text-message-renderer #author-photo, yt-live-chat-paid-message-renderer #author-photo { width: 28px !important; height: 28px !important; border: 2px solid #000 !important; border-radius: 0 !important; }
yt-live-chat-paid-message-renderer { background: #ffe600 !important; }
yt-live-chat-item-list-renderer #item-scroller { overflow-y: auto !important; }
::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-thumb { background: #000; }
`.trim()
}

function InfoModal({ onClose, serverUrl }: { onClose: () => void; serverUrl: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-[520px] overflow-auto border-[3px] border-black bg-white p-4 shadow-[8px_8px_0_#000]" onClick={(e) => e.stopPropagation()} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[Space_Grotesk] text-lg font-bold">CARA PAKAI</h2>
          <button onClick={onClose} className="border-[3px] border-black bg-black px-3 py-1 font-bold text-[#ffe600]">TUTUP ✕</button>
        </div>
        <div className="grid gap-3 text-sm leading-relaxed">
          <div className="border-[3px] border-black bg-[#fef08a] p-3 shadow-[4px_4px_0_#000]">
            <p className="font-bold">1 · Tempel link YouTube</p>
            <p>Kopi link live — tempel di atas, chat muncul otomatis.</p>
          </div>
          <div className="border-[3px] border-black bg-white p-3 shadow-[4px_4px_0_#000]">
            <p className="font-bold">2 · Atur tampilan</p>
            <p><b>Kecerahan</b>, <b>Lebar/Tinggi</b>, warna <b>Wrapper</b> & <b>Kotak chat</b>, <b>Radius</b>, <b>Ukuran font</b>, <b>Warna teks</b>, <b>Gaya teks</b>. Tarik ◢ untuk resize.</p>
          </div>
          <div className="border-[3px] border-black bg-cyan-100 p-3 shadow-[4px_4px_0_#000]">
            <p className="font-bold">3 · PIN di atas game</p>
            <p><b>📌 PIN AKTIF</b> biar tetap di atas game / OBS. <b>—</b> kecilkan, <b>✕</b> tutup.</p>
          </div>
          <div className="border-[3px] border-black bg-white p-3 shadow-[4px_4px_0_#000]">
            <p className="font-bold">4 · Ke OBS</p>
            <p>
              <b>OBS → Browser Source → URL:</b>
            </p>
            <code className="mt-1 block break-all border-[3px] border-black bg-[#fef08a] px-3 py-2 font-mono text-xs font-bold shadow-[3px_3px_0_#000]">{serverUrl}</code>
            <p className="mt-2 font-mono text-xs opacity-60">Link localhost Electron — sama seperti langkah onboarding. Aktif selama app berjalan.</p>
            <button onClick={() => navigator.clipboard.writeText(serverUrl)} className="mt-2 border-[3px] border-black bg-white px-3 py-1 text-xs font-bold shadow-[3px_3px_0_#000]">
              COPY LINK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const presets = ['#ffffff', '#fef08a', '#ffe600', '#000000', '#ff3b30', '#00d4ff', '#a78bfa', '#22c55e']
  return (
    <div className="grid gap-1 border-2 border-black p-2">
      <span className="font-bold leading-none">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-7 w-8 shrink-0 border-2 border-black p-0"
          style={{ backgroundColor: value }}
          title="Pilih warna"
          aria-label={`Pilih ${label}`}
        />
        <span className="break-all font-mono text-[10px] leading-none">{value}</span>
      </span>
      {open && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-[320px] border-[3px] border-black bg-white p-3 shadow-[8px_8px_0_#000]"
            onClick={(e) => e.stopPropagation()}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-xs">{label}</span>
              <button onClick={() => setOpen(false)} className="border-2 border-black bg-black px-2 py-0.5 text-xs font-bold text-white">
                TUTUP
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((c) => (
                <button key={c} onClick={() => { onChange(c); setOpen(false) }} className="h-8 border-2 border-black" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 border-2 border-black p-0" />
              <span className="font-mono text-xs">{value}</span>
              <button onClick={() => setOpen(false)} className="ml-auto border-2 border-black bg-[#ffe600] px-3 py-1 text-xs font-bold">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OnboardingModal({ serverUrl, onDone }: { serverUrl: string; onDone: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-[520px] border-[3px] border-black bg-white shadow-[8px_8px_0_#000]">
        <div className="flex items-center justify-between border-b-[3px] border-black bg-[#ffe600] px-4 py-2">
          <h2 className="font-[Space_Grotesk] text-[13px] font-bold tracking-wide">SELAMAT DATANG — 2 LANGKAH</h2>
          <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-xs font-bold">Langkah {step}/2</span>
        </div>
        {step === 1 ? (
          <div className="grid gap-3 p-4 text-sm leading-relaxed">
            <p className="font-bold">1 · Pasang ke OBS</p>
            <p>
              Buka <b>OBS</b> → <b>Add Source</b> → <b>Browser Source</b> → tempel link ini:
            </p>
            <code className="break-all border-[3px] border-black bg-[#fef08a] px-3 py-2 font-mono text-xs font-bold shadow-[3px_3px_0_#000]">{serverUrl}</code>
            <p className="font-mono text-xs opacity-60">Link localhost ini aktif selama app berjalan. Temp di OBS sekali, nanti otomatis update.</p>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(serverUrl)} className="border-[3px] border-black bg-white px-3 py-2 text-xs font-bold shadow-[3px_3px_0_#000]">
                COPY LINK
              </button>
              <button onClick={() => setStep(2)} className="flex-1 border-[3px] border-black bg-black px-3 py-2 text-xs font-bold text-[#ffe600] shadow-[3px_3px_0_#000]">
                LANJUT →
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 p-4 text-sm leading-relaxed">
            <p className="font-bold">2 · Atur ukuran layar</p>
            <p>
              Tarik ujung jendela / pojok <b>◢</b> untuk ubah ukuran. Atur <b>Kecerahan</b>, <b>Lebar / Tinggi</b>, dan <b>Chat Style</b> di panel pengaturan.
            </p>
            <div className="rounded border-2 border-dashed border-black bg-[#fef08a] p-3 text-center font-mono text-xs">
              <span className="text-lg">◢</span> tarik di sini &nbsp;·&nbsp; atau tarik tepi jendela
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="border-[3px] border-black bg-white px-3 py-2 text-xs font-bold">
                ← KEMBALI
              </button>
              <button onClick={onDone} className="flex-1 border-[3px] border-black bg-cyan-300 px-3 py-2 text-xs font-bold shadow-[3px_3px_0_#000]">
                SUDAH PAHAM
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HeaderBar({
  opacity,
  setOpacity,
  width,
  height,
  setWidth,
  setHeight,
  style,
  setStyle,
  alwaysOnTop,
  showConfig,
  setShowConfig,
  onToggleTop
}: {
  opacity: number
  setOpacity: (v: number) => void
  width: number
  setWidth: (v: number) => void
  height: number
  setHeight: (v: number) => void
  style: ChatStyle
  setStyle: (up: Partial<ChatStyle>) => void
  alwaysOnTop: boolean
  showConfig: boolean
  setShowConfig: React.Dispatch<React.SetStateAction<boolean>>
  onToggleTop: () => Promise<void>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center justify-between gap-2 border-[3px] border-black px-2 py-2 shadow-[6px_6px_0_#000]"
        style={{ WebkitAppRegion: 'drag', backgroundColor: style.wrapperBg } as React.CSSProperties}
      >
        <div className="flex flex-1 items-center gap-2 self-stretch rounded-sm px-1 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <span className="font-[Space_Grotesk] text-[13px] font-bold leading-none tracking-tight">LIVECHAT</span>
        </div>
        {/* wide: all buttons inline */}
        <div className="hidden shrink-0 items-center gap-1 sm:flex" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={() => setShowConfig((p: boolean) => !p)} className={`border-[2px] border-black px-2 py-1 text-[11px] font-bold ${showConfig ? 'bg-black text-[#ffe600]' : 'bg-white text-black'}`}>
            {showConfig ? '▲ SEMBUNYIKAN' : '▼ PENGATURAN'}
          </button>
          <button onClick={onToggleTop} title={alwaysOnTop ? 'Pin aktif' : 'Pin mati'} className={`border-[2px] border-black px-2 py-1 text-[11px] font-bold ${alwaysOnTop ? 'bg-black text-[#ffe600]' : 'bg-white text-black'}`}>
            {alwaysOnTop ? '📌 PIN AKTIF' : '📍 PIN MATI'}
          </button>
          <button onClick={() => window.api?.minimize()} title="Kecilkan" aria-label="Minimize" className="border-[2px] border-black bg-white px-2.5 py-1 text-xs font-bold leading-none hover:bg-[#fef08a]">
            —
          </button>
          <button onClick={() => window.api?.close()} title="Tutup" aria-label="Close" className="border-[2px] border-black bg-red-400 px-2.5 py-1 text-xs font-bold leading-none hover:bg-red-500">
            ✕
          </button>
        </div>
        {/* narrow: hamburger */}
        <div className="flex shrink-0 items-center gap-1 sm:hidden" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className={`border-[2px] border-black px-2.5 py-1 text-xs font-bold leading-none ${menuOpen ? 'bg-black text-[#ffe600]' : 'bg-white text-black'}`}
          >
            ☰
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="grid gap-1 border-[3px] border-black bg-white p-2 shadow-[4px_4px_0_#000] sm:hidden" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={() => { setShowConfig((p: boolean) => !p); setMenuOpen(false) }} className={`border-2 border-black px-2 py-1 text-xs font-bold ${showConfig ? 'bg-black text-[#ffe600]' : 'bg-white'}`}>
            {showConfig ? '▲ SEMBUNYIKAN' : '▼ PENGATURAN'}
          </button>
          <button onClick={() => { onToggleTop(); setMenuOpen(false) }} className={`border-2 border-black px-2 py-1 text-xs font-bold ${alwaysOnTop ? 'bg-black text-[#ffe600]' : 'bg-white'}`}>
            {alwaysOnTop ? '📌 PIN AKTIF' : '📍 PIN MATI'}
          </button>
          <div className="flex gap-1">
            <button onClick={() => window.api?.minimize()} className="flex-1 border-2 border-black bg-white px-2 py-1 text-xs font-bold">
              — KECILKAN
            </button>
            <button onClick={() => window.api?.close()} className="flex-1 border-2 border-black bg-red-400 px-2 py-1 text-xs font-bold">
              ✕ TUTUP
            </button>
          </div>
        </div>
      )}

      {showConfig && (
        <div className="grid gap-4 border-[3px] border-black bg-white p-3 shadow-[6px_6px_0_#000] text-xs" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* row: JENDELA */}
          <div className="grid gap-3">
            <p className="border-b-2 border-black pb-1 font-[Space_Grotesk] text-[11px] font-bold tracking-[0.14em]">JENDELA</p>
            <div className="grid grid-cols-[72px_1fr_48px] items-center gap-2">
              <span className="font-bold">Kecerahan</span>
              <input type="range" min={5} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} className="accent-black" />
              <span className="text-right font-mono font-bold">{Math.round(opacity * 100)}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="font-bold">Lebar</span>
                <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full border-2 border-black bg-white px-2 py-1.5 font-mono" />
              </label>
              <label className="grid gap-1">
                <span className="font-bold">Tinggi</span>
                <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full border-2 border-black bg-white px-2 py-1.5 font-mono" />
              </label>
            </div>
          </div>

          <div className="h-px bg-black" />

          {/* row: CHAT STYLE — unified grid */}
          <div className="grid gap-3">
            <p className="border-b-2 border-black pb-1 font-[Space_Grotesk] text-[11px] font-bold tracking-[0.14em]">CHAT STYLE</p>

            <div className="grid gap-2">
              <div className="grid grid-cols-[72px_1fr_44px] items-center gap-2">
                <span className="font-bold">Radius</span>
                <input type="range" min={0} max={24} value={style.radius} onChange={(e) => setStyle({ radius: Number(e.target.value) })} className="accent-black" />
                <span className="text-right font-mono font-bold">{style.radius}px</span>
              </div>
              <div className="grid grid-cols-[72px_1fr_44px] items-center gap-2">
                <span className="font-bold">Uk. Font</span>
                <input type="range" min={11} max={22} value={style.fontSize} onChange={(e) => setStyle({ fontSize: Number(e.target.value) })} className="accent-black" />
                <span className="text-right font-mono font-bold">{style.fontSize}px</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ColorField label="Warna teks" value={style.textColor} onChange={(v) => setStyle({ textColor: v })} />
              <ColorField label="Bg chat" value={style.bgColor} onChange={(v) => setStyle({ bgColor: v })} />
              <ColorField label="Wrapper" value={style.wrapperBg} onChange={(v) => setStyle({ wrapperBg: v })} />
              <ColorField label="Kotak chat" value={style.containerBg} onChange={(v) => setStyle({ containerBg: v })} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="font-bold">Tebal</span>
                <select value={style.fontWeight} onChange={(e) => setStyle({ fontWeight: Number(e.target.value) as ChatStyle['fontWeight'] })} className="w-full border-2 border-black bg-white px-2 py-1.5 font-mono">
                  <option value={400}>Normal</option>
                  <option value={600}>Semi-bold</option>
                  <option value={700}>Bold</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="font-bold">Gaya</span>
                <select value={style.fontStyle} onChange={(e) => setStyle({ fontStyle: e.target.value as ChatStyle['fontStyle'] })} className="w-full border-2 border-black bg-white px-2 py-1.5 font-mono">
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                </select>
              </label>
            </div>
          </div>

          <p className="border-t-2 border-black pt-2 font-mono text-[10px] leading-tight opacity-60">Tarik ◢ di pojok kanan bawah untuk resize manual.</p>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [opacity, setOpacity] = useState(0.85)
  const [width, setWidth] = useState(420)
  const [height, setHeight] = useState(640)
  const [serverUrl, setServerUrl] = useState('http://localhost:13415')
  const [style, setStyle] = useState<ChatStyle>(DEFAULT_STYLE)
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [showConfig, setShowConfig] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [videoInput, setVideoInput] = useState('')
  const [videoId, setVideoId] = useState(DEFAULT_VIDEO_ID)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [pollErr, setPollErr] = useState('')
  const seen = useRef<Set<string>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)
  const webviewRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (isElectron) {
      window.api!.getState().then((s) => {
        setOpacity(s.opacity)
        setWidth(s.width)
        setHeight(s.height)
        if (s.style) setStyle(s.style)
        if ((s as { serverUrl?: string }).serverUrl) setServerUrl((s as { serverUrl?: string }).serverUrl!)
        if (typeof s.alwaysOnTop === 'boolean') setAlwaysOnTop(s.alwaysOnTop)
        if (s.videoId) {
          setVideoId(s.videoId)
          setVideoInput(`https://www.youtube.com/watch?v=${s.videoId}`)
        }
        if (!(s as { onboardingDone?: boolean }).onboardingDone) setShowOnboarding(true)
      })
      window.api!.getAlwaysOnTop().then(setAlwaysOnTop)
      window.api!.getOnboardingDone?.()
        .then((done) => {
          if (!done) setShowOnboarding(true)
        })
        .catch(() => {})
      const off = window.api!.onState((s) => {
        setOpacity(s.opacity)
        setWidth(s.width)
        setHeight(s.height)
        if (s.style) setStyle(s.style)
        if (typeof s.alwaysOnTop === 'boolean') setAlwaysOnTop(s.alwaysOnTop)
        if (typeof s.videoId === 'string' && s.videoId) setVideoId(s.videoId)
      })
      const off2 = window.api!.onAlwaysOnTop(setAlwaysOnTop)
      return () => {
        off()
        off2()
      }
    } else {
      const u = new URL(window.location.href)
      const qp = u.searchParams.get('v') || u.searchParams.get('videoId')
      if (qp) {
        const id = extractVideoId(qp)
        if (id) setVideoId(id)
      }
      const base = `${u.protocol}//${u.host}`
      const tick = async () => {
        try {
          const r = await fetch(`${base}/overlay-state`, { cache: 'no-store' })
          if (r.ok) {
            const s = await r.json()
            setOpacity(s.opacity)
            setWidth(s.width)
            setHeight(s.height)
            if (s.style) setStyle(s.style)
            if (s.videoId) setVideoId(s.videoId)
          }
        } catch {}
      }
      tick()
      const id = setInterval(tick, 800)
      return () => clearInterval(id)
    }
  }, [])

  // opacity is window-level via win.setOpacity, keep CSS var for OBS sync only
  useEffect(() => {
    document.documentElement.style.setProperty('--overlay-opacity', String(opacity))
    document.documentElement.style.setProperty('--overlay-w', `${width}px`)
  }, [opacity, width, height])

  useEffect(() => {
    if (!isElectron) return
    const off = window.api!.onChatMessages((items) => {
      const fresh = (items as ChatMsg[]).filter((m) => !seen.current.has(m.id))
      fresh.forEach((m) => seen.current.add(m.id))
      if (!fresh.length) return
      setMessages((prev) => {
        const merged = [...prev, ...fresh].sort((a, b) => new Date(a.snippet.publishedAt).getTime() - new Date(b.snippet.publishedAt).getTime())
        return merged.slice(-300)
      })
    })
    const off2 = window.api!.onChatError((m) => setPollErr(m))
    return () => {
      off()
      off2()
    }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isElectron || !videoId) return
    type WebviewEl = {
      addEventListener: (e: string, cb: () => void) => void
      removeEventListener: (e: string, cb: () => void) => void
      insertCSS: (css: string) => Promise<void>
      executeJavaScript: (code: string) => Promise<unknown>
    }
    const el = webviewRef.current as unknown as WebviewEl | null
    if (!el) return
    let ready = false
    let pendingStyle: ChatStyle | null = style
    let domReadyCb: (() => void) | null = null
    const apply = (css: string) => {
      if (!ready) {
        pendingStyle = style
        return
      }
      el.executeJavaScript(`(() => { try { document.querySelectorAll('style[data-neo]').forEach(s=>s.remove()); const s=document.createElement('style'); s.setAttribute('data-neo','1'); s.textContent=${JSON.stringify(css)}; document.head.appendChild(s); return true; } catch(e){ return String(e) } })()`).catch(() => {
        el.insertCSS(css).catch(() => {})
      })
    }
    domReadyCb = () => {
      ready = true
      ;(el as unknown as Record<string, unknown>).__neoReady = true
      const toApply = pendingStyle ?? style
      apply(neoCss(toApply))
      pendingStyle = null
    }
    el.addEventListener('dom-ready', domReadyCb)
    return () => {
      if (domReadyCb) el.removeEventListener('dom-ready', domReadyCb)
    }
  }, [videoId])

  useEffect(() => {
    if (!isElectron || !videoId) return
    const el = webviewRef.current as unknown as { executeJavaScript: (code: string) => Promise<unknown>; insertCSS: (css: string) => Promise<void> } | null
    if (!el) return
    const css = neoCss(style)
    const anyEl = el as unknown as Record<string, unknown>
    if (!anyEl['__neoReady']) return
    el.executeJavaScript(`(() => { try { document.querySelectorAll('style[data-neo]').forEach(s=>s.remove()); const s=document.createElement('style'); s.setAttribute('data-neo','1'); s.textContent=${JSON.stringify(css)}; document.head.appendChild(s); } catch(e){} })()`).catch(() => el.insertCSS(css).catch(() => {}))
  }, [style])

  const handleOpacity = (v: number) => {
    setOpacity(v)
    if (isElectron) window.api!.updateOpacity(v)
  }
  const handleW = (v: number) => {
    setWidth(v)
    if (isElectron) window.api!.updateSize(v, height)
  }
  const handleH = (v: number) => {
    setHeight(v)
    if (isElectron) window.api!.updateSize(width, v)
  }
  const handleStyle = (up: Partial<ChatStyle>) => {
    const next = { ...style, ...up }
    setStyle(next)
    if (isElectron) window.api!.updateStyle(up)
  }

  const applyVideo = () => {
    const id = extractVideoId(videoInput || videoId)
    if (!id) {
      setPollErr('Link tidak valid. Contoh: youtube.com/watch?v=rFZHOHl-L8A')
      return
    }
    setPollErr('')
    setVideoId(id)
    setShowConfig(false)
    if (isElectron) window.api!.updateVideoId(id)
  }

  const chatUrl = popoutUrl(videoId)
  const usePopout = !!videoId

  return (
    <div className="flex h-screen flex-col gap-3 overflow-hidden p-3 font-[Space_Grotesk] text-black selection:bg-black selection:text-[#ffe600]" style={{ backgroundColor: style.wrapperBg }}>
      <style>{`html, body, #root { height: 100%; overflow: hidden; } input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }`}</style>
      <HeaderBar
        opacity={opacity}
        setOpacity={handleOpacity}
        width={width}
        setWidth={handleW}
        height={height}
        setHeight={handleH}
        style={style}
        setStyle={handleStyle}
        alwaysOnTop={alwaysOnTop}
        showConfig={showConfig}
        setShowConfig={setShowConfig}
        onToggleTop={async () => {
          if (!isElectron) return
          const next = await window.api!.toggleAlwaysOnTop()
          setAlwaysOnTop(next)
        }}
      />

      {showConfig && (
        <div className="flex flex-col gap-2 border-[3px] border-black bg-white p-2 shadow-[4px_4px_0_#000] sm:flex-row sm:items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <input
            placeholder="Tempel link YouTube (youtube.com/watch?v=...)"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyVideo()}
            className="min-w-0 flex-1 border-2 border-black bg-[#fef08a] px-3 py-2 font-mono text-xs"
          />
          <button onClick={applyVideo} className="w-full shrink-0 border-[3px] border-black bg-cyan-300 px-4 py-2 text-xs font-bold shadow-[3px_3px_0_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] sm:w-auto">
            TAMPILKAN
          </button>
        </div>
      )}
      {pollErr && <div className="border-[3px] border-black bg-red-400 p-2 font-mono text-xs font-bold shadow-[4px_4px_0_#000]">{pollErr}</div>}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-[3px] border-black shadow-[6px_6px_0_#000]" style={{ backgroundColor: style.containerBg }}>
        {usePopout ? (
          isElectron ? (
            <webview ref={webviewRef as unknown as React.RefObject<never>} src={chatUrl} partition="persist:youtube" className="h-full w-full border-0" style={{ width: '100%', height: '100%' } as React.CSSProperties} />
          ) : (
            <div className="grid h-full place-items-center p-4 text-center">
              <div className="border-[3px] border-black bg-cyan-100 p-4 shadow-[4px_4px_0_#000]">
                <p className="font-bold">Browser biasa tidak bisa embed YouTube chat (X-Frame-Options).</p>
                <p className="font-mono text-xs">
                  Buka via <b>OBS Browser Source</b>: <code className="border border-black bg-white px-1">{chatUrl}</code>
                </p>
                <p className="pt-2 font-mono text-[11px]">Jalankan app Electron — chat tampil otomatis.</p>
              </div>
            </div>
          )
        ) : (
          <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-auto p-2">
            <div className="grid place-items-center py-10 text-center">
              <div className="border-[3px] border-black bg-[#ffe600] px-4 py-3 font-bold shadow-[4px_4px_0_#000]">Tidak Ada Livechat</div>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center border-2 border-black bg-[#ffe600] text-[10px] font-bold leading-none shadow-[2px_2px_0_#000]" title="Tarik untuk ubah ukuran">
          ◢
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 font-mono text-[10px] opacity-60">
        <span>◢ Tarik pojok untuk resize · Geser header kuning untuk pindah</span>
        <button onClick={() => setShowInfo(true)} className="border-2 border-black bg-white px-2 py-0.5 font-bold">
          ⓘ BANTUAN
        </button>
      </div>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} serverUrl={serverUrl} />}
      {showOnboarding && (
        <OnboardingModal
          serverUrl={serverUrl}
          onDone={() => {
            setShowOnboarding(false)
            window.api?.setOnboardingDone?.()
          }}
        />
      )}
    </div>
  )
}
