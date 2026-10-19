import { partsInside, screenFrame, routeLines } from './lines.js';
import { updateElement } from './engine.js';

// Auto layout (v43), after Figma's. A screen with `auto: {gap, pad}` keeps its parts stacked: bands of parts
// that share rows run top to bottom, `gap` rows apart and `pad` cells inside the frame, and the frame hugs them.
// Every edit restacks it, so a part whose text grows pushes the rest down. ios/App/Layout.swift is the twin.
export const AUTO_MAX = 8;

export function cleanAuto(a) {
  if (!a || typeof a !== 'object') return null;
  const knob = v => (Number.isInteger(v) && v >= 0 && v <= AUTO_MAX ? v : 1);
  return { gap: knob(a.gap), pad: knob(a.pad) };
}

const inner = (elements, screen) => partsInside(elements, screen).filter(el => el.presetId !== 'line' && !el.locked);

// keyHeight is how tall a part was before the edit, so one that grew pushes the next band down instead of joining it.
function stack(elements, screen, parts, { gap, pad }, keyHeight) {
  const bands = [];
  for (const p of [...parts].sort((a, b) => a.row - b.row || a.col - b.col)) {
    const last = bands.at(-1);
    if (last && p.row < last.key) { last.parts.push(p); last.key = Math.max(last.key, p.row + keyHeight(p)); }
    else bands.push({ top: p.row, key: p.row + keyHeight(p), parts: [p] });
  }
  const left = parts.length ? Math.min(...parts.map(p => p.col)) : 0, moved = new Map();
  let row = screen.row + 1 + pad, right = 0, bottom = row;
  for (const band of bands) {
    let tall = 0;
    for (const p of band.parts) {
      const at = { col: p.col - left + screen.col + 1 + pad, row: row + p.row - band.top };
      moved.set(p.id, at);
      tall = Math.max(tall, at.row + p.height - row);
      right = Math.max(right, at.col + p.width);
    }
    bottom = row + tall;
    row = bottom + gap;
  }
  const width = Math.max(screen.width, right + pad + 1 - screen.col), height = Math.max(3, bottom + pad + 1 - screen.row);
  return routeLines(elements.map(el => {
    if (moved.has(el.id)) return { ...el, ...moved.get(el.id) };
    if (el.id !== screen.id || (width === el.width && height === el.height)) return el;
    return { ...el, width, height, template: screenFrame(el.text ?? 'Screen', width, height) };
  }));
}

// Restack every auto screen after an edit from prev to next. A part that was inside stays in its stack even when
// it grew past the frame; one dragged out leaves it. Returns next itself when nothing moved.
export function autoLayout(prev, next) {
  if (!next.some(el => el.presetId === 'screen' && el.auto)) return next;
  const was = new Map(prev.map(el => [el.id, el]));
  let out = next;
  for (const screen of next) {
    if (screen.presetId !== 'screen' || !screen.auto) continue;
    const before = was.get(screen.id), now = out.find(el => el.id === screen.id);
    const stayed = before ? inner(prev, before).filter(p => {
      const n = out.find(el => el.id === p.id);
      return n && n.presetId !== 'line' && !n.locked && n.col === p.col && n.row === p.row;
    }) : [];
    const ids = new Set([...stayed, ...inner(out, now)].map(p => p.id));
    out = stack(out, now, out.filter(el => ids.has(el.id)), cleanAuto(now.auto), p => was.get(p.id)?.height ?? p.height);
  }
  return out.every((el, i) => el === next[i] || JSON.stringify(el) === JSON.stringify(next[i])) ? next : out;
}

// Constraints (v44), after Figma's: a part on a screen is pinned left (the default), right, to both sides
// (it stretches) or to the center, and top, bottom, both or center the same way. When the screen is resized,
// pinned parts follow. `pin: {x, y}` keeps only what is not the default.
export const PIN_X = ['left', 'right', 'both', 'center'];
export const PIN_Y = ['top', 'bottom', 'both', 'center'];

export function cleanPin(p) {
  if (!p || typeof p !== 'object') return null;
  const x = PIN_X.includes(p.x) && p.x !== 'left' ? p.x : null, y = PIN_Y.includes(p.y) && p.y !== 'top' ? p.y : null;
  return x || y ? { ...(x && { x }), ...(y && { y }) } : null;
}

const shift = (mode, d) => (mode === 'right' || mode === 'bottom' ? d : mode === 'center' ? Math.round(d / 2) : 0);

export function constrain(prev, next) {
  const was = new Map(prev.map(el => [el.id, el]));
  let out = next;
  for (const screen of next) {
    const before = was.get(screen.id);
    if (screen.presetId !== 'screen' || !before || before.col !== screen.col || before.row !== screen.row) continue;
    const dx = screen.width - before.width, dy = screen.height - before.height;
    if (!dx && !dy) continue;
    for (const p of partsInside(prev, before)) {
      const now = out.find(el => el.id === p.id);
      const pin = now?.pin;
      if (!pin || now.presetId === 'line' || now.locked) continue;
      const width = now.width + (pin.x === 'both' ? dx : 0), height = now.height + (pin.y === 'both' ? dy : 0);
      if (width !== now.width || height !== now.height) out = updateElement(out, p.id, { width: Math.max(1, width), height: Math.max(1, height) });
      const col = now.col + shift(pin.x, dx), row = now.row + shift(pin.y, dy);
      if (col !== now.col || row !== now.row) out = out.map(el => (el.id === p.id ? { ...el, col, row } : el));
    }
  }
  return out === next ? next : routeLines(out);
}
