import { SYMBOL_FIELDS, symbolFields } from './shapes.js';
import { BOX_STYLES, routeLines, styleChar } from './lines.js';
import { maxOf } from './extent.js';

// Libraries (v48), after Figma's. Publish turns each symbol in a project into a library part; a project that
// places one keeps its symbol id, so opening a newer copy of the library updates every copy in place, minus what
// a copy owns (v46). The file is plain JSON, so it travels in a repo or a chat. ios/App/Library.swift is the twin.
export const LIBRARY_MAX = 100;
const ok = s => typeof s === 'string' && s.length > 0 && s.length <= 64;

export function makeLibrary(elements, name = 'Library') {
  const seen = new Set(), parts = [];
  for (const el of elements) {
    if (!ok(el.symbol) || seen.has(el.symbol) || parts.length >= LIBRARY_MAX) continue;
    seen.add(el.symbol);
    parts.push({ symbol: el.symbol, label: el.label, presetId: el.presetId, template: el.template,
      ...(typeof el.text === 'string' && { text: el.text }), ...(el.style && { style: el.style }) });
  }
  return { icelusLibrary: 1, name: String(name).trim().slice(0, 40) || 'Library', parts };
}

// A library file read back, kept only if well formed. Untrusted: it may come from anyone.
export function parseLibrary(raw) {
  let d;
  try { d = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!d || d.icelusLibrary !== 1 || !Array.isArray(d.parts)) return null;
  const seen = new Set();
  const parts = d.parts.filter(p => p && ok(p.symbol) && !seen.has(p.symbol) && seen.add(p.symbol) && typeof p.label === 'string'
    && p.label.length <= 40 && Array.isArray(p.template) && p.template.length > 0 && p.template.length <= 60
    && p.template.every(l => typeof l === 'string' && l.length <= 200)).slice(0, LIBRARY_MAX)
    .map(p => ({ symbol: p.symbol, label: p.label, presetId: typeof p.presetId === 'string' ? p.presetId.slice(0, 40) : 'custom', template: p.template,
      ...(typeof p.text === 'string' && p.text.length <= 2000 && { text: p.text }),
      ...(BOX_STYLES.includes(p.style) && p.style !== 'single' && { style: p.style }) }));
  return { icelusLibrary: 1, name: typeof d.name === 'string' && d.name.trim() ? d.name.trim().slice(0, 40) : 'Library', parts };
}

const sized = p => ({ ...p, width: Math.max(1, maxOf(p.template.map(l => [...l].length))), height: p.template.length });

// Every copy of a library symbol takes the library's version of it. Returns the list and how many copies changed.
export function pullLibrary(elements, library) {
  const bySymbol = new Map(library.parts.map(p => [p.symbol, sized(p)]));
  let changed = 0;
  const out = elements.map(el => {
    const part = bySymbol.get(el.symbol);
    if (!part) return el;
    const next = { ...el };
    for (const f of symbolFields(el)) { if (part[f] === undefined) delete next[f]; else next[f] = part[f]; }
    if (SYMBOL_FIELDS.every(f => JSON.stringify(next[f]) === JSON.stringify(el[f]))) return el;
    changed++;
    return next;
  });
  return { elements: changed ? routeLines(out) : elements, changed };
}

// Library parts for the palette (under Mine), style baked in like any Mine part, carrying their symbol so a
// placed one stays linked.
export const libraryPalette = library => library.parts.map(p => sized({ id: `mine-lib-${p.symbol}`, label: p.label, category: 'Mine',
  template: p.style ? p.template.map(l => [...l].map(ch => styleChar(ch, p.style)).join('')) : p.template, symbol: p.symbol }));
