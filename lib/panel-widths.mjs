export const PANEL_MIN_WIDTH = 180;
export const PANEL_MAX_WIDTH = 480;
export const panelWidthKey = side => `akashic-panel-width-${side}`;

export function parsePanelWidth(value) {
  if (value === null || value === "") return null;
  const width = Number(value);
  return Number.isFinite(width) ? Math.round(Math.min(480, Math.max(180, width))) : null;
}

export function resizedPanelWidth(start, delta, side, max = PANEL_MAX_WIDTH) {
  return Math.round(Math.max(PANEL_MIN_WIDTH, Math.min(max, start + (side === "left" ? delta : -delta))));
}

export const panelWidthInitScript = `(() => {
  for (const side of ['left', 'right']) {
    let value = null;
    try { value = localStorage.getItem('akashic-panel-width-' + side); } catch {}
    const width = (${parsePanelWidth.toString()})(value);
    if (width !== null) {
      document.documentElement.style.setProperty('--' + side + '-panel-width', width + 'px');
      document.documentElement.setAttribute('data-' + side + '-panel-sized', 'true');
    }
  }
})();`;
