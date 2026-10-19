import { newElementId, DEFAULT_COLS, DEFAULT_ROWS } from './engine.js';
import { ADJUSTMENTS, BOX_STYLES, VARIANTS, cleanBlend } from './lines.js';
import { cleanNote } from './shapes.js';
import { maxOf } from './extent.js';
import { cleanColor } from './color.js';
import { cleanMask } from './mask.js';

// The project file, the same JSON on every platform (ios/App/Project.swift is the twin). engine.js re-exports both.
// A project file is the element list, the canvas size and any named snapshots (history.js).
export function serializeProject(state) {
  return JSON.stringify({ blockprint: 1, cols: state.cols, rows: state.rows, elements: state.elements,
    ...(state.snapshots?.length && { snapshots: state.snapshots.map(s => ({ name: s.name, elements: s.elements })) }) });
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
  // Each snapshot is read like a project of its own, so it gets the same cleaning and its own fresh ids.
  const snapshots = (Array.isArray(data.snapshots) ? data.snapshots : [])
    .filter(s => s && Array.isArray(s.elements)).slice(-20)
    .map((s, i) => ({ name: String(typeof s.name === 'string' ? s.name : '').trim().slice(0, 60) || `Snapshot ${i + 1}`,
      elements: parseProject(JSON.stringify({ elements: s.elements })).elements }));
  return { cols, rows, elements, ...(snapshots.length && { snapshots }) };
}
