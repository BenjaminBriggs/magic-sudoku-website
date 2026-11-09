// Draws a puzzle link's og:image: its givens on the app's grid beside its title and the Magic
// Sudoku mark, as a 1200 × 630 PNG. The path mirrors the page's: /og/c/<payload>.png is the
// picture for /c/<payload>. The path is the puzzle, so each picture is drawn once and cached.

import { initWasm, Resvg } from './vendor/resvg-wasm.mjs';
import { describePuzzleLink, previewSVG } from '../../js/puzzle-preview.js';

let assets = null;

function base64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
}

// The renderer, the fonts and the app icon, fetched from the site once per instance.
function loadAssets(origin) {
    assets ??= (async () => {
        const bytes = async (path) => {
            const response = await fetch(new URL(path, origin));
            if (response.ok === false) throw new Error(`${path} answered ${response.status}`);
            return new Uint8Array(await response.arrayBuffer());
        };
        const [wasm, bold, medium, icon] = await Promise.all([
            bytes('/preview/resvg.wasm'),
            bytes('/preview/Rubik-Bold.ttf'),
            bytes('/preview/Rubik-Medium.ttf'),
            bytes('/images/apple-touch-icon.png'),
        ]);
        await initWasm(wasm);
        return { fonts: [bold, medium], iconDataURL: `data:image/png;base64,${base64(icon)}` };
    })();
    // A failed load is tried again by the next request.
    assets.catch(() => {
        assets = null;
    });
    return assets;
}

export default async (request) => {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/og(\/.+)\.png$/);
    const preview = match === null ? null : describePuzzleLink(match[1]);
    if (preview === null) return new Response('Not found', { status: 404 });

    let loaded;
    try {
        loaded = await loadAssets(url.origin);
    } catch (error) {
        console.error(`Couldn't load the preview's renderer: ${error}`);
        return new Response('Unavailable', { status: 503, headers: { 'cache-control': 'no-store' } });
    }

    const resvg = new Resvg(previewSVG(preview, loaded.iconDataURL), {
        font: { fontBuffers: loaded.fonts, loadSystemFonts: false, defaultFontFamily: 'Rubik' },
    });
    const image = resvg.render();
    const png = image.asPng();
    image.free();
    resvg.free();

    return new Response(png, {
        headers: {
            'content-type': 'image/png',
            'cache-control': 'public, max-age=31536000, immutable',
            'netlify-cdn-cache-control': 'public, durable, max-age=31536000, immutable',
        },
    });
};

export const config = { path: '/og/*', cache: 'manual' };
