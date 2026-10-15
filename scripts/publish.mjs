import path from "node:path";
import { githubRepository, pagesBasePath, publishDirectory, run } from "./pages.mjs";

try {
  const remote = run("git", ["remote", "get-url", "origin"]);
  const repository = githubRepository(remote);
  // Fail before building or pushing if gh cannot access the source repository.
  const repo = JSON.parse(run("gh", ["api", `repos/${repository}`]));
  const pages = repo.has_pages ? JSON.parse(run("gh", ["api", `repos/${repository}/pages`])) : null;
  const basePath = pagesBasePath(repository, pages?.cname);
  const identity = {
    name: run("git", ["config", "user.name"]),
    email: run("git", ["config", "user.email"]),
  };
  console.log(`Building ${repository} for ${basePath || "/"}…`);
  run("npm", ["run", "build"], {
    stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath },
  });
  await publishDirectory(path.resolve("out"), remote, identity, pages?.cname);
  if (!pages || pages.build_type !== "legacy" || pages.source?.branch !== "gh-pages" || pages.source?.path !== "/") {
    run("gh", ["api", "--method", pages ? "PUT" : "POST", `repos/${repository}/pages`, "--input", "-"], {
      input: JSON.stringify({ build_type: "legacy", source: { branch: "gh-pages", path: "/" } }),
    });
  }
  const site = JSON.parse(run("gh", ["api", `repos/${repository}/pages`]));
  console.log(`Pushed to gh-pages. GitHub Pages will deploy shortly: ${site.html_url}`);
} catch (error) {
  console.error(error.message);
  console.error("Publishing requires Git push access and gh authentication with access to the repository and its Pages settings. Run gh auth status to check your account.");
  process.exitCode = 1;
}
