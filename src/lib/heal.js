import { lineShape } from './lines.js';
import { tableCells } from './shapes.js';
import { newElementId } from './engine.js';

// Heal and expand (v42). Heal: delete a part in the middle of a flow and the arrows on either side join up.
// Expand: a table or list grows by a row and carries its pattern on (Item 3, Item 4; Mon, Tue, Wed).
// ios/App/Heal.swift is the twin.
// The lines pinned to a part that is going away, joined across it: one way in, any number out, or the other way round.
export function closeLines(elements, gone) {
  const ins = elements.filter(el => el.presetId === 'line' && el.to?.id === gone && el.from?.id !== gone);
  const outs = elements.filter(el => el.presetId === 'line' && el.from?.id === gone && el.to?.id !== gone);
  if (!ins.length || !outs.length || (ins.length > 1 && outs.length > 1)) return elements;
  const joined = ins.flatMap(a => outs.map(b => {
    const { side, ...to } = b.to, end = { ...to, ...(a.to.side && { side: a.to.side }) };
    return { ...a, id: newElementId(), ...lineShape(a.from, end), from: a.from, to: end };
  }));
  const used = new Set([...ins, ...outs].map(el => el.id));
  return [...elements.filter(el => !used.has(el.id)), ...joined];
}

const WORDS = [
  ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
];

// What comes after a run of values: a number keeps its step, a counting word, day or month the next one,
// the same value again when they were all the same, otherwise nothing.
export function nextValue(values) {
  const last = values.at(-1) ?? '';
  const num = /^(.*?)(-?\d+)(\D*)$/;
  const m = last.match(num);
  if (m) {
    const p = values.at(-2)?.match(num);
    const step = p && p[1] === m[1] && p[3] === m[3] ? Number(m[2]) - Number(p[2]) || 1 : 1;
    return `${m[1]}${Number(m[2]) + step}${m[3]}`;
  }
  const w = last.match(/^(.*?)([A-Za-z]+)$/);
  if (w) {
    for (const list of WORDS) {
      const i = list.findIndex(x => x.toLowerCase() === w[2].toLowerCase());
      if (i < 0) continue;
      const word = list[(i + 1) % list.length];
      if (list === WORDS[0] && i === list.length - 1) break; // counting stops at twelve
      const cased = w[2][0] === w[2][0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word.toLowerCase();
      return w[1] + cased;
    }
  }
  return values.length > 1 && values.every(v => v === last) ? last : '';
}

const BULLET = /^(\s*(?:[•\-*·▸›]|\d+[.)]|[a-z][.)])\s+)(.*)$/;

// The next line of a list: its bullet or number carries on, and so does the text after it.
export function nextLine(lines) {
  const parts = lines.map(l => l.match(BULLET) ?? [l, '', l]);
  const lead = parts.at(-1)[1];
  const indent = lead.match(/^\s*/)[0], space = lead.match(/\s*$/)[0] || ' ';
  const mark = lead ? nextValue(parts.map(p => p[1].trim())) || lead.trim() : '';
  return (mark ? indent + mark + space : '') + nextValue(parts.map(p => p[2].trimEnd()));
}

export const EXPAND_LIMIT = 50;

// The changes that grow a table by rows or a list by items, or null when the part does not expand.
export function expandChanges(el, by = 1) {
  const n = Math.max(1, Math.min(EXPAND_LIMIT, Math.floor(by) || 1));
  if (el?.presetId === 'table') {
    const cells = tableCells(el.template);
    if (cells.length + n > 200) return null;
    for (let i = 0; i < n; i++) {
      const body = cells.slice(1), width = Math.max(...cells.map(r => r.length));
      cells.push(Array.from({ length: width }, (_, j) => nextValue(body.map(r => r[j] ?? ''))));
    }
    return { cells };
  }
  if (el?.presetId === 'list') {
    const lines = el.template.map(l => l.trimEnd()).filter(Boolean);
    if (lines.length + n > 200) return null;
    for (let i = 0; i < n; i++) lines.push(nextLine(lines));
    return { text: lines.join('\n') };
  }
  return null;
}
