# JSON Lyrics Format

Bulk-import lyrics by pasting a JSON array into the **For Dev → Import JSON Lyrics** modal.

## Schema

Each item is an object with three string fields:

```ts
type LyricLine = {
  start: string;  // "mm:ss", e.g. "00:18"
  end:   string;  // "mm:ss", e.g. "00:21"
  text:  string;  // the lyric text
};

type LyricsFile = LyricLine[];
```

## Example

```json
[
  { "start": "00:18", "end": "00:21", "text": "I wake up in the familiar room" },
  { "start": "00:22", "end": "00:24", "text": "Where your hand once rested" },
  { "start": "00:25", "end": "00:28", "text": "But now it's just an empty space" }
]
```

## Validation rules

The importer rejects the file with an alert if:

| Rule | Error |
|---|---|
| Root is not an array | `JSON must be an array of objects` |
| An item is not an object | `Item at index N must be an object` |
| Any of `start`, `end`, `text` is missing or not a string | `Item at index N must have 'start' (mm:ss), 'end' (mm:ss), and 'text' (string) properties` |
| `start` or `end` doesn't match `mm:ss` (1–2 digit minutes, 2 digit seconds) | `Item at index N has invalid time format. Use mm:ss format (e.g., "01:30")` |
| `start >= end` | `Item at index N has invalid time values: start must be >= 00:00, end must be > start` |

The whole file must validate — no partial imports.

## Tips

- Items don't need to be sorted by `start`. The player matches the first line whose range contains the current time.
- Overlapping ranges are allowed but only the first match (in array order) is shown.
- Empty `text` lines are silently dropped at render time.
- The import **replaces** all existing lyrics. Save your work elsewhere first if you're mixing manual entries.

## Converting from LRC

Standard `.lrc` files use `[mm:ss.xx]line` tags. Quick conversion in JS:

```js
const lrc = `...`; // your LRC file content
const lines = lrc.split('\n')
  .map(l => l.match(/\[(\d+):(\d+)/) ? l : null)
  .filter(Boolean);

const out = [];
for (let i = 0; i < lines.length; i++) {
  const [, m1, s1] = lines[i].match(/\[(\d+):(\d+)/);
  const [, m2, s2] = (lines[i + 1] || lines[i]).match(/\[(\d+):(\d+)/);
  const text = lines[i].replace(/\[[^\]]+\]/g, '').trim();
  if (text) out.push({
    start: `${m1.padStart(2, '0')}:${s1.padStart(2, '0')}`,
    end:   `${m2.padStart(2, '0')}:${s2.padStart(2, '0')}`,
    text,
  });
}
console.log(JSON.stringify(out, null, 2));
```
