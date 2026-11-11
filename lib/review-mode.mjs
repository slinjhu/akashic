export const REVIEW_MODE_STORAGE_KEY = "akashic-review-mode";

export function parseReviewMode(value) {
  return value !== "false";
}

// Hide review indicators before hydration when the saved preference is off.
export const reviewModeInitScript = `(() => {
  let saved = null;
  try { saved = localStorage.getItem(${JSON.stringify(REVIEW_MODE_STORAGE_KEY)}); } catch {}
  document.documentElement.setAttribute('data-review-mode', (${parseReviewMode.toString()})(saved) ? 'on' : 'off');
})();`;
