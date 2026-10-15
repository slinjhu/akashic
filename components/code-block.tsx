"use client";

import { useState, type ReactNode } from "react";

export function CodeBlock({ text, language, children }: { text: string; language: string; children: ReactNode }) {
  const [status, setStatus] = useState("Copy");
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus("Copied"); }
    catch { setStatus("Copy failed"); }
    setTimeout(() => setStatus("Copy"), 2000);
  }
  return <div className="code-block"><div className="code-toolbar"><span>{language || "text"}</span><button onClick={copy} aria-label="Copy code">{status}</button></div><pre>{children}</pre></div>;
}
