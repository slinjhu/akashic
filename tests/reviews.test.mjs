import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { sectionReviews, setSectionReview, withoutReviewEmoji } from "../lib/section-reviews.mjs";
import { createReviewHandler } from "../scripts/review-api.mjs";
import { parseNote } from "../scripts/content.mjs";

test("review emojis preserve anchors, front matter, and unrelated text", () => {
  const source = '---\ntitle: Example\n---\n# Title\n\n## Same *name*\n\nText\n\n## Same *name*\n\n```md\n## Ignore\n```\n\nSetext\n------\n';
  const changed = setSectionReview(source, "same-name-1", true);
  assert.deepEqual(sectionReviews(changed), { "same-name": false, "same-name-1": true, setext: false });
  assert.deepEqual(parseNote(source, "test.md").headings, parseNote(changed, "test.md").headings);
  assert.equal(changed.replace('## ✅ Same', '## Same'), source);
  const pending = setSectionReview(changed, "same-name-1", false);
  assert.equal((pending.match(/⏳/g) || []).length, 1);
  assert.equal(withoutReviewEmoji(changed), source);
  assert.equal(sectionReviews(pending)["same-name-1"], false);
  assert.equal(sectionReviews(setSectionReview(source, "setext", true)).setext, true);
  assert.throws(() => setSectionReview(source, "ignore", true), /Section not found/);
  assert.throws(() => setSectionReview(source, "title", true), /Section not found/);
});

test("review editing retains Windows newlines and ignores markers inside code", () => {
  const source = '## A\r\n\r\n```md\r\n<!-- review: reviewed -->\r\n```\r\n';
  const result = setSectionReview(source, "a", true);
  assert.ok(result.startsWith('## ✅ A\r\n'));
  assert.equal(sectionReviews(source).a, false);
});

test("old comments migrate to an emoji without changing the anchor", () => {
  const old = "## First\n<!-- review: reviewed -->\n\nText\n";
  assert.equal(sectionReviews(old).first, true);
  assert.equal(setSectionReview(old, "first", true), "## ✅ First\n\nText\n");
  assert.equal(setSectionReview("## ✅ First\n", "first", false), "## ⏳ First\n");
  assert.equal(setSectionReview("## ⏳ First\n", "first", true), "## ✅ First\n");
});

test("local review API persists concurrent updates and rejects unsafe requests", async t => {
  const base = await mkdtemp(path.join(tmpdir(), "akashic-review-"));
  const docs = path.join(base, "docs");
  await mkdir(docs);
  await writeFile(path.join(docs, "note.md"), "## First\n\n## Second\n");
  await writeFile(path.join(base, "outside.md"), "## Outside\n");
  await symlink(path.join(base, "outside.md"), path.join(docs, "escape.md"));
  const server = createServer(createReviewHandler(docs));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(base, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const endpoint = origin + "/api/section-review/";
  const post = (input, requestOrigin = origin) => fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: requestOrigin }, body: JSON.stringify(input),
  });
  const responses = await Promise.all(["first", "second"].map(id => post({ file: "note.md", id, reviewed: true })));
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  assert.deepEqual(sectionReviews(await readFile(path.join(docs, "note.md"), "utf8")), { first: true, second: true });
  assert.deepEqual((await (await fetch(endpoint + "?file=note.md")).json()).reviews, { first: true, second: true });
  assert.equal((await post({ file: "note.md", id: "first", reviewed: false }, "https://other.example")).status, 403);
  assert.equal((await post({ file: "../outside.md", id: "outside", reviewed: true })).status, 400);
  assert.equal((await post({ file: "escape.md", id: "outside", reviewed: true })).status, 403);
  assert.equal((await post({ file: "note.md", id: "missing", reviewed: true })).status, 400);
  assert.equal((await post({ file: "note.md", id: "first", reviewed: "yes" })).status, 400);
  assert.equal((await post({ file: "note.md", id: "first", reviewed: false })).status, 200);
  assert.equal(sectionReviews(await readFile(path.join(docs, "note.md"), "utf8")).first, false);
});
