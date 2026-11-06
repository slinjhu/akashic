import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { parsePanelWidth, resizedPanelWidth, panelWidthInitScript } from "../lib/panel-widths.mjs";

test("panel widths reject invalid storage and clamp to usable sizes", () => {
  for (const value of [null, "", "broken", "Infinity", "NaN"]) assert.equal(parsePanelWidth(value), null);
  assert.equal(parsePanelWidth("320"), 320);
  assert.equal(parsePanelWidth("-25"), 180);
  assert.equal(parsePanelWidth("99999"), 480);
});

test("opposite panel edges resize in opposite directions and respect viewport limits", () => {
  assert.equal(resizedPanelWidth(250, 40, "left"), 290);
  assert.equal(resizedPanelWidth(250, 40, "right"), 210);
  assert.equal(resizedPanelWidth(250, -500, "left"), 180);
  assert.equal(resizedPanelWidth(250, -500, "right", 360), 360);
});

test("saved panel widths restore independently before paint, with blocked storage tolerated", () => {
  for (const blocked of [false, true]) {
    const styles = {}, attributes = {};
    runInNewContext(panelWidthInitScript, {
      localStorage: { getItem: key => { if (blocked) throw Error("blocked"); return key.endsWith("left") ? "310" : "invalid"; } },
      document: { documentElement: {
        style: { setProperty: (key, value) => { styles[key] = value; } },
        setAttribute: (key, value) => { attributes[key] = value; },
      } },
    });
    assert.deepEqual(styles, blocked ? {} : { "--left-panel-width": "310px" });
    assert.deepEqual(attributes, blocked ? {} : { "data-left-panel-sized": "true" });
  }
});
