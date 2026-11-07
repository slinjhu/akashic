import { unified } from "unified";
import remarkParse from "remark-parse";

const parser = unified().use(remarkParse);

/** Render fenced `images` blocks as galleries of ordinary Markdown images. */
export default function remarkImageGallery() {
  return function transform(tree) {
    function walk(parent) {
      parent.children = parent.children.map(node => {
        if (node.type === "code" && node.lang === "images") {
          const images = [];
          for (const paragraph of parser.parse(node.value).children) {
            if (paragraph.type !== "paragraph") throw new Error("An images block must contain only Markdown images.");
            for (const child of paragraph.children) {
              if (child.type === "image") images.push(child);
              else if (child.type !== "text" || child.value.trim()) throw new Error("An images block must contain only Markdown images.");
            }
          }
          if (!images.length) throw new Error("An images block must contain at least one Markdown image.");
          return {
            type: "paragraph", children: images,
            data: { hName: "div", hProperties: { "data-image-gallery": "true" } },
          };
        }
        if (node.children) walk(node);
        return node;
      });
    }
    walk(tree);
  };
}
