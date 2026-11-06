"use client";

import { useEffect, useRef, useState } from "react";
import { PANEL_MIN_WIDTH, PANEL_MAX_WIDTH, panelWidthKey, parsePanelWidth, resizedPanelWidth } from "@/lib/panel-widths.mjs";

/** Place inside a positioned panel; its width is controlled by a shared CSS variable. */
export function PanelResizeHandle({ side, controls, label }: {
  side: "left" | "right"; controls: string; label: string;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [width, setWidth] = useState(250);
  const [edge, setEdge] = useState<number | null>(null);
  const [maximum, setMaximum] = useState(PANEL_MAX_WIDTH);
  const variable = `--${side}-panel-width`;
  const attribute = `data-${side}-panel-sized`;

  function apply(value: number | null, persist = false) {
    const root = document.documentElement;
    if (value === null) {
      root.style.removeProperty(variable);
      root.removeAttribute(attribute);
    } else {
      root.style.setProperty(variable, `${value}px`);
      root.setAttribute(attribute, "true");
    }
    if (persist) {
      try {
        if (value === null) localStorage.removeItem(panelWidthKey(side));
        else localStorage.setItem(panelWidthKey(side), String(value));
      } catch {}
    }
  }

  useEffect(() => {
    const panel = document.getElementById(controls);
    if (!panel) return;
    const measure = () => {
      const bounds = panel.getBoundingClientRect();
      setWidth(Math.round(bounds.width));
      setEdge((side === "left" ? bounds.right : bounds.left) - 5);
      setMaximum(Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, Math.floor(innerWidth * .3))));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    if (panel.parentElement) observer.observe(panel.parentElement);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const restore = (event: StorageEvent) => {
      if (event.key === panelWidthKey(side) || event.key === null) {
        let value = null;
        try { value = localStorage.getItem(panelWidthKey(side)); } catch {}
        apply(parsePanelWidth(value));
      }
    };
    window.addEventListener("storage", restore);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("storage", restore);
      if (drag.current) document.documentElement.removeAttribute("data-panel-resizing");
    };
  }, [side, controls]);

  function finish() {
    if (!drag.current) return;
    drag.current = null;
    document.documentElement.removeAttribute("data-panel-resizing");
    const current = parsePanelWidth(document.documentElement.style.getPropertyValue(variable).replace("px", ""));
    if (current !== null) apply(current, true);
  }

  return <div style={{ left: edge ?? 0, visibility: edge === null ? "hidden" : undefined }} className={`panel-resize-handle panel-resize-${side}`} role="separator"
    tabIndex={0} aria-label={label} aria-orientation="vertical" aria-controls={controls}
    aria-valuemin={PANEL_MIN_WIDTH} aria-valuemax={Math.max(maximum, width)} aria-valuenow={width}
    aria-valuetext={`${width} pixels`} title="Drag to resize. Arrow keys adjust width; double-click or Enter resets."
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { x: event.clientX, width };
      document.documentElement.setAttribute("data-panel-resizing", "true");
    }}
    onPointerMove={event => {
      if (drag.current) apply(resizedPanelWidth(drag.current.width, event.clientX - drag.current.x, side, maximum));
    }}
    onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
    onDoubleClick={() => apply(null, true)}
    onKeyDown={event => {
      const step = event.shiftKey ? 48 : 16;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        apply(resizedPanelWidth(width, event.key === "ArrowRight" ? step : -step, side, maximum), true);
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        apply(event.key === "Home" ? PANEL_MIN_WIDTH : maximum, true);
      } else if (event.key === "Enter") {
        event.preventDefault();
        apply(null, true);
      }
    }} />;
}
