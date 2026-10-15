# Akashic

A Markdown-first personal knowledge library built with Next.js, React, and TypeScript.

## Preview locally

Install Node.js 22 or newer, then run:

```sh
make env
make dev
```

Open <http://127.0.0.1:8056>. `make env` runs `npm ci` using the lockfile.
`make dev` watches both app code and `docs/`: saved notes, added or deleted pages,
metadata, and images update automatically. Stop the server with Ctrl+C.

## Write a note

1. Copy `templates/note.md` into a subject folder under `docs/`.
2. Set its title, tags, and optional description, then write the content.
3. Add an `index.md` to introduce a subject when useful.

Navigation follows folders automatically; no navigation list needs updating.
Search covers titles, tags, and note text; the tag index groups notes automatically.
Tags appear above the title. Appearance follows the system by default, with
persistent light/dark overrides. Dates belong in Git history.
See [the writing guide](docs/guides/writing-notes.md) for equations, Mermaid
diagrams, images, plots, and links.

## Build

```sh
make check
make build
npm start
```

`make check` runs content-pipeline tests and TypeScript checks. The production
build lives in `.next/`; `npm start` serves it on port 8056. Rebuild after changing
notes in production. No database is required; notes remain editable Markdown.

## Rendering and interaction

`components/markdown.tsx` owns the Markdown-to-React rendering pipeline. It uses
`react-markdown`, GFM tables/task lists/footnotes, syntax highlighting, and KaTeX
for equations. Raw HTML and executable MDX are not enabled. Relative `.md` links
resolve to page URLs; images can live beside notes or in `docs/assets/`.

Mermaid blocks render with a local JavaScript bundle at the page's default text
size, with source and fullscreen controls. Wide diagrams scroll instead of
scaling the text. Code blocks have a copy button. Add React components in `components/`
and register them in the Markdown renderer to extend interactions. The app owns
the layout and styling, without a documentation theme or template overrides.

Math fonts, syntax highlighting, and Mermaid are bundled locally, with no CDN
dependency. `scripts/content.mjs` validates front matter, indexes headings and
notes, and copies supported assets into `public/content/`. Its generated JSON
feeds both server rendering and client search. `/search` is reserved for the app;
`docs/tags.md` supplies the introduction to the generated `/tags` index.

## Layout

```text
app/                  Next.js routes, layout, and styles
components/           Markdown rendering and interactive components
lib/                  Content types and relative-link resolution
scripts/              Content indexing and development watcher
tests/                Content and path regression tests
docs/                 Notes, subject indexes, and assets
templates/note.md      Reusable note template (not published)
.generated/           Generated content index (ignored)
public/content/       Generated copies of note assets (ignored)
package-lock.json     Locked Node.js dependencies
```
