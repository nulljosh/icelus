// Tweaks: live knobs on a screen, Claude Design's sliders for a text grid. Spacing is the blank rows between
// bands of parts, padding the blank cells inside the frame's top and left, and one box style for every box in it.
import { partsInside, screenFrame, routeLines, BOX_STYLES, freshTag } from './lines.js';
import { duplicateScreen, updateElement } from './engine.js';
import { minOf, maxOf } from './extent.js';

const LINE_CHARS = /[─│┌┐└┘├┤┬┴┼]/u;
const MAX = 8;

// Parts that share rows form a band; bands stack top to bottom.
function bands(parts) {
  const out = [];
  for (const p of [...parts].sort((a, b) => a.row - b.row || a.col - b.col)) {
    const last = out[out.length - 1];
    if (last && p.row < last.bottom) { last.parts.push(p); last.bottom = Math.max(last.bottom, p.row + p.height); }
    else out.push({ top: p.row, bottom: p.row + p.height, parts: [p] });
  }
  return out;
}

// ponytail: loose lines inside stay put; pinned ones reroute with their parts.
const movable = (elements, screen) => partsInside(elements, screen).filter(el => el.presetId !== 'line' && !el.locked);

// What the knobs read now: the smallest gap between bands and the smallest margin inside the frame.
export function screenTweaks(elements, screen) {
  const parts = movable(elements, screen), b = bands(parts);
  if (!parts.length) return { spacing: 1, padding: 1 };
  const gaps = b.slice(1).map((band, i) => band.top - b[i].bottom);
  return {
    spacing: Math.min(MAX, gaps.length ? Math.min(minOf(gaps)) : 1),
    padding: Math.min(MAX, b[0].top - screen.row - 1, Math.min(minOf(parts.map(p => p.col))) - screen.col - 1),
  };
}

// Restack the screen with the new knobs. The frame grows when the parts need more room, never shrinks.
export function tweakScreen(elements, id, { spacing, padding, style } = {}) {
  const screen = elements.find(el => el.id === id);
  if (screen?.presetId !== 'screen') return elements;
  const now = screenTweaks(elements, screen);
  const knob = (v, d) => (Number.isFinite(v) ? Math.max(0, Math.min(MAX, Math.round(v))) : d);
  const gap = knob(spacing, now.spacing), pad = knob(padding, now.padding);
  const parts = movable(elements, screen), moved = new Map();
  let right = 0, bottom = 0;
  if (parts.length) {
    const left = Math.min(minOf(parts.map(p => p.col)));
    let row = screen.row + 1 + pad;
    for (const band of bands(parts)) {
      for (const p of band.parts) {
        const at = { col: p.col - left + screen.col + 1 + pad, row: row + p.row - band.top };
        moved.set(p.id, at);
        right = Math.max(right, at.col + p.width); bottom = Math.max(bottom, at.row + p.height);
      }
      row += band.bottom - band.top + gap;
    }
  }
  const width = Math.max(screen.width, right + pad + 1 - screen.col), height = Math.max(screen.height, bottom + pad + 1 - screen.row);
  const inside = new Set(partsInside(elements, screen).map(el => el.id));
  const restyle = BOX_STYLES.includes(style);
  return routeLines(elements.map(el => {
    let out = moved.has(el.id) ? { ...el, ...moved.get(el.id) } : el;
    if (el.id === id) out = { ...out, width, height, template: screenFrame(el.text ?? 'Screen', width, height) };
    if (restyle && (el.id === id || inside.has(el.id)) && !el.locked && LINE_CHARS.test(el.template.join(''))) {
      const { style: _, ...rest } = out;
      out = style === 'single' ? rest : { ...rest, style };
    }
    return out;
  }));
}

// Put parts at new cells and grow the frame to hold them (never shrink it). moved: id -> { col, row }.
function place(elements, screen, moved, pad) {
  let right = 0, bottom = 0;
  for (const el of elements) {
    const at = moved.get(el.id);
    if (at) { right = Math.max(right, at.col + el.width); bottom = Math.max(bottom, at.row + el.height); }
  }
  const width = Math.max(screen.width, right + pad + 1 - screen.col), height = Math.max(screen.height, bottom + pad + 1 - screen.row);
  return routeLines(elements.map(el => {
    if (el.id === screen.id) return { ...el, width, height, template: screenFrame(el.text ?? 'Screen', width, height) };
    return moved.has(el.id) ? { ...el, ...moved.get(el.id) } : el;
  }));
}

// Variations: other takes on a screen from the same parts, Claude Design's "show me options".
// stacked: one part a row. split: two columns, each part to the shorter one. dense: no blank rows.
export const VARIATION_MODES = ['stacked', 'split', 'dense'];
export function relayout(elements, id, mode) {
  const screen = elements.find(el => el.id === id);
  if (screen?.presetId !== 'screen') return elements;
  if (mode === 'dense') return tweakScreen(elements, id, { spacing: 0, padding: 1 });
  const parts = movable(elements, screen).sort((a, b) => a.row - b.row || a.col - b.col);
  const pad = 1, left = screen.col + 1 + pad, top = screen.row + 1 + pad, moved = new Map();
  if (mode === 'stacked') {
    let row = top;
    for (const p of parts) { moved.set(p.id, { col: left, row }); row += p.height + 1; }
  } else if (mode === 'split') {
    const x = [left, left + Math.max(0, maxOf(parts.map(p => p.width))) + 3], y = [top, top];
    for (const p of parts) { const k = y[0] <= y[1] ? 0 : 1; moved.set(p.id, { col: x[k], row: y[k] }); y[k] += p.height + 1; }
  } else return elements;
  return place(elements, screen, moved, pad);
}

// Three variations to the right of a screen, each named for its layout. They share a `take` tag with the
// original, so keepVariation can clear away the rest.
export function variations(elements, id, labels = VARIATION_MODES) {
  const src = elements.find(el => el.id === id);
  if (src?.presetId !== 'screen') return { elements, ids: [] };
  const take = src.take ?? freshTag(), name = src.text ?? 'Screen';
  let els = elements.map(el => (el.id === id ? { ...el, take } : el)), from = id;
  const ids = [];
  VARIATION_MODES.forEach((mode, i) => {
    // Past the rightmost thing on the canvas, so a take never lands on other work.
    const clear = Math.max(maxOf(els.map(el => el.col + el.width))) + 4;
    const at = els.find(el => el.id === from);
    const copy = duplicateScreen(els, at, clear - at.col);
    els = updateElement(copy.elements, copy.id, { text: `${name} ${labels[i]}` }).map(el => (el.id === copy.id ? { ...el, take } : el));
    els = relayout(els, copy.id, mode);
    ids.push(copy.id); from = copy.id;
  });
  return { elements: els, ids };
}

// Keep one take: every other screen with its tag goes, with the parts inside it.
export function keepVariation(elements, id) {
  const kept = elements.find(el => el.id === id);
  if (!kept?.take) return elements;
  const drop = new Set(elements.filter(el => el.presetId === 'screen' && el.take === kept.take && el.id !== id)
    .flatMap(s => [s.id, ...partsInside(elements, s).map(p => p.id)]));
  return routeLines(elements.filter(el => !drop.has(el.id)).map(el => {
    if (el.id !== id) return el;
    const { take, ...rest } = el;
    return rest;
  }));
}
