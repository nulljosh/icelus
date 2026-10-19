// The real look: what each part draws as when it is shown as a real interface instead of characters. Pure,
// so the web canvas, the native canvas (ios/App/Real.swift) and the tests read the same answers.

import { readPart } from './code.js';

// A row that is only "[ Action ]" is a button inside a card or modal (two characters or more, so "[x]" stays).
const BUTTON = /^\[\s*([^[\]\s][^[\]]*?[^[\]\s])\s*\]$/;
const BOX = /[─│┌┐└┘├┤┬┴┼╭╮╰╯═║╔╗╚╝╠╣╦╩╬━┃┏┓┗┛┣┫┳┻╋╷╵╶╴]/;
// Parts that stay as characters even in the real look: lines, paint, charts and the shapes made of glyphs.
const CHARACTERS = new Set(['line', 'paint', 'adjust', 'chart', 'sparkline', 'fill', 'photo', 'boxy', 'flow', 'node', 'sequence', 'tree']);

/** The words on each row of a part, with where they start: [{ row, col, text, button? }]. Box lines are dropped. */
export function rowsOfText(el) {
  return el.template.flatMap((line, row) => {
    const plain = [...line].map(ch => (BOX.test(ch) ? ' ' : ch)).join('');
    const col = plain.search(/\S/);
    if (col < 0) return [];
    const text = plain.slice(col).trimEnd(), b = text.match(BUTTON);
    return [b && !/^v /.test(b[1]) ? { row, col, text: b[1], button: true } : { row, col, text }];
  });
}

const boxed = el => el.height > 1 && /^[┌╔╭┏]/.test(el.template[0] ?? '') && /[┘╝╯┛]$/.test(el.template.at(-1) ?? '');

/** How a part draws in the real look: { kind, ... } or null to keep its characters. */
export function realPart(el) {
  if (CHARACTERS.has(el.presetId) || el.presetId?.startsWith('photo')) return null;
  const p = readPart(el);
  if (p.kind !== 'pre') return p;
  const t = el.template[0] ?? '';
  switch (el.presetId) {
    case 'toggle': return { kind: 'toggle', on: t.indexOf('●') > t.length / 2 || /━+●/.test(t) };
    case 'slider': case 'progress': {
      const marks = [...t].filter(c => /[▓░●─━]/.test(c));
      const at = el.presetId === 'slider' ? Math.max(0, [...t].indexOf('●')) / Math.max(1, [...t].length - 1)
        : marks.filter(c => c === '▓').length / Math.max(1, marks.length);
      return { kind: el.presetId, value: Math.max(0, Math.min(1, at)) };
    }
    case 'search': return { kind: 'input', placeholder: t.replace(/[()⌕]/g, '').trim(), search: true };
    case 'avatar': return { kind: 'avatar', initials: rowsOfText(el).map(r => r.text).join('').replace(/\W/g, '').slice(0, 2).toUpperCase() };
    case 'image': return { kind: 'image' };
    case 'skeleton': return { kind: 'skeleton' };
    case 'segmented': return { kind: 'segmented', items: t.replace(/^\[|\]$/g, '').split('|').map(s => s.trim()).filter(Boolean) };
    case 'tags': return { kind: 'tags', items: [...t.matchAll(/\(([^)]+)\)/g)].map(m => m[1].trim()) };
  }
  if (boxed(el)) return { kind: 'box', rows: rowsOfText(el) };
  return { kind: 'words', rows: rowsOfText(el) };
}
