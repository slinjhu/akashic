# Akashic

A Markdown-first personal knowledge library, rendered with [Zensical](https://zensical.org/).

## Preview locally

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run:

```sh
make env
make dev
```

Open <http://127.0.0.1:8056>. The preview rebuilds as files change.

## Write a note

1. Copy `templates/note.md` into a subject folder under `docs/`.
2. Set its title, tags, and optional description, then write the content.
3. Add an `index.md` to introduce a subject when useful.

Navigation follows folders automatically; no navigation list needs updating.
Search and the tag index are built from the notes. Dates belong in Git history.
See [the writing guide](docs/guides/writing-notes.md) for equations, Mermaid
diagrams, images, plots, and links.

## Build

```sh
uv run zensical build --strict
```

The generated static site is in `site/` (ignored by Git). The Markdown files
remain the source of truth. No database or application server is required.
The reading UI is generated; edit notes in your text editor.

MathJax and the Mermaid runtime load from external CDNs, so rendering these
features requires an internet connection. The Python dependencies are locked
in `uv.lock` for reproducible installs.

## Layout

```text
docs/                 Notes, subject indexes, and assets
templates/note.md     Reusable note template (not published)
zensical.toml         Site configuration
pyproject.toml        Python project and development dependencies
uv.lock              Locked dependency versions
```
