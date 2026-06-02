# Troubleshooting

## Browser support matrix

| Browser | Audio playback | Lyrics | WebM export |
|---|:-:|:-:|:-:|
| Chrome 60+ | ✅ | ✅ | ✅ |
| Edge 79+ | ✅ | ✅ | ✅ |
| Firefox 55+ | ✅ | ✅ | ✅ |
| Safari 14+ | ✅ | ✅ | ⚠️ partial — `MediaRecorder` lacks WebM support on some versions |

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

The button enables only when **both** an audio file and a song title are present. Add a title.

### Export fails or hangs

- Watch the browser console — `EXPORT_ERROR` events log the reason.
- The exporter times out after 5 minutes. For longer tracks, edit `EXPORT_TIMEOUT_MS` in `js/export.js`.
- If `MediaRecorder.isTypeSupported('video/webm')` returns `false`, your browser can't export. Switch to Chrome / Firefox / Edge.
- Disabling browser extensions (especially ad blockers and privacy ones that touch `MediaStream`) sometimes fixes weird stream errors.

### Exported video has no audio

Browser quirk — `createMediaElementSource` is sometimes blocked if the audio file uses unusual codecs. Re-encode the file as standard MP3:

```bash
ffmpeg -i input.m4a -codec:a libmp3lame -b:a 192k output.mp3
```

### Recent colors don't persist

The color history uses `localStorage`. If your browser is in private/incognito mode (or you've disabled storage for the origin), the history resets every load. This is expected.

### Service worker keeps serving old code

After a code change, hard-reload with **Ctrl + Shift + R** (or DevTools → Application → Service Workers → Update). For a permanent fix, bump `CACHE_VERSION` in `service-worker.js` before deploying.

## Still stuck?

Open an issue with:

- Your browser + version
- A copy-paste of the **Check Browser Support** output
- A console screenshot (DevTools → Console)
- Steps to reproduce

→ [github.com/koniz-dev/vinyl-music-player/issues](https://github.com/koniz-dev/vinyl-music-player/issues)
