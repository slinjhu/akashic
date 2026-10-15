import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm, cp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || `exit ${result.status}`}`);
  return (result.stdout || "").trim();
}

export function githubRepository(remote) {
  // Supports HTTPS, SSH, and local SSH aliases such as github-personal-slinjhu.
  const match = remote.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) throw new Error("Cannot determine owner/repository from origin.");
  return `${match[1]}/${match[2]}`;
}

export function pagesBasePath(repository, customDomain) {
  const [owner, name] = repository.split("/");
  return customDomain || name.toLowerCase() === `${owner}.github.io`.toLowerCase() ? "" : `/${name}`;
}

export async function publishDirectory(directory, remote, identity, cname) {
  const temporary = await mkdtemp(path.join(tmpdir(), "akashic-pages-"));
  const git = args => run("git", args, { cwd: temporary });
  try {
    git(["init", "--initial-branch=gh-pages"]);
    git(["remote", "add", "origin", remote]);
    if (git(["ls-remote", "--heads", "origin", "refs/heads/gh-pages"])) {
      git(["fetch", "--depth=1", "origin", "gh-pages"]);
      git(["checkout", "-B", "gh-pages", "FETCH_HEAD"]);
    }
    // Only the temporary deployment checkout is replaced. Source checkout is untouched.
    for (const entry of await readdir(temporary)) {
      if (entry !== ".git") await rm(path.join(temporary, entry), { recursive: true, force: true });
    }
    await cp(directory, temporary, { recursive: true });
    await writeFile(path.join(temporary, ".nojekyll"), "");
    if (cname) await writeFile(path.join(temporary, "CNAME"), cname + "\n");
    git(["config", "user.name", identity.name]);
    git(["config", "user.email", identity.email]);
    git(["add", "--all"]);
    if (git(["status", "--porcelain"])) git(["commit", "-m", "Publish Akashic static site"]);
    // Normal fast-forward push; concurrent deployments fail rather than overwrite history.
    git(["push", "origin", "HEAD:refs/heads/gh-pages"]);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
