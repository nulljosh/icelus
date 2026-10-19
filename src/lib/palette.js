// Your own parts: save one from the canvas and it joins the palette under Mine, on this device only.
import { styleChar } from './engine.js';
import { maxOf } from './extent.js';

export const MINE = 'Mine';
const LIMIT = 100;

const sized = p => ({ ...p, width: Math.max(1, maxOf(p.template.map(l => [...l].length))), height: p.template.length });

// A palette part from a placed one. Its box style is baked into the characters, so it stamps as it looks.
export function toPalettePart(el, existing = []) {
  const taken = new Set(existing.map(p => p.label));
  let label = el.label, n = 2;
  while (taken.has(label)) label = `${el.label} ${n++}`;
  const template = el.style ? el.template.map(l => [...l].map(ch => styleChar(ch, el.style)).join('')) : el.template;
  return sized({ id: `mine-${Date.now().toString(36)}-${existing.length}`, label, category: MINE, template });
}

// Read the saved palette back, keeping only well-formed parts. Storage is the viewer's, but never trusted.
export function parsePalette(raw) {
  let data;
  try { data = JSON.parse(raw || '[]'); } catch { return []; }
  if (!Array.isArray(data)) return [];
  return data.filter(p => p && typeof p.id === 'string' && p.id.startsWith('mine-') && typeof p.label === 'string'
    && p.label.length <= 40 && Array.isArray(p.template) && p.template.length > 0 && p.template.length <= 60
    && p.template.every(l => typeof l === 'string' && l.length <= 200))
    .slice(0, LIMIT).map(p => sized({ id: p.id, label: p.label, category: MINE, template: p.template,
      ...(typeof p.symbol === 'string' && p.symbol.length <= 64 && { symbol: p.symbol }) }));
}

export const addToPalette = (palette, el) => [...palette, toPalettePart(el, palette)].slice(-LIMIT);
