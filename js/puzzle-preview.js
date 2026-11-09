// What a puzzle link shows in other apps before anyone opens it: a title, a line under it and a
// picture of the clues. The edge functions in netlify/edge-functions write it into the page's
// og: tags and draw the picture, since link crawlers don't run the page's scripts.
//
// The app hands Messages the same title for links it shares (PuzzleLinkPreview.swift in the app
// repo): a created puzzle's name, otherwise "Expert Sudoku · 26 clues", the rating only where
// the setter shows it before a solve. Keep the words alike. Only the givens are ever drawn.

import { decodeSharedPuzzle } from './shared-puzzle.js';

export const PREVIEW_IMAGE_SIZE = { width: 1200, height: 630 };

// shared.html can print a created puzzle; puzzle.html can't.
const PLAY_LINE = 'Play it in Magic Sudoku, with pencil marks, Magic Mode and hints.';
const PLAY_OR_PRINT_LINE = 'Play it in Magic Sudoku, with pencil marks, Magic Mode and hints, or print it.';

function clueCount(givens) {
    return givens.split('').filter((digit) => digit !== '0').length;
}

function clueTitle(levelName, clues) {
    return levelName ? `${levelName} Sudoku · ${clues} clues` : `Sudoku · ${clues} clues`;
}

// The preview for a page path: /puzzle/<81 digits>, its short form /p/<81 digits>, or
// /c/<payload>. Returns { title, subtitle, description, givens, imagePath }, or null for any
// other path or a puzzle that doesn't read.
export function describePuzzleLink(pathname) {
    const match = pathname.match(/^\/(puzzle|p|c)\/([^/]+)\/?$/);
    if (match === null) return null;
    const [, route, id] = match;
    const imagePath = `/og/${route}/${id}.png`;

    if (route === 'c') {
        const puzzle = decodeSharedPuzzle(id);
        if (puzzle === null) return null;
        const clues = clueCount(puzzle.givens);
        const levelName = puzzle.showsRatingBeforeSolving && puzzle.level ? puzzle.level.name : null;
        if (puzzle.title === '') {
            return {
                title: clueTitle(levelName, clues),
                subtitle: 'Made in Magic Sudoku',
                description: PLAY_OR_PRINT_LINE,
                givens: puzzle.givens,
                imagePath,
            };
        }
        const subtitle = [puzzle.author ? `by ${puzzle.author}` : null, levelName, `${clues} clues`]
            .filter((part) => part !== null)
            .join(' · ');
        return {
            title: puzzle.title,
            subtitle,
            description: `${subtitle}. ${puzzle.instructions || PLAY_OR_PRINT_LINE}`,
            givens: puzzle.givens,
            imagePath,
        };
    }

    if (/^[0-9]{81}$/.test(id) === false) return null;
    return {
        title: clueTitle(null, clueCount(id)),
        subtitle: 'Play it in Magic Sudoku',
        description: PLAY_LINE,
        givens: id,
        imagePath,
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
        ['property', 'og:image:alt', `A Sudoku grid with ${clueCount(preview.givens)} clues`],
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

// The app's light appearance, as the app's shared puzzle picture draws it.
const COLORS = {
    backgroundEdge: '#E5E3E0', // Tertiary Background
    background: '#F1F1ED', // Secondary Background
    card: '#F9F9F7', // Grid/Cell Primary Background
    given: '#F5F3F0', // Grid/Cell Prefilled Background
    cellLine: '#E2DFD8',
    boxLine: '#BABABA', // Grid/Lines
    ink: '#212121', // Primary Foreground
    slate: '#5F717F', // Input/Pen
    secondaryInk: '#797979', // Secondary Foreground
    shadow: '#B8B6AF', // Shadow
};

// Rubik covers Latin, Cyrillic and Hebrew. Other scripts would draw as blanks, so the picture
// falls back to the clue count; the link's title still shows in full beside it.
const DRAWABLE = /^[ -ɏͰ-ϿЀ-ӿ֐-׿ -⁯€]*$/;

// Rubik's advance widths in thousandths of an em, for the printable ASCII characters (space to
// ~) and a few more, read from preview/Rubik-Bold.ttf and Rubik-Medium.ttf. Anything else is
// taken as wide, so a line never runs over.
const WIDTHS = {
    700: { ascii: [212, 302, 488, 689, 675, 847, 765, 260, 408, 408, 450, 613, 287, 479, 287, 574, 688, 503, 666, 676, 703, 654, 661, 589, 686, 647, 295, 307, 523, 571, 523, 604, 876, 718, 712, 702, 723, 643, 617, 711, 732, 325, 685, 673, 603, 836, 726, 718, 686, 718, 695, 674, 631, 734, 696, 832, 711, 687, 668, 390, 574, 390, 468, 737, 396, 589, 634, 602, 634, 607, 460, 634, 644, 296, 307, 611, 296, 931, 644, 616, 634, 634, 459, 562, 474, 634, 624, 866, 616, 626, 564, 451, 302, 451, 562], '·': 336, '…': 797, '\u00A0': 212 },
    500: { ascii: [228, 270, 420, 685, 645, 814, 722, 232, 368, 368, 446, 613, 266, 485, 261, 526, 652, 456, 612, 635, 647, 610, 620, 548, 650, 604, 273, 289, 500, 569, 500, 565, 863, 704, 686, 684, 704, 617, 597, 708, 728, 291, 655, 628, 588, 812, 707, 696, 659, 696, 670, 648, 593, 719, 664, 802, 663, 662, 635, 354, 526, 354, 432, 739, 361, 571, 619, 577, 619, 574, 427, 619, 621, 268, 278, 562, 268, 919, 621, 595, 619, 619, 418, 520, 439, 611, 588, 830, 585, 589, 541, 398, 266, 398, 562], '·': 332, '…': 695, '\u00A0': 228 },
};

function textWidth(text, size, weight) {
    const table = WIDTHS[weight];
    let thousandths = 0;
    for (const char of text) {
        const code = char.codePointAt(0);
        thousandths += code >= 32 && code <= 126 ? table.ascii[code - 32] : table[char] ?? 750;
    }
    return (thousandths / 1000) * size;
}

// Splits text into at most `maxLines` lines of `width`, ending with … when it runs over.
function wrap(text, size, weight, width, maxLines) {
    const lines = [];
    let line = '';
    // Only plain spaces break: a no-break space keeps a count with its noun.
    for (const word of text.split(/ +/).filter((part) => part !== '')) {
        const candidate = line === '' ? word : `${line} ${word}`;
        if (textWidth(candidate, size, weight) <= width) {
            line = candidate;
            continue;
        }
        if (line !== '') lines.push(line);
        line = word;
        // A word wider than the line breaks where it must.
        while (textWidth(line, size, weight) > width) {
            let fit = line.length - 1;
            while (fit > 1 && textWidth(line.slice(0, fit), size, weight) > width) fit -= 1;
            lines.push(line.slice(0, fit));
            line = line.slice(fit);
        }
    }
    if (line !== '') lines.push(line);
    if (lines.length <= maxLines) return lines;
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && textWidth(`${last}…`, size, weight) > width) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
}

function escapeXML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// The grid card: the givens on their shaded squares, the app's thin and thick lines, rounded
// like the game's board.
function gridSVG(givens, x, y, side) {
    const radius = 28;
    const boxLineWidth = 4;
    const inset = boxLineWidth / 2;
    const cell = (side - boxLineWidth) / 9;
    const parts = [];

    for (let index = 0; index < 81; index++) {
        if (givens[index] === '0') continue;
        const cx = x + inset + (index % 9) * cell;
        const cy = y + inset + Math.floor(index / 9) * cell;
        parts.push(`<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" fill="${COLORS.given}"/>`);
    }
    for (let line = 1; line < 9; line++) {
        const offset = inset + line * cell;
        const isBox = line % 3 === 0;
        const stroke = isBox ? COLORS.boxLine : COLORS.cellLine;
        const width = isBox ? boxLineWidth : 2;
        parts.push(`<line x1="${x + offset}" y1="${y + inset}" x2="${x + offset}" y2="${y + side - inset}" stroke="${stroke}" stroke-width="${width}"/>`);
        parts.push(`<line x1="${x + inset}" y1="${y + offset}" x2="${x + side - inset}" y2="${y + offset}" stroke="${stroke}" stroke-width="${width}"/>`);
    }
    const fontSize = cell * 0.6;
    for (let index = 0; index < 81; index++) {
        const digit = givens[index];
        if (digit === '0') continue;
        const cx = x + inset + (index % 9 + 0.5) * cell;
        // Rubik's digits are 0.7 em tall: centre them on the square.
        const baseline = y + inset + (Math.floor(index / 9) + 0.5) * cell + fontSize * 0.35;
        parts.push(`<text x="${cx}" y="${baseline}" font-size="${fontSize}" font-weight="700" fill="${COLORS.ink}" text-anchor="middle">${digit}</text>`);
    }

    return `
  <clipPath id="grid"><rect x="${x}" y="${y}" width="${side}" height="${side}" rx="${radius}"/></clipPath>
  <g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${side}" height="${side}" rx="${radius}" fill="${COLORS.card}"/></g>
  <g clip-path="url(#grid)">${parts.join('')}</g>
  <rect x="${x + inset}" y="${y + inset}" width="${side - boxLineWidth}" height="${side - boxLineWidth}" rx="${radius - inset}" fill="none" stroke="${COLORS.boxLine}" stroke-width="${boxLineWidth}"/>`;
}

// The picture: the grid on the left; the title, the line under it and the Magic Sudoku mark on
// the right. `iconDataURL` is the app icon as a data: URL.
export function previewSVG(preview, iconDataURL) {
    const { width, height } = PREVIEW_IMAGE_SIZE;
    const gridSide = 540;
    const gridX = 60;
    const gridY = (height - gridSide) / 2;
    const textX = gridX + gridSide + 56;
    const textWidthLimit = width - textX - 48;

    const keepCounts = (text) => text.replace(/(\d+) clues/g, '$1\u00A0clues');
    const title = keepCounts(DRAWABLE.test(preview.title) ? preview.title : clueTitle(null, clueCount(preview.givens)));
    const subtitle = DRAWABLE.test(preview.subtitle) ? keepCounts(preview.subtitle) : '';
    const titleSize = 52;
    const subtitleSize = 30;
    const titleLines = wrap(title, titleSize, 700, textWidthLimit, 3);
    const subtitleLines = subtitle === '' ? [] : wrap(subtitle, subtitleSize, 500, textWidthLimit, 2);

    // The words sit in the space above the mark, centred on it.
    const titleLeading = titleSize * 1.15;
    const subtitleLeading = subtitleSize * 1.3;
    const blockHeight = titleLines.length * titleLeading
        + (subtitleLines.length > 0 ? 18 + subtitleLines.length * subtitleLeading : 0);
    const markTop = gridY + gridSide - 84;
    let baseline = gridY + Math.max(0, (markTop - gridY - 24 - blockHeight) / 2) + titleSize * 0.9;

    const words = [];
    for (const line of titleLines) {
        words.push(`<text x="${textX}" y="${baseline}" font-size="${titleSize}" font-weight="700" fill="${COLORS.ink}">${escapeXML(line)}</text>`);
        baseline += titleLeading;
    }
    if (subtitleLines.length > 0) baseline += 18 - titleLeading + subtitleLeading;
    for (const line of subtitleLines) {
        words.push(`<text x="${textX}" y="${baseline}" font-size="${subtitleSize}" font-weight="500" fill="${COLORS.slate}">${escapeXML(line)}</text>`);
        baseline += subtitleLeading;
    }

    const iconSize = 84;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Rubik">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COLORS.backgroundEdge}"/>
      <stop offset="0.2" stop-color="${COLORS.background}"/>
      <stop offset="0.5" stop-color="${COLORS.background}"/>
      <stop offset="1" stop-color="${COLORS.backgroundEdge}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="${COLORS.shadow}" flood-opacity="0.45"/>
    </filter>
    <clipPath id="icon"><rect x="${textX}" y="${markTop}" width="${iconSize}" height="${iconSize}" rx="${iconSize * 0.24}"/></clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#background)"/>
  ${gridSVG(preview.givens, gridX, gridY, gridSide)}
  ${words.join('\n  ')}
  <image href="${iconDataURL}" x="${textX}" y="${markTop}" width="${iconSize}" height="${iconSize}" clip-path="url(#icon)"/>
  <text x="${textX + iconSize + 20}" y="${markTop + 40}" font-size="38" font-weight="700" fill="${COLORS.ink}">Magic Sudoku</text>
  <text x="${textX + iconSize + 20}" y="${markTop + 76}" font-size="26" font-weight="500" fill="${COLORS.secondaryInk}">magic-sudoku.com</text>
</svg>`;
}
