import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { notes, assetRevision, allTags } from "@/lib/content";
import { NoteMarkdown } from "@/components/markdown";

type Props = { params: Promise<{ slug?: string[] }> };
export const dynamicParams = false;
function findNote(slug?: string[]) {
  return notes.find(note => note.url === "/" + (slug || []).map(encodeURIComponent).join("/"));
}

export function generateStaticParams() {
  return notes.map(note => ({ slug: note.url === "/" ? [] : note.url.slice(1).split("/").map(decodeURIComponent) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const note = findNote((await params).slug);
  return { title: note?.url === "/" ? { absolute: "Akashic" } : note?.title || "Page not found", description: note?.description };
}

export default async function NotePage({ params }: Props) {
  const note = findNote((await params).slug);
  if (!note) notFound();
  const toc = note.headings.filter(heading => heading.depth > 1 && heading.depth <= 4);
  const home = note.url === "/";
  return <div className={`reading-layout ${home ? "home-page" : ""}`}>
    <article className="note">
      <div className="breadcrumbs"><Link href="/">Library</Link><span>/</span><span>{home ? "Overview" : note.file.split("/").slice(0, -1).join(" / ") || note.title}</span></div>
      {!note.hideTags && note.tags.length > 0 && <div className="tags page-tags" aria-label="Page tags">{note.tags.map(tag => <Link className="tag" key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>}
      {!note.headings.some(heading => heading.depth === 1) && <h1>{note.title}</h1>}
      {home && <p className="eyebrow home-kicker">Learn · Connect · Revisit</p>}
      <NoteMarkdown body={note.body} file={note.file} assetRevision={assetRevision} />
      {home && <section className="library-cards" aria-label="Explore notes"><div className="section-heading"><h2>Explore the collection</h2><Link href="/search">View all →</Link></div><div className="card-grid">{notes.filter(item => !["/", "/tags"].includes(item.url) && !item.file.endsWith("/index.md")).map(item => <Link className="note-card" href={item.url} key={item.url}><span className="eyebrow">{item.tags.join(" / ") || "Note"}</span><h3>{item.title}</h3><span className="card-link">Open note ↗</span></Link>)}</div></section>}
      {note.url === "/tags" && <div className="tag-index">{allTags.map(tag => <section key={tag} id={`tag:${tag}`}><h2><Link href={`/search?tag=${encodeURIComponent(tag)}`}>{tag}</Link><span className="tag-count">{notes.filter(item => item.tags.includes(tag)).length}</span></h2><ul>{notes.filter(item => item.tags.includes(tag)).map(item => <li key={item.url}><Link href={item.url}>{item.title}</Link></li>)}</ul></section>)}</div>}
    </article>
    {toc.length > 0 && <aside className="toc" aria-label="On this page"><p className="eyebrow">On this page</p><ul>{toc.map(heading => <li key={heading.id} style={{ paddingLeft: (heading.depth - 2) * 12 }}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ul><a className="back-top" href="#main-content">Back to top ↑</a></aside>}
  </div>;
}
