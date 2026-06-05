# TODO — UX + free-AI roadmap

> Research findings from June 2026. Each item carries enough technical pointers to skip re-researching later.
> House rules for every item: bump `CACHE_VERSION` (service-worker.js), add new JS files
> to `PRECACHE`, add new external hosts to the CSP (meta tag in index.html).

## Wave 1 — Quick wins (kill data-entry friction)

- [ ] **ID3 autofill** — read metadata from the uploaded MP3: title (TIT2), artist (TPE1), embedded album art (APIC).
  - Hand-roll an ID3v2 parser (~100 lines, no dependency — fits the repo's vendored style). `ID3` header + syncsafe size; APIC frame holds MIME + image bytes → Blob → reuse the existing album-art load path in `settings.js`.
  - Only autofill empty fields; never overwrite user-typed input.

- [ ] **LRCLIB — fetch pre-synced lyrics** (free, no key, no rate limit, CORS `*` — verified live; Vietnamese catalog exists: Sơn Tùng M-TP has syncedLyrics).
  - `GET https://lrclib.net/api/get?artist_name=&track_name=&album_name=&duration=` (exact match, duration in seconds) or `GET /api/search?q=` (returns an array; `syncedLyrics` is LRC `[mm:ss.xx] text`, `plainLyrics` when unsynced). Docs: https://lrclib.net/docs — send a `Lrclib-Client: vinyl-music-player` header.
  - CSP: add `https://lrclib.net` to `connect-src`.
  - UI: a "Find lyrics" button in the Lyrics section (next to Auto-sync); multiple hits → picker modal. Whisper auto-sync stays as the fallback when nothing matches.
  - ⚠️ Privacy: the app advertises "nothing is uploaded" — this sends track/artist names (never audio) → make it clearly opt-in, note it in UI + docs.

- [ ] **Import/Export `.lrc`** — the standard interop format for lyric tools (and what LRCLIB returns → write the parser once, use it twice).
  - Parser is ~20 lines: `[mm:ss.xx]` → `{start, end, text}`; end = next line's start (last line = duration). Export is the reverse from `state.lyrics`.
  - Add to the existing Import modal (next to JSON) + an export button.

- [ ] **"Auto palette" from album art** — first chip in Palette: extract 6 colors from the artwork (simple k-means/median-cut), map to accent/title/artist/lyrics/bg/vinyl.
  - `theme.js` already extracts the accent from album art — extend that rather than writing anew. Apply through `color-manager.js`'s `setColor()` (persists + updates UI for free). Guard contrast: bg = darkest tone further darkened, title = lightest.

- [ ] **Palette hover preview** — hovering a chip applies the colors temporarily (no persist), leaving reverts; only click persists. Just set/remove the CSS vars directly, don't touch `overrides`.

- [ ] **Keyboard shortcuts** — Space play/pause, ←/→ seek ±5s, only when focus is outside input/textarea.

## Wave 2 — Exported-video quality

- [ ] **Audio-reactive visualizer** — spectrum ring / beat-driven glow around the vinyl.
  - Web Audio `AnalyserNode` (FFT ~64–128 bins is plenty). Export: `export.js` already owns an `audioCtx` + per-frame canvas drawing in `drawFrame()` → draw it there (per-frame path must stay cheap — `getByteFrequencyData` + arc drawing only, fine). Live preview: its own rAF loop in the player.
  - Appearance toggle, default off so existing behavior is unchanged.

- [ ] **Trim/segment export** — export a chosen 15–30 s slice instead of the whole song (TikTok/Reels only need the hook; export gets faster too).
  - `export.js`: seek `exportAudio.currentTime = start` before recording, stop at `end`. UI: two mm:ss inputs or a range slider in the Export section. Lyrics/progress are already driven from `exportAudio` time, so they stay correct automatically.

- [ ] **Karaoke word-highlighting** — highlight each word as it's sung.
  - Whisper already returns word-level timestamps — `autosync.js` uses them for alignment (Needleman-Wunsch) and throws them away; keep them as `state.lyrics[i].words`.
  - ⚠️ The hard part is export: lyrics live in the base layer refreshed 1×/s → smooth highlighting means pulling lyrics out into per-frame canvas `fillText` (font/size/shadow mirrored from CSS by hand). Touches the most fragile part of `export.js` — do last, and compare a reference export before/after.

## Wave 3 — AI wow

- [ ] **AI theme suggestion from the music's mood** — listen to the first ~30 s → map mood onto the existing 8 palettes + 9 fonts (e.g. ballad → Rose Noir + Playfair Display).
  - transformers.js `audio-classification` pipeline, AST finetuned on AudioSet (`MIT/ast-finetuned-audioset-10-10-0.4593`, ~90 MB q8). Reuse the 16 kHz mono decode path + worker pattern from `autosync.js`/`whisper-worker.js` (the SW-injected worker CSP already covers cdn.jsdelivr.net + the HF Hub).
  - The AudioSet-label → palette/font-key mapping is a hand-written table; no extra model needed.

- [ ] **Pollinations.ai — AI album art** (no key, no signup, Flux model free/unlimited — still free as of 2026).
  - It's just an image URL: `https://image.pollinations.ai/prompt/<encoded-prompt>?width=1024&height=1024&nologo=true`. CSP: add `https://image.pollinations.ai` to `img-src` (+ `connect-src` if fetching to a blob to reuse the album-art pipeline).
  - UI: a small prompt input inside the album-art drop zone when no image is set. ⚠️ Opt-in (the prompt leaves the device) + third-party dependency — on failure, fall back silently to the placeholder.

- [ ] **Whisper model tier** — let users pick `tiny` (~40 MB, current) / `small` (~250 MB) for better Vietnamese accuracy. Same pipeline in `whisper-worker.js`, just a different model id + a first-download size warning. Persist the choice in localStorage.

- [ ] **Bilingual lyrics translation** (low priority) — transformers.js opus-mt, ~50 MB per language pair; render two lyric lines. Niche — only if real demand shows up.

## Not now (watch list)

- **Vocal separation (source separation) to boost Whisper accuracy** — transformers.js doesn't support it yet (xenova/transformers.js#788); Demucs v4 → ONNX is an in-progress Mixxx GSoC project. Revisit once a browser-ready ONNX model actually ships.
