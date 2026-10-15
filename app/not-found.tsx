import Link from "next/link";

export default function NotFound() {
  return <div className="empty-state"><p className="eyebrow">404</p><h1>That page isn’t in the library.</h1><p>It may have moved or been renamed.</p><Link href="/search">Search the library →</Link></div>;
}
