const API = 'https://lrclib.net/api';
const HEADERS = { 'Lrclib-Client': 'vinyl-music-player/0.0.1' };

async function request(path) {
    const response = await fetch(`${API}${path}`, { headers: HEADERS });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Lyrics service returned ${response.status}.`);
    return response.json();
}

export async function findSyncedLyrics({ title, artist, duration }) {
    const exact = await request(`/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}&duration=${Math.round(duration || 0)}`);
    if (exact?.syncedLyrics) return [exact];
    const query = encodeURIComponent([artist, title].filter(Boolean).join(' '));
    const results = await request(`/search?q=${query}`) || [];
    return results.filter(result => result.syncedLyrics);
}
