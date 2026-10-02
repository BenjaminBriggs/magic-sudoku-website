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
- `/*` — SPA fallback to `index.html`

Configured in both `netlify.toml` and `_redirects` (Netlify uses both).

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