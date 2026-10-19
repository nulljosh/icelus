import { nudgeElement, updateElement, deleteElement, DEFAULT_COLS, DEFAULT_ROWS } from './engine.js';
import { stepName } from './history.js';
import { BLENDS, BOX_STYLES } from './lines.js';
import { VARIANTS } from './shapes.js';
import { cleanColor } from './color.js';

// Actions (v41). Record a few steps, then replay them on any part. A step is relative to the part it touched:
// move {dCol, dRow}, set {changes}, text {text}, resize {width, height} or delete. Actions live in the project file.
export const ACTION_LIMIT = 20;
export const ACTION_STEPS = 50;
const MAX_TEXT = 2000;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SETTABLE = {
  style: v => BOX_STYLES.includes(v), ink: v => cleanColor(v) !== undefined, paper: v => cleanColor(v) !== undefined,
  blend: v => BLENDS.includes(v), variant: v => VARIANTS.includes(v),
  accent: v => typeof v === 'boolean', hidden: v => typeof v === 'boolean', locked: v => typeof v === 'boolean',
};

// The step one undo entry makes, or null when it is not about one part (a paste, a reorder, a screen tweak).
export function actionStep(before, after) {
  const { kind, el } = stepName(before, after);
  const was = el && before.find(x => x.id === el.id);
  if (!was) return null;
  if (kind === 'delete') return { op: 'delete' };
  if (kind === 'move') return { op: 'move', dCol: el.col - was.col, dRow: el.row - was.row };
  if (kind !== 'edit') return null;
  if (el.text !== was.text && typeof el.text === 'string') return { op: 'text', text: el.text.slice(0, MAX_TEXT) };
  const changes = {};
  for (const k of Object.keys(SETTABLE)) if (!same(was[k], el[k])) changes[k] = el[k] ?? null;
  if (Object.keys(changes).length) return { op: 'set', changes };
  if (el.width !== was.width || el.height !== was.height) return { op: 'resize', width: el.width, height: el.height };
  return null;
}

// Steps from the undo entry `from` (the history length when recording started) to the canvas now.
// ponytail: an index, so steps older than the 50 undo entries are gone; fine for "a few steps".
export function recordAction(state, from, name, count = 0) {
  const list = [...state.history, state.elements];
  const steps = [];
  for (let i = Math.max(0, Math.min(from, list.length - 1)); i < list.length - 1; i++) {
    const step = actionStep(list[i], list[i + 1]);
    const last = steps.at(-1);
    // Arrow-key nudges in a row are one move.
    if (step?.op === 'move' && last?.op === 'move') steps[steps.length - 1] = { op: 'move', dCol: last.dCol + step.dCol, dRow: last.dRow + step.dRow };
    else if (step) steps.push(step);
  }
  return { name: cleanActionName(name, count + 1), steps: steps.slice(0, ACTION_STEPS) };
}

export const cleanActionName = (name, n) => String(name ?? '').trim().slice(0, 60) || `Action ${n}`;

// Whatever came from a file or a caller: unknown steps and bad values dropped, sizes capped.
export function cleanStep(s) {
  if (!s || typeof s !== 'object') return null;
  const whole = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  if (s.op === 'delete') return { op: 'delete' };
  if (s.op === 'move' && whole(s.dCol, -500, 500) && whole(s.dRow, -500, 500)) return { op: 'move', dCol: s.dCol, dRow: s.dRow };
  if (s.op === 'resize' && whole(s.width, 1, 500) && whole(s.height, 1, 500)) return { op: 'resize', width: s.width, height: s.height };
  if (s.op === 'text' && typeof s.text === 'string') return { op: 'text', text: s.text.slice(0, MAX_TEXT) };
  if (s.op === 'set' && s.changes && typeof s.changes === 'object') {
    const changes = Object.fromEntries(Object.entries(s.changes).filter(([k, v]) => SETTABLE[k] && (v === null || SETTABLE[k](v))));
    return Object.keys(changes).length ? { op: 'set', changes } : null;
  }
  return null;
}

export function cleanActions(list) {
  return (Array.isArray(list) ? list : []).filter(a => a && Array.isArray(a.steps)).slice(-ACTION_LIMIT)
    .map((a, i) => ({ name: cleanActionName(typeof a.name === 'string' ? a.name : '', i + 1), steps: a.steps.slice(0, ACTION_STEPS).map(cleanStep).filter(Boolean) }));
}

export function saveAction(actions = [], action) {
  return [...actions, action].slice(-ACTION_LIMIT);
}

// Every step on every part named, in order. A part an earlier step deleted is skipped.
export function playAction(elements, steps, ids, cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
  let out = elements;
  for (const id of ids) {
    for (const s of steps) {
      if (!out.some(el => el.id === id)) break;
      if (s.op === 'move') out = nudgeElement(out, id, s.dCol, s.dRow, cols, rows);
      else if (s.op === 'resize') out = updateElement(out, id, { width: s.width, height: s.height });
      else if (s.op === 'text') out = updateElement(out, id, { text: s.text });
      else if (s.op === 'delete') out = deleteElement(out, id);
      // One key at a time: updateElement applies the first kind of change it finds.
      else if (s.op === 'set') for (const [k, v] of Object.entries(s.changes)) out = updateElement(out, id, { [k]: v });
    }
  }
  return out;
}
