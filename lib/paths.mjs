// Paths are relative to docs/, not to the rendered page's URL.
export function noteUrl(file) {
  const parts = file.replace(/\.md$/i, "").split("/");
  if (parts.at(-1) === "index") parts.pop();
  return "/" + parts.map(encodeURIComponent).join("/");
}

export function resolveContentUrl(value, sourceFile) {
  if (!value || value.startsWith("#") || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return value;
  const match = value.match(/^([^?#]*)(.*)$/);
  if (!match) return value;
  const [, pathname, suffix] = match;
  const parts = pathname.startsWith("/") ? [] : sourceFile.split("/").slice(0, -1);
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return ""; }
  for (const part of decoded.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return "";
      parts.pop();
    } else parts.push(part);
  }
  const target = parts.join("/");
  if (/\.md$/i.test(target)) return noteUrl(target) + suffix;
  if (/\.[^/]+$/.test(target)) return "/content/" + parts.map(encodeURIComponent).join("/") + suffix;
  return "/" + parts.map(encodeURIComponent).join("/") + suffix;
}
