"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useReviewMode } from "./review-mode";

type Reviews = Record<string, boolean>;
type ReviewContextValue = {
  reviews: Reviews; available: boolean; saving: string | null;
  toggle: (id: string) => Promise<void>;
};
const ReviewContext = createContext<ReviewContextValue | null>(null);
const endpoint = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/section-review/`;

export function SectionReviews({ file, initial, children }: { file: string; initial: Reviews; children: ReactNode }) {
  const { enabled } = useReviewMode();
  const [reviews, setReviews] = useState(initial);
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { setReviews(initial); }, [initial]);
  useEffect(() => {
    if (!enabled || !["localhost", "127.0.0.1"].includes(location.hostname)) return;
    setError("");
    const controller = new AbortController();
    fetch(`${endpoint}?file=${encodeURIComponent(file)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Review saving is unavailable. Start the app with npm run dev or npm start.");
        const data = await response.json();
        setReviews(data.reviews);
        setAvailable(true);
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [file, enabled]);

  async function toggle(id: string) {
    if (!available || saving) return;
    setSaving(id);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file, id, reviewed: !reviews[id] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save review status.");
      setReviews(data.reviews);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save review status.");
    } finally { setSaving(null); }
  }

  return <ReviewContext.Provider value={{ reviews, available, saving, toggle }}>
    {enabled && error && <p className="review-error" role="alert">{error}</p>}
    {children}
  </ReviewContext.Provider>;
}

export function useSectionReviewed(id?: string) {
  const context = useContext(ReviewContext);
  return id !== undefined && context?.reviews[id] === true;
}

export function SectionReviewStatus({ id }: { id: string }) {
  const { enabled } = useReviewMode();
  const context = useContext(ReviewContext);
  if (!enabled) return null;
  const reviewed = context?.reviews[id] === true;
  const status = reviewed ? "Reviewed" : "Pending";
  return <span className="toc-review-status" role="img" aria-label={status} title={status}>
    {reviewed ? "✅" : "⏳"}
  </span>;
}

export function SectionReviewButton({ id }: { id: string }) {
  const { enabled } = useReviewMode();
  const context = useContext(ReviewContext);
  if (!enabled || !context) return null;
  const { reviews, available, saving, toggle } = context;
  const reviewed = reviews[id] === true;
  const status = reviewed ? "Reviewed" : "Pending";
  const label = `${status}. ${available ? `Mark as ${reviewed ? "pending" : "reviewed"}` : "Open the local app to change review status"}`;
  return <button type="button" className="section-review" disabled={!available || saving !== null}
    aria-pressed={reviewed} aria-label={label} aria-describedby={id} title={label}
    aria-busy={saving === id} onClick={() => void toggle(id)}>
    <span aria-hidden="true">{reviewed ? "✅" : "⏳"}</span>
  </button>;
}
