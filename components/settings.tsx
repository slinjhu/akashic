"use client";

import { useEffect, useRef, useState } from "react";
import { PanelControls } from "./panel-controls";
import { ThemeSelect } from "./theme";

export function Settings() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    card.current?.querySelector<HTMLElement>("button:not(:disabled), select:not(:disabled)")?.focus();
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <div className="settings" ref={container} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="settings-trigger" aria-label="Settings" title="Settings"
      aria-expanded={open} aria-controls="settings-card" aria-haspopup="dialog" onClick={() => setOpen(!open)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9.5 3-.6 2.2-1.7 1-2.2-.6-2.5 4.3 1.6 1.6v2L2.5 15 5 19.3l2.2-.6 1.7 1 .6 2.3h5l.6-2.3 1.7-1 2.2.6 2.5-4.3-1.6-1.5v-2l1.6-1.6L19 5.6l-2.2.6-1.7-1L14.5 3z" />
        <circle cx="12" cy="12.5" r="3.2" />
      </svg>
    </button>
    <div ref={card} id="settings-card" className="settings-card" role="dialog" aria-label="Settings" hidden={!open}>
      <p className="settings-title">Settings</p>
      <PanelControls />
      <div className="settings-divider" />
      <ThemeSelect />
    </div>
  </div>;
}
