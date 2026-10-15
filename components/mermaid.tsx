"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";

// Mermaid has global configuration; serialize rendering across diagrams and themes.
let renderQueue = Promise.resolve();

export function Diagram({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const version = useRef(0);
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState("");
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
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: resolvedTheme === "dark" ? "dark" : "default", suppressErrorRendering: true });
        const result = await mermaid.render(renderId, source);
        if (!cancelled) { setSvg(result.svg); setError(""); }
      } catch {
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
    {showSource || error ? <pre><code>{source}</code></pre> : svg ? <div className="diagram-scroll"><div className="diagram-render" style={{ width: `${scale * 100}%` }} dangerouslySetInnerHTML={{ __html: svg }}/></div> : <p className="diagram-loading">Rendering diagram…</p>}
  </figure>;
}
