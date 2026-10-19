// Grids (v49), after Figma's layout grids. A screen with `grid: {cols, gutter}` shows that many column bands
// inside its frame, `gutter` cells apart and from the edges, and a dragged part snaps its left or right edge
// to a band. The grid is never drawn into the text. ios/App/Grids.swift is the twin.
export const GRID_MAX = 24;

export function cleanGrid(g) {
  if (!g || typeof g !== 'object') return null;
  const n = (v, min, max, d) => (Number.isInteger(v) && v >= min && v <= max ? v : d);
  return { cols: n(g.cols, 1, GRID_MAX, 4), gutter: n(g.gutter, 0, 8, 1) };
}

// The column bands of a screen, in canvas cells: [{col, width}]. Empty when the bands would not fit.
export function gridColumns(screen) {
  const g = screen.grid && cleanGrid(screen.grid);
  if (!g) return [];
  const inner = screen.width - 2, width = Math.floor((inner - g.gutter * (g.cols + 1)) / g.cols);
  if (width < 1) return [];
  const start = screen.col + 1 + g.gutter + Math.floor((inner - width * g.cols - g.gutter * (g.cols + 1)) / 2); // centred
  return Array.from({ length: g.cols }, (_, i) => ({ col: start + i * (width + g.gutter), width }));
}

// After snapPosition: a part whose left or right edge comes within reach of a band edge on its screen moves onto it.
export function snapToGrid(elements, id, snap, reach = 2) {
  const el = elements.find(x => x.id === id);
  if (!el) return snap;
  const screen = elements.find(s => s.presetId === 'screen' && s.grid && s.id !== id && snap.col >= s.col && snap.row >= s.row
    && snap.col + el.width <= s.col + s.width && snap.row + el.height <= s.row + s.height);
  if (!screen) return snap;
  let best = null;
  for (const band of gridColumns(screen)) {
    // the part's left edge on the band's left edge, or its right edge on the band's right edge
    for (const [col, guide] of [[band.col, band.col], [band.col + band.width - el.width, band.col + band.width - 1]]) {
      const d = Math.abs(snap.col - col);
      if (d <= reach && (!best || d < best.d)) best = { d, col, guide };
    }
  }
  return best ? { ...snap, col: best.col, guideCols: [...snap.guideCols, best.guide] } : snap;
}

// Every screen takes this screen's grid, or loses its own when it has none.
export function gridEverywhere(elements, id) {
  const grid = elements.find(el => el.id === id)?.grid ?? null;
  return elements.map(el => {
    if (el.presetId !== 'screen' || el.id === id) return el;
    const { grid: _, ...rest } = el;
    return grid ? { ...rest, grid } : rest;
  });
}
