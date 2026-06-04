/**
 * Auto-sync lyrics — Whisper-powered timing, fully client-side.
 *
 * Two modes, picked automatically:
 *   align — the user already typed lyric lines: transcribe the audio with
 *           word-level timestamps, then globally align transcript words to
 *           lyric tokens (Needleman-Wunsch) and derive each line's start/end.
 *   fill  — no lyric lines yet: transcribe with segment timestamps and turn
 *           Whisper's segments directly into editable lines.
 *
 * The heavy ML work runs in js/workers/whisper-worker.js; this module owns
 * audio decoding (Web Audio is main-thread only), worker lifecycle, and the
 * alignment math. Used directly by settings.js — it's a lyrics-editor helper,
 * not a cross-module state change, so no event-bus traffic.
 */

import { formatTime } from './lib/format.js';

const TARGET_SAMPLE_RATE = 16000; // Whisper's expected input rate

// Songs and mixes, not podcasts — beyond this the decoded Float32 buffers
// (4 bytes × 16k samples/s) plus transcription time get hostile to the tab.
const MAX_SYNC_DURATION_S = 30 * 60;

let worker = null;
let activeJob = null;

export function isAutoSyncRunning() {
    return !!activeJob;
}

export function cancelAutoSync() {
    const job = activeJob;
    if (!job) return;
    activeJob = null;
    job.cancelled = true;
    // Terminating loses the in-memory pipeline, but the model files stay in
    // the browser cache — the next run re-initializes without re-downloading.
    if (worker) {
        worker.terminate();
        worker = null;
    }
    job.rejectWorker?.(abortError());
}

/**
 * @param {{ file: File, lineTexts: string[], hintText?: string, onProgress?: (p) => void }} opts
 *   lineTexts mirrors the current lyric items (empty string = line without
 *   text). Any non-empty text switches the run into align mode. hintText
 *   (song title/artist) feeds language detection when there are no lyrics.
 * @returns {Promise<{ mode: 'align', lines: ({start,end}|null)[] }
 *                 | { mode: 'fill',  lines: {start,end,text}[] }>}
 *   In align mode, lines[i] matches lineTexts[i] (null = leave untouched).
 */
export async function runAutoSync({ file, lineTexts, hintText, onProgress }) {
    if (activeJob) throw new Error('Auto-sync is already running.');
    const job = { cancelled: false, rejectWorker: null };
    activeJob = job;

    try {
        onProgress?.({ stage: 'decode' });
        const { audio, duration } = await decodeTo16kMono(file);
        if (job.cancelled) throw abortError();

        const texts = lineTexts || [];
        const hasLines = texts.some(t => t && t.trim());
        const language = detectLanguage(`${texts.join(' ')} ${hintText || ''}`);

        const { chunks, wordLevel } = await transcribeInWorker(
            job, audio, hasLines ? 'word' : 'segment', language, onProgress
        );
        if (job.cancelled) throw abortError();

        onProgress?.({ stage: 'align' });
        if (hasLines) {
            return { mode: 'align', lines: alignLinesToTranscript(texts, chunks, wordLevel, duration) };
        }
        return { mode: 'fill', lines: linesFromChunks(chunks, duration) };
    } finally {
        if (activeJob === job) activeJob = null;
    }
}

function abortError() {
    const err = new Error('Auto-sync cancelled.');
    err.name = 'AbortError';
    return err;
}

// ---------- Audio decoding ----------

// Decode at native rate first, then resample via OfflineAudioContext — the
// two-step survives browsers that reject arbitrary AudioContext sample rates.
// The mono destination downmixes stereo for free.
async function decodeTo16kMono(file) {
    const arrayBuffer = await file.arrayBuffer();
    const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
    let decoded;
    try {
        decoded = await decodeCtx.decodeAudioData(arrayBuffer);
    } finally {
        decodeCtx.close().catch(() => {});
    }

    if (decoded.duration > MAX_SYNC_DURATION_S) {
        throw new Error('Audio is longer than 30 minutes — auto-sync is built for songs. Trim the file and retry.');
    }

    const length = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
    const offline = new OfflineAudioContext(1, length, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();

    return { audio: rendered.getChannelData(0), duration: decoded.duration };
}

// ---------- Worker plumbing ----------

function getWorker() {
    if (!worker) {
        worker = new Worker(new URL('./workers/whisper-worker.js', import.meta.url), { type: 'module' });
    }
    return worker;
}

// transformers.js has no Whisper language detection yet (it silently forces
// English) — guess from the user's own text instead. Unicode-block heuristics
// are enough: Vietnamese is unmistakable from its vowel/tone marks, and the
// other scripts are disjoint. Plain Latin → null → Whisper's English default.
function detectLanguage(text) {
    if (/[ăđơưẠ-ỹ]/i.test(text)) return 'vi'; // ă đ ơ ư + Vietnamese tone block
    if (/[぀-ヿ]/.test(text)) return 'ja'; // Hiragana + Katakana
    if (/[가-힯]/.test(text)) return 'ko'; // Hangul
    if (/[一-鿿]/.test(text)) return 'zh'; // CJK ideographs
    if (/[Ѐ-ӿ]/.test(text)) return 'ru'; // Cyrillic
    if (/[฀-๿]/.test(text)) return 'th'; // Thai
    if (/[؀-ۿ]/.test(text)) return 'ar'; // Arabic
    if (/[ऀ-ॿ]/.test(text)) return 'hi'; // Devanagari
    return null;
}

function transcribeInWorker(job, audio, timestamps, language, onProgress) {
    return new Promise((resolve, reject) => {
        job.rejectWorker = reject;
        const w = getWorker();
        const downloads = new Map(); // file → { loaded, total }

        w.onmessage = (event) => {
            const msg = event.data || {};
            if (msg.type === 'progress') {
                if (msg.stage === 'download') {
                    downloads.set(msg.file, { loaded: msg.loaded, total: msg.total });
                    let loaded = 0, total = 0;
                    for (const d of downloads.values()) { loaded += d.loaded; total += d.total; }
                    onProgress?.({ stage: 'download', percent: total ? Math.round((loaded / total) * 100) : 0 });
                } else {
                    onProgress?.({ stage: msg.stage });
                }
                return;
            }
            if (msg.type === 'result') {
                job.rejectWorker = null;
                // Defensive shape check — the worker runs third-party code,
                // so don't let a malformed result crash the alignment.
                resolve({
                    chunks: Array.isArray(msg.chunks) ? msg.chunks : [],
                    wordLevel: !!msg.wordLevel,
                });
            } else if (msg.type === 'error') {
                job.rejectWorker = null;
                reject(new Error(msg.message));
            }
        };
        w.onerror = (event) => {
            job.rejectWorker = null;
            reject(new Error(event.message || 'Whisper worker failed to load.'));
        };

        // Transfer, don't copy — a 4-minute song is ~15 MB of Float32.
        w.postMessage({ type: 'transcribe', audio, timestamps, language }, [audio.buffer]);
    });
}

// ---------- Text normalization ----------

// Diacritic-insensitive comparison: ASR slips on tone marks (esp. Vietnamese)
// shouldn't break a match.
function normalizeWord(raw) {
    return String(raw)
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/đ/g, 'd')
        .replace(/[^\p{L}\p{N}']/gu, '');
}

function tokenize(text) {
    return String(text).split(/\s+/).map(normalizeWord).filter(Boolean);
}

// ---------- Transcript → timed word list ----------

function wordsFromChunks(chunks, wordLevel, duration) {
    const words = [];
    for (const chunk of chunks) {
        const [start, end] = chunk.timestamp || [];
        if (typeof start !== 'number') continue;

        if (wordLevel) {
            const norm = normalizeWord(chunk.text || '');
            if (!norm) continue;
            words.push({ norm, start, end: typeof end === 'number' ? end : start + 0.5 });
            continue;
        }

        // Segment-level fallback: spread word times linearly across the
        // segment by character share — coarse, but keeps alignment usable.
        const rawTokens = String(chunk.text || '').trim().split(/\s+/).filter(Boolean);
        if (!rawTokens.length) continue;
        const segEnd = typeof end === 'number' ? end : Math.min(duration, start + rawTokens.length * 0.4);
        const totalChars = rawTokens.reduce((sum, t) => sum + t.length, 0) || 1;
        let acc = 0;
        for (const token of rawTokens) {
            const norm = normalizeWord(token);
            const wordStart = start + (segEnd - start) * (acc / totalChars);
            acc += token.length;
            const wordEnd = start + (segEnd - start) * (acc / totalChars);
            if (norm) words.push({ norm, start: wordStart, end: wordEnd });
        }
    }
    return words;
}

// ---------- Alignment (Needleman-Wunsch) ----------

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}

function similarity(a, b) {
    if (!a || !b) return -1;
    if (a === b) return 3;
    if (Math.abs(a.length - b.length) > 2) return -1;
    if (levenshtein(a, b) <= 1) return 2;
    if (a.length >= 5 && b.length >= 5 && levenshtein(a, b) <= 2) return 1;
    return -1;
}

// Global alignment of transcript words against the concatenated lyric tokens.
// Both sequences are in song order, so a monotonic global alignment is exactly
// the right model — it absorbs ASR insertions/deletions without ever matching
// out of order. ~600×400 tokens for a typical song: trivial for typed arrays.
function alignTokens(words, tokens) {
    const n = words.length, m = tokens.length;
    const W = m + 1;
    const GAP = -1;

    // Memoize similarity per string pair — common words ("the", "em", "anh")
    // repeat across the grid, so the ~240k cells hit only a few thousand
    // unique pairs. Cuts levenshtein work ~5× and keeps the main thread
    // responsive while audio plays; the backtrack pass hits the cache free.
    const simCache = new Map();
    const sim = (a, b) => {
        if (a === b) return 3;
        const key = `${a} ${b}`;
        let s = simCache.get(key);
        if (s === undefined) {
            s = similarity(a, b);
            simCache.set(key, s);
        }
        return s;
    };

    const score = new Float32Array((n + 1) * W);
    const trace = new Uint8Array((n + 1) * W); // 0 = diag, 1 = skip word, 2 = skip token
    for (let i = 1; i <= n; i++) { score[i * W] = i * GAP; trace[i * W] = 1; }
    for (let j = 1; j <= m; j++) { score[j] = j * GAP; trace[j] = 2; }

    for (let i = 1; i <= n; i++) {
        const wordNorm = words[i - 1].norm;
        for (let j = 1; j <= m; j++) {
            const diag = score[(i - 1) * W + (j - 1)] + sim(wordNorm, tokens[j - 1]);
            const up = score[(i - 1) * W + j] + GAP;
            const left = score[i * W + (j - 1)] + GAP;
            let best = diag, dir = 0;
            if (up > best) { best = up; dir = 1; }
            if (left > best) { best = left; dir = 2; }
            score[i * W + j] = best;
            trace[i * W + j] = dir;
        }
    }

    // Backtrack; only positively-similar diagonal steps count as matches.
    const matched = new Int32Array(m).fill(-1);
    let i = n, j = m;
    while (i > 0 && j > 0) {
        const dir = trace[i * W + j];
        if (dir === 0) {
            if (sim(words[i - 1].norm, tokens[j - 1]) > 0) matched[j - 1] = i - 1;
            i--; j--;
        } else if (dir === 1) {
            i--;
        } else {
            j--;
        }
    }
    return matched;
}

function alignLinesToTranscript(lineTexts, chunks, wordLevel, duration) {
    const words = wordsFromChunks(chunks, wordLevel, duration);

    const tokens = [];
    const owner = []; // token index → line index
    const tokenCounts = lineTexts.map(() => 0);
    lineTexts.forEach((text, lineIdx) => {
        for (const token of tokenize(text || '')) {
            tokens.push(token);
            owner.push(lineIdx);
            tokenCounts[lineIdx]++;
        }
    });
    if (!words.length || !tokens.length) return lineTexts.map(() => null);

    const matched = alignTokens(words, tokens);

    // Per line: enough matched tokens → trust first/last matched word times.
    const raw = lineTexts.map(() => null);
    lineTexts.forEach((_, lineIdx) => {
        if (!tokenCounts[lineIdx]) return;
        const hits = [];
        for (let k = 0; k < tokens.length; k++) {
            if (owner[k] === lineIdx && matched[k] >= 0) hits.push(matched[k]);
        }
        if (hits.length >= Math.max(1, Math.ceil(tokenCounts[lineIdx] * 0.3))) {
            raw[lineIdx] = {
                start: words[hits[0]].start,
                end: words[hits[hits.length - 1]].end,
            };
        }
    });

    interpolateMissing(raw, tokenCounts, duration);
    return finalizeTimes(raw, duration);
}

// Lines Whisper couldn't match (mumbled, ad-libs, ASR misses) get times
// spread between their matched neighbours, proportional to token count.
function interpolateMissing(raw, tokenCounts, duration) {
    const lines = [];
    raw.forEach((time, i) => { if (tokenCounts[i] > 0) lines.push(i); });

    let k = 0;
    while (k < lines.length) {
        if (raw[lines[k]]) { k++; continue; }
        let runEnd = k;
        while (runEnd < lines.length && !raw[lines[runEnd]]) runEnd++;

        const startT = k > 0 ? raw[lines[k - 1]].end : 0;
        const endT = runEnd < lines.length ? raw[lines[runEnd]].start : duration;
        const span = Math.max(0, endT - startT);
        let totalTokens = 0;
        for (let q = k; q < runEnd; q++) totalTokens += tokenCounts[lines[q]];

        let acc = 0;
        for (let q = k; q < runEnd; q++) {
            const lineIdx = lines[q];
            const start = startT + span * (acc / totalTokens);
            acc += tokenCounts[lineIdx];
            const end = startT + span * (acc / totalTokens);
            raw[lineIdx] = { start, end };
        }
        k = runEnd;
    }
}

// Float seconds → the editor's mm:ss strings. Integer-second granularity
// forces some massaging: floor starts / ceil ends, keep starts monotonic,
// guarantee ≥1s duration, stay inside the song.
function finalizeTimes(raw, duration) {
    const maxEnd = Math.max(1, Math.ceil(duration));
    let prevStart = 0;
    return raw.map((time) => {
        if (!time) return null;
        let start = Math.max(0, Math.floor(time.start));
        start = Math.max(start, prevStart);
        let end = Math.max(Math.ceil(time.end), start + 1);
        if (end > maxEnd) {
            end = maxEnd;
            start = Math.min(start, end - 1);
        }
        prevStart = start;
        return { start: formatTime(start), end: formatTime(end) };
    });
}

// ---------- Fill mode (no existing lines) ----------

function linesFromChunks(chunks, duration) {
    const rows = [];
    for (const chunk of chunks) {
        const text = String(chunk.text || '').trim();
        if (!text) continue;
        const [start, end] = chunk.timestamp || [];
        if (typeof start !== 'number') continue;
        rows.push({
            start,
            end: typeof end === 'number' ? end : Math.min(duration, start + 5),
            text,
        });
    }
    const times = finalizeTimes(rows, duration);
    return rows
        .map((row, i) => (times[i] ? { ...times[i], text: row.text } : null))
        .filter(Boolean);
}
