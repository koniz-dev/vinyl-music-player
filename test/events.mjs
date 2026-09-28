import assert from 'node:assert/strict';
import { emit, on, Events } from '../js/lib/events.js';

let received = null;
const unsubscribe = on(Events.EXPORT_PROGRESS, payload => { received = payload; });
emit(Events.EXPORT_PROGRESS, { progress: 25, message: 'Recording… 25%' });
assert.deepEqual(received, { progress: 25, message: 'Recording… 25%' });
unsubscribe();

assert.throws(
    () => emit(Events.EXPORT_PROGRESS, { progress: '25', message: 'invalid' }),
    /Invalid payload/
);
assert.throws(
    () => emit(Events.EXPORT_PROGRESS, { progress: 101, message: 'invalid' }),
    /Invalid payload/
);
let lyricsReceived = null;
const unsubscribeLyrics = on(Events.UPDATE_LYRICS, payload => { lyricsReceived = payload; });
const lyrics = [{
    start: 0,
    end: 2.5,
    text: 'Hello',
    translation: 'Xin chào',
    words: [{ start: 0, end: 1, text: 'Hello' }],
}];
emit(Events.UPDATE_LYRICS, lyrics);
assert.deepEqual(lyricsReceived, lyrics, 'numeric editor timestamps must satisfy the lyrics contract');
unsubscribeLyrics();
assert.throws(
    () => emit(Events.UPDATE_LYRICS, [{ start: '00:00', end: 5, text: 'invalid' }]),
    /Invalid payload/
);
assert.throws(() => emit('not-an-event'), /Unknown event/);
console.log('Event contract tests passed');
