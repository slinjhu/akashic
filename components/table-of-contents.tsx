"use client";

import { PanelResizeHandle } from "./resizable-panels";
import { SectionReviewStatus, useSectionReviewed } from "./section-reviews";
import { useId, useState } from "react";

type Heading = { id: string; text: string; depth: number };
type HeadingNode = Heading & { children: HeadingNode[] };

function HeadingBranch({ node }: { node: HeadingNode }) {
  const reviewed = useSectionReviewed(node.id);
  const [expanded, setExpanded] = useState(() => !reviewed);
  const childrenId = useId();
  const hasChildren = node.children.length > 0;

  return <li>
    <div className="toc-row">
      {hasChildren ? <button type="button" className="toc-toggle"
        aria-expanded={expanded} aria-controls={childrenId}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${node.text}`}
        onClick={() => setExpanded(value => !value)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
      </button> : <span className="toc-spacer" aria-hidden="true" />}
      <SectionReviewStatus id={node.id} />
      <a href={`#${node.id}`} title={node.text}>{node.text}</a>
    </div>
    {hasChildren && <ul id={childrenId} hidden={!expanded}>
      {node.children.map(child => <HeadingBranch key={child.id} node={child} />)}
    </ul>}
  </li>;
}

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const roots: HeadingNode[] = [];
  const ancestors: HeadingNode[] = [];
  for (const heading of headings) {
    // A skipped heading level still belongs to the nearest shallower heading.
    while (ancestors.length && ancestors[ancestors.length - 1].depth >= heading.depth) ancestors.pop();
    const node: HeadingNode = { ...heading, children: [] };
    const parent = ancestors[ancestors.length - 1];
    (parent ? parent.children : roots).push(node);
    ancestors.push(node);
  }

  return <aside id="page-toc" className="toc" aria-label="On this page">
    <div className="panel-scroll"><p className="eyebrow">On this page</p>
    <nav aria-label="Table of contents">
      <ul>{roots.map(node => <HeadingBranch key={node.id} node={node} />)}</ul>
    </nav>
    <a className="back-top" href="#main-content">Back to top ↑</a>
    </div><PanelResizeHandle side="right" controls="page-toc" label="Resize right table of contents" />
  </aside>;
}
