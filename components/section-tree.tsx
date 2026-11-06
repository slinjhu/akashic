"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function SectionTree({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const initialAnchorHandled = useRef(false);
  const [hasSections, setHasSections] = useState(false);

  useEffect(() => {
    setHasSections(!!root.current?.querySelector("details.note-section"));
  }, [children]);

  useEffect(() => {
    const container = root.current!;
    function reveal(hash: string, scroll: boolean) {
      let id: string;
      try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target || !container.contains(target)) return;
      for (let parent = target.parentElement; parent && parent !== container; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement && parent.classList.contains("note-section")) parent.open = true;
      }
      if (scroll) target.scrollIntoView({ block: "start" });
    }
    function onHashChange() { reveal(window.location.hash, true); }
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && url.hash) {
        // Reveal before the browser or Next scrolls, including repeated clicks on the same hash.
        reveal(url.hash, true);
      }
    }
    // Source edits (including review toggles) are not anchor navigation.
    // Handle the initial URL once, then scroll only for links or hash changes.
    if (!initialAnchorHandled.current) {
      initialAnchorHandled.current = true;
      onHashChange();
    }
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  function setAll(open: boolean) {
    root.current?.querySelectorAll<HTMLDetailsElement>("details.note-section").forEach(section => { section.open = open; });
  }

  return <div ref={root} className="section-tree">
    {hasSections && <div className="section-controls" role="group" aria-label="Section visibility">
      <button type="button" onClick={() => setAll(true)}>Expand all</button>
      <button type="button" onClick={() => setAll(false)}>Collapse all</button>
    </div>}
    <div className="prose">{children}</div>
  </div>;
}
