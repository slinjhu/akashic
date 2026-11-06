"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function SectionSummary({ id, children }: { id?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const section = ref.current?.parentElement;
    if (!(section instanceof HTMLDetailsElement)) return;
    const sync = () => setOpen(section.open);
    sync();
    section.addEventListener("toggle", sync);
    return () => section.removeEventListener("toggle", sync);
  }, []);

  return <summary ref={ref} tabIndex={-1} onClick={event => {
    // Keep links working, but suppress the summary's native toggle behavior.
    if (!(event.target instanceof Element && event.target.closest("a[href]"))) event.preventDefault();
  }}>
    <button type="button" className="section-toggle" aria-expanded={open}
      aria-label={open ? "Collapse section" : "Expand section"} aria-describedby={id}
      title={open ? "Collapse section" : "Expand section"}
      onClick={() => {
        const section = ref.current?.parentElement;
        if (section instanceof HTMLDetailsElement) {
          section.open = !section.open;
          setOpen(section.open);
        }
      }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
    </button>
    {children}
    {id && <a className="section-anchor" href={`#${id}`} aria-label="Link to section" aria-describedby={id} title="Link to section">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m10 13 4-4 M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" /></svg>
    </a>}
  </summary>;
}
