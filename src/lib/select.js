// Selections pick cells, not parts: a marquee picks a rectangle, the magic wand the run of matching
// characters around a cell. What a selection holds is its painted cells and every whole part inside it,
// so cut, move and fill never cut a box open (the same rule as the eraser). Copy takes the characters as
// they show. Ported line for line in ios/App/Select.swift.

import { paint, paintMarks, erase } from './brush.js';
import { moveElement } from './engine.js';
import { minOf, maxOf } from './extent.js';

const MAX_WAND = 250_000;

/** The cells of the rectangle with corners a and b, clipped to the grid. */
export function marquee(a, b, cols, rows) {
  const c0 = Math.max(0, Math.min(a[0], b[0])), c1 = Math.min(cols - 1, Math.max(a[0], b[0]));
  const r0 = Math.max(0, Math.min(a[1], b[1])), r1 = Math.min(rows - 1, Math.max(a[1], b[1]));
  const cells = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cells.push([c, r]);
  return cells;
}

/** The magic wand: every cell joined to (col, row) by sides that shows the same character. */
export function wand(grid, col, row) {
  const rows = grid.length, cols = grid[0]?.length ?? 0;
  if (col < 0 || row < 0 || col >= cols || row >= rows) return [];
  const ch = grid[row][col], seen = new Set([row * cols + col]), out = [], todo = [[col, row]];
  while (todo.length && out.length < MAX_WAND) {
    const [c, r] = todo.pop();
    out.push([c, r]);
    for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
      const key = nr * cols + nc;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen.has(key) || grid[nr][nc] !== ch) continue;
      seen.add(key); todo.push([nc, nr]);
    }
  }
  return out;
}

/** The characters under the selection as text: its bounding box, cells outside it blank, blank edges trimmed. */
export function cellText(grid, cells) {
  if (!cells.length) return '';
  const c0 = minOf(cells.map(c => c[0])), r0 = minOf(cells.map(c => c[1]));
  const w = maxOf(cells.map(c => c[0])) - c0 + 1, h = maxOf(cells.map(c => c[1])) - r0 + 1;
  const g = Array.from({ length: h }, () => Array(w).fill(' '));
  for (const [c, r] of cells) g[r - r0][c - c0] = grid[r]?.[c] ?? ' ';
  const lines = g.map(l => l.join('').trimEnd());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines.at(-1)) lines.pop();
  const indent = minOf(lines.filter(Boolean).map(l => l.length - l.trimStart().length));
  return lines.map(l => l.slice(indent)).join('\n');
}

const keyOf = (c, r) => `${c},${r}`;

/** The parts (not paint) whose every cell is selected. Locked and hidden parts are never taken. */
export function partsWithin(elements, cells) {
  const set = new Set(cells.map(([c, r]) => keyOf(c, r)));
  return elements.filter(el => {
    if (el.presetId === 'paint' || el.locked || el.hidden || el.canvas) return false;
    for (let r = el.row; r < el.row + el.height; r++) for (let c = el.col; c < el.col + el.width; c++) if (!set.has(keyOf(c, r))) return false;
    return true;
  });
}

/** The painted characters under the selection, topmost first: [[col, row, ch]]. */
function paintedAt(elements, cells) {
  const set = new Set(cells.map(([c, r]) => keyOf(c, r))), got = new Map();
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.presetId !== 'paint' || el.hidden || el.locked) continue;
    el.template.forEach((line, dy) => [...line].forEach((ch, dx) => {
      const k = keyOf(el.col + dx, el.row + dy);
      if (ch !== ' ' && set.has(k) && !got.has(k)) got.set(k, [el.col + dx, el.row + dy, ch]);
    }));
  }
  return [...got.values()];
}

/** Cut: the painted cells and the whole parts inside the selection are taken away. */
export function cutCells(elements, cells) {
  const gone = new Set(partsWithin(elements, cells).map(el => el.id));
  return erase(elements.filter(el => !gone.has(el.id)), cells);
}

/** Fill the selection with one character, as one new stroke of paint. */
export const fillCells = (elements, cells, ch) => paint(elements, cells, ch);

/** Move what the selection holds by (dCol, dRow): its paint as one new stroke, its whole parts as parts. */
export function moveCells(elements, cells, dCol, dRow, cols, rows) {
  if (!dCol && !dRow) return elements;
  const marks = paintedAt(elements, cells).map(([c, r, ch]) => [c + dCol, r + dRow, ch])
    .filter(([c, r]) => c >= 0 && r >= 0 && c < cols && r < rows);
  let out = erase(elements, cells);
  // Screens first: a screen carries its parts, and the parts' own moves then land where they already are.
  const parts = partsWithin(elements, cells).sort((a, b) => (b.presetId === 'screen') - (a.presetId === 'screen'));
  for (const el of parts) out = moveElement(out, el.id, el.col + dCol, el.row + dRow);
  return paintMarks(out, marks);
}

/** The selection moved by (dCol, dRow), clipped to the grid: where it sits after a move. */
export const shiftCells = (cells, dCol, dRow, cols, rows) =>
  cells.map(([c, r]) => [c + dCol, r + dRow]).filter(([c, r]) => c >= 0 && r >= 0 && c < cols && r < rows);
