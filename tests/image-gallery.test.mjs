import test from "node:test";
import assert from "node:assert/strict";
import React, { Children, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown, { defaultUrlTransform } from "react-markdown";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkImageGallery from "../lib/remark-image-gallery.mjs";
import { resolveContentUrl } from "../lib/paths.mjs";
import { parseNote } from "../scripts/content.mjs";

const parser = unified().use(remarkParse).use(remarkImageGallery);
const parse = source => parser.runSync(parser.parse(source));

test("image arrays retain image order, alt text, titles, and relative paths", () => {
  const source = 'Before\n\n```images\n![First](./one.jpg "Reference")\n\n![Second](../two.png)\n```\n\nAfter';
  const tree = parse(source);
  const gallery = tree.children[1];
  assert.equal(gallery.data.hProperties["data-image-gallery"], "true");
  assert.deepEqual(gallery.children.map(({ url, alt, title }) => ({ url, alt, title })), [
    { url: "./one.jpg", alt: "First", title: "Reference" },
    { url: "../two.png", alt: "Second", title: null },
  ]);
  assert.equal(tree.children[0].children[0].value, "Before");
  assert.equal(tree.children[2].children[0].value, "After");
  assert.match(parseNote(source, "test.md").text, /FirstSecond/);
  assert.doesNotMatch(parseNote(source, "test.md").text, /!\[/);
});

test("image arrays reject empty blocks and non-image content without changing normal code", () => {
  for (const content of ["", "plain text", "![One](one.jpg) extra", "<img src='one.jpg'>", "# Heading"]) {
    assert.throws(() => parse(`\`\`\`images\n${content}\n\`\`\``), /images block/);
  }
  assert.equal(parse("```python\nprint('hello')\n```").children[0].type, "code");
  assert.equal(parse("![One](one.jpg)").children[0].data, undefined);
});

test("gallery images pass through Markdown URL resolution and sanitization", () => {
  const seen = [];
  renderToStaticMarkup(React.createElement(Markdown, {
    remarkPlugins: [remarkImageGallery],
    urlTransform: url => defaultUrlTransform(resolveContentUrl(url, "datasets/evaluation.md")),
    components: {
      div: ({ node, children }) => {
        if (node.properties["data-image-gallery"] === "true") {
          for (const child of Children.toArray(children)) if (isValidElement(child)) seen.push(child.props.src);
        }
        return React.createElement("div");
      },
    },
    children: "```images\n![Local](evaluation-assets/one.jpg)\n![Remote](https://example.com/two.jpg)\n![Unsafe](javascript:alert)\n```",
  }));
  assert.deepEqual(seen, ["/content/datasets/evaluation-assets/one.jpg", "https://example.com/two.jpg", ""]);
});
