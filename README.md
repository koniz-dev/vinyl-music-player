# 🎵 Vinyl Music Player

> Turn any audio file into a vinyl-spin music video with synced lyrics — **right in your browser**, no upload, no install.

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](https://koniz-dev.github.io/vinyl-music-player/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-offline_ready-5A0FC8?style=for-the-badge)](docs/architecture.md#pwa--offline)
[![No build](https://img.shields.io/badge/build-not_required-blue?style=for-the-badge)](docs/architecture.md#why-no-build-step)

**[Live Demo](https://koniz-dev.github.io/vinyl-music-player/)** · **[Docs](docs/)** · **[Report a Bug](https://github.com/koniz-dev/vinyl-music-player/issues)**

---

Drop in an MP3, type the song title, add timed lyrics, click export. You get a **1080×1920 vertical WebM** ready for TikTok, Reels, or YouTube Shorts. Audio never leaves your device — the whole pipeline (decode, render, encode) runs in the browser.

## Why use this

- 🎬 **Real video export** — Canvas + `MediaRecorder`, not a screen recording
- 📝 **Synced lyrics** — type per-line or bulk-paste JSON; live preview as audio plays
- 🎨 **Live vinyl preview** — record spins, tonearm tracks, lyrics fade in/out
- 🔒 **100% local** — no servers, no uploads, no account
- 📦 **Offline-ready PWA** — works on the train after the first load
- ⚡ **Zero install** — open the [demo](https://koniz-dev.github.io/vinyl-music-player/) and go

## Quickstart

```bash
git clone https://github.com/koniz-dev/vinyl-music-player.git
cd vinyl-music-player
npm install
npm run dev
```

Open <http://localhost:3000>. Need more detail? See [Getting Started](docs/getting-started.md).

> ES modules require an HTTP origin — don't open `index.html` via `file://`.

## Documentation

| | |
|---|---|
| [Getting Started](docs/getting-started.md) | Install, run, first export in 60 s |
| [Usage Guide](docs/usage.md) | UI walkthrough — upload, lyrics, color, export |
| [JSON Lyrics Format](docs/json-lyrics-format.md) | Bulk-import spec, LRC conversion |
| [Architecture](docs/architecture.md) | Modules, event bus, render pipeline |
| [Troubleshooting](docs/troubleshooting.md) | Browser matrix + fixes |
| [Contributing](docs/contributing.md) | Dev workflow + code style |

## Tech

Vanilla HTML / CSS / JavaScript. ES modules, no build step, no backend. Uses `MediaRecorder`, Web Audio, Canvas, and a service worker for offline support. Full breakdown in [docs/architecture.md](docs/architecture.md).

## License

[MIT](LICENSE) © [koniz-dev](https://github.com/koniz-dev)
