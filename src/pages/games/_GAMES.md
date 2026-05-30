# Games Showcase (`/games`)

Dedicated, per-game showcase pages live under `src/pages/games/`. Each game gets
its own route, e.g. `the-facility.astro` → `/games/the-facility`.

These pages are the deep-dive counterpart to the brief "Current Project" teaser on
the home page (`src/pages/index.astro`), which links here.

> **Note:** This file is named `_GAMES.md` (underscore prefix) so Astro excludes it
> from routing — otherwise loose `.md` files in `src/pages/` become public pages.

## Content rule

**Showcase completed / shipped work only.** Do not advertise upcoming or unreleased
features anywhere on these pages — we never want to imply a promise we might not
deliver. Copy describes what is *done*, not what is planned. (See AGENTS.md →
Design Philosophy.)

## Page anatomy (`the-facility.astro`)

Standalone Astro page (full `<html data-theme="dark">`) that imports
`../../styles/global.css` + its own sheet `../../styles/the-facility.css`. Sections:

1. **Hero** — title, lede, status/genre chips, autoplay-muted-loop in-engine video.
2. **What We've Built** — completed features; each can link to the devlog that
   details it (`devlogSlug`).
3. **In-Engine** — media gallery (images / gifs / clips) with a click-to-expand
   lightbox (Esc / click-out to close).
4. **From the Devlog** — related devlogs, pulled via `Astro.glob('../../devlogs/*.md')`
   and sorted newest-first.

## Media is data-driven

Media is declared as a manifest at the top of the page and mapped over — never
hand-write repeated markup. Pattern:

- `CONTENT_BASE` points at the **general** content bucket
  (`https://alleriumlabs-general-content.s3.us-west-2.amazonaws.com`), with
  `image/`, `gif/`, `video/` subdirectories. This is distinct from the devlog
  content bucket.
- `mediaUrl(kind, file)` builds the full URL.
- Every `<img>`/`<video>` has an `onerror` handler that adds `.media-missing` to its
  frame and removes itself, revealing a styled `.media-fallback` placeholder — so a
  missing/unset file never renders as a broken image.

To swap in real media: upload to the matching bucket subdirectory and set the
`file` value in the manifest. Placeholders are marked with `// TODO`.

## Adding a new game

1. Create `src/pages/games/<game-slug>.astro` (copy `the-facility.astro` as a
   starting point).
2. Reuse `the-facility.css` or add a per-page sheet alongside it.
3. Fill in the media manifest + completed-features copy (completed work only).
4. Link to it from the relevant place (home teaser, nav, etc.).

## Keeping this file out of routing

Astro generates a route for any `.md`/`.mdx`/`.astro`/`.html` in `src/pages/`.
This doc must not become a public page. If it ever shows up in the build output as a
route, either prefix the filename with an underscore (Astro ignores `_`-prefixed
files) or move it out of `src/pages/`. See AGENTS.md for the authoritative project map.
