"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/lib/content";

type SearchNote = Omit<Note, "body" | "headings">;
export function Search({ notes, tags, initialQuery, initialTag }: { notes: SearchNote[]; tags: string[]; initialQuery: string; initialTag: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [tag, setTag] = useState(initialTag);
  const router = useRouter();
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = notes.filter(note => (!tag || note.tags.includes(tag)) && words.every(word => `${note.title} ${note.tags.join(" ")} ${note.text}`.toLocaleLowerCase().includes(word)))
    .sort((a, b) => Number(b.title.toLowerCase().includes(query.toLowerCase())) - Number(a.title.toLowerCase().includes(query.toLowerCase())) || a.title.localeCompare(b.title));
  function syncUrl(nextQuery: string, nextTag: string) {
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextTag) params.set("tag", nextTag);
    router.replace(`/search${params.size ? `?${params}` : ""}`, { scroll: false });
  }
  function excerpt(note: SearchNote) {
    const index = words.length ? note.text.toLowerCase().indexOf(words[0]) : -1;
    if (index < 0) return note.description || note.text.slice(0, 200);
    const start = Math.max(0, index - 70);
    return `${start ? "…" : ""}${note.text.slice(start, start + 220)}…`;
  }
  return <div className="search-page">
    <form className="search-form" onSubmit={event => { event.preventDefault(); syncUrl(query, tag); }}>
      <label htmlFor="search-query">Search your notes</label>
      <div className="search-input-row"><input id="search-query" type="search" autoFocus placeholder="A concept, a question, a keyword…" value={query} onChange={event => setQuery(event.target.value)} /><button type="submit">Search</button></div>
      <label className="tag-filter" htmlFor="tag-filter">Filter by tag <select id="tag-filter" value={tag} onChange={event => { setTag(event.target.value); syncUrl(query, event.target.value); }}><option value="">All tags</option>{tags.map(value => <option key={value}>{value}</option>)}</select></label>
    </form>
    <p className="result-count" aria-live="polite">{results.length} {results.length === 1 ? "note" : "notes"}{tag ? ` tagged ${tag}` : ""}</p>
    <div className="search-results">{results.map(note => <article key={note.url} className="search-result">
      <p className="eyebrow">{note.file.replace(/\.md$/, "").replaceAll("/", " / ")}</p>
      <h2><Link href={note.url}>{note.title}</Link></h2><p>{excerpt(note)}</p>
      <div className="tags">{note.tags.map(value => <button className="tag" key={value} onClick={() => { setTag(value); syncUrl(query, value); }}>{value}</button>)}</div>
    </article>)}</div>
    {!results.length && <div className="empty-state"><h2>No matching notes</h2><p>Try fewer keywords or choose a different tag.</p><button onClick={() => { setQuery(""); setTag(""); syncUrl("", ""); }}>Clear search</button></div>}
  </div>;
}
