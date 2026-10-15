"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";

// Mermaid has global configuration; serialize rendering across diagrams and themes.
let renderQueue = Promise.resolve();

export function Diagram({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const version = useRef(0);
  const { resolvedTheme } = useTheme();
  const [drawing, setDrawing] = useState<{ svg: string; width: number } | null>(null);
  const [error, setError] = useState("");
  const [showSource, setShowSource] = useState(false);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    let cancelled = false;
    const renderId = `diagram-${id}-${++version.current}`;
    renderQueue = renderQueue.then(async () => {
      if (cancelled) return;
      try {
        const mermaid = (await import("mermaid")).default;
        const typography = getComputedStyle(document.body);
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "default",
          fontFamily: typography.fontFamily,
          themeVariables: { fontFamily: typography.fontFamily, fontSize: typography.fontSize },
          suppressErrorRendering: true,
        });
        const result = await mermaid.render(renderId, source);
        const element = new DOMParser().parseFromString(result.svg, "text/html").querySelector("svg");
        const width = Number(element?.getAttribute("viewBox")?.trim().split(/[\s,]+/)[2]);
        if (!Number.isFinite(width) || width <= 0) throw new Error("Invalid diagram dimensions");
        if (!cancelled) { setDrawing({ svg: result.svg, width }); setError(""); }
      } catch (error) {
        console.error("Mermaid rendering failed:", error);
        if (!cancelled) setError("This diagram could not be rendered. Check its Mermaid syntax below.");
      }
    });
    return () => { cancelled = true; };
  }, [source, id, resolvedTheme]);
  return <figure className="diagram">
    <figcaption className="code-toolbar"><span>Mermaid diagram</span><div className="diagram-controls">
      <button aria-label="Zoom out" onClick={() => setScale(Math.max(.5, scale - .25))}>−</button>
      <button aria-label="Reset diagram zoom" onClick={() => setScale(1)}>{Math.round(scale * 100)}%</button>
      <button aria-label="Zoom in" onClick={() => setScale(Math.min(3, scale + .25))}>+</button>
      <button aria-pressed={showSource} onClick={() => setShowSource(!showSource)}>{showSource ? "Diagram" : "Source"}</button>
    </div></figcaption>
    {error && <p role="alert">{error}</p>}
    {showSource || error ? <pre><code>{source}</code></pre> : drawing ? <div className="diagram-scroll"><div className="diagram-render" style={{ width: drawing.width * scale }} dangerouslySetInnerHTML={{ __html: drawing.svg }}/></div> : <p className="diagram-loading">Rendering diagram…</p>}
  </figure>;
}
