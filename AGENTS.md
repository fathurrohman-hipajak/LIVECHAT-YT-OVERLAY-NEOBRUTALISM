# AGENTS.md — livechat-floating

> Read this before any task. Enforced.

## Package Manager — Bun only

- **Use `bun` for everything.** `bun install`, `bun run`, `bunx`, `bun --bun`.
- **Do NOT use `npm`, `yarn`, `pnpm`, `npx`.**
- `package.json` declares `"packageManager": "bun"` and `engines.bun >=1.0`.
- If a doc or script still says `npm` — fix it to `bun`.

## What this project is

**Livechat Floating OBS Plugin** — Electron + OBS Browser Source overlay for single-monitor streamers.

- Floating, resizable, draggable, **alwaysOnTop** chat window that stays over game + OBS.
- Controls: **opacity (0–100%), width, height** live without restart.
- Style: **neobrutalism** (thick borders, hard shadows, high-contrast palette).
- Runs with **no manual server**: Electron auto-serves built overlay on `http://localhost:{port}`. OBS just adds Browser Source → that URL.
- Data: **YouTube `liveChatMessages.list`** polling in Electron main (adaptive `pollingIntervalMillis`, `nextPageToken` chaining, WS/IPC fan-out to renderer + Browser Source). See `docs/research/overlay-research.md`.

## Stack

- **Electron + electron-vite + electron-builder** — desktop shell, auto localhost serve, installer.
- **Vite + React + TypeScript** — overlay UI.
- **Tailwind CSS** — styling, neobrutalism tokens via CSS vars.
- **YouTube Data API v3 (googleapis)** — live chat poller.

## Structure

```
livechat-floating/
├── AGENTS.md                 # this file — always use bun
├── package.json              # bun-only, type: module
├── electron.vite.config.ts   # electron-vite (main/preload/renderer)
├── tsconfig.json
├── tailwind.config.ts
├── src/
│   ├── main/                 # Electron main — window, localhost server, YT polling, IPC
│   │   ├── index.ts
│   │   ├── server.ts         # embedded static HTTP serving dist/ on dynamic port
│   │   └── youtube-poller.ts # liveChatMessages.list + nextPageToken + pollingIntervalMillis
│   ├── preload/              # contextBridge, contextIsolation
│   │   └── index.ts
│   └── renderer/             # Vite React overlay
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx           # floating chat + controls (opacity/size/neobrutalism)
│       └── styles.css        # Tailwind + neobrutalism tokens
├── resources/                # icons for electron-builder
├── docs/
│   ├── OVERVIEW.md
│   ├── ROADMAP.md
│   └── research/overlay-research.md  # Story 1.1 research (OBS docs, YT polling, CSS hook)
├── ai-artifacts/             # BMAD epics/stories, dumps
└── dist/                     # build output (generated)
```

## Key runtime facts (from research)

- **CEF in OBS 30+ ≈ Chrome 111.** Test CSS there.
- **Browser Source alone cannot go OS alwaysOnTop** — needs Electron window with `alwaysOnTop:true, frame:false, transparent` (`WS_EX_TOPMOST` / `NSWindowLevelFloating`).
- **Quota:** treat `liveChatMessages.list` as **5 units/call**, 10k/day default. Single poller in main + fan-out via IPC/WS. Respect `pollingIntervalMillis` (1500–5000ms), never hardcode.
- **Opacity/size sync:** CSS vars `--overlay-opacity/--overlay-w` updated live via IPC; OBS Browser Source subscribes via `GET /overlay-state` or WS so no reload needed. Prefer CSS `opacity` over OBS `color_correction` filter.
- **Neobrutalism:** `border-[3px] border-black shadow-[6px_6px_0_#000]`, palette yellow/cyan/violet, `Space Grotesk` / `JetBrains Mono`.

## Commands (bun)

```bash
bun install          # install
bun run dev          # Electron + Vite HMR (exposes localhost for OBS testing)
bun run build        # electron-vite build
bun run preview      # preview packaged
bun run build:installer  # electron-builder installer
bun run typecheck
```

In production `main` serves `dist/renderer` via embedded http on `app.whenReady()` — no manual server.

## Conventions

- Story lifecycle: `ready-for-dev → in-progress → review → done`. Use `workflow_status`, `workflow_story_tasks`.
- Keep `docs/research/overlay-research.md` authoritative for OBS/YT decisions.
- No `npm` lockfiles. Commit `bun.lockb`.
