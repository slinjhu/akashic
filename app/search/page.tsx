import { Search } from "@/components/search";
import { searchNotes, allTags } from "@/lib/content";
import { Suspense } from "react";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return <div className="search-container"><p className="eyebrow">Find a connection</p><h1>Search the library</h1><p className="page-intro">Follow a topic, rediscover an idea, or find exactly what you need.</p><Suspense fallback={<p>Loading search…</p>}><Search notes={searchNotes} tags={allTags}/></Suspense></div>;
}
