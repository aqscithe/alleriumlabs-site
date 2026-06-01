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

1. **Intro** — brief "what The Facility is": eyebrow, title, lede, status/genre chips.
2. **Work in Progress** — an aspect-ratio media puzzle, **populated live from the
   bucket** (see below), with a click-to-expand lightbox (Esc / click-out to close).

A **"From the Devlog"** section is intentionally hidden for now (the first devlogs
may not be what we want to feature here yet). To restore it, re-add an
`Astro.glob('../../devlogs/*.md')` fetch and a `related-devlogs` `<section>` — see
git history; the `.related-devlogs` CSS and `/devlog` routes are still in place.

## The Work-in-Progress puzzle is content-managed (no code edits)

The puzzle is **not** a hard-coded manifest. On page load, client-side JS lists the
general content bucket and builds the tiles from whatever is there — so a content
manager just uploads files and they appear on the next page load, grouped into
month sections (newest month first) forming a development timeline.

- Bucket: `https://alleriumlabs-general-content.s3.us-west-2.amazonaws.com`, folders
  `image/`, `gif/`, `video/` (distinct from the devlog content bucket).
- Recognised types: images `jpg/jpeg/png/webp/avif`, `gif`, video `mp4/webm/mov/m4v`.

### Filename convention: `YYYY-MM-DD_descriptive-slug.ext`

Example: `2026-05-14_old-lab-corridor.jpg`.

- **Date prefix (ISO, optional but expected)** is the *source of truth* for "when
  posted". It drives the bottom-right date stamp on each tile and which month
  section the tile lands in. We deliberately do **not** use the S3 `LastModified`
  time, because re-uploading or tweaking a clip would change it and silently
  re-date/re-order the piece. The filename date is immutable across edits.
- **Separator** between date and slug is `_` (a `-` also works); the date uses
  `-` internally. Day precision; `YYYY-MM-DD` also sorts chronologically.
- **Descriptive slug** becomes the on-hover caption (`old-lab-corridor` → "Old lab
  corridor"), so **name files meaningfully**.
- **Legacy / un-dated files** (no date prefix) still work — they fall back to
  `LastModified` for the stamp and month grouping. Rename them with a date prefix
  to make the date accurate and stable.
- Layout adapts to each piece's natural aspect ratio (portrait/square = 1 col,
  landscape = 2, panoramic ≥ 2.4:1 = 3); each month's grid packs independently
  with `grid-auto-flow: dense`.
- Failed/blocked loads degrade to a `.media-fallback` panel; if the whole listing
  can't load, the section shows a friendly message and logs setup guidance.

### Required one-time bucket setup

For the in-browser listing to work the bucket must (a) be **publicly readable**
(already true — images load), (b) allow **anonymous listing**, and (c) send **CORS**
headers for GET from the site origin.

Bucket policy statement (anonymous `s3:ListBucket`, scoped to the media prefixes):

```json
{
  "Sid": "PublicListMediaPrefixes",
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:ListBucket",
  "Resource": "arn:aws:s3:::alleriumlabs-general-content",
  "Condition": { "StringLike": { "s3:prefix": ["image/*", "gif/*", "video/*"] } }
}
```

CORS configuration (set `AllowedOrigins` to the real site origin(s); add localhost
for dev):

```json
[
  {
    "AllowedOrigins": ["https://<your-site-domain>", "http://localhost:4321"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

Note: enabling anonymous `ListBucket` makes the object keys under those prefixes
publicly enumerable. That's fine for a public showcase bucket; don't put anything
private in `image/`, `gif/`, or `video/`.

## Adding a new game

1. Create `src/pages/games/<game-slug>.astro` (copy `the-facility.astro` as a
   starting point).
2. Reuse `the-facility.css` or add a per-page sheet alongside it.
3. Write the intro copy (shipped / in-progress work only); the puzzle wiring is
   reusable as-is against the same bucket folders.
4. Link to it from the relevant place (home teaser, nav, etc.).

## Keeping this file out of routing

Astro generates a route for any `.md`/`.mdx`/`.astro`/`.html` in `src/pages/`.
This doc must not become a public page. If it ever shows up in the build output as a
route, either prefix the filename with an underscore (Astro ignores `_`-prefixed
files) or move it out of `src/pages/`. See AGENTS.md for the authoritative project map.
