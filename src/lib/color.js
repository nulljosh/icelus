// Color: a part may carry an ink (its marks) and a paper (behind them) from the 16 terminal colors, by
// index. A paint stroke is a part, so painting in a color colors cells one stroke at a time. Plain copy
// never carries color; ANSI and HTML keep it. Ported line for line in ios/App/Color.swift.

import { SEE_THROUGH } from './lines.js';
import { withMasks, HOLE } from './mask.js';

// The xterm palette: the eight colors, then their bright twins. Index n is SGR 30+n (90+n-8 bright).
export const COLORS = [
  ['Black', '#000000'], ['Red', '#CD0000'], ['Green', '#00CD00'], ['Yellow', '#CDCD00'],
  ['Blue', '#0000EE'], ['Magenta', '#CD00CD'], ['Cyan', '#00CDCD'], ['White', '#E5E5E5'],
  ['Bright black', '#7F7F7F'], ['Bright red', '#FF0000'], ['Bright green', '#00FF00'], ['Bright yellow', '#FFFF00'],
  ['Bright blue', '#5C5CFF'], ['Bright magenta', '#FF00FF'], ['Bright cyan', '#00FFFF'], ['Bright white', '#FFFFFF'],
].map(([name, hex]) => ({ name, hex }));

/** A color index 0 to 15, or undefined for none. */
export const cleanColor = v => (Number.isInteger(v) && v >= 0 && v < COLORS.length ? v : undefined);

export const hasColor = elements => elements.some(el => !el.hidden && (el.ink !== undefined || el.paper !== undefined));

/** The ink and paper of every cell, -1 for none, in drawing order so a part on top clears the color under it. */
export function colorMask(elements, cols, rows) {
  const ink = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  const paper = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  for (const el of withMasks(elements)) {
    if (el.hidden) continue;
    const clear = SEE_THROUGH.has(el.presetId);
    for (let dy = 0; dy < el.height; dy++) {
      const r = el.row + dy, line = [...(el.template[dy] ?? '')];
      if (r < 0 || r >= rows) continue;
      for (let dx = 0; dx < el.width; dx++) {
        const c = el.col + dx, ch = line[dx] ?? ' ';
        if (c < 0 || c >= cols || (clear && ch === ' ') || ch === HOLE) continue;
        ink[r][c] = el.ink ?? -1;
        paper[r][c] = el.paper ?? -1;
      }
    }
  }
  return { ink, paper };
}

const sgr = (i, base) => (i < 8 ? base + i : base + 60 + i - 8);

/** The grid as ANSI text: SGR colors on runs that carry them, reset at the end of each run. */
export function toAnsi(grid, mask) {
  const lines = grid.map((row, r) => {
    let out = '', on = '';
    // Trailing blank cells with no paper are dropped, like plain text.
    let end = row.length;
    while (end > 0 && row[end - 1] === ' ' && mask.paper[r][end - 1] < 0) end--;
    for (let c = 0; c < end; c++) {
      const i = mask.ink[r][c], p = mask.paper[r][c];
      const want = [i >= 0 && sgr(i, 30), p >= 0 && sgr(p, 40)].filter(Boolean).join(';');
      if (want !== on) { out += on ? '\x1b[0m' : ''; out += want ? `\x1b[${want}m` : ''; on = want; }
      out += /\p{Cc}/u.test(row[c]) ? ' ' : row[c]; // a raw escape in a part never reaches the terminal
    }
    return out + (on ? '\x1b[0m' : '');
  });
  while (lines.length && !lines.at(-1)) lines.pop();
  return lines.join('\n');
}
