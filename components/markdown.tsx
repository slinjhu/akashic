import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { Children, isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { resolveContentUrl } from "@/lib/paths.mjs";
import { CodeBlock } from "./code-block";
import { Diagram } from "./mermaid";

export function NoteMarkdown({ body, file, assetRevision }: { body: string; file: string; assetRevision: string }) {
  return <div className="prose"><Markdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeSlug, rehypeKatex, [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
    urlTransform={url => defaultUrlTransform(resolveContentUrl(url, file))}
    components={{
      a: ({ href, children, ...props }) => href?.startsWith("/") && !href.startsWith("//") ? <Link href={href} title={props.title}>{children}</Link> : <a href={href} title={props.title} rel={href?.startsWith("http") ? "noreferrer" : undefined}>{children}</a>,
      img: ({ src, alt, title }) => <img src={typeof src === "string" && src.startsWith("/content/") ? `${src}${src.includes("?") ? "&" : "?"}v=${assetRevision.slice(0, 12)}` : src} alt={alt || ""} title={title} loading="lazy" />,
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
  >{body}</Markdown></div>;
}
