// Critique: a review of the screens, the way Claude Design checks its own work. Each issue names its rule,
// where it is and the part, if any. message() says it in English for agents and the CLI; the app translates
// by rule. Ported in ios/App/Critique.swift.
import { renderElements, gridToText, deleteElement } from './engine.js';
import { brokenBoxes } from './importer.js';

const SEE_THROUGH = new Set(['line', 'text', 'banner', 'screen', 'fill', 'paint', 'adjust']);
const VAGUE = new Set(['click', 'here', 'button', 'label', 'text', 'title', 'option', 'lorem', 'ipsum', 'todo', 'tbd', 'xxx', 'untitled', 'placeholder']);
const LISTS = new Set(['list', 'table', 'ios-list']);
const INPUTS = new Set(['input', 'textarea', 'select', 'search', 'datepicker']);
export const CRITIQUE_RULES = ['off_grid', 'overlap', 'broken_box', 'vague_label', 'no_empty_state', 'no_error_state', 'off_system', 'open_note', 'distraction'];

const marks = el => el.template.join('').replace(/\s/gu, '').length;
const tokens = el => (el.text ?? el.template.join(' ')).split(/[^\p{L}\p{N}']+/u).filter(Boolean);
const at = (rule, el, extra = {}) => ({ rule, severity: ['off_grid', 'broken_box'].includes(rule) ? 'error' : rule === 'open_note' ? 'info' : 'warn',
  col: el.col, row: el.row, ...(el.id && { id: el.id, part: el.label }), ...extra });
const holds = (a, b) => b.col >= a.col && b.row >= a.row && b.col + b.width <= a.col + a.width && b.row + b.height <= a.row + a.height;
const meets = (a, b) => a.col < b.col + b.width && b.col < a.col + a.width && a.row < b.row + b.height && b.row < a.row + a.height;

// The box style a part shows: set on it, or baked into its characters (a saved or system part).
function shownStyle(el) {
  const chars = el.template.join('');
  if (!/[┌╭┏╔]/u.test(chars)) return null;
  if (el.style) return el.style;
  return /[╭╮╰╯]/u.test(chars) ? 'rounded' : /[╔═]/u.test(chars) ? 'double' : /[┏━]/u.test(chars) ? 'heavy' : 'single';
}

// system: an optional design system ({ name, style }); boxes in another style are off it.
export function critique(elements, cols, rows, system = null) {
  const shown = elements.filter(el => !el.hidden), issues = [];
  for (const el of shown) {
    if (el.col < 0 || el.row < 0 || el.col + el.width > cols || el.row + el.height > rows) issues.push(at('off_grid', el));
  }
  // Two solid parts that partly cover each other. One wholly inside another is a part in a card, on purpose.
  const solid = shown.filter(el => !SEE_THROUGH.has(el.presetId));
  solid.forEach((a, i) => solid.slice(i + 1).forEach(b => {
    if (meets(a, b) && !holds(a, b) && !holds(b, a) && !(a.group && a.group === b.group)) issues.push(at('overlap', a, { other: b.label, otherId: b.id }));
  }));
  // A box that closes in its own part but is cut open on the canvas, by whatever sits on top of it.
  const own = new Set(shown.flatMap(el => brokenBoxes(el.template.join('\n')).map(b => `${el.row + b.row},${el.col + b.col}`)));
  for (const b of brokenBoxes(gridToText(renderElements(shown, cols, rows)))) {
    if (!own.has(`${b.row},${b.col}`)) issues.push(at('broken_box', { col: b.col, row: b.row }));
  }
  for (const el of shown) {
    const t = tokens(el);
    if (el.presetId !== 'screen' && t.length && t.every(w => VAGUE.has(w.toLowerCase()))) issues.push(at('vague_label', el, { word: t.join(' ') }));
  }
  // States: a list needs a screen for when it is empty, a form needs one for a wrong entry.
  const all = shown.flatMap(tokens).map(w => w.toLowerCase());
  const said = (...ws) => ws.some(w => all.includes(w));
  const list = shown.find(el => LISTS.has(el.presetId)), input = shown.find(el => INPUTS.has(el.presetId));
  if (list && !said('empty', 'nothing', 'results')) issues.push(at('no_empty_state', list));
  if (input && !said('error', 'invalid', 'required', 'wrong') && !shown.some(el => el.variant === 'error' || el.presetId === 'alert')) {
    issues.push(at('no_error_state', input));
  }
  if (system?.style) {
    for (const el of shown) {
      const style = shownStyle(el);
      if (style && style !== system.style && el.presetId !== 'line') issues.push(at('off_system', el, { style: system.style, system: system.name }));
    }
  }
  for (const el of shown) if (el.note) issues.push(at('open_note', el, { note: el.note }));
  // Distractions, the way Photoshop finds them: a few stray painted marks or paint off every screen, and parts with nothing to show.
  const screens = shown.filter(el => el.presetId === 'screen');
  for (const el of shown) {
    if (el.locked) continue;
    const stray = el.presetId === 'paint' && (marks(el) <= 3 || (screens.length > 0 && !screens.some(s => meets(s, el))));
    if (stray || (!['screen', 'line', 'adjust', 'paint'].includes(el.presetId) && !marks(el))) issues.push(at('distraction', el, { kind: stray ? 'stray' : 'empty' }));
  }
  return issues;
}

// One tap clears them. Deleting heals any arrows through a removed part.
export function removeDistractions(elements, cols, rows) {
  return critique(elements, cols, rows).filter(i => i.rule === 'distraction').reduce((els, i) => deleteElement(els, i.id), elements);
}

const where = i => `at ${i.col},${i.row}`;
export function critiqueMessage(i) {
  const part = i.part ?? 'A part';
  return {
    off_grid: `${part} ${where(i)} runs off the grid`,
    overlap: `${part} ${where(i)} overlaps ${i.other}`,
    broken_box: `A box ${where(i)} is cut open by a part on top of it`,
    vague_label: `${part} ${where(i)} says "${i.word}", which is placeholder text`,
    no_empty_state: `${part} ${where(i)} has no empty state: add a screen for when it has nothing in it`,
    no_error_state: `${part} ${where(i)} has no error state: show what a wrong entry looks like`,
    off_system: `${part} ${where(i)} is off the ${i.style} style of ${i.system}`,
    open_note: `Note on ${part} ${where(i)}: ${i.note}`,
    distraction: `${part} ${where(i)} is a distraction: ${i.kind === 'stray' ? 'a few stray marks' : 'it shows nothing'}`,
  }[i.rule];
}
