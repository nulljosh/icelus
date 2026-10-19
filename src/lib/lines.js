// Lines, connectors, see-through text and banners. Split out of engine.js to keep each file small.
// Ported line for line in ios/App/Lines.swift.

import { createGrid, elementAt, newElementId, trimText, asciiChar } from './engine.js';
export { tableFrame, tableCells, tableText, textCells, CHARTS, SIZED, chartItems, chartFrame, nodeFrame, sequenceFrame, isMessage,
  treeFrame, isTreeLine, contentFrame, syncSymbol, makeSymbol, detachSymbol, symbolUses,
  VARIANTS, variantChar } from './shapes.js';
import { variantChar } from './shapes.js';
import { withMasks, HOLE } from './mask.js';

// Box-drawing joins: each light line character as the sides it reaches (up 8, right 4, down 2, left 1).
const LINKS = { '─': 5, '│': 10, '┌': 6, '┐': 3, '└': 12, '┘': 9, '├': 14, '┤': 11, '┬': 7, '┴': 13, '┼': 15,
  '╶': 4, '╴': 1, '╷': 2, '╵': 8 };
const JOINS = Object.fromEntries(Object.entries(LINKS).map(([c, b]) => [b, c]));

export const SEE_THROUGH = new Set(['line', 'text', 'banner', 'screen', 'paint', 'adjust']);

// A 3 by 5 pixel font. Each glyph is five rows of three bits, top to bottom.
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', ' ': '000000000000000', '!': '010010010000010', '?': '110001010000010', '.': '000000000000010',
  '-': '000000111000000',
};

// Big text for titles: two pixel rows per text row with half blocks, so a banner is 3 rows tall.
export function bannerText(text) {
  const glyphs = [...text.replace(/\s+/g, ' ').trim().toUpperCase()].map(ch => FONT[ch] ?? FONT[' ']);
  const on = (g, x, y) => y < 5 && g[y * 3 + x] === '1';
  return [0, 2, 4].map(y => glyphs.map(g => [0, 1, 2].map(x => {
    const top = on(g, x, y), bottom = on(g, x, y + 1);
    return top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' ';
  }).join('')).join(' '));
}

// Where two strokes cross, draw the character that joins them.
export function joinChar(under, over) {
  return LINKS[under] && LINKS[over] ? JOINS[LINKS[under] | LINKS[over]] : over;
}

// Which cells an accented part paints, in the same order renderElements draws, so a part on top
// clears the accent under it. Only the canvas and images use it; copied text stays plain.
export function accentMask(elements, cols, rows) {
  const mask = Array.from({ length: rows }, () => new Array(cols).fill(false));
  for (const el of withMasks(elements)) {
    if (el.hidden) continue;
    const clear = SEE_THROUGH.has(el.presetId);
    el.template.forEach((line, dy) => {
      const r = el.row + dy;
      if (r < 0 || r >= rows) return;
      [...line].forEach((ch, dx) => {
        const c = el.col + dx;
        if (c < 0 || c >= cols || (clear && ch === ' ') || ch === HOLE) return;
        mask[r][c] = el.accent === true;
      });
    });
  }
  return mask;
}

export function renderElements(elements, cols, rows) {
  const grid = createGrid(cols, rows);
  for (const el of withMasks(elements)) {
    if (el.hidden) continue;
    if (el.presetId === 'adjust') { adjustGrid(grid, el); continue; }
    // Lines, text and banners are see-through: only their marks land on what is underneath.
    const clear = SEE_THROUGH.has(el.presetId);
    el.template.forEach((line, dy) => {
      const r = el.row + dy;
      if (r < 0 || r >= rows) return;
      [...line].forEach((ch, dx) => {
        const c = el.col + dx;
        if (c < 0 || c >= cols || (clear && ch === ' ') || ch === HOLE) return;
        // A part's state or box style draws its own line set; joins only form between light strokes.
        grid[r][c] = el.variant ? variantChar(ch, el.variant) : el.style ? styleChar(ch, el.style) : joinChar(grid[r][c], ch);
      });
    });
  }
  return grid;
}
// An elbow line from one cell to another: across first, then up or down, with an arrowhead at the end.
export function lineShape(from, to, arrow = true) {
  // A loop back in a flowchart goes under both boxes: down, across, up into the bottom of the earlier one.
  const lane = to.side === 'below' ? Math.max(from.row, to.row) + 2 : null;
  const col = Math.min(from.col, to.col), row = Math.min(from.row, to.row);
  const width = Math.abs(to.col - from.col) + 1, height = (lane ?? Math.max(from.row, to.row)) - row + 1;
  const fc = from.col - col, fr = from.row - row, tc = to.col - col, tr = to.row - row;
  const g = createGrid(width, height);
  if (lane !== null) {
    const lr = lane - row, left = tc < fc;
    for (let r = fr; r <= lr; r++) g[r][fc] = '│';
    for (let c = Math.min(fc, tc); c <= Math.max(fc, tc); c++) g[lr][c] = '─';
    for (let r = tr; r <= lr; r++) g[r][tc] = '│';
    g[lr][fc] = JOINS[8 | (left ? 1 : 4)];
    g[lr][tc] = JOINS[8 | (left ? 4 : 1)];
    if (from.edge) g[fr][fc] = '╷';
    if (arrow) g[tr][tc] = '▲';
    return { template: g.map(r => r.join('')), width, height, col, row };
  }
  // Into a box's left side from another row: across, down or up in the gap before the box, then across into it.
  if (to.side === 'left' && fr !== tr) {
    const mc = tc - 3 > fc ? tc - 3 : Math.floor((fc + tc) / 2), down = tr > fr;
    for (let c = Math.min(fc, mc); c <= Math.max(fc, mc); c++) g[fr][c] = '─';
    for (let r = Math.min(fr, tr); r <= Math.max(fr, tr); r++) g[r][mc] = '│';
    for (let c = Math.min(mc, tc); c <= Math.max(mc, tc); c++) g[tr][c] = '─';
    g[fr][mc] = JOINS[(mc > fc ? 1 : 4) | (down ? 2 : 8)];
    g[tr][mc] = JOINS[(down ? 8 : 2) | (tc > mc ? 4 : 1)];
    if (from.edge) g[fr][fc] = mc > fc ? '╶' : '╴';
    if (arrow) g[tr][tc] = tc < mc ? '◀' : '▶';
    return { template: g.map(r => r.join('')), width, height, col, row };
  }
  for (let c = Math.min(fc, tc); c <= Math.max(fc, tc); c++) g[fr][c] = '─';
  if (fr !== tr) for (let r = Math.min(fr, tr); r <= Math.max(fr, tr); r++) g[r][tc] = '│';
  if (fc !== tc && fr !== tr) g[fr][tc] = JOINS[(tc > fc ? 1 : 4) | (tr > fr ? 2 : 8)];
  // A line that leaves a box's edge starts as a half stroke, so it joins the edge as ├ rather than crossing it.
  if (from.edge && (fc !== tc || fr !== tr)) g[fr][fc] = fc !== tc ? (tc > fc ? '╶' : '╴') : (tr > fr ? '╷' : '╵');
  if (arrow) g[tr][tc] = fr !== tr ? (tr > fr ? '▼' : '▲') : (tc < fc ? '◀' : '▶');
  return { template: g.map(r => r.join('')), width, height, col, row };
}
// A line's ends are anchors: pinned to the part under them, so they follow it, or loose on the canvas.
function anchorAt(elements, cell) {
  const el = elementAt(elements.filter(x => x.presetId !== 'line'), cell.col, cell.row);
  return el ? { col: cell.col, row: cell.row, id: el.id, dCol: cell.col - el.col, dRow: cell.row - el.row }
    : { col: cell.col, row: cell.row };
}

// A screen is a frame with its name in the top border. It is see-through, so the parts inside it show.
export function screenFrame(name, width, height) {
  const w = Math.max(6, width), h = Math.max(3, height);
  const title = [...` ${name} `].slice(0, w - 4).join('');
  const top = `┌─${title}${'─'.repeat(w - 3 - [...title].length)}┐`;
  return [top, ...Array(h - 2).fill(`│${' '.repeat(w - 2)}│`), `└${'─'.repeat(w - 2)}┘`];
}

// The parts wholly inside a screen travel with it. A part across its edge stays where it is.
export function partsInside(elements, frame) {
  return elements.filter(el => el.id !== frame.id && el.presetId !== 'screen'
    && el.col >= frame.col && el.row >= frame.row
    && el.col + el.width <= frame.col + frame.width && el.row + el.height <= frame.row + frame.height);
}

// Every screen as one Markdown document: a Flow list of the arrows that run from one screen to another,
// then each screen under its name, cropped to its frame. Null when there are no screens.
export function screensDocument(elements, cols, rows) {
  const screens = elements.filter(el => el.presetId === 'screen').sort((a, b) => a.row - b.row || a.col - b.col);
  if (!screens.length) return null;
  const grid = renderElements(elements, cols, rows);
  const name = s => s.text || 'Screen';
  const holding = p => screens.find(s => p.col >= s.col && p.col < s.col + s.width && p.row >= s.row && p.row < s.row + s.height);
  const flow = elements.filter(el => el.presetId === 'line' && el.from && el.to)
    .map(el => [holding(el.from), holding(el.to)]).filter(([a, b]) => a && b && a !== b)
    .map(([a, b]) => `- ${name(a)} → ${name(b)}`);
  const crop = s => grid.slice(s.row, s.row + s.height).map(r => r.slice(s.col, s.col + s.width).join('')).join('\n');
  return [...(flow.length ? ['## Flow', '', ...new Set(flow), ''] : []),
    ...screens.flatMap(s => [`## ${name(s)}`, '', '```', trimText(crop(s)), '```', ''])].join('\n').trimEnd() + '\n';
}

// Shift a part carried by its screen. A carried line keeps its pins; only its loose ends move.
export function carry(el, dCol, dRow) {
  const shift = a => (a.id ? a : { col: a.col + dCol, row: a.row + dRow });
  const moved = { ...el, col: el.col + dCol, row: el.row + dRow };
  return el.presetId === 'line' && el.from ? { ...moved, from: shift(el.from), to: shift(el.to) } : moved;
}

// Grouped parts move as one: they share a `group` id. A group needs two parts or more.
export const groupMates = (elements, el) => (el?.group ? elements.filter(x => x.group === el.group && x.id !== el.id) : []);
// Group and symbol ids outlive a session in the project file, so they are random, not the counted element ids.
export const freshTag = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
export function groupElements(elements, ids) {
  if (new Set(ids).size < 2) return elements;
  const group = freshTag();
  return elements.map(el => (ids.includes(el.id) ? { ...el, group } : el));
}
export function ungroupElements(elements, id) {
  const group = elements.find(el => el.id === id)?.group;
  return group ? elements.map(el => { if (el.group !== group) return el; const { group: _, ...rest } = el; return rest; }) : elements;
}

// Moving or copying a line by hand cuts it loose from what it was pinned to.
export function shiftLine(el, dCol, dRow) {
  const loose = a => ({ col: a.col + dCol, row: a.row + dRow });
  return { ...el, col: el.col + dCol, row: el.row + dRow, from: loose(el.from), to: loose(el.to) };
}

// A flowchart arrow (`edge`) starts as a half stroke on its box and comes into the next box's left side.
export function createLine(elements, start, end, edge = false) {
  const from = { ...anchorAt(elements, start), ...(edge && { edge: true }) };
  const to = { ...anchorAt(elements, end), ...(edge && { side: edge === 'below' ? 'below' : 'left' }) };
  return { id: newElementId(), presetId: 'line', label: 'Arrow', ...lineShape(from, to), from, to };
}

// Redraw every pinned line from where its parts are now. A part that is gone leaves the end where it was.
export function routeLines(elements) {
  const byId = new Map(elements.map(el => [el.id, el]));
  const follow = a => {
    const el = a.id && byId.get(a.id);
    return el ? { ...a, col: el.col + a.dCol, row: el.row + a.dRow } : a;
  };
  return elements.map(el => {
    if (el.presetId !== 'line' || !el.from || !el.to) return el;
    const from = follow(el.from), to = follow(el.to);
    if (from.col === el.from.col && from.row === el.from.row && to.col === el.to.col && to.row === el.to.row) return el;
    return { ...el, ...lineShape(from, to), from, to };
  });
}

// Box styles swap the light line set for another, character for character.
const LIGHT = '─│┌┐└┘├┤┬┴┼';
const STYLES = { double: '═║╔╗╚╝╠╣╦╩╬', rounded: '─│╭╮╰╯├┤┬┴┼', heavy: '━┃┏┓┗┛┣┫┳┻╋', ascii: '-|+++++++++' };
export const BOX_STYLES = ['single', ...Object.keys(STYLES)];

export function styleChar(ch, style) {
  const i = STYLES[style] ? LIGHT.indexOf(ch) : -1;
  return i < 0 ? ch : STYLES[style][i];
}

// Adjustment layers change what is drawn under them, in their area, without touching the parts. They act
// in layer order, so a part above an adjustment is left alone.
// ascii turns every character plain ASCII, not just the box lines.
export const ADJUSTMENTS = ['invert', 'dim', 'ascii', ...BOX_STYLES.filter(s => s !== 'ascii')];
const INVERT = { ' ': '█', '█': ' ', '░': '▓', '▓': '░', '▀': '▄', '▄': '▀' };
const DIM = { '█': '▓', '▓': '▒', '▒': '░', '░': ' ', '▀': '░', '▄': '░' };
// Any box line back to the light set, so a style swap works on doubled, heavy and rounded boxes too.
const TO_LIGHT = new Map(Object.values(STYLES).filter((_, i) => Object.keys(STYLES)[i] !== 'ascii')
  .flatMap(set => [...set].map((ch, i) => [ch, LIGHT[i]])));
const toLight = ch => TO_LIGHT.get(ch) ?? ch;

export function adjustChar(ch, kind) {
  if (kind === 'invert') return INVERT[ch] ?? ch;
  if (kind === 'dim') return DIM[ch] ?? toLight(ch);
  if (kind === 'ascii') return asciiChar(ch);
  return BOX_STYLES.includes(kind) ? styleChar(toLight(ch), kind) : ch;
}

function adjustGrid(grid, el) {
  for (let r = Math.max(0, el.row); r < Math.min(grid.length, el.row + el.height); r++) {
    for (let c = Math.max(0, el.col); c < Math.min(grid[r].length, el.col + el.width); c++) grid[r][c] = adjustChar(grid[r][c], el.adjust);
  }
}

/** A new adjustment layer over an area: no marks of its own, just a kind. */
export const adjustLayer = (col, row, width, height, adjust) => ({ id: newElementId(), presetId: 'adjust', label: 'Adjustment', adjust,
  col, row, width, height, template: Array.from({ length: height }, () => ' '.repeat(width)) });

// Snap a dragged part to the left edge, centre or right edge of another when it comes within `reach`
// cells. Returns the snapped spot and the guide lines to draw.
export function snapPosition(elements, id, col, row, reach = 2) {
  const el = elements.find(x => x.id === id);
  if (!el) return { col, row, guideCols: [], guideRows: [] };
  const others = elements.filter(x => x.id !== id && x.presetId !== 'line');
  const edges = (start, size) => [start, start + Math.floor((size - 1) / 2), start + size - 1];
  const snap = (pos, size, at, len) => {
    let best = null;
    for (const o of others) for (const e of edges(o[at], o[len])) for (const m of edges(pos, size)) {
      const d = e - m;
      if (Math.abs(d) <= reach && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, e };
    }
    return best ? [pos + best.d, [best.e]] : [pos, []];
  };
  const [c, guideCols] = snap(col, el.width, 'col', 'width');
  const [r, guideRows] = snap(row, el.height, 'row', 'height');
  return { col: c, row: r, guideCols, guideRows };
}
