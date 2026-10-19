// Canvas engine — manages a 2D character grid
// Grid coordinate system: (col, row), 0-indexed
// Lines, connectors, see-through text and banners live in lines.js and are re-exported here.

import { FILLS, cleanNote } from './shapes.js';
import { tweakScreen } from './tweaks.js';
import { ADJUSTMENTS, renderElements, routeLines, shiftLine, bannerText, BOX_STYLES, screenFrame, partsInside, carry, groupMates, tableFrame, textCells, SIZED, nodeFrame, contentFrame, syncSymbol, VARIANTS, cleanBlend } from './lines.js';
import { maxOf } from './extent.js';
import { cleanColor } from './color.js';
import { cleanMask } from './mask.js';
export { ADJUSTMENTS, adjustChar, adjustLayer, renderElements, joinChar, bannerText, lineShape, createLine, routeLines, BOX_STYLES, styleChar, snapPosition, screenFrame, partsInside, screensDocument, accentMask, tableFrame, tableCells, tableText, textCells, CHARTS, chartFrame, chartItems, nodeFrame, SIZED, sequenceFrame, isMessage, treeFrame, isTreeLine, contentFrame,
  groupMates, groupElements, ungroupElements, syncSymbol, makeSymbol, detachSymbol, symbolUses, freshTag, VARIANTS, variantChar } from './lines.js';

export const DEFAULT_COLS = 100;
export const DEFAULT_ROWS = 50;

export function createGrid(cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
  return Array.from({ length: rows }, () => Array(cols).fill(' '));
}

export function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

export function gridToText(grid) {
  return grid.map(row => row.join('')).join('\n');
}

export function textToGrid(text, cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
  const grid = createGrid(cols, rows);
  const lines = text.split('\n');
  for (let r = 0; r < Math.min(lines.length, rows); r++) {
    const chars = [...lines[r]]; // spread handles multi-byte unicode
    for (let c = 0; c < Math.min(chars.length, cols); c++) {
      grid[r][c] = chars[c];
    }
  }
  return grid;
}

// Stamp a component template onto the grid at (col, row)
// Returns a new grid (immutable)
export function stampComponent(grid, template, col, row) {
  const next = cloneGrid(grid);
  const rows = grid.length;
  const cols = grid[0].length;
  for (let dy = 0; dy < template.length; dy++) {
    const r = row + dy;
    if (r < 0 || r >= rows) continue;
    const chars = [...template[dy]];
    for (let dx = 0; dx < chars.length; dx++) {
      const c = col + dx;
      if (c < 0 || c >= cols) continue;
      next[r][c] = chars[dx];
    }
  }
  return next;
}

// Set a single character at (col, row)
export function setChar(grid, col, row, char) {
  if (row < 0 || row >= grid.length) return grid;
  if (col < 0 || col >= grid[0].length) return grid;
  const next = cloneGrid(grid);
  next[row][col] = char || ' ';
  return next;
}

// Erase a rectangular region
export function eraseRegion(grid, col, row, width, height) {
  const next = cloneGrid(grid);
  for (let dy = 0; dy < height; dy++) {
    const r = row + dy;
    if (r < 0 || r >= grid.length) continue;
    for (let dx = 0; dx < width; dx++) {
      const c = col + dx;
      if (c < 0 || c >= grid[0].length) continue;
      next[r][c] = ' ';
    }
  }
  return next;
}

// Pixel coordinate (px, py) → grid cell (col, row) given char dimensions
export function pxToCell(px, py, charW, charH) {
  return {
    col: Math.floor(px / charW),
    row: Math.floor(py / charH),
  };
}

// Measure monospace character dimensions in a canvas element
export function measureChar(ctx, fontFamily = 'monospace', fontSize = 14) {
  ctx.font = `${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText('M');
  return {
    w: metrics.width,
    h: fontSize * 1.2,
  };
}

// Initial engine state factory
export function createState(cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
  return {
    grid: createGrid(cols, rows),
    cols,
    rows,
    cursor: { col: 0, row: 0 },
    history: [],
    future: [],
    selectedPreset: null,
    elements: [],
    selectedId: null,
  };
}

export function pushHistory(state) {
  return {
    ...state,
    history: [...state.history.slice(-49), state.elements],
    future: [],
  };
}

export function undo(state) {
  if (state.history.length === 0) return state;
  const prev = state.history[state.history.length - 1];
  return {
    ...state,
    elements: prev,
    grid: renderElements(prev, state.cols, state.rows),
    history: state.history.slice(0, -1),
    future: [state.elements, ...state.future.slice(0, 49)],
  };
}

export function redo(state) {
  if (state.future.length === 0) return state;
  const next = state.future[0];
  return {
    ...state,
    elements: next,
    grid: renderElements(next, state.cols, state.rows),
    history: [...state.history.slice(-49), state.elements],
    future: state.future.slice(1),
  };
}

// Elements — placed, selectable, movable objects. `grid` is always their
// render output; elements are the thing undo/redo, select, and move act on.
let nextElementId = 1;
export const newElementId = () => `el-${nextElementId++}`;

export function createElement(preset, col, row) {
  return {
    id: newElementId(),
    presetId: preset.id,
    label: preset.label,
    template: preset.template,
    width: preset.width,
    height: preset.height,
    col,
    row,
    ...(preset.text !== undefined && { text: preset.text }),
  };
}

// Topmost element whose bounding box contains (col, row), or null.
export function elementAt(elements, col, row) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.hidden || el.locked) continue; // a hidden or locked layer lets clicks through
    if (col >= el.col && col < el.col + el.width && row >= el.row && row < el.row + el.height) {
      if (el.presetId === 'adjust') continue; // an adjustment is picked from Layers, never by a click on the canvas
      if (el.presetId === 'paint' && [...(el.template[row - el.row] ?? '')][col - el.col] === ' ') continue; // only its marks
      return el;
    }
  }
  return null;
}

export function moveElement(elements, id, col, row) {
  const target = elements.find(el => el.id === id);
  if (target?.locked) return elements;
  // A screen carries the parts inside it, and a grouped part its group.
  const carried = new Set([...(target?.presetId === 'screen' ? partsInside(elements, target) : []), ...groupMates(elements, target)]
    .map(el => el.id));
  return routeLines(elements.map(el => {
    if (carried.has(el.id)) return carry(el, col - target.col, row - target.row);
    if (el.id !== id) return el;
    return el.presetId === 'line' && el.from ? shiftLine(el, col - el.col, row - el.row) : { ...el, col, row };
  }));
}

export function deleteElement(elements, id) {
  return elements.filter(el => el.id !== id);
}

// Resize character art without stretching its text. Keep line endings and box borders.
export function resizeTemplate(template, width, height) {
  const lines = template.map(line => [...line]);
  const boxed = lines.length > 1 && /^[┌╭┏]/u.test(template[0]) && /^[└╰┗]/u.test(template.at(-1));
  const fit = chars => {
    const end = chars.at(-1);
    const bordered = /[┐┤┘╮╯┓┫┛│┃\]]/u.test(end || '');
    const body = bordered ? chars.slice(0, -1) : chars;
    const fill = /^[─━_]+$/u.test(body.slice(1).join('')) ? body[1] : ' ';
    const size = width - (bordered ? 1 : 0);
    return [...body.slice(0, size), ...Array(Math.max(0, size - body.length)).fill(fill), ...(bordered ? [end] : [])].join('');
  };
  return Array.from({length: height}, (_, row) => {
    if (boxed && row === height - 1) return fit(lines.at(-1));
    if (boxed && row >= lines.length - 1) return fit([lines[1][0], ...Array(Math.max(0, lines[1].length - 2)).fill(' '), lines[1].at(-1)]);
    return fit(lines[row] || []);
  });
}

export function updateElement(elements, id, changes) {
  if (changes.tweak) return tweakScreen(elements, id, changes.tweak);
  return syncSymbol(updateOne(elements, id, changes), id);
}

function updateOne(elements, id, changes) {
  return routeLines(elements.map(el => {
    if (el.id !== id) return el;
    // Flags: a highlight, and a layer hidden (not drawn or copied) or locked (the canvas cannot pick it).
    for (const flag of ['accent', 'hidden', 'locked']) {
      if (changes[flag] === undefined) continue;
      const { [flag]: _, ...rest } = el;
      return changes[flag] ? { ...rest, [flag]: true } : rest;
    }
    if (changes.adjust !== undefined) return ADJUSTMENTS.includes(changes.adjust) ? { ...el, adjust: changes.adjust } : el;
    // Ink and paper: a terminal color index, or null to clear it.
    if (changes.ink !== undefined || changes.paper !== undefined) {
      const next = { ...el };
      for (const key of ['ink', 'paper']) {
        if (changes[key] === undefined) continue;
        const v = cleanColor(changes[key]);
        if (v === undefined) delete next[key]; else next[key] = v;
      }
      return next;
    }
    // A mask crops the part to insets; a clip shows it only inside another part (mask.js). Null clears either.
    if (changes.mask !== undefined || changes.clip !== undefined) {
      const { mask, clip, ...next } = el, m = changes.mask === undefined ? mask : cleanMask(changes.mask);
      const to = changes.clip === undefined ? clip : changes.clip;
      return { ...next, ...(m && { mask: m }), ...(typeof to === 'string' && to !== el.id && { clip: to }) };
    }
    if (changes.blend !== undefined) {
      const { blend, ...rest } = el, b = cleanBlend(changes.blend);
      return b ? { ...rest, blend: b } : rest;
    }
    if (changes.note !== undefined) {
      const { note, ...rest } = el, next = cleanNote(changes.note);
      return next ? { ...rest, note: next } : rest;
    }
    if (changes.variant !== undefined) {
      const { variant, ...rest } = el;
      return VARIANTS.includes(changes.variant) && changes.variant !== 'default' ? { ...rest, variant: changes.variant } : rest;
    }
    if (changes.style !== undefined) {
      const { style, ...rest } = el;
      return BOX_STYLES.includes(changes.style) && changes.style !== 'single' ? { ...rest, style: changes.style } : rest;
    }
    if (el.presetId === 'screen' && (changes.text !== undefined || changes.width || changes.height)) {
      const text = changes.text ?? el.text ?? 'Screen';
      const width = Math.max(6, Math.round(changes.width || el.width)), height = Math.max(3, Math.round(changes.height || el.height));
      return { ...el, text, width, height, template: screenFrame(text, width, height) };
    }
    // A table edits its cells (typed rows or a cells array) and redraws its frame to fit them.
    if (el.presetId === 'table' && (changes.text !== undefined || changes.cells)) {
      const template = tableFrame(changes.cells ?? textCells(changes.text));
      return {...el, template, width: [...template[0]].length, height: template.length};
    }
    // A flowchart node redraws its box around its new words.
    if (el.presetId === 'node' && changes.text !== undefined) {
      const template = nodeFrame(changes.text);
      return {...el, text: changes.text, template, width: [...template[0]].length, height: template.length};
    }
    // A chart, sequence diagram or tree redraws from its numbers, messages or list, kept as its text.
    const drawn = changes.text !== undefined && contentFrame(el.presetId, changes.text);
    if (drawn) {
      const template = drawn;
      return {...el, text: changes.text, template, width: maxOf(template.map(l => [...l].length)), height: template.length};
    }
    // A shade fill is one character at any size: a resize or a new shade refills it.
    if (el.presetId === 'fill' && (changes.fill || changes.width || changes.height)) {
      const ch = FILLS.includes(changes.fill) ? changes.fill : [...el.template[0]][0];
      const width = Math.max(1, Math.round(changes.width || el.width)), height = Math.max(1, Math.round(changes.height || el.height));
      return { ...el, ...('col' in changes && { col: changes.col }), ...('row' in changes && { row: changes.row }),
        width, height, template: Array(height).fill(ch.repeat(width)) };
    }
    // What is in it sizes a table, chart or sequence diagram, so dragging a handle only moves it.
    if (SIZED.includes(el.presetId)) return {...el, col: changes.col ?? el.col, row: changes.row ?? el.row};
    if (changes.text !== undefined && el.presetId === 'banner') {
      const template = bannerText(changes.text);
      return {...el, text: changes.text, template, width: Math.max(1, [...template[0]].length), height: template.length};
    }
    if (changes.text !== undefined) {
      const template = changes.text.replace(/\r\n?/g, '\n').split('\n');
      return {...el, template, width: Math.max(1, maxOf(template.map(line => [...line].length))), height: template.length};
    }
    const width = Math.max(2, Math.round(changes.width || el.width));
    const height = Math.max(1, Math.round(changes.height || el.height));
    return {...el, ...changes, width, height, template: resizeTemplate(el.template, width, height)};
  }));
}

// Copy an element one cell down and right so the duplicate is visible. Returns the new list and id.
export function duplicateElement(elements, id, cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
  const src = elements.find(el => el.id === id);
  if (!src) return { elements, id: null };
  if (src.presetId === 'screen') return duplicateScreen(elements, src);
  const col = Math.min(src.col + 2, Math.max(0, cols - src.width));
  const row = Math.min(src.row + 1, Math.max(0, rows - src.height));
  const moved = src.presetId === 'line' && src.from ? shiftLine(src, col - src.col, row - src.row) : { ...src, col, row };
  const { group, note, ...copy } = { ...moved, id: newElementId() }; // a copy stands alone, without the note
  return { elements: [...elements, copy], id: copy.id };
}

// A screen copies with everything inside it, placed to its right. Lines between copied parts pin to the copies.
export function duplicateScreen(elements, src, dCol = src.width + 4) {
  const group = [src, ...partsInside(elements, src)];
  const ids = new Map(group.map(el => [el.id, newElementId()]));
  const pin = a => (a && ids.has(a.id) ? { ...a, id: ids.get(a.id) } : a);
  const copies = group.map(el => {
    const c = carry(el, dCol, 0);
    return { ...c, id: ids.get(el.id), ...(c.from && { from: pin(c.from), to: pin(c.to) }) };
  });
  const [frame, ...parts] = copies;
  return { elements: routeLines([frame, ...elements, ...parts]), id: frame.id };
}

// Later elements paint over earlier ones, so order is the z-index.
export function reorderElement(elements, id, to) {
  const el = elements.find(x => x.id === id);
  if (!el) return elements;
  const rest = elements.filter(x => x.id !== id);
  // One step up or down the layer list, or all the way to the front or back.
  if (to === 'up' || to === 'down') {
    const i = elements.indexOf(el), j = Math.max(0, Math.min(rest.length, i + (to === 'up' ? 1 : -1)));
    return [...rest.slice(0, j), el, ...rest.slice(j)];
  }
  return to === 'back' ? [el, ...rest] : [...rest, el];
}

// Keep a moved element on the canvas.
export function nudgeElement(elements, id, dCol, dRow, cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
  const el = elements.find(x => x.id === id);
  if (!el) return elements;
  const col = Math.max(0, Math.min(cols - el.width, el.col + dCol));
  const row = Math.max(0, Math.min(rows - el.height, el.row + dRow));
  return moveElement(elements, id, col, row);
}

// Plain-ASCII export for places that cannot draw box characters (READMEs on old terminals, email, code comments).
const ASCII_MAP = new Map([
  ...'─━═╌╍┄┅┈┉'.split('').map(c => [c, '-']),
  ...'│┃║╎╏┆┇┊┋'.split('').map(c => [c, '|']),
  ...'┌┐└┘├┤┬┴┼╭╮╰╯┏┓┗┛┣┫┳┻╋╔╗╚╝╠╣╦╩╬'.split('').map(c => [c, '+']),
  ['●', '*'], ['○', 'o'], ['■', '#'], ['□', '#'], ['▪', '#'], ['▫', '#'], ['█', '#'], ['░', '.'], ['▒', ':'], ['▓', '#'],
  ['▀', '"'], ['▄', '_'], ['◡', 'u'], ['▌', '|'], ['‹', '<'], ['›', '>'], ['▸', '>'], ['▶', '>'], ['◂', '<'], ['◀', '<'], ['▾', 'v'], ['▼', 'v'], ['▴', '^'], ['▲', '^'],
  ['✓', 'x'], ['✔', 'x'], ['★', '*'], ['☆', '*'], ['…', '...'], ['—', '-'], ['–', '-'], ['·', '.'], ['•', '*'],
]);
/** One character in plain ASCII, always one character wide (… becomes .). */
export const asciiChar = c => (ASCII_MAP.get(c) ?? (c.codePointAt(0) > 126 ? '?' : c))[0];

export function toAscii(text) {
  return [...text].map(c => ASCII_MAP.get(c) ?? (c.codePointAt(0) > 126 ? '?' : c)).join('');
}

// Drop trailing spaces and blank rows so exports are not a 100x50 block of padding.
export function trimText(text) {
  return text.split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
}

export function toMarkdown(text) {
  return '```\n' + trimText(text) + '\n```';
}

// A project file is just the element list and the canvas size.
export function serializeProject(state) {
  return JSON.stringify({ blockprint: 1, cols: state.cols, rows: state.rows, elements: state.elements });
}

export function parseProject(json) {
  let data;
  try { data = JSON.parse(json); } catch { return null; }
  if (!data || typeof data !== 'object' || !Array.isArray(data.elements)) return null;
  const cols = Number.isInteger(data.cols) && data.cols > 0 && data.cols <= 500 ? data.cols : DEFAULT_COLS;
  const rows = Number.isInteger(data.rows) && data.rows > 0 && data.rows <= 500 ? data.rows : DEFAULT_ROWS;
  const valid = data.elements.filter(el => el && Array.isArray(el.template) && el.template.every(l => typeof l === 'string'));
  // Ids are fresh on open, so pinned line ends are re-pointed at the new ids.
  const fresh = valid.map(() => newElementId());
  const ids = new Map();
  valid.forEach((el, i) => { if (el.id != null && !ids.has(el.id)) ids.set(el.id, fresh[i]); });
  const int = n => (Number.isInteger(n) ? n : 0);
  const anchor = a => (a && typeof a === 'object'
    ? { col: int(a.col), row: int(a.row), ...(ids.has(a.id) && { id: ids.get(a.id), dCol: int(a.dCol), dRow: int(a.dRow) }),
        ...(a.edge === true && { edge: true }), ...(['left', 'below'].includes(a.side) && { side: a.side }) }
    : null);
  const elements = valid.map((el, i) => {
    const from = anchor(el.from), to = anchor(el.to);
    return {
      id: fresh[i],
      presetId: String(el.presetId ?? 'custom'),
      label: String(el.label ?? 'Element'),
      template: el.template,
      width: Math.max(1, maxOf(el.template.map(l => [...l].length))),
      height: el.template.length,
      col: int(el.col),
      row: int(el.row),
      ...(from && to && { from, to }),
      ...(typeof el.text === 'string' && { text: el.text }),
      ...(BOX_STYLES.includes(el.style) && el.style !== 'single' && { style: el.style }),
      ...(el.accent === true && { accent: true }),
      ...(el.presetId === 'adjust' && ADJUSTMENTS.includes(el.adjust) && { adjust: el.adjust }),
      ...(cleanColor(el.ink) !== undefined && { ink: el.ink }),
      ...(cleanColor(el.paper) !== undefined && { paper: el.paper }),
      ...(cleanMask(el.mask) && { mask: cleanMask(el.mask) }),
      ...(cleanBlend(el.blend) && { blend: el.blend }),
      ...(ids.has(el.clip) && ids.get(el.clip) !== fresh[i] && { clip: ids.get(el.clip) }),
      ...(typeof el.group === 'string' && { group: el.group }),
      ...(el.hidden === true && { hidden: true }),
      ...(el.locked === true && { locked: true }),
      ...(typeof el.symbol === 'string' && { symbol: el.symbol }),
      ...(VARIANTS.includes(el.variant) && el.variant !== 'default' && { variant: el.variant }),
      ...(cleanNote(typeof el.note === 'string' ? el.note : '') && { note: cleanNote(el.note) }),
      ...(typeof el.take === 'string' && el.take.length <= 64 && { take: el.take }),
    };
  });
  return { cols, rows, elements };
}
