import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { PANEL_STORAGE_KEY, panelInitScript, parsePanelPreferences } from "../lib/panel-preferences.mjs";

function initialize(width, saved, blocked = false) {
  const attributes = {};
  runInNewContext(panelInitScript, {
    innerWidth: width,
    localStorage: { getItem(key) {
      assert.equal(key, PANEL_STORAGE_KEY);
      if (blocked) throw new Error("Storage blocked");
      return saved;
    } },
    document: { documentElement: { setAttribute(key, value) { attributes[key] = value; } } },
  });
  return attributes;
}

test("saved panel states survive initialization independently at any viewport", () => {
  for (const left of [false, true]) for (const right of [false, true]) {
    const saved = JSON.stringify({ left, right });
    for (const width of [375, 1000, 1600]) {
      assert.deepEqual(initialize(width, saved), {
        "data-left-panel": left ? "visible" : "hidden",
        "data-right-panel": right ? "visible" : "hidden",
      });
    }
  }
});

test("missing or blocked storage preserves responsive defaults", () => {
  for (const blocked of [false, true]) {
    assert.deepEqual(initialize(375, null, blocked), { "data-left-panel": "hidden", "data-right-panel": "hidden" });
    assert.deepEqual(initialize(1000, null, blocked), { "data-left-panel": "visible", "data-right-panel": "hidden" });
    assert.deepEqual(initialize(1600, null, blocked), { "data-left-panel": "visible", "data-right-panel": "visible" });
  }
});

test("corrupt and partial preferences cannot break rendering", () => {
  const defaults = { left: true, right: false };
  for (const value of [null, "null", "broken", "[]", "42"]) assert.deepEqual(parsePanelPreferences(value, defaults), defaults);
  assert.deepEqual(parsePanelPreferences('{"left":false,"right":"true"}', defaults), { left: false, right: false });
  assert.equal(initialize(1600, "broken")["data-left-panel"], "visible");
});
