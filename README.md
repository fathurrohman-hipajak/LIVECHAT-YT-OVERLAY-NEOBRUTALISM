# livechat-floating

Single-monitor live chat overlay. Electron floating window + OBS Browser Source. Paste a YouTube live link, chat renders via webview, style collapses neobrutalism, keeps always on top, opacity and size adjustable without restart.

## Features

- Floating always-on-top window, frameless, resizable via native edges and corner handle. Yank header bar to move (wrap header draggable, controls isolated as no-drag).
- Opacity slider controls native window opacity via `BrowserWindow.setOpacity`, so the entire wrapper fades uniformly.
- Live chat via YouTube `live_chat?is_popout=1&v=` in an Electron `webview` (bypasses `X-Frame-Options`). Neobrutalism styling injected after `dom-ready` and on style change. Fallback message for non-Electron contexts and OBS Browser Source.
- Chat style controls: border radius, font size, text color, chat bubble background, wrapper background, chat container background, font weight, italic. All persisted.
- Window controls in header: hide/show settings, PIN toggle (`alwaysOnTop` via `setAlwaysOnTop('screen-saver')` + `setVisibleOnAllWorkspaces` + `moveTop`), minimize, close. Hamburger menu at narrow width to avoid overflow.
- Paste bar for YouTube URLs accepts full watch links, `youtu.be`, bare video IDs, or `/live/` paths. Paste then "Tampilkan" hides the config panel together with the brightness controls. Empty state shows a single line without extra guidance.
- Two-step onboarding on first launch: step 1 Browser Source with the auto localhost URL, step 2 resize hint. Dismiss with "Sudah paham" persists `onboardingDone`, not shown again. Info modal with the same help text.
- OBS integration without manual server: Electron serves built renderer at `http://localhost:13415` (auto increments on conflict) and exposes `GET /overlay-state` for opacity/size/style sync. Info step 4 shows the same localhost link with copy.
- Persistence via `electron-store` for opacity, width, height, videoId, style, onboarding flag. Restores window background and opacity on next open.

## Stack

- Electron 44, electron-vite 5, electron-builder, Vite 5.4, React 19, TypeScript, Tailwind 4.
- `AGENTS.md` enforces bun only. Postinstall patches `electron-vite` SSR `noExternal` to keep `electron` external and re-runs `electron/install.js` for space-containing paths.

## Requirements

- Node 20+, Bun 1.0+, macOS or Windows or Linux with Electron support.
- No YouTube API key required for the webview path.

## Setup

```
bun install
bun run dev        # runs patched postinstall then electron-vite dev (Vite at 5173, overlay at 13415)
bun run build      # electron-vite build to out/
bun run typecheck  # tsc --noEmit
```

First run shows the onboarding. Paste a YouTube live link in the input and press Tampilkan.

## Usage

- Window: drag the yellow header bar to move, drag edges or the bottom-right corner mark to resize.
- Config: brightness slider, width and height number inputs, four color pickers (text, chat bubble, wrapper, container), radius and font size sliders, weight and italic selects. Pickers open in a fixed modal above all overlays, no clipping.
- PIN: toggles always-on-top. When active, the window stays above the game and OBS.
- To OBS: add a Browser Source and paste the same `http://localhost:13415` URL shown in onboarding step 1 and info step 4. Reuse the same link.

## Project structure

```
electron.vite.config.ts  # main/preload/renderer, casts to allow build
scripts/patch-electron-vite.js
src/main/                # window, localhost server, YouTube poller, IPC, electron-store, webviewTag
src/preload/             # contextBridge surface for opacity/size/videoId/style/onboarding
src/renderer/            # Vite React overlay
out/                     # build output (generated)
ai-artifacts/            # planning and story artifacts, ignored in git
docs/                    # research and roadmap
```

## Build notes

- Dev uses `ELECTRON_RENDERER_URL`, prod loads `out/renderer/index.html`.
- `electron-vite` SSR preset sets `ssr.noExternal = true` by default, which would bundle `electron/index.js` (installer helper). The postinstall patch sets `ssr.noExternal = []` and `ssr.external = ['electron','electron/*']` so the main build keeps `import { app } from "electron"` external.
- Keeping this project at `vite 5.4` and `@vitejs/plugin-react 4.3.4` avoids the `ERR_PACKAGE_PATH_NOT_EXPORTED` for `vite/internal` seen with Vite 8 plus plugin 6.

## License

ISC.
