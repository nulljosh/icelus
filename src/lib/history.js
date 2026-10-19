import { undo, redo } from './engine.js';

// History (v40). Each undo step is named from what changed between two element lists, the panel jumps
// to any step, and snapshots keep named copies of the canvas inside the project file (parseProject reads them).
export const SNAPSHOT_LIMIT = 20;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// {kind, el, count}: kind is start, add, delete, move, edit, reorder, replace, clear or change; el is the part it is about.
export function stepName(before, after) {
  const was = new Map(before.map(el => [el.id, el]));
  const now = new Set(after.map(el => el.id));
  const added = after.filter(el => !was.has(el.id));
  const removed = before.filter(el => !now.has(el.id));
  const changed = after.filter(el => was.has(el.id) && !same(was.get(el.id), el));
  const about = (kind, list) => ({ kind, el: list[0], count: list.length });
  if (!after.length && before.length) return about('clear', before);
  if (added.length && !removed.length && !changed.length) return about('add', added);
  if (removed.length && !added.length && !changed.length) return about('delete', removed);
  if (changed.length && !added.length && !removed.length) {
    // Lines pinned to a moved part change too; name the step after the part, not its lines.
    const parts = changed.filter(el => !el.from);
    const focus = parts.length ? parts : changed;
    return about(focus.every(el => same({ ...was.get(el.id), col: el.col, row: el.row }, el)) ? 'move' : 'edit', focus);
  }
  if (!changed.length && removed.length === before.length && added.length === after.length && after.length) return about('replace', after);
  if (!added.length && !removed.length) return about(same(before.map(el => el.id), after.map(el => el.id)) ? 'edit' : 'reorder', []);
  return { kind: 'change', el: undefined, count: added.length + removed.length + changed.length };
}

// Oldest kept step first; the one you are on is at index state.history.length, redo steps follow it.
export function timeline(state) {
  const steps = [...state.history, state.elements, ...state.future];
  return steps.map((els, i) => (i ? stepName(steps[i - 1], els) : { kind: 'start', el: undefined, count: 0 }));
}

// Jumping is undo or redo repeated, so the steps after the target stay redoable.
export function goToStep(state, index) {
  let s = state;
  while (s.history.length > Math.max(0, index)) s = undo(s);
  while (s.history.length < index && s.future.length) s = redo(s);
  return s;
}

export const cleanSnapshotName = (name, n) => String(name ?? '').trim().slice(0, 60) || `Snapshot ${n}`;

export function takeSnapshot(snapshots = [], elements, name) {
  return [...snapshots, { name: cleanSnapshotName(name, snapshots.length + 1), elements }].slice(-SNAPSHOT_LIMIT);
}
