import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const marker = /^(\r?\n[\t ]*)+<!-- review: (reviewed|pending) -->/;

function sections(source) {
  const frontmatter = source.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] || "";
  const body = source.slice(frontmatter.length);
  const slugger = new GithubSlugger();
  return parser.parse(body).children.filter(node => node.type === "heading").map(node => {
    const text = toString(node);
    const cleanText = node.depth >= 2 ? text.replace(/^(✅|⏳)\s*/, "") : text;
    const id = slugger.slug(cleanText);
    const start = frontmatter.length + node.position.start.offset;
    const end = frontmatter.length + node.position.end.offset;
    const match = source.slice(end).match(marker);
    return { id, text: cleanText, depth: node.depth, start, end, match, reviewed: /^(✅|⏳)/.test(text) ? text.startsWith("✅") : match?.[2] === "reviewed" };
  });
}

/** Derive heading labels and anchors from the same Markdown used for review status. */
export function sectionHeadings(source) {
  return sections(source).map(({ id, text, depth }) => ({ id, text, depth }));
}

/** @param {string} source @returns {Record<string, boolean>} */
export function sectionReviews(source) {
  return Object.fromEntries(sections(source).filter(node => node.depth >= 2).map(node => [node.id, node.reviewed]));
}

/** Strip status from heading text before rendering/indexing; the UI supplies the button. */
export function withoutReviewEmoji(source) {
  for (const section of sections(source).filter(node => node.depth >= 2).reverse()) {
    const heading = source.slice(section.start, section.end);
    const clean = heading.replace(/^(#{2,6}[ \t]+)?(✅|⏳)[ \t]*/, "$1");
    source = source.slice(0, section.start) + clean + source.slice(section.end);
  }
  return source;
}

/** Update the heading's emoji, preserving the rest of the Markdown. */
export function setSectionReview(source, id, reviewed) {
  const section = sections(source).find(node => node.depth >= 2 && node.id === id);
  if (!section) throw new Error("Section not found. Refresh the page and try again.");
  const heading = source.slice(section.start, section.end);
  const prefix = heading.match(/^#{2,6}[ \t]+/)?.[0] || "";
  const text = heading.slice(prefix.length).replace(/^(✅|⏳)[ \t]*/, "");
  const replacement = prefix + (reviewed ? "✅ " : "⏳ ") + text;
  return source.slice(0, section.start) + replacement + source.slice(section.end + (section.match?.[0].length || 0));
}
