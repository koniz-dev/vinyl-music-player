# Usage Guide

The vinyl player preview fills the stage. Settings live in a slide-in drawer — open it with the **Settings** button (or the stage hint) and close with ✕ or the backdrop. The drawer is grouped into four sections: **Song** (audio, title, artist, album art), **Lyrics**, **Appearance** (colors), and **Export** (ratio, format, export button).

Every change in the drawer updates the preview immediately.

## Upload audio

Click the **Audio File** upload area or drag a file onto it. Supported formats:

| Format | Notes |
|---|---|
| MP3 | Recommended — best compatibility |
| WAV | High quality, large files |
| OGG | Open-source codec |
| M4A / AAC | Apple / advanced audio |

Playback starts automatically once the file is loaded.

## Song metadata

| Field | Required | Behavior |
|---|---|---|
| Song Title | No (exports as `untitled` if blank) | Shown below the vinyl |
| Song Artist | No | Shown under the title |
| Album Art | No | Used as the spinning label + ambient background; also drives the auto accent color |

Image formats: JPG, PNG, WebP.

## Lyrics

### Add lyrics one-by-one

1. Click **+ Line** in the Lyrics section header. Start/End times are pre-filled from the previous line and focus jumps straight to the text input.
2. Adjust times if needed — `mm:ss` format (e.g. `01:30`).
3. Type the line.
4. Lines fade in/out at their timing during playback.

Click the red `×` to remove a row.

### Bulk import via JSON

Click **Import** in the Lyrics section header, paste an array, choose **Replace** or **Append**, hit Import. Full spec: [JSON Lyrics Format](json-lyrics-format.md).

## Colors

The **Appearance → Colors** list lets you override six element colors: Accent, Title, Artist, Lyrics, Background, and Vinyl tint. Pick with the swatch; the reset button restores the default. The Accent auto-derives from the album art until you override it manually. Overrides persist across sessions via `localStorage`.

## Playback controls

All controls enable once an audio file is loaded.

| Button | Action |
|---|---|
| ▶ / ⏸ | Toggle play/pause |
| ⏮ | Restart the song (seek to 0:00) |
| ⏭ | Skip to the end (fires `ended`, respects repeat) |
| ↻ | Toggle repeat (loops on `ended`) |
| 🔀 | Visual-only — single-song app, no playlist to shuffle |
| Progress bar | Click anywhere to seek |

## Export

Pick an **Aspect ratio** and a **Video format** (MP4 or WebM) in the Export section, then click the export button. The only requirement is a loaded audio file — without a title the file is named `untitled`.

MP4 (H.264/AAC) plays everywhere — phones, messengers, default video players — and needs Chrome 126+ or Safari; the button is disabled where the browser can't mux it. WebM works in every desktop browser that supports `MediaRecorder` and is usually smaller. Your choice is remembered.

The exporter:

1. Renders the player to a canvas at the selected ratio's native resolution (e.g. 1080×1920 for 9:16) at 30 fps
2. Streams that canvas + the audio track into a `MediaRecorder`
3. Saves a `.mp4` / `.webm` file named after the song title (illegal filename characters are stripped). If the chosen format turns out to be unsupported mid-flight, the recorder falls back to WebM and the extension follows.

The export button itself becomes the progress bar: an animated fill pours across it with the live percentage on top. Hover it to reveal **Cancel** — clicking mid-export aborts the run. Playback in the main player is paused for the duration of the export and resumed after.

### Browser support check

Click **Check Browser Support** (the debug button) to see which codecs your browser exposes (`MediaRecorder`, `webm`, `vp8`, `vp9`, `mp4/h264`, etc.). Useful when an export fails silently.

## Tips

- For social platforms (TikTok / Reels / Shorts), the 1080×1920 9:16 ratio is the native upload size — no cropping or upscaling needed.
- If your browser can't record MP4 (e.g. Firefox), export WebM and convert with `ffmpeg -i out.webm out.mp4`.
- The export timeout scales with the audio length (track duration + 60s), so long tracks won't be cut off. To trade file size for sharpness, tweak `VIDEO_BITS_PER_PIXEL` in `js/export.js`.
