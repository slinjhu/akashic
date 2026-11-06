import { readFile, realpath, stat, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sectionReviews, setSectionReview } from "../lib/section-reviews.mjs";

/** Local-only source editing, shared by the dev server and static preview. */
export function createReviewHandler(docsDirectory, allowedOrigins) {
  let writes = Promise.resolve();
  return async function reviewHandler(req, res) {
    const reply = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(body));
    };
    try {
      const host = req.headers.host || "";
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return reply(403, { error: "Local access only." });
      if (req.method !== "GET" && req.method !== "POST") return reply(405, { error: "Method not allowed." });
      if (req.method === "POST" && (!(allowedOrigins || [`http://${host}`]).includes(req.headers.origin) || !req.headers["content-type"]?.startsWith("application/json"))) {
        return reply(403, { error: "Same-origin JSON requests required." });
      }
      let input;
      if (req.method === "POST") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 16384) return reply(413, { error: "Request too large." });
        }
        input = JSON.parse(body);
      } else input = Object.fromEntries(new URL(req.url, `http://${host}`).searchParams);
      if (!input || typeof input.file !== "string" || !input.file.endsWith(".md") || input.file.split(/[\\/]/).some(part => !part || part.startsWith("."))) {
        return reply(400, { error: "Invalid note path." });
      }
      const root = await realpath(docsDirectory);
      const file = await realpath(path.resolve(root, input.file));
      if (!file.startsWith(root + path.sep)) return reply(403, { error: "Note must be inside docs." });
      if (req.method === "GET") return reply(200, { reviews: sectionReviews(await readFile(file, "utf8")) });
      if (typeof input.id !== "string" || typeof input.reviewed !== "boolean") return reply(400, { error: "Invalid review status." });
      // Serialize read-modify-write operations so different sections cannot overwrite each other.
      const save = writes.then(async () => {
        const source = await readFile(file, "utf8");
        const updated = setSectionReview(source, input.id, input.reviewed);
        const temporary = path.join(path.dirname(file), `.review-${randomUUID()}.tmp`);
        try {
          await writeFile(temporary, updated, { mode: (await stat(file)).mode });
          await rename(temporary, file);
        } finally { await unlink(temporary).catch(() => {}); }
        return sectionReviews(updated);
      });
      writes = save.catch(() => {});
      return reply(200, { reviews: await save });
    } catch (error) {
      return reply(400, { error: error.message?.startsWith("Section not found") ? error.message : "Could not read or save this note." });
    }
  };
}
