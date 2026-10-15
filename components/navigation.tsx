"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Entry = { url: string; title: string };
type Tree = { label: string; url?: string; children: Map<string, Tree> };

function buildTree(entries: Entry[]) {
  const root: Tree = { label: "", children: new Map() };
  for (const entry of entries) {
    if (entry.url === "/" || entry.url === "/tags") continue;
    let branch = root;
    for (const segment of entry.url.slice(1).split("/")) {
      if (!branch.children.has(segment)) branch.children.set(segment, { label: decodeURIComponent(segment).replaceAll("-", " "), children: new Map() });
      branch = branch.children.get(segment)!;
    }
    branch.label = entry.title;
    branch.url = entry.url;
  }
  return root;
}

export function Navigation({ entries, tags }: { entries: Entry[]; tags: { tag: string; count: number }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isTags = pathname === "/tags";
  const tree = buildTree(entries);
  const link = (url: string, title: string) => <Link href={url} aria-current={pathname === url ? "page" : undefined} onClick={() => setOpen(false)}>{title}</Link>;
  function branches(parent: Tree): React.ReactNode {
    return [...parent.children.entries()].map(([key, node]) => <li key={key}>
      {node.children.size ? <details open><summary>{node.url ? link(node.url, node.label) : <span>{node.label.toUpperCase() === "AWS" ? "AWS" : node.label}</span>}</summary><ul>{branches(node)}</ul></details> : node.url && link(node.url, node.label)}
    </li>);
  }
  if (pathname === "/search") return <aside className="sidebar" aria-hidden="true" />;
  return <>
    <button className="mobile-nav" aria-expanded={open} aria-controls="library-nav" onClick={() => setOpen(!open)}>{isTags ? "Browse tags" : "Browse library"} <span>{open ? "−" : "+"}</span></button>
    <nav id="library-nav" className={`sidebar ${open ? "is-open" : ""}`} aria-label={isTags ? "Tags" : "Library"}>
      <p className="eyebrow">{isTags ? "Tags" : "Topics"}</p>
      {isTags ? <ul className="sidebar-tags">{tags.map(({ tag, count }) => <li key={tag}>
        <a href={`#tag:${encodeURIComponent(tag)}`} onClick={() => setOpen(false)}><span>{tag}</span><span className="sidebar-tag-count">{count}</span></a>
      </li>)}</ul> : <ul className="nav-tree">{branches(tree)}</ul>}
      {!isTags && <div className="sidebar-footer">Keep learning.<br/><span>Make it your own.</span></div>}
    </nav>
  </>;
}
