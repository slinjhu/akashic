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
    const id = slugger.slug(toString(node));
    const end = frontmatter.length + node.position.end.offset;
    const match = source.slice(end).match(marker);
    return { id, depth: node.depth, end, match, reviewed: match?.[2] === "reviewed" };
  });
}

/** @param {string} source @returns {Record<string, boolean>} */
export function sectionReviews(source) {
  return Object.fromEntries(sections(source).filter(node => node.depth >= 2).map(node => [node.id, node.reviewed]));
}

/** Update only the comment immediately following the requested heading. */
export function setSectionReview(source, id, reviewed) {
  const section = sections(source).find(node => node.depth >= 2 && node.id === id);
  if (!section) throw new Error("Section not found. Refresh the page and try again.");
  const comment = `<!-- review: ${reviewed ? "reviewed" : "pending"} -->`;
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const replacement = section.match
    ? section.match[0].replace(/<!-- review: (reviewed|pending) -->/, comment)
    : newline + comment;
  return source.slice(0, section.end) + replacement + source.slice(section.end + (section.match?.[0].length || 0));
}
