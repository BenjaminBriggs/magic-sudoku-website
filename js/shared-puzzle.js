// Reads a player-made puzzle from a /c/<payload> link. The app writes the payload
// (PuzzleDistribution/SharedPuzzle.swift in the app repo); change both together.
// An ES module: shared.html imports it, and so do the link-preview edge functions.
//
// byte 0      version (1)
// byte 1      flags: 0 title, 1 author, 2 instructions, 3 solved note, 4 link,
//             5 allows hints, 6 shows rating before solving, 7 rating follows
// 11 bytes    which of the 81 cells are given, cell 0 in the high bit of the first byte
// n/2 bytes   the given digits, two to a byte, high nibble first
// 2 bytes     if flag 7: level index (easy, medium, hard, expert, professional, custom), minutes
// then        each text field whose flag is set, in flag order: a LEB128 length, then UTF-8
//
// The whole is base64url without padding.

const SHARED_PUZZLE_LEVELS = [
    { name: 'Beginner', tone: 'green' },
    { name: 'Intermediate', tone: 'orange' },
    { name: 'Advanced', tone: 'red' },
    { name: 'Expert', tone: 'purple' },
    { name: 'Master', tone: 'blue' },
    { name: 'Custom', tone: 'purple' },
];

function base64UrlToBytes(text) {
    if (/^[A-Za-z0-9_-]+$/.test(text) === false) return null;
    let base64 = text.replace(/-/g, '+').replace(/_/g, '/');
    base64 += '='.repeat((4 - (base64.length % 4)) % 4);
    try {
        const binary = atob(base64);
        return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    } catch (error) {
        return null;
    }
}

// Returns { givens, title, author, instructions, solvedNote, link, allowsHints,
// showsRatingBeforeSolving, level, estimatedMinutes } or null when the payload isn't valid.
export function decodeSharedPuzzle(payload) {
    const bytes = base64UrlToBytes(payload);
    if (bytes === null) return null;
    let offset = 0;
    const next = () => (offset < bytes.length ? bytes[offset++] : null);
    const take = (count) => {
        if (offset + count > bytes.length) return null;
        const slice = bytes.slice(offset, offset + count);
        offset += count;
        return slice;
    };

    if (next() !== 1) return null;
    const flags = next();
    const mask = take(11);
    if (flags === null || mask === null) return null;
    const has = (bit) => (flags & (1 << bit)) !== 0;

    const indices = [];
    for (let i = 0; i < 81; i++) {
        if (mask[Math.floor(i / 8)] & (0x80 >> (i % 8))) indices.push(i);
    }
    const packed = take(Math.ceil(indices.length / 2));
    if (packed === null) return null;
    const cells = new Array(81).fill(0);
    for (let p = 0; p < indices.length; p++) {
        const byte = packed[Math.floor(p / 2)];
        const digit = p % 2 === 0 ? byte >> 4 : byte & 0x0f;
        if (digit < 1 || digit > 9) return null;
        cells[indices[p]] = digit;
    }

    let level = null;
    let estimatedMinutes = null;
    if (has(7)) {
        const index = next();
        const minutes = next();
        if (index === null || minutes === null || index >= SHARED_PUZZLE_LEVELS.length) return null;
        level = SHARED_PUZZLE_LEVELS[index];
        estimatedMinutes = minutes === 0 ? null : minutes;
    }

    const decoder = new TextDecoder('utf-8', { fatal: true });
    const readText = (bit) => {
        if (has(bit) === false) return '';
        let length = 0;
        let shift = 0;
        for (;;) {
            const byte = next();
            if (byte === null || shift > 21) return null;
            length |= (byte & 0x7f) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
        }
        if (length > 2048) return null;
        const utf8 = take(length);
        if (utf8 === null) return null;
        try {
            return decoder.decode(utf8);
        } catch (error) {
            return null;
        }
    };

    const fields = [0, 1, 2, 3, 4].map(readText);
    if (fields.includes(null) || offset !== bytes.length) return null;
    const [title, author, instructions, solvedNote, link] = fields;

    return {
        givens: cells.join(''),
        title,
        author,
        instructions,
        solvedNote,
        link,
        allowsHints: has(5),
        showsRatingBeforeSolving: has(6),
        level,
        estimatedMinutes,
    };
}
