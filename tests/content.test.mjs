import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseNote, generateContent } from "../scripts/content.mjs";
import { noteUrl, resolveContentUrl } from "../lib/paths.mjs";

test("nested note URLs, folder indexes, fragments, and images resolve from source files", () => {
  assert.equal(noteUrl("index.md"), "/");
  assert.equal(noteUrl("aws/index.md"), "/aws");
  assert.equal(noteUrl("deep/a note.md"), "/deep/a%20note");
  assert.equal(resolveContentUrl("../aws/networking.md#routes", "guides/writing-notes.md"), "/aws/networking#routes");
  assert.equal(resolveContentUrl("index.md", "guides/writing-notes.md"), "/guides");
  assert.equal(resolveContentUrl("../assets/images/plot.svg", "guides/writing-notes.md"), "/content/assets/images/plot.svg");
  assert.equal(resolveContentUrl("./plot.png", "a/b/note.md"), "/content/a/b/plot.png");
  assert.equal(resolveContentUrl("#section", "index.md"), "#section");
  assert.equal(resolveContentUrl("https://example.com/page.md", "index.md"), "https://example.com/page.md");
  assert.equal(resolveContentUrl("../../secret.txt", "index.md"), "");
  assert.equal(resolveContentUrl("invalid%ZZ.md", "index.md"), "");
});

test("front matter preserves tags and headings use stable, unique anchors", () => {
  const note = parseNote('---\ntitle: "Networking: AWS"\ntags: [AWS, Network, AWS]\n---\n# Networking\n## A **route**\n## A route\n\nSome knowledge.', "aws/networking.md");
  assert.equal(note.title, "Networking: AWS");
  assert.deepEqual(note.tags, ["AWS", "Network"]);
  assert.deepEqual(note.headings.map(heading => heading.id), ["networking", "a-route", "a-route-1"]);
  assert.match(note.text, /Some knowledge/);
  assert.throws(() => parseNote("---\ntags: AWS\n---\n# Bad", "bad.md"), /array of strings/);
  assert.throws(() => parseNote("---\ntitle: 123\n---\n", "bad.md"), /title must be a string/);
  assert.throws(() => parseNote("---\ntitle: Oops", "bad.md"), /unclosed/);
});

test("regeneration handles additions, edits, removals, and changed assets", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "akashic-content-"));
  try {
    await mkdir(path.join(root, "docs/topic"), { recursive: true });
    await writeFile(path.join(root, "docs/index.md"), "# Home");
    await writeFile(path.join(root, "docs/topic/one.md"), "---\ntags: [AWS]\n---\n# One\nOriginal");
    await writeFile(path.join(root, "docs/topic/plot.svg"), "<svg/>");
    await generateContent(root);
    const initial = JSON.parse(await readFile(path.join(root, ".generated/library.json"), "utf8"));
    assert.equal(initial.notes.length, 2);
    await access(path.join(root, "public/content/topic/plot.svg"));
    await writeFile(path.join(root, "docs/topic/one.md"), "# Renamed\nEdited");
    await writeFile(path.join(root, "docs/topic/plot.svg"), "<svg>updated</svg>");
    await generateContent(root);
    const edited = JSON.parse(await readFile(path.join(root, ".generated/library.json"), "utf8"));
    assert.equal(edited.notes.find(note => note.url === "/topic/one").title, "Renamed");
    assert.notEqual(initial.assetRevision, edited.assetRevision);
    await rm(path.join(root, "docs/topic/one.md"));
    await rm(path.join(root, "docs/topic/plot.svg"));
    const remaining = await generateContent(root);
    assert.equal(remaining.length, 1);
    await assert.rejects(access(path.join(root, "public/content/topic/plot.svg")));
    await writeFile(path.join(root, "docs/topic.md"), "# Collision");
    await writeFile(path.join(root, "docs/topic/index.md"), "# Collision");
    await assert.rejects(generateContent(root), /Duplicate or reserved URL/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
