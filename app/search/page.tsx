import { Search } from "@/components/search";
import { searchNotes, allTags } from "@/lib/content";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const tag = typeof params.tag === "string" ? params.tag : "";
  return <div className="search-container"><p className="eyebrow">Find a connection</p><h1>Search the library</h1><p className="page-intro">Follow a topic, rediscover an idea, or find exactly what you need.</p><Search key={`${q}:${tag}`} notes={searchNotes} tags={allTags} initialQuery={q} initialTag={tag}/></div>;
}
