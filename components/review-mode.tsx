"use client";

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { REVIEW_MODE_STORAGE_KEY, parseReviewMode } from "@/lib/review-mode.mjs";

const ReviewModeContext = createContext({ enabled: true, ready: false, setEnabled: (_enabled: boolean) => {} });

export function ReviewMode({ children }: { children: ReactNode }) {
  const [enabled, setMode] = useState(true);
  const [ready, setReady] = useState(false);

  function apply(enabled: boolean) {
    document.documentElement.setAttribute("data-review-mode", enabled ? "on" : "off");
    setMode(enabled);
  }

  useLayoutEffect(() => {
    function restore() {
      let saved = null;
      try { saved = localStorage.getItem(REVIEW_MODE_STORAGE_KEY); } catch {}
      apply(parseReviewMode(saved));
    }
    restore();
    setReady(true);
    function onStorage(event: StorageEvent) {
      if (event.key === REVIEW_MODE_STORAGE_KEY || event.key === null) restore();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setEnabled(next: boolean) {
    apply(next);
    try { localStorage.setItem(REVIEW_MODE_STORAGE_KEY, String(next)); } catch {}
  }

  return <ReviewModeContext.Provider value={{ enabled, ready, setEnabled }}>
    {children}
  </ReviewModeContext.Provider>;
}

export const useReviewMode = () => useContext(ReviewModeContext);

// Reset disclosure defaults only when the mode changes, never when a status is edited.
// Readers can still fold sections manually in either mode.
export function useReviewDisclosure(reviewed: boolean) {
  const { enabled } = useReviewMode();
  const [state, setState] = useState(() => ({ mode: enabled, open: !enabled || !reviewed }));
  if (state.mode !== enabled) setState({ mode: enabled, open: !enabled || !reviewed });
  const open = state.mode === enabled ? state.open : !enabled || !reviewed;
  return [open, (open: boolean) => setState({ mode: enabled, open })] as const;
}

export function ReviewModeControl() {
  const { enabled, ready, setEnabled } = useReviewMode();
  return <div className="settings-row">
    <span id="review-mode-label">Review mode</span>
    <button type="button" className="settings-switch" role="switch" disabled={!ready}
      aria-labelledby="review-mode-label" aria-checked={enabled}
      onClick={() => setEnabled(!enabled)}><span /></button>
  </div>;
}
