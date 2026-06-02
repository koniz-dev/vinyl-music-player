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
│   ├── album-art.js        # Album art DOM updates
│   ├── settings.js         # Form, uploads, lyrics CRUD, export UI
│   ├── color-manager.js    # Lyrics color picker + history
│   ├── export.js           # Canvas + MediaRecorder WebM exporter
│   └── gradient.js         # Random background gradient
└── styles/
    ├── common.css          # Design tokens + form/upload primitives
    ├── index.css           # Page layout
    ├── settings.css        # Settings panel
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
| `UPDATE_SONG_TITLE` | `settings.js` | `player.js` | `string` |
| `UPDATE_ARTIST_NAME` | `settings.js` | `player.js` | `string` |
| `UPDATE_ALBUM_ART` | `settings.js` | `player.js` | `string` (blob URL) |
| `UPDATE_LYRICS` | `settings.js` | `player.js` | `{start, end, text}[]` |
| `UPDATE_LYRICS_COLOR` | `color-manager.js` | `player.js` | hex string |
| `EXPORT_REQUESTED` | `settings.js` | `export.js` | `{audioFile, songTitle, artistName, albumArtFile}` |
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
    isMuted: false,
    isRepeat: false,
    isExporting: false,
    audioElement: null,
    lyrics: [],
    lyricsColor: '#ffb3d1',
};
```

Modules import it directly. There's no reactivity layer — consumers re-read on each event.

## Export pipeline

`js/export.js` is the most complex module. It:

1. Creates an off-screen 720×1280 canvas
2. Loads the album art into an `Image`
3. Loads the audio into a hidden `Audio` element
4. Wires the canvas's `captureStream()` + the audio's `MediaStreamDestination` into a `MediaStream`
5. Starts a `MediaRecorder` against that stream (picks the best WebM codec available)
6. Drives the canvas with `requestAnimationFrame` until the audio's `duration` is reached
7. Emits `EXPORT_COMPLETE` with the resulting Blob

The render function draws everything pixel-by-pixel rather than reusing the live DOM — this lets it run at fixed 30 fps regardless of the player UI's repaint rhythm.

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
