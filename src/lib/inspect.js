import { partSnippet } from './code.js';

// Inspect (v50), after Figma's Dev Mode: a part's place, size, the gap to the nearest part or screen edge on
// each side, and its code. ios/App/Inspect.swift is the twin.
const SKIP = new Set(['line', 'adjust', 'paint']);
const holds = (s, el) => el.col > s.col && el.row > s.row && el.col + el.width < s.col + s.width && el.row + el.height < s.row + s.height;

export function partSpacing(elements, id) {
  const el = elements.find(x => x.id === id);
  if (!el) return null;
  const screen = elements.find(s => s.presetId === 'screen' && s.id !== id && holds(s, el));
  const others = elements.filter(o => o.id !== id && !o.hidden && !SKIP.has(o.presetId) && o.presetId !== 'screen');
  const across = o => o.row < el.row + el.height && el.row < o.row + o.height, down = o => o.col < el.col + el.width && el.col < o.col + o.width;
  const near = (gaps, edge) => { const all = [...gaps, ...(screen ? [edge] : [])].filter(g => g >= 0); return all.length ? Math.min(...all) : null; };
  return {
    left: near(others.filter(across).map(o => el.col - (o.col + o.width)), screen && el.col - (screen.col + 1)),
    right: near(others.filter(across).map(o => o.col - (el.col + el.width)), screen && screen.col + screen.width - 1 - (el.col + el.width)),
    top: near(others.filter(down).map(o => el.row - (o.row + o.height)), screen && el.row - (screen.row + 1)),
    bottom: near(others.filter(down).map(o => o.row - (el.row + el.height)), screen && screen.row + screen.height - 1 - (el.row + el.height)),
  };
}

/** Measure between any two parts (Figma redlines): empty cells across and down between their boxes, 0 where they
 *  overlap on that axis. Null when either part is gone. */
export function partGap(elements, aId, bId) {
  const a = elements.find(x => x.id === aId), b = elements.find(x => x.id === bId);
  if (!a || !b || a === b) return null;
  const gap = (p, ps, q, qs) => Math.max(0, q - (p + ps), p - (q + qs));
  return { across: gap(a.col, a.width, b.col, b.width), down: gap(a.row, a.height, b.row, b.height) };
}

export function inspectPart(elements, id) {
  const el = elements.find(x => x.id === id);
  if (!el) return null;
  return { col: el.col, row: el.row, width: el.width, height: el.height, spacing: partSpacing(elements, id),
    react: partSnippet(el, 'react'), swiftui: partSnippet(el, 'swiftui') };
}
