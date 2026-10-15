import { spawn } from "node:child_process";
import { watch } from "chokidar";
import { generateContent } from "./content.mjs";

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
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "8056"], { stdio: "inherit" });
let stopping = false;
async function stop(signal) {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  await watcher.close();
  server.kill(signal);
}
process.on("SIGINT", () => void stop("SIGINT"));
process.on("SIGTERM", () => void stop("SIGTERM"));
server.on("exit", async code => {
  clearTimeout(timer);
  await watcher.close();
  process.exit(code ?? 0);
});
