import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { REVIEW_MODE_STORAGE_KEY, parseReviewMode, reviewModeInitScript } from "../lib/review-mode.mjs";

test("review mode restores an explicit off preference and otherwise preserves existing defaults", () => {
  for (const saved of [null, "true", "false", "corrupt"]) {
    const attributes = {};
    runInNewContext(reviewModeInitScript, {
      localStorage: { getItem(key) {
        assert.equal(key, REVIEW_MODE_STORAGE_KEY);
        return saved;
      } },
      document: { documentElement: { setAttribute(key, value) { attributes[key] = value; } } },
    });
    assert.equal(attributes["data-review-mode"], saved === "false" ? "off" : "on");
    assert.equal(parseReviewMode(saved), saved !== "false");
  }
});

test("review-mode initialization works when browser storage is blocked", () => {
  const attributes = {};
  runInNewContext(reviewModeInitScript, {
    localStorage: { getItem() { throw new Error("Storage blocked"); } },
    document: { documentElement: { setAttribute(key, value) { attributes[key] = value; } } },
  });
  assert.equal(attributes["data-review-mode"], "on");
});
