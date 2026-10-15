import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { generateContent } from "./content.mjs";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
if (basePath && !/^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(basePath)) {
  throw new Error("NEXT_PUBLIC_BASE_PATH must be empty or a path such as /akashic (no trailing slash).");
}
await generateContent();
const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath },
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);
await writeFile("out/.nojekyll", "");
await writeFile(".generated/export.json", JSON.stringify({ basePath }) + "\n");
console.log(`Static site exported to out/. Preview with npm start at ${basePath || "/"}.`);
