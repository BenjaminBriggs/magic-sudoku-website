// Writes a puzzle page's og: and twitter: tags for the puzzle in its link, so WhatsApp, Slack,
// Discord, X and a link pasted into Messages show that puzzle's title and picture instead of the
// site's one card. Link crawlers don't run the page's scripts, so this happens at the edge.
// A path that isn't a puzzle, or a puzzle that doesn't read, keeps the page's own tags.

import { describePuzzleLink, withPreviewTags } from '../../js/puzzle-preview.js';

export default async (request, context) => {
    const response = await context.next();
    if (request.method !== 'GET' || response.status !== 200) return response;
    if ((response.headers.get('content-type') ?? '').includes('text/html') === false) return response;

    const url = new URL(request.url);
    const preview = describePuzzleLink(url.pathname);
    if (preview === null) return response;

    const html = withPreviewTags(await response.text(), preview, `${url.origin}${url.pathname}`);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html, { status: response.status, headers });
};

export const config = { path: ['/puzzle/*', '/p/*', '/c/*'] };
