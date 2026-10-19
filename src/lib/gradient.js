// Gradients: drag from a start cell to an end cell to lay a ramp of shade characters as one stroke of paint.
// Straight ramps across the box the drag spans, light where you start and solid where you stop, along the
// drag's main direction. Round glows out from the start, solid in the middle and light at the edge, with
// rows counted twice as tall as columns so a circle looks round. Ported line for line in ios/App/Gradient.swift.

export const RAMP = ['░', '▒', '▓', '█'];
export const GRADIENT_MODES = ['straight', 'round'];
const ASPECT = 2; // a cell is about twice as tall as it is wide
const MAX_RADIUS = 250;

const level = t => RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.floor(t * RAMP.length)))];

/** The marks [[col, row, ch]] a gradient from a to b lays, clipped to the grid. */
export function gradientMarks(a, b, mode, cols, rows) {
  const [ac, ar] = a, [bc, br] = b, marks = [];
  const inGrid = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows;
  if (mode === 'round') {
    const radius = Math.min(MAX_RADIUS, Math.hypot(bc - ac, (br - ar) * ASPECT));
    if (radius < 1) return inGrid(ac, ar) ? [[ac, ar, RAMP.at(-1)]] : [];
    const reach = Math.ceil(radius), up = Math.ceil(radius / ASPECT);
    for (let r = ar - up; r <= ar + up; r++) for (let c = ac - reach; c <= ac + reach; c++) {
      const d = Math.hypot(c - ac, (r - ar) * ASPECT);
      if (d <= radius && inGrid(c, r)) marks.push([c, r, level(1 - d / radius)]);
    }
    return marks;
  }
  const across = Math.abs(bc - ac) >= Math.abs(br - ar) * ASPECT; // the drag's main direction
  const from = across ? ac : ar, to = across ? bc : br, span = to - from;
  for (let r = Math.min(ar, br); r <= Math.max(ar, br); r++) for (let c = Math.min(ac, bc); c <= Math.max(ac, bc); c++) {
    if (!inGrid(c, r)) continue;
    const t = span ? ((across ? c : r) - from) / span : 1;
    marks.push([c, r, level(t)]);
  }
  return marks;
}
