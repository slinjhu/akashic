"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Library", href: "/" },
  { label: "Tags", href: "/tags" },
  { label: "Search", href: "/search" },
  { label: "Help", href: "/guides/writing-notes" },
];

export function TopNavigation() {
  const pathname = usePathname();
  const active = pathname === "/tags" ? "Tags"
    : pathname === "/search" ? "Search"
    : pathname === "/guides" || pathname.startsWith("/guides/") ? "Help"
    : "Library";

  return <nav className="top-nav" aria-label="Main navigation">
    {tabs.map(tab => <Link key={tab.label} href={tab.href} aria-current={active === tab.label ? "page" : undefined}>{tab.label}</Link>)}
  </nav>;
}
