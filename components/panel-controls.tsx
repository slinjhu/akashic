"use client";

import { useEffect, useState } from "react";
import { PANEL_STORAGE_KEY, parsePanelPreferences } from "@/lib/panel-preferences.mjs";

type Panels = { left: boolean; right: boolean };

function applyPanels(panels: Panels) {
  for (const side of ["left", "right"] as const) {
    document.documentElement.setAttribute(`data-${side}-panel`, panels[side] ? "visible" : "hidden");
  }
}

export function PanelControls() {
  const [panels, setPanels] = useState<Panels>({ left: true, right: true });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function restore() {
      const defaults = { left: window.innerWidth > 760, right: window.innerWidth > 1200 };
      let saved = null;
      try { saved = localStorage.getItem(PANEL_STORAGE_KEY); } catch {}
      const next = parsePanelPreferences(saved, defaults);
      applyPanels(next);
      setPanels(next);
    }
    restore();
    setMounted(true);
    function onStorage(event: StorageEvent) {
      if (event.key === PANEL_STORAGE_KEY || event.key === null) restore();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle(side: keyof Panels) {
    const next = { ...panels, [side]: !panels[side] };
    applyPanels(next);
    setPanels(next);
    try { localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  return <div className="panel-controls" role="group" aria-label="Side panels">
    {(["left", "right"] as const).map(side => {
      const name = side === "left" ? "Left navigation" : "Right table of contents";
      return <div className="settings-row" key={side}>
        <span id={`panel-label-${side}`}>{name}</span>
        <button type="button" className="settings-switch" role="switch" disabled={!mounted}
          aria-labelledby={`panel-label-${side}`} aria-checked={mounted && panels[side]}
          onClick={() => toggle(side)}><span /></button>
      </div>;
    })}
  </div>;
}
