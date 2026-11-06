import { spawn } from "node:child_process";
import { watch } from "chokidar";
import { generateContent } from "./content.mjs";
import { createServer } from "node:http";
import { createReviewHandler } from "./review-api.mjs";

await generateContent();
let pending = Promise.resolve();
let timer;
const watcher = watch("docs", { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 25 } });
watcher.on("all", () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    pending = pending.then(generateContent).then(() => console.log("Markdown updated.")).catch(error => console.error(error));
  }, 100);
});
const port = Number(process.env.PORT || 8056);
const reviews = createServer(createReviewHandler("docs", [`http://127.0.0.1:${port}`, `http://localhost:${port}`]));
await new Promise((resolve, reject) => { reviews.once("error", reject); reviews.listen(0, "127.0.0.1", resolve); });
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  stdio: "inherit", env: { ...process.env, AKASHIC_REVIEW_PORT: String(reviews.address().port) },
});
let stopping = false;
async function stop(signal) {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  await watcher.close();
  reviews.close();
  server.kill(signal);
}
process.on("SIGINT", () => void stop("SIGINT"));
process.on("SIGTERM", () => void stop("SIGTERM"));
server.on("exit", async code => {
  reviews.close();
  clearTimeout(timer);
  await watcher.close();
  process.exit(code ?? 0);
});
