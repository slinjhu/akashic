import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// A local preview of the exported files, including GitHub Pages' project path.
const { basePath } = JSON.parse(await readFile(".generated/export.json", "utf8").catch(() => {
  throw new Error("No static build found. Run make build first.");
}));
const root = path.resolve("out");
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".txt": "text/plain", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm",
};
const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return;
    }
    const url = new URL(req.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    if (basePath && pathname === "/") {
      res.writeHead(302, { Location: `${basePath}/` }); res.end(); return;
    }
    if (basePath && pathname !== basePath && !pathname.startsWith(`${basePath}/`)) throw new Error("Not found");
    const file = path.resolve(root, `.${pathname.slice(basePath.length) || "/"}`);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error("Not found");
    if (path.relative(root, file).split(path.sep).some(part => part.startsWith("."))) throw new Error("Not found");
    const directory = (await stat(file)).isDirectory();
    if (directory && !url.pathname.endsWith("/")) {
      res.writeHead(308, { Location: url.pathname + "/" + url.search }); res.end(); return;
    }
    const target = directory ? path.join(file, "index.html") : file;
    const body = await readFile(target);
    res.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(req.method === "HEAD" ? undefined : await readFile(path.join(root, "404.html")).catch(() => "Not found"));
  }
});
const port = Number(process.env.PORT || 8056);
server.listen(port, "127.0.0.1", () => console.log(`Preview: http://127.0.0.1:${port}${basePath}/`));
