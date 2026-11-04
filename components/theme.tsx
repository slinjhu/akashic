"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Theme({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem storageKey="akashic-theme">{children}</ThemeProvider>;
}

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <label className="settings-row">
    <span>Appearance</span>
    <select aria-label="Appearance" disabled={!mounted} value={mounted ? theme || "system" : "system"}
      onChange={event => setTheme(event.target.value)}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>;
}
