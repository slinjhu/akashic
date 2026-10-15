---
title: Getting started with Akashic
description: Set up, run, and write notes in Akashic.
tags: [akashic]
---

# Getting started with Akashic

A Markdown-first personal knowledge library built with Next.js, React, and TypeScript.

## Preview locally

Install Node.js 22 or newer, then run these commands from the repository root:

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
Use Library for the topic tree, Tags for the grouped tag index, and Search for
titles, tags, and note text. On Tags, the sidebar lists tags with note counts;
click one to scroll to its section. Search currently has no sidebar content.
These Akashic guides live in Library alongside other notes.

Tags appear above the title unless the note sets `hide: [tags]`. The appearance
button shows the current mode and cycles System → Light → Dark → System.
System is the default, and the choice is saved. Dates belong in Git history.
See [the writing guide](writing-notes.md) for equations, Mermaid
diagrams, images, plots, and links.

## Build

```sh
make check
make build
npm start
```

`make check` runs tests and TypeScript checks. `make build` exports the site to
`out/`, containing HTML, CSS, JavaScript, and assets. `npm start` previews those
files on port 8056; use `PORT=8057 npm start` if the development server is already
running. Rebuild after changing notes. Production hosting needs only a static
file server, with no Node.js runtime or database.

## Publish to GitHub Pages

Ensure Git can push to `origin`, then run the command below. Publishing uses the
same SSH alias and credentials as `git push`; the GitHub CLI is not needed.

```sh
make publish
```

This builds the current working files and pushes only the generated site to the
`gh-pages` branch. It keeps deployment history, leaves the source branch alone,
and adds `.nojekyll`. All notes and supported assets
under `docs/` are included, including uncommitted local edits.

For `slinjhu/akashic`, the default URL is <https://slinjhu.github.io/akashic/>.
After the first push, open the repository's **Settings → Pages**. Select
**Deploy from a branch**, choose **gh-pages** and **/ (root)**, and save.
This is a one-time setup; subsequent `make publish` runs trigger deployment
automatically. Deployment runs asynchronously after the push. See
[GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

The publish command determines the project path from `origin`. If using a custom
domain, configure it in Pages settings and pass `PAGES_DOMAIN=notes.example.com`
on every publish. This builds for the domain root and writes a `CNAME` file.

To build and preview the project-path version without publishing:

```sh
NEXT_PUBLIC_BASE_PATH=/akashic make build
npm start
```

The preview serves it at <http://127.0.0.1:8056/akashic/>. A plain `make build`
exports for the domain root. The deployment path is fixed at build time.

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
feeds build-time page rendering and browser search. Search query parameters are
read in the browser. `/search` is reserved for the app;
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
out/                  Static site ready for hosting (ignored)
package-lock.json     Locked Node.js dependencies
```
