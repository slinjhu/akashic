export const PANEL_STORAGE_KEY = "akashic-panels";

/**
 * @param {string | null} value
 * @param {{ left: boolean, right: boolean }} defaults
 */
export function parsePanelPreferences(value, defaults) {
  try {
    const saved = JSON.parse(value ?? "null");
    return {
      left: typeof saved?.left === "boolean" ? saved.left : defaults.left,
      right: typeof saved?.right === "boolean" ? saved.right : defaults.right,
    };
  } catch {
    return defaults;
  }
}

// Apply preferences before paint so hidden panels do not flash on refresh.
export const panelInitScript = `(() => {
  const defaults = { left: innerWidth > 760, right: innerWidth > 1200 };
  let saved = null;
  try { saved = localStorage.getItem(${JSON.stringify(PANEL_STORAGE_KEY)}); } catch {}
  const panels = (${parsePanelPreferences.toString()})(saved, defaults);
  for (const side of ['left', 'right']) {
    document.documentElement.setAttribute('data-' + side + '-panel', panels[side] ? 'visible' : 'hidden');
  }
})();`;
