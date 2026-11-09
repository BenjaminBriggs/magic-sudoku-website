# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Static marketing website for Magic Sudoku, an iOS/iPad/Mac/Vision Pro Sudoku app. No build process — edit HTML/CSS/JS directly.

- **TailwindCSS** via CDN with custom color theme matching the iOS app
- **Vanilla JavaScript** for interactivity
- **Netlify** for hosting
- **Client-side includes** (`js/includes.js`) — elements with `include-html="/includes/foo.html"` attributes get their content fetched and injected at DOMContentLoaded

### Pages

- `index.html` — Landing page with feature bento grid
- `puzzle.html` — Puzzle viewer with deep linking to iOS app via `magic-sudoku://puzzle/{id}`
- `shared.html` — Player-made puzzle page for `/c/<payload>` links: decodes title, author, instructions and grid from the link (`js/shared-puzzle.js`, mirrors the app's `SharedPuzzle.swift`), deep links to `magic-sudoku://c/<payload>`
- `learn.html` — Hub linking to technique guides in `learn/` subdirectory
- `learn/*.html` — Individual technique pages with step-by-step image carousels
- `privacy.html`, `support.html` — Standard pages

### Shared Components

Header and footer are in `includes/` and loaded client-side. Every page must include:
```html
<span include-html="/includes/header.html"></span>
<!-- page content -->
<footer class="bg-tertiaryBg text-secondaryFg py-12">
    <div include-html="/includes/footer.html"></div>
</footer>
<script src="/js/includes.js"></script>
```

### Color System

Tailwind config is defined inline in each page's `<head>`. Colors mirror the iOS app's asset catalog:
- `accent`, `primaryBg`, `secondaryBg`, `tertiaryBg`, `primaryFg`, `secondaryFg`
- `highlight.blue`, `highlight.green`, `highlight.orange`, `highlight.red`, `highlight.yellow`
- `index.html` has the most complete config including `cellPrimary`, `cellAlternate`, `pen`, `pencil`

### Routing (Netlify)

- `/.well-known/*` — served directly (app association files)
- `/puzzle/*` — rewritten to `puzzle.html?id=:splat`
- `/c/*` — rewritten to `shared.html` (the page reads the payload from the path)
- `/og/*` — puzzle link pictures, drawn by an edge function (below)
- `/*` — SPA fallback to `index.html`

Configured in both `netlify.toml` and `_redirects` (Netlify uses both).

### Link previews (Netlify Edge Functions)

Link crawlers (WhatsApp, Slack, Discord, X, a link pasted into Messages) read `og:` tags without
running the page's scripts, so two edge functions in `netlify/edge-functions/` give each puzzle
link its own preview:

- `puzzle-preview-tags.js` on `/puzzle/*`, `/p/*` and `/c/*` swaps the page's `og:`/`twitter:` tags
  and `<title>` for the puzzle's: a created puzzle's name, otherwise "Sudoku · 26 clues" (the
  app's own previews use the same words). Invalid puzzles keep the static tags.
- `puzzle-preview-image.js` on `/og/*` draws the `og:image`, 1200 × 630: the givens on the app's
  grid, the title, and the app icon. `/og/c/<payload>.png` is the picture for `/c/<payload>`.
  It renders SVG with resvg-wasm (`netlify/edge-functions/vendor/`, wasm in `preview/`) and the
  app's Rubik fonts in `preview/`, and caches each picture for good: the path is the puzzle.

The words and the drawing are in `js/puzzle-preview.js`, which imports `js/shared-puzzle.js` (an
ES module, also imported by `shared.html`). Only the givens are drawn, never a solution.

Test them with `netlify dev` (`python3 -m http.server` doesn't run edge functions), then
`curl http://localhost:8888/c/<payload>` and open `/og/c/<payload>.png`.

## Development

```bash
python3 -m http.server 8080
```

Note: the include system uses `fetch()`, so you need an HTTP server (not `file://`).

### App Store ID

`id6742204685` — used in App Store links and `apple-itunes-app` meta tags.

### iOS App Repo

The companion iOS app is at `../magic-sudoku`. Useful for referencing color assets, feature descriptions, and marketing copy.

## Deployment

Automatic via Netlify on push to repository.