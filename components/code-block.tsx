"use client";

import { type ReactNode } from "react";
import { CopyButton } from "./toolbar-controls";

export function CodeBlock({ text, language, children }: { text: string; language: string; children: ReactNode }) {
  return <div className="code-block"><div className="code-toolbar"><span>{language || "text"}</span><CopyButton text={text} /></div><pre>{children}</pre></div>;
}
