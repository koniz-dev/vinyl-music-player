# Architecture

A static web app — HTML + CSS + ES modules, no backend, no build step. Two panels live in one window and talk to each other through an in-process event bus.

## File layout

```
vinyl-music-player/
├── index.html              # Shell — loads js/main.js as a module
├── service-worker.js       # Offline app-shell cache (stale-while-revalidate)
├── favicon/                # Favicons + web manifest
├── js/
│   ├── main.js             # Entry — kicks off each subsystem
│   ├── lib/
│   │   ├── events.js       # Pub/sub bus + Events enum
│   │   ├── state.js        # Shared mutable state
│   │   └── format.js       # mm:ss helpers
│   ├── player.js           # Audio playback + vinyl UI + lyrics display
│   ├── album-art.js        # Album art DOM updates (used by player.js)
│   ├── settings.js         # Form, uploads, lyrics CRUD, ratio/format toggles, export UI
│   ├── color-manager.js    # Color overrides + accent sync + history
│   ├── export.js           # Canvas + MediaRecorder MP4/WebM exporter
│   ├── theme.js            # Derives the accent color from the album art
│   ├── drawer.js           # Settings drawer open/close
│   ├── toast.js            # Toast notifications
│   ├── icons.js            # Inline SVG icon registry + static hydration
│   └── vendor/
│       └── html-to-image.js  # Vendored DOM→canvas capture (ESM + UMD copies)
└── styles/
    ├── common.css          # Design tokens + form/upload primitives
    ├── index.css           # Page layout
    ├── settings.css        # Settings panel
    ├── toast.css           # Toasts
    └── vinyl-player.css    # Vinyl player
```

## Module communication

Both panels live in the same `window`. Rather than wire them up with `window.postMessage` (which would only make sense across frames), they share an in-process pub/sub bus.

```js
// js/lib/events.js
import { emit, on, Events } from './lib/events.js';

emit(Events.UPDATE_LYRICS, [...]);     // settings.js publishes
on(Events.UPDATE_LYRICS, fn);          // player.js subscribes
```

Event names live in a frozen `Events` object so misspellings fail loudly.

| Event | Producer | Consumer | Payload |
|---|---|---|---|
| `PLAY_FILE` | `settings.js` | `player.js` | `{audioUrl, songTitle, artistName, albumArtUrl?}` |
| `STOP_PLAYBACK` | `settings.js` | `player.js` | – |
| `UPDATE_SONG_TITLE` | `settings.js` | `player.js` | `string` |
| `UPDATE_ARTIST_NAME` | `settings.js` | `player.js` | `string` |
| `UPDATE_ALBUM_ART` | `settings.js` | `player.js`, `theme.js` | `string \| null` (blob URL) |
| `CLEAR_ALBUM_ART` | `settings.js` | `player.js` | – |
| `UPDATE_LYRICS` | `settings.js` | `player.js` | `{start, end, text}[]` |
| `UPDATE_LYRICS_COLOR` | `color-manager.js` | `player.js` | hex string |
| `UPDATE_ASPECT_RATIO` | `settings.js` | – (none yet) | ratio key, e.g. `'9:16'` |
| `ACCENT_DERIVED` | `theme.js` | `color-manager.js` | hex string |
| `ACCENT_OVERRIDE_CLEARED` | `color-manager.js` | `theme.js` | – |
| `EXPORT_REQUESTED` | `settings.js` | `export.js` | `{audioFile, songTitle, artistName, albumArtFile}` |
| `EXPORT_CANCEL` | `settings.js` | `export.js` | – |
| `EXPORT_CANCELLED` | `export.js` | `settings.js` | – |
| `EXPORT_PROGRESS` | `export.js` | `settings.js` | `{progress, message}` |
| `EXPORT_COMPLETE` | `export.js` | `settings.js` | `{videoBlob, fileName}` |
| `EXPORT_ERROR` | `export.js` | `settings.js` | `string` |
| `DEBUG_BROWSER_SUPPORT` | `settings.js` | `export.js` | – |

## Shared state

`js/lib/state.js` exports a single mutable object:

```js
export const state = {
    isPlaying: false,
    currentTime: 0,
    totalTime: 0,
    isRepeat: false,
    isExporting: false,
    audioElement: null,
    lyrics: [],
    lyricsColor: '#ffb3d1',
    aspectRatio: '9:16',
    videoFormat: 'webm',
};
```

Modules import it directly. There's no reactivity layer — consumers re-read on each event.

The same module also exports the shared constants `RATIOS` (canvas dimensions per
aspect ratio — native platform upload resolutions) and `FORMATS` (export container
formats with their `MediaRecorder` codec candidate lists), plus their defaults.

## Export pipeline

`js/export.js` is the most complex module. It:

1. Creates an off-screen canvas at the selected ratio's native resolution (e.g. 1080×1920 for 9:16; see `RATIOS` in `js/lib/state.js`)
2. Loads the audio into a hidden `Audio` element
3. Captures the live `.frame` DOM into static layers via html-to-image: the base (everything except vinyl/sheen/tonearm, refreshed ~1×/s for lyrics/progress) plus the vinyl, sheen, and tonearm as separate bitmaps
4. Wires the canvas's `captureStream()` + the audio's `MediaStreamDestination` into a `MediaStream`
5. Starts a `MediaRecorder` against that stream — codec candidates come from `FORMATS` in `js/lib/state.js` (MP4/H.264 where the browser can mux it, falling back to WebM)
6. Composites the layers onto the canvas with `requestAnimationFrame` — the vinyl's rotation angle is derived from the audio's `currentTime`, so it's smooth and deterministic — until the audio ends
7. Emits `EXPORT_COMPLETE` with the resulting Blob

The hybrid approach (cheap per-frame canvas composite + occasional DOM capture) keeps the recording at a steady 30 fps: the expensive html-to-image work never runs on the per-frame path.

While exporting, the editor preview is driven from the same `exportAudio` clock (vinyl angle, lyrics, progress bar, time labels — see `syncLiveDomToExportAudio`), so what you watch is exactly what's being recorded, starting from 0° / 0:00. In the settings panel the export button itself doubles as the progress bar (fill width + label driven by `EXPORT_PROGRESS`; clicking it mid-export cancels).

## PWA / offline

- `service-worker.js` pre-caches the app shell on `install` and serves it stale-while-revalidate on `fetch`.
- After the first load, the site works offline (only your own audio/image files remain dynamic — they're already local Blobs).
- Bump `CACHE_VERSION` on releases to invalidate clients.

## Why no build step

The app is small enough that splitting concerns at the file boundary is fine. ES modules give:

- Real imports/exports (no global pollution)
- Tree-shaking-by-not-importing (you only ship what you use)
- Source maps "for free" — files are exactly what you wrote

A bundler would add complexity without measurable benefit for this scale.
