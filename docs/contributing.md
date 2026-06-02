# Contributing

Bug fixes, new features, and docs improvements are all welcome.

## Workflow

```bash
# 1. Fork on GitHub, then:
git clone https://github.com/<your-username>/vinyl-music-player.git
cd vinyl-music-player
npm install

# 2. Create a feature branch off main
git checkout -b feat/your-thing

# 3. Make changes and test in browser
npm run dev

# 4. Commit, push, open a PR
git push -u origin feat/your-thing
gh pr create  # or use the GitHub UI
```

`main` is the only long-lived branch. Open PRs against `main`.

## Code style

- **ES modules everywhere.** No globals, no `<script>` tags outside `js/main.js`.
- **No build step.** Vanilla JS that runs in the browser as-is. If you reach for a transpiler, reconsider the feature first.
- **Event bus over direct imports** for cross-module communication. State changes that other modules care about should go through `Events`.
- **Two-space indentation, single quotes, semicolons.** Match existing files.
- **Comment only the "why".** Skip restating what the code does.

## DOM access

DOM elements are cached at module top with `document.getElementById` / `querySelector`. Don't re-query in hot paths (e.g. inside `renderToCanvas` or `timeupdate` handlers).

## Adding a new event

1. Add the constant to `Events` in `js/lib/events.js`.
2. Wire `emit(...)` and `on(...)` at the boundaries.
3. Document the producer / consumer / payload in [docs/architecture.md](architecture.md#module-communication).

## Touching the exporter

`js/export.js` is the most fragile module — every drawing call has a counterpart in the CSS, so visual regressions are easy to introduce.

When changing the render pipeline:

- Export a known reference song before and after, compare frames in a video tool.
- Keep the canvas dimensions at 720×1280 unless you're explicitly changing the output format.
- Watch the FPS — the recorder is locked at 30 fps; long-running per-frame work will drop frames.

## Testing

There's no automated test suite. Verify changes manually:

1. Drop in an MP3.
2. Add a song title.
3. Add 2–3 lyrics lines.
4. Export.
5. Open the resulting WebM and confirm audio + lyrics + visual all sync.

If you change the offline behavior, also test:

- Hard reload, then put the browser into airplane mode, then refresh.
- DevTools → Application → Service Workers → check the active worker.

## Commit messages

No strict convention. A concise summary line is fine. The repo has a hook that may rewrite or auto-commit your messages during certain flows — don't fight it.

## Reporting bugs

Open an issue with the template in [troubleshooting](troubleshooting.md#still-stuck).
