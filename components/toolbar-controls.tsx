"use client";

import { useEffect, useRef, useState } from "react";

type IconName = "copy" | "check" | "error" | "source" | "expand" | "collapse";

export function ToolbarIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    copy: "M9 9h11v11H9z M15 9V4H4v11h5",
    check: "m5 12 4 4L19 6",
    error: "M12 8v5 M12 17h.01 M12 3 2 21h20L12 3Z",
    source: "m8 6-6 6 6 6 M16 6l6 6-6 6 M14 4l-4 16",
    expand: "M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5",
    collapse: "M3 8h5V3 M21 8h-5V3 M16 21v-5h5 M8 21v-5H3",
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function CopyButton({ text, label = "Copy code" }: { text: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  const message = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : label;

  async function copy() {
    clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    resetTimer.current = setTimeout(() => setStatus("idle"), 2000);
  }

  return <>
    <button type="button" className="toolbar-icon-button" onClick={copy} aria-label={message} title={message}>
      <ToolbarIcon name={status === "copied" ? "check" : status === "failed" ? "error" : "copy"} />
    </button>
    <span className="toolbar-status" role="status">{status === "idle" ? "" : message}</span>
  </>;
}
