import { readdir, readFile, mkdir, writeFile, copyFile, rm, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import { noteUrl } from "../lib/paths.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const assetPattern = /\.(?:svg|png|jpe?g|gif|webp|avif|pdf|mp4|webm|mp3|ogg|csv|txt)$/i;

export function parseNote(source, file) {
  const frontmatter = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (source.startsWith("---\n") && !frontmatter) throw new Error(`${file}: unclosed YAML front matter`);
  const data = frontmatter ? (parseYaml(frontmatter[1]) ?? {}) : {};
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(`${file}: front matter must be a mapping`);
  const content = frontmatter ? source.slice(frontmatter[0].length) : source;
  if (data.title !== undefined && typeof data.title !== "string") throw new Error(`${file}: title must be a string`);
  if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== "string"))) {
    throw new Error(`${file}: tags must be an array of strings`);
  }
  const tree = parser.parse(content);
  const firstHeading = tree.children.find(node => node.type === "heading" && node.depth === 1);
  const title = data.title || (firstHeading && toString(firstHeading)) || path.basename(file, ".md");
  const slugger = new GithubSlugger();
  const headings = tree.children.filter(node => node.type === "heading").map(node => ({
    id: slugger.slug(toString(node)), text: toString(node), depth: node.depth,
  }));
  return {
    file, url: noteUrl(file), title, description: typeof data.description === "string" ? data.description : "",
    tags: [...new Set(data.tags || [])], body: content, text: tree.children.map(node => toString(node)).join("\n\n"), headings,
    hideTags: Array.isArray(data.hide) && data.hide.includes("tags"),
  };
}

export async function generateContent(base = root) {
  const docs = path.join(base, "docs");
  const assetsDir = path.join(base, "public/content");
  const notes = [];
  const assets = [];
  const hash = createHash("sha256");
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const relative = path.relative(docs, full).split(path.sep).join("/");
        if (/\.md$/i.test(entry.name)) notes.push(parseNote(await readFile(full, "utf8"), relative));
        else if (assetPattern.test(entry.name)) {
          const destination = path.join(assetsDir, relative);
          await mkdir(path.dirname(destination), { recursive: true });
          await copyFile(full, destination);
          assets.push(relative);
          hash.update(relative).update(await readFile(full));
        }
      }
    }
  }
  await walk(docs);
  const routes = new Set();
  for (const note of notes) {
    if (routes.has(note.url) || note.url === "/search" || note.url.startsWith("/content/")) {
      throw new Error(`Duplicate or reserved URL ${note.url} from ${note.file}`);
    }
    routes.add(note.url);
  }
  const generated = path.join(base, ".generated");
  await mkdir(generated, { recursive: true });
  // Remove only previously generated assets, never user-owned public files.
  let previous = [];
  try { previous = JSON.parse(await readFile(path.join(generated, "assets.json"), "utf8")); } catch {}
  for (const file of previous) if (!assets.includes(file)) await rm(path.join(assetsDir, file), { force: true });
  await writeFile(path.join(generated, "assets.json"), JSON.stringify(assets));
  const output = JSON.stringify({ notes, assetRevision: hash.digest("hex") }, null, 2) + "\n";
  const target = path.join(generated, "library.json");
  let current;
  try { current = await readFile(target, "utf8"); } catch {}
  if (output !== current) {
    await writeFile(target + ".tmp", output);
    await rename(target + ".tmp", target);
  }
  return notes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const notes = await generateContent();
  console.log(`Indexed ${notes.length} Markdown pages.`);
}
