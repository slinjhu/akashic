import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import rehypeSections from "../lib/rehype-sections.mjs";

const heading = (level, id) => ({ type: "element", tagName: `h${level}`, properties: { id }, children: [{ type: "text", value: id }] });
const paragraph = value => ({ type: "element", tagName: "p", properties: {}, children: [{ type: "text", value }] });
const content = section => section.children[1].children;
const title = section => section.children[0].children[0].properties.id;
function group(children) {
  const tree = { type: "root", children };
  rehypeSections()(tree);
  return tree.children;
}

test("sections nest by heading depth and stop at the next peer or ancestor", () => {
  const intro = paragraph("Introduction");
  const body = paragraph("Deep content");
  const result = group([
    heading(1, "title"), intro, heading(2, "a"), paragraph("A"),
    heading(3, "b"), heading(4, "c"), body,
    heading(3, "d"), heading(2, "e"), paragraph("E"),
  ]);
  assert.equal(result[0].tagName, "h1");
  assert.equal(result[1], intro);
  assert.deepEqual(result.slice(2).map(title), ["a", "e"]);
  const [a, e] = result.slice(2);
  assert.deepEqual(content(a).slice(1).map(title), ["b", "d"]);
  assert.equal(content(content(a)[1])[0].children[0].children[0].tagName, "h4");
  assert.equal(content(content(content(a)[1])[0])[0], body);
  assert.equal(content(e)[0].children[0].value, "E");
  assert.equal(a.properties.open, true);
});

test("skipped levels nest under the nearest ancestor and a title resets the tree", () => {
  const result = group([heading(2, "a"), heading(4, "b"), heading(6, "c"), heading(1, "next"), heading(3, "d")]);
  assert.equal(title(content(result[0])[0]), "b");
  assert.equal(title(content(content(result[0])[0])[0]), "c");
  assert.equal(result[1].tagName, "h1");
  assert.equal(title(result[2]), "d");
});

test("headings embedded in quotes stay in their original content", () => {
  const quote = { type: "element", tagName: "blockquote", properties: {}, children: [heading(2, "quoted")] };
  const result = group([heading(2, "a"), quote, paragraph("After quote")]);
  assert.equal(content(result[0])[0], quote);
  assert.equal(content(result[0]).length, 2);
});

test("Markdown rendering preserves anchor IDs, formatted headings, code, and native disclosures", () => {
  const html = renderToStaticMarkup(React.createElement(Markdown, {
    rehypePlugins: [rehypeSlug, rehypeSections],
    children: "# Title\n\nIntro\n\n## A *formatted* heading\n\n### Child\n\n```md\n## Not a section\n```\n\n## A *formatted* heading",
  }));
  assert.equal((html.match(/<details /g) || []).length, 3);
  assert.match(html, /<details open="" class="note-section" data-depth="2">/);
  assert.match(html, /<summary><h2 id="a-formatted-heading">A <em>formatted<\/em> heading<\/h2><\/summary>/);
  assert.match(html, /id="a-formatted-heading-1"/);
  assert.match(html, /<code class="language-md">## Not a section/);
  assert.match(html, /^<h1 id="title">Title<\/h1>/);
});
