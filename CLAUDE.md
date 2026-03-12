# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

This is a static website for Magic Sudoku, an iOS Sudoku app. The site uses:

- **Static HTML pages** with shared components via includes
- **TailwindCSS** (CDN) for styling with custom color theme matching the iOS app
- **Vanilla JavaScript** for interactive functionality
- **Netlify** for hosting with redirect rules

### Key Files

- `index.html` - Main landing page showcasing app features
- `puzzle.html` - Interactive puzzle viewer with deep linking to iOS app
- `js/includes.js` - Client-side HTML partial inclusion system
- `includes/footer.html` - Shared footer component
- `netlify.toml` - Netlify configuration with redirect rules
- `_redirects` - Additional Netlify redirect configuration

### Color System

The site uses a comprehensive color system that mirrors the iOS app's design:
- Accent colors, grid colors, highlight colors (blue, green, orange, red, yellow)
- Background colors (primary, secondary, tertiary)
- Foreground colors and input colors (pen, pencil)
- Dark mode variants for all colors

### Routing

- `/puzzle/*` routes to `puzzle.html?id=:splat` for puzzle deep linking
- SPA fallback routes everything else to `index.html`
- `.well-known/*` files served directly for app association

## Development

No build process required - this is a static site using CDN resources. Simply edit HTML/CSS/JS files directly.

### Testing Locally

Use any static file server (e.g., `python -m http.server` or VS Code Live Server).

### Deployment

Deployed automatically to Netlify when changes are pushed to the repository.