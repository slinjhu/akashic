"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Library", href: "/" },
  { label: "Tags", href: "/tags" },
  { label: "Search", href: "/search" },
];

export function TopNavigation() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const active = pathname === "/tags" ? "Tags"
    : pathname === "/search" ? "Search"
    : "Library";

  return <nav className="top-nav" aria-label="Main navigation">
    {tabs.map(tab => <Link key={tab.label} href={tab.href} aria-current={active === tab.label ? "page" : undefined}>{tab.label}</Link>)}
  </nav>;
}
