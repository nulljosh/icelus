import { adjustLayer } from './lines.js';
import { AUTO_MAX } from './layout.js';
import { cleanGrid } from './grids.js';
import { cleanColor } from './color.js';
import { updateElement } from './engine.js';

// Variables and modes (v47), after Figma's. One canvas part (an adjustment with `canvas: true`) holds the
// project's line mode, drawn over everything (renderElements), and its named spacing, which a screen's auto
// layout uses by name: change `space` once and every screen bound to it restacks. ios/App/Modes.swift is the twin.
export const MODES = ['ascii', 'single', 'heavy', 'double', 'rounded'];
export const VAR_MAX = 12;
const NAME = /^[a-z][a-z0-9-]{0,15}$/;

export const isVarName = v => typeof v === 'string' && NAME.test(v);

export function cleanVars(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out = Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).filter(([k, n]) => isVarName(k) && Number.isInteger(n) && n >= 0 && n <= AUTO_MAX).slice(0, VAR_MAX);
  return out.length ? Object.fromEntries(out) : null;
}

export const canvasPart = elements => elements.find(el => el.canvas);
export const canvasMode = elements => canvasPart(elements)?.adjust ?? null;
export const canvasVars = elements => canvasPart(elements)?.vars ?? {};
export const canvasGrids = elements => canvasPart(elements)?.grids ?? {};

// Named grid styles: a screen's grid saved by name on the canvas part, picked for any screen later. At most 12.
export function cleanGrids(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out = Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).filter(([k, g]) => isVarName(k) && cleanGrid(g)).slice(0, VAR_MAX)
    .map(([k, g]) => [k, cleanGrid(g)]);
  return out.length ? Object.fromEntries(out) : null;
}

// Put the canvas part's mode and vars back; it goes away when it holds nothing at all.
function withCanvas(elements, mode, vars, grids = cleanGrids(canvasGrids(elements))) {
  return patchCanvas(elements, { adjust: mode || null, vars: vars || null, grids: grids || null });
}

const CANVAS_KEYS = ['adjust', 'vars', 'grids', 'colors', 'widths', 'colorMode'];

// Set or (with null) clear fields on the canvas part, making it on first use and dropping it once empty.
function patchCanvas(elements, patch) {
  const part = canvasPart(elements), rest = elements.filter(el => !el.canvas);
  const next = { ...(part ?? { ...adjustLayer(0, 0, 1, 1), label: 'Canvas', canvas: true }), ...patch };
  for (const k of Object.keys(patch)) if (patch[k] == null) delete next[k];
  if (!CANVAS_KEYS.some(k => next[k] !== undefined)) return part ? rest : elements;
  return [...rest, next];
}

// Save a grid under a name, or null to remove the name. Screens that picked it keep their own copy.
export function setGridStyle(elements, name, grid) {
  if (!isVarName(name)) return elements;
  const grids = { ...canvasGrids(elements) };
  if (grid === null) delete grids[name];
  else { const g = cleanGrid(grid); if (!g || (grids[name] === undefined && Object.keys(grids).length >= VAR_MAX)) return elements; grids[name] = g; }
  return withCanvas(elements, canvasMode(elements), cleanVars(canvasVars(elements)), cleanGrids(grids));
}

export function setMode(elements, mode) {
  return withCanvas(elements, MODES.includes(mode) ? mode : null, cleanVars(canvasVars(elements)));
}

// A value of null removes the variable; screens bound to it keep its last value as a plain number.
export function setVar(elements, name, value) {
  if (!isVarName(name)) return elements;
  const vars = { ...canvasVars(elements) }, last = vars[name];
  if (value !== null && last === undefined && Object.keys(vars).length >= VAR_MAX) return elements;
  if (value === null) delete vars[name]; else vars[name] = Math.max(0, Math.min(AUTO_MAX, Math.round(value)));
  const next = withCanvas(elements, canvasMode(elements), cleanVars(vars));
  if (value !== null || last === undefined) return next;
  const unbind = v => (v === name ? last : v);
  return next.map(el => (el.auto && (el.auto.gap === name || el.auto.pad === name)
    ? { ...el, auto: { gap: unbind(el.auto.gap), pad: unbind(el.auto.pad) } } : el));
}

// A gap or pad that names a variable reads its value; an unknown name reads 1.
export const knobValue = (v, vars) => (typeof v === 'string' ? vars[v] ?? 1 : v);

// Color and width variables, after Figma's color variables and modes. A named color holds a light and a dark
// index into COLORS; a named width is a column count. A part binds its ink, paper or width to a name (inkVar,
// paperVar, widthVar). Changing a variable or the color mode writes the value into every bound part, so drawing
// and export never look a variable up. Removing a variable unbinds its parts and they keep the last value.
export const COLOR_MODES = ['light', 'dark'];
export const WIDTH_MAX = 500;
const BINDS = ['ink', 'paper', 'width'];

export const canvasColors = elements => canvasPart(elements)?.colors ?? {};
export const canvasWidths = elements => canvasPart(elements)?.widths ?? {};
export const colorMode = elements => (canvasPart(elements)?.colorMode === 'dark' ? 'dark' : 'light');

const named = (v, ok) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out = Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).filter(([k, x]) => isVarName(k) && ok(x)).slice(0, VAR_MAX);
  return out.length ? Object.fromEntries(out) : null;
};
export const cleanColorVars = v => named(v, c => Array.isArray(c) && c.length === 2 && c.every(i => cleanColor(i) !== undefined));
export const cleanWidthVars = v => named(v, w => Number.isInteger(w) && w >= 1 && w <= WIDTH_MAX);

/** Write every variable's current value into the parts bound to it. */
export function applyVars(elements) {
  const colors = canvasColors(elements), widths = canvasWidths(elements), m = colorMode(elements) === 'dark' ? 1 : 0;
  let out = elements;
  for (const el of elements) {
    const ink = colors[el.inkVar]?.[m], paper = colors[el.paperVar]?.[m], width = widths[el.widthVar];
    if ((ink !== undefined && ink !== el.ink) || (paper !== undefined && paper !== el.paper)) {
      out = out.map(x => (x.id === el.id ? { ...x, ...(ink !== undefined && { ink }), ...(paper !== undefined && { paper }) } : x));
    }
    if (width !== undefined && width !== el.width) out = updateElement(out, el.id, { width, height: el.height });
  }
  return out;
}

function unbindAll(elements, key, name) {
  return elements.map(el => { if (el[`${key}Var`] !== name) return el; const { [`${key}Var`]: _, ...rest } = el; return rest; });
}

// A color as [light, dark], or null to remove it.
export function setColorVar(elements, name, pair) {
  if (!isVarName(name)) return elements;
  const colors = { ...canvasColors(elements) };
  if (pair === null) {
    if (colors[name] === undefined) return elements;
    delete colors[name];
    return unbindAll(unbindAll(patchCanvas(elements, { colors: cleanColorVars(colors) }), 'ink', name), 'paper', name);
  }
  if (!cleanColorVars({ [name]: pair }) || (colors[name] === undefined && Object.keys(colors).length >= VAR_MAX)) return elements;
  colors[name] = pair;
  return applyVars(patchCanvas(elements, { colors: cleanColorVars(colors) }));
}

export function setWidthVar(elements, name, width) {
  if (!isVarName(name)) return elements;
  const widths = { ...canvasWidths(elements) };
  if (width === null) {
    if (widths[name] === undefined) return elements;
    delete widths[name];
    return unbindAll(patchCanvas(elements, { widths: cleanWidthVars(widths) }), 'width', name);
  }
  if (widths[name] === undefined && Object.keys(widths).length >= VAR_MAX) return elements;
  widths[name] = Math.max(1, Math.min(WIDTH_MAX, Math.round(width)));
  return applyVars(patchCanvas(elements, { widths: cleanWidthVars(widths) }));
}

export function setColorMode(elements, mode) {
  return applyVars(patchCanvas(elements, { colorMode: mode === 'dark' ? 'dark' : null }));
}

// Bind a part's ink, paper or width to a variable by name, or null to let go (it keeps the value it has).
export function bindVar(elements, id, key, name) {
  if (!BINDS.includes(key)) return elements;
  const known = key === 'width' ? canvasWidths(elements) : canvasColors(elements);
  if (name !== null && known[name] === undefined) return elements;
  const k = `${key}Var`;
  const out = elements.map(el => { if (el.id !== id) return el; const { [k]: _, ...rest } = el; return name === null ? rest : { ...rest, [k]: name }; });
  return applyVars(out);
}
