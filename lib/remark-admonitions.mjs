const types = {
  GOOD: { title: "Good", tone: "success" },
  BAD: { title: "Bad", tone: "danger" },
  NOTE: { title: "Note", tone: "note" },
  TIP: { title: "Tip", tone: "success" },
  IMPORTANT: { title: "Important", tone: "important" },
  WARNING: { title: "Warning", tone: "warning" },
  CAUTION: { title: "Caution", tone: "danger" },
};

/** Turn marked blockquotes into cards while retaining normal Markdown content. */
export default function remarkAdmonitions() {
  return function transform(tree) {
    function walk(parent) {
      for (const node of parent.children || []) {
        if (node.type === "blockquote") {
          const paragraph = node.children[0];
          const first = paragraph?.type === "paragraph" ? paragraph.children[0] : undefined;
          const match = first?.type === "text" && /^\[!(GOOD|BAD|NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n|$)/.exec(first.value);
          if (match) {
            const { title, tone } = types[match[1]];
            first.value = first.value.slice(match[0].length);
            if (!first.value) paragraph.children.shift();
            if (!paragraph.children.length) node.children.shift();
            node.data = { hName: "div", hProperties: { className: ["admonition", `admonition-${tone}`] } };
            node.children.unshift({
              type: "paragraph",
              data: { hProperties: { className: ["admonition-title"] } },
              children: [{ type: "text", value: title }],
            });
          }
        }
        walk(node);
      }
    }
    walk(tree);
  };
}
