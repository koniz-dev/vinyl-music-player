# Getting Started

Vinyl Music Player is a single-page web app. There's no build step and no backend — just static files served over HTTP.

## Prerequisites

- A modern browser (Chrome 60+, Firefox 55+, Edge 79+, Safari 14+)
- Node.js ≥ 16 (only needed to run the local dev server)

## Install and run

```bash
git clone https://github.com/koniz-dev/vinyl-music-player.git
cd vinyl-music-player
npm install
npm run dev
```

`npm run dev` starts [http-server](https://www.npmjs.com/package/http-server) on port 3000 with cache disabled and opens your default browser at `http://localhost:3000`.

> The app uses native ES modules. Opening `index.html` directly via `file://` will **not** work — the browser refuses to load modules without a proper HTTP origin.

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start dev server on port 3000 with auto-open |
| `npm start` | Same server, no auto-open |
| `npm run serve` | Start server on port 8080 instead |
| `npm run preview` | Alias of `start` |

## First export — 60 seconds

1. Drop or pick an MP3 in the **Audio file** upload area in the Song section.
2. Optionally type a song title / artist name and upload an album cover.
3. Add lyrics (see [Usage](usage.md#lyrics)) or skip.
4. In the Export section, pick an aspect ratio and a video format (MP4 or WebM).
5. Click **Export MP4** / **Export WebM**. The button fills up as progress runs; the download starts automatically at 100%.

The default output is a 1080×1920 vertical video (native TikTok / Reels / Shorts size), ready to upload. Other ratios use their platform-native resolutions too.

## Try the live demo

If you don't want to clone, hit the deployed copy: **<https://koniz-dev.github.io/vinyl-music-player/>**

Everything runs locally in your browser — your audio file never leaves your device.

## Next steps

- **[Usage guide](usage.md)** — full UI walkthrough
- **[JSON lyrics format](json-lyrics-format.md)** — bulk-import lyrics
- **[Troubleshooting](troubleshooting.md)** — fix common issues
