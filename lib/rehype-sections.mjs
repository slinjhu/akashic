/** Group document headings into nested native disclosure sections. */
export default function rehypeSections() {
  /** @param {import('hast').Root} tree */
  return function transform(tree) {
    const children = tree.children;
    tree.children = [];
    /** @type {{ depth: number, content: import('hast').Element }[]} */
    const stack = [];
    for (const node of children) {
      const depth = node.type === "element" && /^h[1-6]$/.test(node.tagName)
        ? Number(node.tagName[1]) : 0;
      if (depth) {
        while (stack.length && stack.at(-1).depth >= depth) stack.pop();
      }
      const parent = stack.at(-1)?.content ?? tree;
      if (depth >= 2) {
        const content = { type: "element", tagName: "div", properties: { className: ["note-section-content"] }, children: [] };
        parent.children.push({
          type: "element", tagName: "details",
          properties: { open: true, className: ["note-section"], "data-depth": depth },
          children: [
            { type: "element", tagName: "summary", properties: {}, children: [node] },
            content,
          ],
        });
        stack.push({ depth, content });
      } else {
        parent.children.push(node);
      }
    }
  };
}
