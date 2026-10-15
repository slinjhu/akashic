import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { githubRepository, pagesBasePath, publishDirectory, run } from "../scripts/pages.mjs";

test("GitHub Pages paths support SSH aliases, project sites, and custom domains", () => {
  for (const remote of ["git@github-personal-slinjhu:slinjhu/akashic.git", "https://github.com/slinjhu/akashic.git", "ssh://git@github.com/slinjhu/akashic.git"]) {
    assert.equal(githubRepository(remote), "slinjhu/akashic");
  }
  assert.equal(pagesBasePath("slinjhu/akashic"), "/akashic");
  assert.equal(pagesBasePath("slinjhu/slinjhu.github.io"), "");
  assert.equal(pagesBasePath("slinjhu/akashic", "notes.example.com"), "");
});

test("publishing replaces generated files, preserves history, and leaves other branches alone", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "akashic-publish-test-"));
  try {
    const remote = path.join(temporary, "remote.git");
    const output = path.join(temporary, "out");
    run("git", ["init", "--bare", remote]);
    await mkdir(output);
    await writeFile(path.join(output, "index.html"), "First build");
    await writeFile(path.join(output, "old.html"), "Old page");
    const identity = { name: "Publish test", email: "test@example.com" };
    await publishDirectory(output, remote, identity, "notes.example.com");
    const git = args => run("git", ["--git-dir", remote, ...args]);
    const first = git(["rev-parse", "gh-pages"]);
    git(["branch", "main", first]);
    await rm(path.join(output, "old.html"));
    await writeFile(path.join(output, "index.html"), "Second build");
    await publishDirectory(output, remote, identity, "notes.example.com");
    assert.equal(git(["show", "gh-pages:index.html"]), "Second build");
    assert.equal(git(["show", "gh-pages:CNAME"]), "notes.example.com");
    assert.match(git(["ls-tree", "--name-only", "gh-pages"]), /\.nojekyll/);
    assert.doesNotMatch(git(["ls-tree", "--name-only", "gh-pages"]), /old.html/);
    assert.equal(git(["rev-parse", "gh-pages^"]), first);
    assert.equal(git(["rev-parse", "main"]), first);
    await publishDirectory(output, remote, identity, "notes.example.com");
    assert.equal(git(["rev-list", "--count", "gh-pages"]), "2");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
