# Roadmap — UX, export reliability, and free-AI

> Last reviewed: 2026-09-25. This is an execution backlog, not a research dump.
> A task may move to Done only after its acceptance criteria, browser verification, and applicable release notes are complete.

## Delivery rules (do not miss these)

- [x] **PWA:** `v101` precache covers every local module; hard refresh verified locally; `npm test` asserts every precached local path exists; `?pwa-smoke=1` verifies cached app-shell fetches; an app-shell reload also passed after the local test server was stopped.
- [x] **In-app guidance:** section-local Help icons launch five focused walkthroughs (Basics, Artwork, Lyrics, Appearance, Export). Each spotlights one real control, says exactly what to click and why, and provides Next/Skip without a global launcher or a 28-step session.
- [x] **App theme:** global System, Dark, and Light controls live in the top-left app bar, persist locally, and stay independent from video palette controls.
- [x] **Privacy:** optional LRCLIB/Pollinations requests are confirmed in UI, disclose provider/fields in docs, and are allowlisted in CSP; model/font downloads are initiated only by their optional controls and never include audio.
- [x] **Export:** browser fallback is documented in `docs/troubleshooting.md`; unsupported MP4 controls are disabled and the generated extension follows the recorder MIME.
- [x] **Regression:** `?smoke=1` created the deterministic five-second WAV and completed an MP4 export (`smoke-tone.mp4`, 2,830,518 bytes); `npm test` covers syntax, parsers, and precache paths.
  - Manual release gates are scripted in `docs/release-checklist.md` (offline PWA, export, and translation first-run).

## Now — P0 (complete the happy path)

- [x] **ID3 autofill** — locally reads title (TIT2), artist (TPE1), and front cover (APIC) without overwriting user-entered fields. Implemented in `js/id3.js`; no dependency or network request.
- [x] **Export codec preflight** — unavailable formats are disabled and the actual recorder MIME controls the download extension.
  - Acceptance: selecting MP4 on a browser without MP4 `MediaRecorder` support cannot produce a mislabeled download.
- [x] **Trim/segment export** — optional start/end fields export just the selected range.
  - Acceptance: validated mm:ss boundaries drive audio, vinyl motion, progress, and lyrics from the selected timestamps.

## Next — P1 (remove input friction)

- [x] **LRCLIB — fetch pre-synced lyrics** — opt-in lookup sends only metadata; audio remains local.
  - `GET https://lrclib.net/api/get?artist_name=&track_name=&album_name=&duration=` (exact match, duration in seconds) or `GET /api/search?q=` (returns an array; `syncedLyrics` is LRC `[mm:ss.xx] text`, `plainLyrics` when unsynced). Docs: https://lrclib.net/docs — send a `Lrclib-Client: vinyl-music-player` header.
  - CSP: add `https://lrclib.net` to `connect-src`.
  - UI: a "Find lyrics" button in the Lyrics section (next to Auto-sync); multiple hits → picker modal. Whisper auto-sync stays as the fallback when nothing matches.
  - ⚠️ Privacy: the app advertises "nothing is uploaded" — this sends track/artist names (never audio) → make it clearly opt-in, note it in UI + docs.

- [x] **Import/Export `.lrc`** — timestamped LRC imports through the existing modal and exports the current lyrics.
  - Parser is ~20 lines: `[mm:ss.xx]` → `{start, end, text}`; end = next line's start (last line = duration). Export is the reverse from `state.lyrics`.
  - Add to the existing Import modal (next to JSON) + an export button.

- [x] **"Auto palette" from album art** — first Palette chip derives a contrast-safe six-color scheme from the artwork accent.
  - `theme.js` already extracts the accent from album art — extend that rather than writing anew. Apply through `color-manager.js`'s `setColor()` (persists + updates UI for free). Guard contrast: bg = darkest tone further darkened, title = lightest.

- [x] **Palette hover preview** — hovering a palette temporarily previews CSS tokens; leaving restores them and only click persists.

- [x] **Keyboard shortcuts** — Space toggles playback and ←/→ seek ±5 seconds outside editable controls.

## Wave 2 — Exported-video quality

- [x] **Audio-reactive visualizer** — optional FFT spectrum ring is rendered in the exported video.
  - Web Audio `AnalyserNode` (FFT 64 bins) draws both the export ring and a matching live preview rAF loop in the player.
  - Appearance toggle, default off so existing behavior is unchanged.

- [x] **Karaoke word-highlighting** — Whisper-aligned word timestamps are retained through the editor; playback uses spans and export uses a per-frame canvas text overlay so highlighting is smooth rather than tied to the 1-second base capture.

## Wave 3 — AI wow

- [x] **Theme suggestion from the music's mood** — a local first-30-second energy/activity analysis maps the track to the existing palettes and fonts (e.g. calm → Rose Noir + Playfair Display) with no model download or network request.

- [x] **Pollinations.ai — AI album art** — opt-in prompt generation, with downloaded artwork applied locally.
  - It's just an image URL: `https://image.pollinations.ai/prompt/<encoded-prompt>?width=1024&height=1024&nologo=true`. CSP: add `https://image.pollinations.ai` to `img-src` (+ `connect-src` if fetching to a blob to reuse the album-art pipeline).
  - UI: a small prompt input inside the album-art drop zone when no image is set. ⚠️ Opt-in (the prompt leaves the device) + third-party dependency — on failure, fall back silently to the placeholder.

- [x] **Whisper model tier** — choose Tiny (~40 MB) or Small (~250 MB); the choice persists and warns before the larger download.

- [x] **Bilingual lyrics translation** — uses the official browser NLLB multilingual model rather than unreliable Marian/Opus-MT. It checks browser storage before the over-1-GB opt-in download and supports removing only its cached model files. First-run Chrome smoke translated “Hello world” to “Chào thế giới”; automated regression confirms removal targets only NLLB entries.

## Not now (watch list)

- **Vocal separation (source separation) to boost Whisper accuracy** — transformers.js doesn't support it yet (xenova/transformers.js#788); Demucs v4 → ONNX is an in-progress Mixxx GSoC project. Revisit once a browser-ready ONNX model actually ships.
