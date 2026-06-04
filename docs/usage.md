# Usage Guide

The interface is split into two panels:

- **Left** — settings (audio file, metadata, lyrics, color, export)
- **Right** — the live vinyl player preview

Every change on the left updates the right immediately.

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
| Song Title | Yes (to enable export) | Shown below the vinyl |
| Song Artist | No | Shown under the title |
| Album Art | No | Used as a blurred background and as the spinning label |

Image formats: JPG, PNG, WebP.

## Lyrics

### Add lyrics one-by-one

1. Click **Add Lyrics**.
2. Fill **Start Time** and **End Time** in `mm:ss` (e.g. `01:30`).
3. Type the line. Leave End Time blank to default to start + 5s.
4. Lines fade in/out at their timing during playback.

Click the red `×` to remove a row.

### Bulk import via JSON

Click **For Dev → Import JSON Lyrics**, paste an array, hit Import. Full spec: [JSON Lyrics Format](json-lyrics-format.md).

### Lyrics color

Use the color picker to change the live lyrics color. The five most recent non-default colors are remembered across sessions via `localStorage`. Click a recent swatch to re-apply it. The copy icon copies the current hex to clipboard.

## Playback controls

| Button | Action |
|---|---|
| ▶ / ⏸ | Toggle play/pause |
| 🔊 / 🔇 | Toggle mute |
| ↻ | Toggle repeat (loops on `ended`) |
| Progress bar | Click anywhere to seek |

The ⏮ and ⏭ buttons are reserved and currently disabled.

## Export

Click **Export WebM Video**. Requirements:

- An audio file is loaded
- A song title is typed

The exporter:

1. Renders the player to a canvas at the selected ratio's native resolution (e.g. 1080×1920 for 9:16) at 30 fps
2. Streams that canvas + the audio track into a `MediaRecorder`
3. Saves a `.webm` file named after the song title (illegal filename characters are stripped)

Progress is shown live. Playback in the main player is paused for the duration of the export and resumed after.

### Browser support check

Click **Check Browser Support** (the debug button) to see which codecs your browser exposes (`MediaRecorder`, `webm`, `vp8`, `vp9`, etc.). Useful when an export fails silently.

## Tips

- For social platforms (TikTok / Reels / Shorts), the 1080×1920 9:16 ratio is the native upload size — no cropping or upscaling needed.
- The exported file is `.webm`. If your target platform needs `.mp4`, use a one-shot converter like `ffmpeg -i out.webm out.mp4`.
- The export timeout scales with the audio length (track duration + 60s), so long tracks won't be cut off. To trade file size for sharpness, tweak `VIDEO_BITS_PER_PIXEL` in `js/export.js`.
