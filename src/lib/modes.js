import { adjustLayer } from './lines.js';
import { AUTO_MAX } from './layout.js';

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

// Put the canvas part's mode and vars back; it goes away when it holds neither.
function withCanvas(elements, mode, vars) {
  const part = canvasPart(elements), rest = elements.filter(el => !el.canvas);
  if (!mode && !vars) return part ? rest : elements;
  const base = part ?? { ...adjustLayer(0, 0, 1, 1), label: 'Canvas', canvas: true };
  const { adjust, vars: _, ...plain } = base;
  return [...rest, { ...plain, ...(mode && { adjust: mode }), ...(vars && { vars }) }];
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
