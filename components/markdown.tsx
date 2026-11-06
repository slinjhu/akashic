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
import { SectionReviews } from "./section-reviews";
import { sectionReviews, withoutReviewEmoji } from "@/lib/section-reviews.mjs";

export function NoteMarkdown({ body, file, assetRevision }: { body: string; file: string; assetRevision: string }) {
  return <SectionReviews key={file} file={file} initial={sectionReviews(body)}><SectionTree><Markdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeSlug, rehypeKatex, [rehypeHighlight, { languages: { ...common, dockerfile }, detect: false, ignoreMissing: true }], rehypeSections]}
    urlTransform={url => defaultUrlTransform(resolveContentUrl(url, file))}
    components={{
      summary: ({ node, children }) => {
        const heading = node?.children.find(child => child.type === "element" && /^h[2-6]$/.test(child.tagName));
        const id = heading?.type === "element" ? heading.properties.id : undefined;
        return <SectionSummary id={typeof id === "string" ? id : undefined}>{children}</SectionSummary>;
      },
      a: ({ href, children, ...props }) => href?.startsWith("/") && !href.startsWith("//") ? <Link href={href} title={props.title}>{children}</Link> : <a href={href} title={props.title} rel={href?.startsWith("http") ? "noreferrer" : undefined}>{children}</a>,
      img: ({ src, alt, title }) => <img src={typeof src === "string" && src.startsWith("/content/") ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${src}${src.includes("?") ? "&" : "?"}v=${assetRevision.slice(0, 12)}` : src} alt={alt || ""} title={title} loading="lazy" />,
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
  >{withoutReviewEmoji(body)}</Markdown></SectionTree></SectionReviews>;
}
