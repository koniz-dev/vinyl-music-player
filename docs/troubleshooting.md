# Troubleshooting

## Browser support matrix

| Browser | Audio playback | Lyrics | WebM export | MP4 export |
|---|:-:|:-:|:-:|:-:|
| Chrome 60+ | ✅ | ✅ | ✅ | ✅ Chrome 126+ |
| Edge 79+ | ✅ | ✅ | ✅ | ✅ Edge 126+ |
| Firefox 55+ | ✅ | ✅ | ✅ | ❌ — the MP4 toggle is disabled automatically |
| Safari 14+ | ✅ | ✅ | ⚠️ partial — `MediaRecorder` lacks WebM support on some versions | ✅ |

Use the **Check Browser Support** button in the settings panel to see which codecs your browser exposes.

## Common issues

### Page is blank / "Failed to load module"

You probably opened `index.html` directly via `file://`. ES modules require an HTTP origin. Run `npm run dev` and visit `http://localhost:3000`.

### Audio not playing

- Some browsers block autoplay until the user clicks the page. Click anywhere on the player, then press play.
- Try a different file — corrupted or DRM-protected files won't decode.
- Check the browser console for decoding errors.

### Lyrics don't appear during playback

- Verify the time format is exactly `mm:ss` (e.g. `01:30`, not `1:30` or `90` or `00:01:30`).
- Make sure `start` is strictly less than `end`.
- The current audio time has to fall inside `[start, end)`.
- Empty `text` is silently dropped.

### Vinyl record doesn't spin

The vinyl animation only runs while `isPlaying` is true. If audio is paused or hasn't loaded, the record stops. Click play.

### Export button stays disabled

The button enables once an audio file is loaded. If you removed the audio (✕ on the upload area), re-add it. The MP4/WebM format buttons can also be individually disabled when the browser can't record that container — that's per-format, not the export button itself.

### Export fails or hangs

- Watch the browser console — `EXPORT_ERROR` events log the reason.
- The export timeout scales with the audio length (track duration + 60s), so long tracks complete normally. A stall watchdog aborts if playback silently freezes.
- If `MediaRecorder.isTypeSupported('video/webm')` returns `false`, your browser can't export. Switch to Chrome / Firefox / Edge.
- Disabling browser extensions (especially ad blockers and privacy ones that touch `MediaStream`) sometimes fixes weird stream errors.

### Exported video has no audio

Browser quirk — `createMediaElementSource` is sometimes blocked if the audio file uses unusual codecs. Re-encode the file as standard MP3:

```bash
ffmpeg -i input.m4a -codec:a libmp3lame -b:a 192k output.mp3
```

### Auto-sync (AI panel) fails or never finishes

- The first run needs internet — the AI library loads from jsDelivr and the ~40 MB Whisper model from the Hugging Face Hub. Ad blockers / strict privacy extensions sometimes block those CDNs; whitelist them or try another browser profile. After the first successful run everything is cached and works offline.
- Privacy note: your audio and lyrics never leave the device, but those first-run CDN requests do reveal your IP and basic request metadata to jsDelivr / Hugging Face — the same as loading any website asset.
- Auto-sync caps audio at 30 minutes (it's built for songs); longer files are rejected with an error before any heavy work starts.
- "Transcribing…" can legitimately take a few minutes on long songs without WebGPU (Whisper runs on CPU via WASM then). Chrome/Edge on a machine with a GPU is the fast path.
- Sync needs a decodable audio file — the same DRM/codec limits as playback apply.

### Auto-sync timings are off / lines didn't match

- Whisper hears the *vocals* — intros, instrumentals, and ad-libs aren't in the transcript, so lines that aren't actually sung get interpolated guesses.
- Make sure the typed lyrics match what's sung (same language, same words, no section headers like `[Chorus]`).
- Dense mixes and heavy effects lower transcription accuracy; treat the result as a first pass and fine-tune by ear.

### Color / font / ratio / format choices don't persist

Color overrides, the player font, aspect ratio, and video format are saved in `localStorage`. If your browser is in private/incognito mode (or you've disabled storage for the origin), they reset every load. This is expected.

### Exported video shows the wrong font

Non-default player fonts are fetched from Google Fonts and embedded into the export at setup. If the network is unavailable at that moment (and the font files aren't yet in the browser's HTTP cache), the export proceeds with the system fallback font instead of failing.

### Service worker keeps serving old code

After a code change, hard-reload with **Ctrl + Shift + R** (or DevTools → Application → Service Workers → Update). For a permanent fix, bump `CACHE_VERSION` in `service-worker.js` before deploying.

## Still stuck?

Open an issue with:

- Your browser + version
- A copy-paste of the **Check Browser Support** output
- A console screenshot (DevTools → Console)
- Steps to reproduce

→ [github.com/koniz-dev/vinyl-music-player/issues](https://github.com/koniz-dev/vinyl-music-player/issues)
