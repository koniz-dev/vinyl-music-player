# Release checklist

Run this against the deployed build or a local HTTP server after every cache-version bump.

## Offline PWA reload

1. Load the app once while online and use the in-app **Update** prompt if shown.
2. In Chrome DevTools, Application → Service Workers, confirm the active cache uses the current `CACHE_VERSION`.
3. Enable **Offline** in DevTools Network and reload the page.
4. Pass when the editor, all local controls, and the app shell render without a network error. External features that have not already cached their models are expected to remain unavailable offline.

## Five-second export smoke

1. Load any decodable local MP3/WAV shorter than five seconds, set Export start/end to a five-second range, or open `?smoke=1` to generate a deterministic five-second local WAV in memory.
2. Add a title and at least one timed lyric; enable the visualizer and, if available, a word-timed lyric line.
3. Export the selected supported format.
4. Pass when the downloaded file opens with audible audio, rotating vinyl, visible lyric/word highlight, visualizer, and the extension matches its actual container.

## Translation first-run smoke

1. Add at least one lyric line and choose a translation direction.
2. Press **Translate**. Confirm the first-run warning identifies the NLLB download as over 1 GB and reports available browser storage (or says that storage cannot be measured).
3. Pass when a second translated line appears in preview/export and the browser network log shows model/CDN requests only—never lyric text sent to a translation endpoint.
4. Press **Remove translation model**, confirm the scope says it preserves music, lyrics, and settings, then verify the matching NLLB Cache API entries are gone. A subsequent translation must require a download again.

Record the browser/version and the result in the release notes when any check fails.
