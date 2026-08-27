# Changelog

All notable changes to this project follow Keep a Changelog and Semantic Versioning.

## [1.0.0] - 2026-08-27

Initial production release.

### Added

- Always-on-top floating window (`BrowserWindow` `alwaysOnTop: 'screen-saver'` + `setVisibleOnAllWorkspaces(true)`), frameless, resizable via native edges and corner handle indicator. Drag via header bar.
- YouTube Live Chat via `webview` loading `https://www.youtube.com/live_chat?is_popout=1&v=` after pasting a link, bypassing `X-Frame-Options`. Fallback message for non-Electron contexts and `/overlay-state` sync for OBS Browser Source.
- Neobrutalism chat styling injected after `dom-ready` and on style change: thick borders, hard shadows, Space Grotesk / JetBrains Mono.
- Style controls: border radius, font size, text color, chat bubble background, wrapper background, chat container background, font weight, italic mode. Persisted.
- Opacity slider controlling native window opacity via `win.setOpacity` so the wrapper fades uniformly.
- Header controls: show/hide settings, PIN toggle, minimize, close. Hamburger menu at narrow width.
- Paste bar accepting full watch links, `youtu.be`, bare video IDs, `/live/` paths. Empty state shows "Tidak Ada Livechat".
- Two-step onboarding on first launch (Browser Source with auto `http://localhost:13415` then resize hint). Persisted `onboardingDone`.
- Auto localhost serve of built renderer and `GET /overlay-state` for OBS sync. Dynamic port fallback.
- Persistence via `electron-store` for opacity, dimensions, videoId, style, onboarding flag. Restores background and opacity on next open.
- Build pipeline: electron-vite 5, Vite 5.4, React 19, Tailwind 4, TypeScript. Bunny-enforced package manager with postinstall patch for `electron` external.

### Fixed

- Patched `electron-vite` SSR `noExternal` to keep `electron` external so the main bundle stays `import { app } from "electron"`.
- Handled space-containing project paths by re-running `electron/install.js` on postinstall.

### Notes

- Version set to `1.0.0` with `private: false` for GitHub release publishing. No YouTube API key required for the webview path.
