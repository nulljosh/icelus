// Brush and eraser. A stroke is the cells the pointer crossed, joined with straight runs and widened to a
// square tip one to five cells across. Painting a stroke adds one see-through `paint` part, so a stroke
// moves, hides and deletes like any part and one undo takes it back. The eraser clears painted cells only:
// boxes and buttons are parts, and a part is never cut open by an eraser (delete it to remove it).
// Ported line for line in ios/App/Brush.swift.

import { newElementId } from './engine.js';
import { minOf, maxOf } from './extent.js';

export const BRUSH_SIZES = [1, 2, 3, 4, 5];
export const BRUSH_CHARS = ['█', '▓', '▒', '░', '•', '*', '#', '.'];
const MAX_CELLS = 20_000;

/** The square tip at a cell: size cells across, centred, the extra cell going right and down. */
export function tip(col, row, size = 1) {
  const s = Math.max(1, Math.min(5, Math.round(size) || 1)), lo = -Math.floor((s - 1) / 2);
  const cells = [];
  for (let dr = lo; dr < lo + s; dr++) for (let dc = lo; dc < lo + s; dc++) cells.push([col + dc, row + dr]);
  return cells;
}

/** Every cell on a straight run from a to b, ends included (Bresenham). */
export function run(a, b) {
  const cells = [];
  let [c, r] = a;
  const [c1, r1] = b, dc = Math.abs(c1 - c), dr = -Math.abs(r1 - r), sc = c < c1 ? 1 : -1, sr = r < r1 ? 1 : -1;
  let err = dc + dr;
  for (;;) {
    cells.push([c, r]);
    if (c === c1 && r === r1) return cells;
    const e2 = 2 * err;
    if (e2 >= dr) { err += dr; c += sc; }
    if (e2 <= dc) { err += dc; r += sr; }
  }
}

/** The cells a stroke covers on the grid: the points joined, widened to the tip, no repeats. */
export function strokeCells(points, size, cols, rows) {
  const seen = new Set(), out = [];
  const add = ([c, r]) => {
    const key = r * cols + c;
    if (c < 0 || r < 0 || c >= cols || r >= rows || seen.has(key) || out.length >= MAX_CELLS) return;
    seen.add(key); out.push([c, r]);
  };
  points.forEach((p, i) => (i ? run(points[i - 1], p) : [p]).forEach(([c, r]) => tip(c, r, size).forEach(add)));
  return out;
}

/** One printable character, or the full block. */
export const brushChar = ch => {
  const first = [...String(ch ?? '')][0];
  return first && /\S/u.test(first) && !/\p{Cc}/u.test(first) ? first : '█';
};

/** Paint marks [[col, row, ch]]: one new see-through part over their bounding box. */
export function paintMarks(elements, marks) {
  if (!marks.length) return elements;
  const c0 = minOf(marks.map(m => m[0])), r0 = minOf(marks.map(m => m[1]));
  const width = maxOf(marks.map(m => m[0])) - c0 + 1, height = maxOf(marks.map(m => m[1])) - r0 + 1;
  const g = Array.from({ length: height }, () => Array(width).fill(' '));
  for (const [c, r, ch] of marks) g[r - r0][c - c0] = brushChar(ch);
  return [...elements, { id: newElementId(), presetId: 'paint', label: 'Paint', col: c0, row: r0, width, height, template: g.map(l => l.join('')) }];
}

/** Paint cells with one character. */
export const paint = (elements, cells, ch) => paintMarks(elements, cells.map(([c, r]) => [c, r, ch]));

/** Clear painted cells under the eraser. A paint part left empty is removed; other parts are untouched. */
export function erase(elements, cells) {
  if (!cells.length) return elements;
  const hit = new Set(cells.map(([c, r]) => `${c},${r}`));
  return elements.flatMap(el => {
    if (el.presetId !== 'paint' || el.locked || el.hidden) return [el];
    let changed = false;
    const template = el.template.map((line, dy) => [...line].map((ch, dx) => {
      if (ch === ' ' || !hit.has(`${el.col + dx},${el.row + dy}`)) return ch;
      changed = true;
      return ' ';
    }).join(''));
    if (!changed) return [el];
    return template.some(l => l.trim()) ? [{ ...el, template }] : [];
  });
}
