# Project Roadmap
**Last Updated:** 2026-08-27
**Total Epics:** 1

---

### EPIC-01: Livechat Floating OBS Plugin
- **Status:** DONE
- **Priority:** HIGH
- **Description:** Single-monitor floating livechat — opacity, size, style, alwaysOnTop, drag, no manual server.
- **Effort Estimate:** 4 - 6 Weeks (1-2 dev + QA) — completed as 2 stories + follow-ups.

#### Stories
- **1.1 Research untuk bagaimana membuat OBS Plugin untuk hook css ke webhook yang akan merender dan pooling** — DONE — `docs/research/overlay-research.md` (OBS C++ vs Browser Source vs Dock vs obs-websocket, CSS hook, webhook pipeline, polling strategy).
- **1.2 Scaffold Electron + Vite Overlay — floating resizable opacity localhost serve neobrutalism** — DONE — Electron + Vite + Tailwind, auto `localhost:13415` serve, frameless alwaysOnTop, IPC state, webview `live_chat` neobrutalism, hamburger, persists via `electron-store`, onboarding, wrapper/rectangle colors. Build 18.70kB CSS / 566kB JS.

#### Follow-ups shipped (post 1.2)
- Fix `frame:false` drag + `no-drag` buttons (minimize/close always clickable).
- Fix `X-Frame-Options` blank via `webview` + `insertCSS` after `dom-ready`.
- Fix height cropped (`h-screen` + `min-h-0 flex-1`), paste auto-hide, copy link/css removal, responsive paste row.
- Fix opacity to `win.setOpacity` (wrapper) with `win.setBackgroundColor` for wrapper color.
- Chat style `radius/fontSize/textColor/bgColor/wrapperBg/containerBg/weight/italic` + `ColorField` modal (z fix) + grid row layout.
- Onboarding 2 langkah (`serverUrl` step 1: Browser Source `localhost`, step 2: tarik ◢) with `onboardingDone` persist.
- Info modal step 4 now shows clickable `serverUrl` + Copy.
