# Working on Akashic

Akashic is a personal knowledge library. Its main content is human-readable
Markdown notes, presented by a Next.js, React, and TypeScript app.

## Writing docs: build a mental model

Help the reader understand how something works, starting from the smallest useful
example. Prefer a gradual explanation over a catalog of terms or features.

- Start with the core concept and a minimal setup. Explain what exists and what
  it can do before introducing more components.
- Add one concept or component at a time. Give it a reason to exist: what new
  need does it address, and how does it change the example?
- Carry one concrete example through the explanation. Keep names and values
  consistent so readers can focus on the new idea.
- Define terms when they first become necessary. Avoid front-loading a glossary,
  implementation details, or a complete architecture diagram.
- Keep each step short and focused. Use plain language, small diagrams, and
  simple tables when they make the relationship clearer.
- Explain what the reader can now do or understand after an important step.
  Distinguish concepts that are easy to confuse without adding unrelated detail.
- Put advanced cases, exceptions, and troubleshooting after the core model.
  Keep simplifications accurate and state assumptions that affect the explanation.
- Verify technical claims against authoritative sources and link to them.

For example, explain networking by starting with an isolated VPC, adding a subnet
and a server, then introducing routing, internet access, and service endpoints as
new needs arise. Each step should build on what the reader already understands.

## Where content lives

- `docs/` contains knowledge notes organized by subject. Folder structure drives
  navigation; an `index.md` can introduce a subject.
- `docs/akashic/` contains guides for this repo: getting started, writing notes,
  and architecture. See `docs/akashic/writing-notes.md` for Markdown conventions.
- Notes use YAML front matter with `title` and `tags`, plus an optional
  `description`. Use relative Markdown links between notes.
- `templates/note.md` is the reusable note template. Images can live beside a
  note or under `docs/assets/`.

## Architecture in brief

`scripts/content.mjs` indexes Markdown and metadata into
`.generated/library.json` and copies assets into `public/content/`. These are
generated outputs; edit the source content instead.

`app/` owns routes and layout, `components/` renders Markdown and interactive
elements, and `lib/` provides content access and link resolution. Notes are stored
as files, with no database. See `docs/akashic/architecture.md` for details.

For content-only requests, keep changes in the docs. Run `npm run content` to
check content generation after moving pages or changing metadata, and update
relative links when paths change.

## Framework instructions

The following block is maintained automatically by Next.js and applies when
working on application code.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
