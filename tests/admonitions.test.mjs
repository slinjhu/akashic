import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkAdmonitions from "../lib/remark-admonitions.mjs";
import rehypeSections from "../lib/rehype-sections.mjs";

const render = source => renderToStaticMarkup(React.createElement(Markdown, {
  remarkPlugins: [remarkAdmonitions],
  rehypePlugins: [rehypeSections],
  children: source,
}));

test("good and bad examples become labelled cards within a section", () => {
  const html = render("## Examples\n\n> [!GOOD]\n> [Project](https://example.com) is a **proxy**.\n\n> [!BAD]\n> Use Project.");
  assert.match(html, /class="admonition admonition-success"/);
  assert.match(html, /<p class="admonition-title">Good<\/p>/);
  assert.match(html, /<a href="https:\/\/example.com">Project<\/a> is a <strong>proxy<\/strong>/);
  assert.match(html, /class="admonition admonition-danger"/);
  assert.match(html, /<p class="admonition-title">Bad<\/p>/);
  assert.doesNotMatch(html, /\[!|<blockquote>/);
  assert.equal((html.match(/<details /g) || []).length, 1);
});

test("cards preserve paragraphs, lists, code, nested cards, and URL sanitization", () => {
  const html = render("> [!NOTE]\n>\n> First paragraph.\n>\n> - A list item\n>\n> ```js\n> const n = 1;\n> ```\n>\n> > [!TIP]\n> > [Unsafe](javascript:alert)");
  assert.match(html, /<p>First paragraph\.<\/p>/);
  assert.match(html, /<li>A list item<\/li>/);
  assert.match(html, /<code class="language-js">const n = 1;/);
  assert.match(html, /<p class="admonition-title">Tip<\/p>/);
  assert.match(html, /<a href="">Unsafe<\/a>/);
});

test("plain quotes, unknown markers, inline markers, and code remain unchanged", () => {
  for (const source of ["> A quotation.", "> [!UNKNOWN]\n> Text", "> [!GOOD] inline text", "> Text [!GOOD]"]) {
    assert.match(render(source), /<blockquote>/);
    assert.doesNotMatch(render(source), /class="admonition/);
  }
  const html = render("```md\n> [!BAD]\n> Example\n```");
  assert.match(html, /\[!BAD\]/);
  assert.doesNotMatch(html, /class="admonition/);
});

test("all documented types render their labels and colors", () => {
  for (const [type, tone] of [["NOTE", "note"], ["TIP", "success"], ["IMPORTANT", "important"], ["WARNING", "warning"], ["CAUTION", "danger"]]) {
    const html = render(`> [!${type}]\n> Body`);
    assert.match(html, new RegExp(`class="admonition admonition-${tone}"`));
    assert.match(html, new RegExp(`>${type[0] + type.slice(1).toLowerCase()}<`));
  }
});
