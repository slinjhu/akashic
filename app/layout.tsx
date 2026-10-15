import type { Metadata } from "next";
import Link from "next/link";
import { Theme, ThemeToggle } from "@/components/theme";
import { Navigation } from "@/components/navigation";
import { navigation, notes } from "@/lib/content";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Akashic", template: "%s · Akashic" }, description: "A personal library of everything I learn." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><body><Theme>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header"><Link className="brand" href="/" aria-label="Akashic home"><span className="brand-mark" aria-hidden="true">A</span><span>Akashic</span></Link>
      <div className="header-tools"><Link className="search-trigger" href="/search"><span aria-hidden="true">⌕</span> Search library</Link><ThemeToggle /></div>
    </header>
    <div className="app-layout"><Navigation entries={navigation} /><main id="main-content" tabIndex={-1}>{children}</main></div>
    <footer className="site-footer"><span>Akashic</span><span>{notes.length} pages · A growing collection of knowledge</span></footer>
  </Theme></body></html>;
}
