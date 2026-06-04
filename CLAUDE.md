# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vinyl Music Player — a static browser app (vanilla HTML/CSS/JS, ES modules) that turns an audio file into a vinyl-spin music video with synced lyrics, exported as MP4 or WebM (1080×1920 default, other ratios available) via Canvas + MediaRecorder. Everything runs client-side: no backend, no uploads, no build step, no framework. Detailed docs live in `docs/` (`architecture.md` is the most useful).

## Commands

```bash
npm run dev      # http-server on :3000, opens browser, cache disabled
npm start        # same, without opening browser
npm run serve    # :8080 variant
```

- There is **no build step** (`npm run build` is a no-op) and **no test suite** (`npm test` is a no-op). Changes are verified manually: load an MP3, add a title + 2–3 lyric lines, export, and check that audio/lyrics/visuals sync in the resulting WebM.
- ES modules require an HTTP origin — never open `index.html` via `file://`.
- Deploy is automatic: GitHub Pages workflow runs on push to `main`, but **only** when shipped files change (`index.html`, `service-worker.js`, `js/**`, `styles/**`, `favicon/**`). Edits to `docs/` or `README.md` do not trigger a deploy.

## Architecture

Single-page app with two panels (settings + vinyl player) that communicate through an in-process pub/sub bus — never via direct cross-module calls.

- **`js/main.js`** — entry point; initializes each subsystem (theme, player, settings, export, drawer) and registers the service worker.
- **`js/lib/events.js`** — the event bus. Event names live in a frozen `Events` enum. Cross-module state changes go through `emit(Events.X, payload)` / `on(Events.X, fn)`. The full producer/consumer/payload table is in `docs/architecture.md`.
- **`js/lib/state.js`** — single shared mutable state object (playback flags, lyrics, colors, aspect ratio, video format) plus the constants `RATIOS` (export resolutions) and `FORMATS` (MP4/WebM codec candidate lists for MediaRecorder). No reactivity layer; consumers re-read on each event.
- **`js/settings.js`** — form, file uploads, lyrics CRUD, export UI (producer side of most events).
- **`js/player.js`** — audio playback, vinyl UI, lyrics display (consumer side).
- **`js/export.js`** — the most complex and fragile module. Hybrid render pipeline: captures the live `.frame` DOM into static layers via `js/vendor/html-to-image.js` (base layer refreshed ~1×/s; vinyl/sheen/tonearm as separate bitmaps), then composites them onto an off-screen canvas per frame with `requestAnimationFrame`. Vinyl rotation is derived from audio `currentTime` (deterministic). Recorder is locked at 30 fps — keep per-frame work cheap; the expensive html-to-image capture must never run on the per-frame path. Many canvas drawing calls mirror CSS rules, so visual regressions are easy — compare an exported reference video before/after when touching it.
- **`service-worker.js`** — offline PWA cache (stale-while-revalidate).

## Conventions that bite if missed

- **Bump `CACHE_VERSION` in `service-worker.js`** on every user-facing change — otherwise clients keep serving the stale cached app. Recent commit history shows this is done on essentially every release commit.
- **New JS/CSS files must be added to `PRECACHE`** in `service-worker.js` or they won't work offline.
- **Adding an event**: add the constant to `Events` in `js/lib/events.js`, wire `emit`/`on` at the boundaries, and document it in the table in `docs/architecture.md`.
- **Export canvas dimensions** come from `RATIOS` in `js/lib/state.js` — change them there, never inline in `export.js`.
- **DOM elements are cached at module top** (`getElementById`/`querySelector`); don't re-query in hot paths (`renderToCanvas`, `timeupdate` handlers).
- Style: 4-space indentation, single quotes, semicolons (match existing files). Comment only the "why".
- If changing offline behavior: hard reload → airplane mode → refresh, and check DevTools → Application → Service Workers.
