"use client";

import { useState, type ReactNode } from "react";
import { useSectionReviewed } from "./section-reviews";

export function SectionDisclosure({ sectionId, className, depth, children }: {
  sectionId?: string; className?: string; depth?: string | number; children: ReactNode;
}) {
  const reviewed = useSectionReviewed(sectionId);
  // Review status sets the initial state only; subsequent folds belong to the reader.
  const [open, setOpen] = useState(() => !reviewed);
  return <details className={className} data-depth={depth} open={open}
    onToggle={event => {
      if (event.target === event.currentTarget) setOpen(event.currentTarget.open);
    }}>{children}</details>;
}
