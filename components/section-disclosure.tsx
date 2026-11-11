"use client";

import { type ReactNode } from "react";
import { useSectionReviewed } from "./section-reviews";
import { useReviewDisclosure } from "./review-mode";

export function SectionDisclosure({ sectionId, className, depth, children }: {
  sectionId?: string; className?: string; depth?: string | number; children: ReactNode;
}) {
  const reviewed = useSectionReviewed(sectionId);
  const [open, setOpen] = useReviewDisclosure(reviewed);
  return <details className={className} data-depth={depth} open={open}
    onToggle={event => {
      if (event.target === event.currentTarget) setOpen(event.currentTarget.open);
    }}>{children}</details>;
}
