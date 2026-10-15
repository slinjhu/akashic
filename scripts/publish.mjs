import path from "node:path";
import { githubRepository, pagesBasePath, publishDirectory, run } from "./pages.mjs";

try {
  const remote = run("git", ["remote", "get-url", "origin"]);
  const repository = githubRepository(remote);
  // Use the same Git credentials and SSH alias as ordinary pushes.
  run("git", ["ls-remote", remote, "HEAD"]);
  const cname = process.env.PAGES_DOMAIN || undefined;
  const basePath = pagesBasePath(repository, cname);
  const identity = {
    name: run("git", ["config", "user.name"]),
    email: run("git", ["config", "user.email"]),
  };
  console.log(`Building ${repository} for ${basePath || "/"}…`);
  run("npm", ["run", "build"], {
    stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath },
  });
  await publishDirectory(path.resolve("out"), remote, identity, cname);
  const [owner] = repository.split("/");
  console.log(`Pushed to gh-pages. Site URL: https://${cname || `${owner}.github.io${basePath}`}/`);
  console.log(`One-time setup: https://github.com/${repository}/settings/pages → Deploy from a branch → gh-pages → / (root).`);
  console.log("Once configured, GitHub Pages deploys automatically after each push.");
} catch (error) {
  console.error(error.message);
  console.error("Publishing requires Git access to origin. Check your remote URL and SSH key or Git credentials; GitHub CLI authentication is not used.");
  process.exitCode = 1;
}
