"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Theme({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem storageKey="akashic-theme">{children}</ThemeProvider>;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mode = mounted ? theme || "system" : "system";
  const nextMode = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
  const label = `Appearance: ${mode}. Switch to ${nextMode}.`;
  return <button type="button" className="theme-toggle" aria-label={label} title={label} onClick={() => setTheme(nextMode)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {mode === "system" && <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>}
          {mode === "light" && <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>}
          {mode === "dark" && <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>}
        </svg>
  </button>;
}
