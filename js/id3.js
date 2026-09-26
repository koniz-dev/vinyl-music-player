/*
 * Minimal, dependency-free ID3v2 reader for local audio uploads.
 *
 * We only need the fields that remove setup work: title (TIT2), artist
 * (TPE1), and front-cover art (APIC). Malformed or unsupported tags simply
 * return no value, so an audio file remains usable even when its metadata is
 * unusual.
 */

const TEXT_DECODERS = { 0: 'iso-8859-1', 1: 'utf-16', 2: 'utf-16be', 3: 'utf-8' };

function syncSafeToInt(bytes, offset) {
    return ((bytes[offset] & 0x7f) << 21) | ((bytes[offset + 1] & 0x7f) << 14)
        | ((bytes[offset + 2] & 0x7f) << 7) | (bytes[offset + 3] & 0x7f);
}

function latin1(bytes) {
    return String.fromCharCode(...bytes);
}

function readTerminated(bytes, offset, encoding) {
    const wide = encoding === 1 || encoding === 2;
    let end = offset;
    if (wide) {
        while (end + 1 < bytes.length && (bytes[end] !== 0 || bytes[end + 1] !== 0)) end += 2;
        return { value: bytes.slice(offset, end), next: Math.min(end + 2, bytes.length) };
    }
    while (end < bytes.length && bytes[end] !== 0) end++;
    return { value: bytes.slice(offset, end), next: Math.min(end + 1, bytes.length) };
}

function decodeText(bytes, encoding) {
    if (!bytes.length) return '';
    try {
        return new TextDecoder(TEXT_DECODERS[encoding] || 'utf-8').decode(bytes)
            .replace(/^\uFEFF/, '').replace(/\0/g, '').trim();
    } catch {
        return latin1(bytes).replace(/\0/g, '').trim();
    }
}

function parseApicFrame(data) {
    if (data.length < 4) return null;
    const encoding = data[0];
    let cursor = 1;
    const mime = readTerminated(data, cursor, 0);
    cursor = mime.next;
    const pictureType = data[cursor++];
    const description = readTerminated(data, cursor, encoding);
    cursor = description.next;
    if (pictureType !== 3 || cursor >= data.length) return null; // front cover only
    const type = decodeText(mime.value, 0).toLowerCase();
    return type.startsWith('image/') ? new Blob([data.slice(cursor)], { type }) : null;
}

/** Read common ID3v2 metadata from a local File/Blob (v2.3 and v2.4). */
export async function readId3Metadata(file) {
    const header = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (header.length < 10 || latin1(header.slice(0, 3)) !== 'ID3') return {};
    const version = header[3];
    if (version !== 3 && version !== 4) return {};
    const tagSize = syncSafeToInt(header, 6);
    if (!tagSize) return {};

    const bytes = new Uint8Array(await file.slice(10, 10 + tagSize).arrayBuffer());
    const metadata = {};
    let cursor = 0;
    while (cursor + 10 <= bytes.length) {
        const id = latin1(bytes.slice(cursor, cursor + 4));
        if (!/^[A-Z0-9]{4}$/.test(id)) break;
        const size = version === 4 ? syncSafeToInt(bytes, cursor + 4)
            : ((bytes[cursor + 4] << 24) >>> 0) | (bytes[cursor + 5] << 16) | (bytes[cursor + 6] << 8) | bytes[cursor + 7];
        cursor += 10;
        if (!size || cursor + size > bytes.length) break;
        const data = bytes.slice(cursor, cursor + size);
        cursor += size;
        if (id === 'TIT2' && !metadata.title) metadata.title = decodeText(data.slice(1), data[0]);
        if (id === 'TPE1' && !metadata.artist) metadata.artist = decodeText(data.slice(1), data[0]);
        if (id === 'APIC' && !metadata.cover) metadata.cover = parseApicFrame(data);
    }
    return metadata;
}
