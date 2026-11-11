import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { common } from "lowlight";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import rehypeSlug from "rehype-slug";
import { Children, isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { resolveContentUrl } from "@/lib/paths.mjs";
import { CodeBlock } from "./code-block";
import { Diagram } from "./mermaid";
import rehypeSections from "@/lib/rehype-sections.mjs";
import { SectionTree } from "./section-tree";
import { SectionSummary } from "./section-summary";
import { SectionDisclosure } from "./section-disclosure";
import { withoutReviewEmoji } from "@/lib/section-reviews.mjs";
import remarkImageGallery from "@/lib/remark-image-gallery.mjs";
import remarkAdmonitions from "@/lib/remark-admonitions.mjs";
import { ImageGallery, type GalleryImage } from "./image-gallery";

export function NoteMarkdown({ body, file, assetRevision }: { body: string; file: string; assetRevision: string }) {
  const imageUrl = (src: string) => src.startsWith("/content/")
    ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${src}${src.includes("?") ? "&" : "?"}v=${assetRevision.slice(0, 12)}` : src;
  return <SectionTree key={file}><Markdown
    remarkPlugins={[remarkGfm, remarkMath, remarkImageGallery, remarkAdmonitions]}
    rehypePlugins={[rehypeSlug, rehypeKatex, [rehypeHighlight, { languages: { ...common, dockerfile }, detect: false, ignoreMissing: true }], rehypeSections]}
    urlTransform={url => defaultUrlTransform(resolveContentUrl(url, file))}
    components={{
      div: ({ node, children, className }) => {
        if (node?.properties["data-image-gallery"] === "true") {
          const images = Children.toArray(children).flatMap(child => {
            if (!isValidElement<{ src?: string; alt?: string; title?: string }>(child) || !child.props.src) return [];
            return [{ src: imageUrl(child.props.src), alt: child.props.alt || "", title: child.props.title } satisfies GalleryImage];
          });
          return <ImageGallery images={images} />;
        }
        return <div className={className}>{children}</div>;
      },
      details: ({ node, children, className }) => {
        const summary = node?.children.find(child => child.type === "element" && child.tagName === "summary");
        const heading = summary?.type === "element" ? summary.children.find(child => child.type === "element" && /^h[2-6]$/.test(child.tagName)) : undefined;
        const id = heading?.type === "element" ? heading.properties.id : undefined;
        const depth = node?.properties["data-depth"];
        return <SectionDisclosure sectionId={typeof id === "string" ? id : undefined} className={className}
          depth={typeof depth === "number" || typeof depth === "string" ? depth : undefined}>{children}</SectionDisclosure>;
      },
      summary: ({ node, children }) => {
        const heading = node?.children.find(child => child.type === "element" && /^h[2-6]$/.test(child.tagName));
        const id = heading?.type === "element" ? heading.properties.id : undefined;
        return <SectionSummary id={typeof id === "string" ? id : undefined}>{children}</SectionSummary>;
      },
      a: ({ href, children, ...props }) => href?.startsWith("/") && !href.startsWith("//") ? <Link href={href} title={props.title}>{children}</Link> : <a href={href} title={props.title} rel={href?.startsWith("http") ? "noreferrer" : undefined}>{children}</a>,
      img: ({ src, alt, title }) => <img src={typeof src === "string" ? imageUrl(src) : src} alt={alt || ""} title={title} loading="lazy" />,
      table: ({ children }) => <div className="table-scroll" tabIndex={0} role="region" aria-label="Table"><table>{children}</table></div>,
      pre: ({ node, children }) => {
        const codeNode = node?.children.find(child => child.type === "element" && child.tagName === "code");
        const code = Children.toArray(children).find(isValidElement);
        const className = isValidElement<{ className?: string }>(code) ? code.props.className || "" : "";
        const language = /language-(\S+)/.exec(className)?.[1] || "";
        function textOf(n: unknown): string {
          const value = n as { value?: string; children?: unknown[] };
          return value.value ?? value.children?.map(textOf).join("") ?? "";
        }
        const text = textOf(codeNode || { children: [] }).replace(/\n$/, "");
        if (language === "mermaid") return <Diagram source={text} />;
        return <CodeBlock text={text} language={language}>{children as ReactNode}</CodeBlock>;
      },
    }}
  >{withoutReviewEmoji(body)}</Markdown></SectionTree>;
}
