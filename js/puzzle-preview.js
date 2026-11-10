// What a puzzle link shows in other apps before anyone opens it: a title, a line under it and a
// picture of the clues. The edge functions in netlify/edge-functions write it into the page's
// og: tags and draw the picture, since link crawlers don't run the page's scripts.
//
// The app hands Messages the same title for links it shares (PuzzleLinkPreview.swift in the app
// repo): a created puzzle's name, otherwise "Expert Sudoku", the rating only where the setter
// shows it before a solve. Keep the words alike. Only the givens are ever drawn.

import { decodeSharedPuzzle } from './shared-puzzle.js';

export const PREVIEW_IMAGE_SIZE = { width: 1200, height: 630 };

// shared.html can print a created puzzle; puzzle.html can't.
const PLAY_LINE = 'Play it in Magic Sudoku, with pencil marks, Magic Mode and hints.';
const PLAY_OR_PRINT_LINE = 'Play it in Magic Sudoku, with pencil marks, Magic Mode and hints, or print it.';

// An untitled puzzle's name: its rating where it's shown, otherwise just "Sudoku".
function ratedTitle(levelName) {
    return levelName ? `${levelName} Sudoku` : 'Sudoku';
}

// The preview for a page path: /puzzle/<81 digits>, its short form /p/<81 digits>, or
// /c/<payload>. Returns { title, subtitle, description, givens, imagePath } for the tags, and
// for the picture its own title, pictureTitle ("Sudoku" for an untitled puzzle, whose rating
// is on its tag), the rating's tag as { name, color } or null, and the line under the title,
// byline. Returns null for any other path or a puzzle that doesn't read.
export function describePuzzleLink(pathname) {
    const match = pathname.match(/^\/(puzzle|p|c)\/([^/]+)\/?$/);
    if (match === null) return null;
    const [, route, id] = match;
    const imagePath = `/og/${route}/${id}.png`;

    if (route === 'c') {
        const puzzle = decodeSharedPuzzle(id);
        if (puzzle === null) return null;
        const levelName = puzzle.showsRatingBeforeSolving && puzzle.level ? puzzle.level.name : null;
        const level = levelName === null ? null : { name: levelName, color: LEVEL_COLORS[puzzle.level.tone] };
        if (puzzle.title === '') {
            return {
                title: ratedTitle(levelName),
                subtitle: 'Made in Magic Sudoku',
                description: PLAY_OR_PRINT_LINE,
                givens: puzzle.givens,
                imagePath,
                pictureTitle: 'Sudoku',
                level,
                byline: 'Made in Magic Sudoku',
            };
        }
        const subtitle = [puzzle.author ? `by ${puzzle.author}` : null, levelName]
            .filter((part) => part !== null)
            .join(' · ');
        const instructions = puzzle.instructions || PLAY_OR_PRINT_LINE;
        return {
            title: puzzle.title,
            subtitle,
            description: subtitle === '' ? instructions : `${subtitle}. ${instructions}`,
            givens: puzzle.givens,
            imagePath,
            pictureTitle: puzzle.title,
            level,
            byline: puzzle.author ? `by ${puzzle.author}` : '',
        };
    }

    if (/^[0-9]{81}$/.test(id) === false) return null;
    return {
        title: ratedTitle(null),
        subtitle: 'Play it in Magic Sudoku',
        description: PLAY_LINE,
        givens: id,
        imagePath,
        pictureTitle: 'Sudoku',
        level: null,
        byline: 'Play it in Magic Sudoku',
    };
}

// MARK: - Tags

function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Swaps the page's own title and og:/twitter: tags for the puzzle's. `origin` is the site the
// page was asked for, so a deploy preview's tags point at its own pictures.
export function withPreviewTags(html, preview, pageURL) {
    const origin = new URL(pageURL).origin;
    const image = `${origin}${preview.imagePath}`;
    const description = preview.description.length > 300
        ? `${preview.description.slice(0, 299)}…`
        : preview.description;
    const tags = [
        ['property', 'og:type', 'article'],
        ['property', 'og:site_name', 'Magic Sudoku'],
        ['property', 'og:url', pageURL],
        ['property', 'og:title', preview.title],
        ['property', 'og:description', description],
        ['property', 'og:image', image],
        ['property', 'og:image:width', String(PREVIEW_IMAGE_SIZE.width)],
        ['property', 'og:image:height', String(PREVIEW_IMAGE_SIZE.height)],
        ['property', 'og:image:alt', 'Part of the puzzle\'s Sudoku grid with its given numbers'],
        ['name', 'twitter:card', 'summary_large_image'],
        ['name', 'twitter:title', preview.title],
        ['name', 'twitter:description', description],
        ['name', 'twitter:image', image],
    ]
        .map(([kind, key, value]) => `<meta ${kind}="${key}" content="${escapeHTML(value)}">`)
        .join('\n    ');

    return html
        .replace(/<meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*>\s*/g, '')
        .replace(/<title>[^<]*<\/title>/, `<title>${escapeHTML(preview.title)} - Magic Sudoku</title>`)
        .replace('</head>', `    ${tags}\n</head>`);
}

// MARK: - Picture

// The app's light appearance, from its asset catalog.
const COLORS = {
    background: '#F1F1ED', // Secondary Background
    cell: '#F9F9F7', // Grid/Cell Primary Background
    cellAlternate: '#F7F7F4', // Grid/Cell Alternate Background
    given: '#F5F3F0', // Grid/Cell Prefilled Background
    lines: '#BABABA', // Grid/Lines
    digit: '#121212', // Grid/Number
    ink: '#212121', // Primary Foreground
    slate: '#5F717F', // Input/Pen
    shadow: '#B8B6AF', // Shadow
};

// A rating's colour, by the tone shared-puzzle.js gives its level: the app's Highlight colours.
const LEVEL_COLORS = {
    green: '#B4BD55',
    orange: '#F4C070',
    red: '#F69B7B',
    purple: '#B1ABA1',
    blue: '#BFD7C9',
};

// Rubik covers Latin, Cyrillic and Hebrew. Other scripts would draw as blanks, so the picture
// falls back to "Sudoku" and leaves the author out; the link's title still shows in full beside it.
const DRAWABLE = /^[ -ɏͰ-ϿЀ-ӿ֐-׿ -⁯€]*$/;

// Rubik's advance widths in thousandths of an em, for the printable ASCII characters (space to
// ~) and a few more, read from preview/Rubik-Black.ttf, Rubik-Bold.ttf and Rubik-Medium.ttf.
// Anything else is taken as wide, so a line never runs over.
const WIDTHS = {
    900: { ascii: [186, 330, 519, 677, 711, 846, 783, 264, 423, 423, 444, 594, 303, 471, 312, 579, 718, 557, 704, 709, 735, 690, 692, 625, 712, 683, 322, 325, 538, 563, 538, 653, 856, 755, 734, 733, 740, 667, 646, 753, 772, 368, 702, 715, 626, 856, 740, 742, 705, 742, 722, 697, 674, 746, 726, 856, 739, 710, 693, 432, 578, 432, 492, 725, 450, 622, 661, 622, 661, 623, 492, 666, 685, 323, 345, 643, 323, 938, 674, 642, 661, 661, 518, 590, 532, 674, 630, 869, 630, 636, 590, 474, 292, 474, 549], '·': 330, '…': 846, ' ': 186 },
    700: { ascii: [212, 302, 488, 689, 675, 847, 765, 260, 408, 408, 450, 613, 287, 479, 287, 574, 688, 503, 666, 676, 703, 654, 661, 589, 686, 647, 295, 307, 523, 571, 523, 604, 876, 718, 712, 702, 723, 643, 617, 711, 732, 325, 685, 673, 603, 836, 726, 718, 686, 718, 695, 674, 631, 734, 696, 832, 711, 687, 668, 390, 574, 390, 468, 737, 396, 589, 634, 602, 634, 607, 460, 634, 644, 296, 307, 611, 296, 931, 644, 616, 634, 634, 459, 562, 474, 634, 624, 866, 616, 626, 564, 451, 302, 451, 562], '·': 336, '…': 797, ' ': 212 },
    500: { ascii: [228, 270, 420, 685, 645, 814, 722, 232, 368, 368, 446, 613, 266, 485, 261, 526, 652, 456, 612, 635, 647, 610, 620, 548, 650, 604, 273, 289, 500, 569, 500, 565, 863, 704, 686, 684, 704, 617, 597, 708, 728, 291, 655, 628, 588, 812, 707, 696, 659, 696, 670, 648, 593, 719, 664, 802, 663, 662, 635, 354, 526, 354, 432, 739, 361, 571, 619, 577, 619, 574, 427, 619, 621, 268, 278, 562, 268, 919, 621, 595, 619, 619, 418, 520, 439, 611, 588, 830, 585, 589, 541, 398, 266, 398, 562], '·': 332, '…': 695, ' ': 228 },
};

// `tracking` is the letter-spacing, in pixels.
function textWidth(text, size, weight, tracking = 0) {
    const table = WIDTHS[weight];
    let thousandths = 0;
    let count = 0;
    for (const char of text) {
        const code = char.codePointAt(0);
        thousandths += code >= 32 && code <= 126 ? table.ascii[code - 32] : table[char] ?? 750;
        count += 1;
    }
    return (thousandths / 1000) * size + tracking * count;
}

// Splits text into at most `maxLines` lines of `width`, ending with … when it runs over.
function wrap(text, size, weight, width, maxLines, tracking = 0) {
    const measure = (part) => textWidth(part, size, weight, tracking);
    const lines = [];
    let line = '';
    // Only plain spaces break: a no-break space keeps a count with its noun.
    for (const word of text.split(/ +/).filter((part) => part !== '')) {
        const candidate = line === '' ? word : `${line} ${word}`;
        if (measure(candidate) <= width) {
            line = candidate;
            continue;
        }
        if (line !== '') lines.push(line);
        line = word;
        // A word wider than the line breaks where it must.
        while (measure(line) > width) {
            let fit = line.length - 1;
            while (fit > 1 && measure(line.slice(0, fit)) > width) fit -= 1;
            lines.push(line.slice(0, fit));
            line = line.slice(fit);
        }
    }
    if (line !== '') lines.push(line);
    if (lines.length <= maxLines) return lines;
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && measure(`${last}…`) > width) last = last.slice(0, -1);
    // Not after a separator: "Ben ·…".
    kept[maxLines - 1] = `${last.replace(/[\s·]+$/, '')}…`;
    return kept;
}

function escapeXML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// The board as the game draws it, `side` square at the origin: lines between the squares,
// three times as thick between the boxes, the givens on their shaded squares and the empty
// squares in a faint check.
function boardSVG(givens, side) {
    const line = Math.max(1, Math.round(side / 360));
    const box = line * 3;
    const cell = (side - 4 * box - 6 * line) / 9;
    const radius = Math.round(side * 0.06);
    const offset = (index) => box + Math.floor(index / 3) * (3 * cell + 2 * line + box) + (index % 3) * (cell + line);
    const fontSize = Math.round(cell * 0.6);
    const squares = [];
    const digits = [];
    for (let index = 0; index < 81; index++) {
        const row = Math.floor(index / 9);
        const column = index % 9;
        const x = offset(column);
        const y = offset(row);
        const digit = givens[index];
        const fill = digit !== '0' ? COLORS.given : (row + column) % 2 === 0 ? COLORS.cellAlternate : COLORS.cell;
        squares.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${fill}"/>`);
        if (digit === '0') continue;
        // Rubik's digits are 0.7 em tall: centre them on the square.
        digits.push(`<text x="${x + cell / 2}" y="${y + cell / 2 + fontSize * 0.35}" font-size="${fontSize}" font-weight="700" fill="${COLORS.digit}" text-anchor="middle">${digit}</text>`);
    }
    return `<clipPath id="board"><rect width="${side}" height="${side}" rx="${radius}"/></clipPath>
    <rect width="${side}" height="${side}" rx="${radius}" fill="${COLORS.lines}" filter="url(#shadow)"/>
    <g clip-path="url(#board)">${squares.join('')}${digits.join('')}</g>`;
}

// The title's sizes, largest first, with the most lines each may take. The title takes the
// largest it fits at whole words.
const TITLE_SIZES = [[84, 2], [68, 3], [56, 3]];

// The picture: the board tilted and running off the right edge, so it shows the puzzle without
// giving all of it away, beside the rating, the title, who made it and the Magic Sudoku mark.
// The app's own picture for Messages is drawn alike. `iconDataURL` is the app icon as a data: URL.
export function previewSVG(preview, iconDataURL) {
    const { width, height } = PREVIEW_IMAGE_SIZE;
    const boardSide = 770;
    const boardCentre = { x: 995, y: 315 };
    const boardTilt = 6;
    // The words' panel fades out over the board's left edge.
    const panelWidth = 600;
    const margin = 64;
    const textWidthLimit = panelWidth - 2 * margin;

    const title = DRAWABLE.test(preview.pictureTitle) ? preview.pictureTitle : 'Sudoku';
    const byline = DRAWABLE.test(preview.byline) ? preview.byline : '';

    const tracking = (size) => size * -0.018;
    let titleSize = 0;
    let titleLines = [];
    for (const [size, maxLines] of TITLE_SIZES) {
        titleSize = size;
        const words = title.split(/ +/);
        const lines = wrap(title, size, 900, textWidthLimit, Infinity, tracking(size));
        const fits = lines.length <= maxLines
            && words.every((word) => textWidth(word, size, 900, tracking(size)) <= textWidthLimit);
        titleLines = fits ? lines : wrap(title, size, 900, textWidthLimit, maxLines, tracking(size));
        if (fits) break;
    }
    const bylineSize = 32;
    const bylineLines = byline === '' ? [] : wrap(byline, bylineSize, 500, textWidthLimit, 2);

    // The rating sits at the top and the mark at the bottom; the title and the line under it
    // are centred between them.
    const levelHeight = 48;
    const markSize = 48;
    const markTop = height - margin - markSize;
    const titleLeading = titleSize;
    const bylineLeading = bylineSize * 1.25;
    const bylineGap = 18;
    const blockHeight = titleLines.length * titleLeading
        + (bylineLines.length > 0 ? bylineGap + bylineLines.length * bylineLeading : 0);
    const blockMin = preview.level === null ? margin : margin + levelHeight + 28;
    const blockMax = Math.max(blockMin, markTop - 28 - blockHeight);
    let top = Math.min(Math.max((height - blockHeight) / 2, blockMin), blockMax);

    const words = [];
    if (preview.level !== null) {
        const levelWidth = textWidth(preview.level.name, 24, 700) + 44;
        words.push(`<rect x="${margin}" y="${margin}" width="${levelWidth}" height="${levelHeight}" rx="${levelHeight / 2}" fill="${preview.level.color}"/>`);
        words.push(`<text x="${margin + 22}" y="${margin + levelHeight / 2 + 24 * 0.35}" font-size="24" font-weight="700" fill="${COLORS.ink}">${escapeXML(preview.level.name)}</text>`);
    }
    // Rubik's ascent is 0.935 em and its descent 0.25 em; the leading splits around them.
    for (const line of titleLines) {
        const baseline = top + (titleLeading - 1.185 * titleSize) / 2 + 0.935 * titleSize;
        words.push(`<text x="${margin}" y="${baseline}" font-size="${titleSize}" font-weight="900" letter-spacing="${tracking(titleSize)}" fill="${COLORS.ink}">${escapeXML(line)}</text>`);
        top += titleLeading;
    }
    if (bylineLines.length > 0) top += bylineGap;
    for (const line of bylineLines) {
        const baseline = top + (bylineLeading - 1.185 * bylineSize) / 2 + 0.935 * bylineSize;
        words.push(`<text x="${margin}" y="${baseline}" font-size="${bylineSize}" font-weight="500" fill="${COLORS.slate}">${escapeXML(line)}</text>`);
        top += bylineLeading;
    }

    const markTextX = margin + markSize + 14;
    const markBaseline = markTop + markSize / 2 + 24 * 0.35;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Rubik">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="24" flood-color="${COLORS.shadow}" flood-opacity="0.5"/>
    </filter>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${COLORS.background}"/>
      <stop offset="0.88" stop-color="${COLORS.background}"/>
      <stop offset="1" stop-color="${COLORS.background}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="icon"><rect x="${margin}" y="${markTop}" width="${markSize}" height="${markSize}" rx="${markSize * 0.23}"/></clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="${COLORS.background}"/>
  <g transform="translate(${boardCentre.x} ${boardCentre.y}) rotate(${boardTilt}) translate(${-boardSide / 2} ${-boardSide / 2})">
    ${boardSVG(preview.givens, boardSide)}
  </g>
  <rect width="${panelWidth}" height="${height}" fill="url(#panel)"/>
  ${words.join('\n  ')}
  <image href="${iconDataURL}" x="${margin}" y="${markTop}" width="${markSize}" height="${markSize}" clip-path="url(#icon)"/>
  <text x="${markTextX}" y="${markBaseline}" font-size="24" font-weight="700" fill="${COLORS.ink}">Magic Sudoku</text>
  <text x="${markTextX + textWidth('Magic Sudoku', 24, 700) + 14}" y="${markBaseline}" font-size="24" font-weight="500" fill="${COLORS.slate}">magic-sudoku.com</text>
</svg>`;
}
