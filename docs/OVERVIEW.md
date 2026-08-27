# Project Overview — livechat-floating

### What it is
**Livechat Floating OBS Plugin** — Electron + OBS Browser Source overlay for single-monitor streamers. Floating, resizable, draggable, alwaysOnTop chat that stays over game + OBS. Controls: opacity 5–100% (window-level `win.setOpacity`), width/height live, chat style (radius, font size, text/bubble/wrapper/rectangle colors, weight, italic). Runs with no manual server: Electron auto-serves `http://localhost:13415` (dynamic fallback) — OBS Browser Source just pastes that URL. Data via YouTube `live_chat?is_popout=1&v=` webview (bypass `X-Frame-Options`) with neobrutalism CSS injection; legacy `liveChatMessages.list` poller kept for API mode.

### Key Technologies
- **Electron 44 + electron-vite 5 + electron-builder** — desktop shell, window (`frame:false`, `alwaysOnTop:'screen-saver'`, `webviewTag`), auto localhost serve, installer (`AGENTS.md` bun-only, `scripts/patch-electron-vite.js` for SSR `noExternal` fix).
- **Vite 5.4 + React 19 + TypeScript** — overlay UI, onboarding 2-step (`onboardingDone` persisted).
- **Tailwind 4** — neobrutalism tokens via CSS vars (`border-[3px]`, `shadow-[6px_6px_0_#000]`, `Space Grotesk`/`JetBrains Mono`).
- **electron-store** — persisted `opacity/width/height/videoId/style/onboardingDone` (survives restart), `win.setBackgroundColor`/`setOpacity` sync.
- **YouTube** — `live_chat` webview primary, `liveChatMessages.list` (adaptive `pollingIntervalMillis`, `nextPageToken`, IPC fan-out) fallback.

### Repository Structure
```
livechat-floating/
├── AGENTS.md                 # bun-only, type: module
├── package.json              # bun, electron in dependencies, postinstall patch
├── electron.vite.config.ts   # main/preload/renderer (as unknown cast)
├── scripts/patch-electron-vite.js
├── src/
│   ├── main/                 # window, localhost server, YT poller, IPC, store
│   │   ├── index.ts
│   │   ├── server.ts         # embedded http, port 13415+, /overlay-state
│   │   └── youtube-poller.ts
│   ├── preload/index.ts      # contextBridge, updateStyle, onboarding
│   └── renderer/
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx           # floating chat, config, webview, onboarding
│       └── styles.css
├── out/                      # electron-vite build (main/index.js, preload/index.mjs, renderer/)
├── ai-artifacts/             # epics/stories, sprint-status.yaml
└── docs/
    ├── OVERVIEW.md
    ├── ROADMAP.md
    └── research/overlay-research.md
```

### How to Get Started
```bash
bun install          # runs postinstall: patch + electron install
bun run dev          # Electron + Vite HMR, overlay at http://localhost:13415 (+13416 fallback)
bun run build        # electron-vite build -> out/
bun run typecheck    # tsc --noEmit
```
First run shows onboarding (2 langkah: pasang ke OBS → atur ukuran). Link YouTube kosong shows `Tidak Ada Livechat`. Settings persist via `electron-store` (`~/Library/Application Support/livechat-floating` on macOS).

### Runtime Facts
- **CEF OBS 30+ ~ Chrome 111.** YT webview CSS via `webview.insertCSS`/`executeJavaScript` after `dom-ready`.
- **AlwaysOnTop** via `setAlwaysOnTop(true,'screen-saver')` + `setVisibleOnAllWorkspaces(true)` + toggle `handle`.
- **Wrapper/rectangle colors** via `style.wrapperBg/containerBg` (+ `bgColor`/`textColor`/`radius`/`fontSize`/weight).
- **Resize** native `resizable:true` + ◢ hint; **minimize/close** via IPC; hamburger at narrow width.
